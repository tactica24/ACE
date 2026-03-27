import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureCached } from '@/lib/stream';
import { getAcePath } from '@/lib/cache';
import { encryptFile, generateAceKey, wrapKey } from '@/lib/crypto';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Mobile app authentication required.' }, { status: 401 });
  }

  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [packages, unlocks] = await Promise.all([
    prisma.offlinePackage.findMany({
      where: { ownerId: auth.sub, status: { not: 'REVOKED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            posterKey: true
          }
        }
      }
    }),
    prisma.unlock.findMany({
      where: {
        userId: auth.sub,
        video: { status: 'APPROVED' }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            posterKey: true
          }
        }
      }
    })
  ]);

  const packageByVideoId = new Map(packages.map((item) => [item.videoId, item]));
  const items = unlocks.map((unlock) => {
    const existingPackage = packageByVideoId.get(unlock.videoId);
    return {
      video: unlock.video,
      package: existingPackage
        ? {
            id: existingPackage.id,
            aceFileKey: existingPackage.aceFileKey,
            status: existingPackage.status,
            createdAt: existingPackage.createdAt
          }
        : null
    };
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Mobile app authentication required.' }, { status: 401 });
  }

  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  if (!videoId) {
    return NextResponse.json({ error: 'Missing video id.' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video || video.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Video not available.' }, { status: 404 });
  }

  const hasUnlock = await prisma.unlock.findFirst({ where: { userId: auth.sub, videoId } });
  if (!hasUnlock) {
    return NextResponse.json({ error: 'Unlock required before offline packaging.' }, { status: 403 });
  }

  const existingPackage = await prisma.offlinePackage.findFirst({
    where: {
      ownerId: auth.sub,
      videoId,
      status: 'READY'
    }
  });

  if (existingPackage) {
    return NextResponse.json({
      ok: true,
      package: {
        id: existingPackage.id,
        aceFileKey: existingPackage.aceFileKey,
        status: existingPackage.status
      }
    });
  }

  const createdPackage = await prisma.offlinePackage.create({
    data: {
      ownerId: auth.sub,
      videoId,
      aceFileKey: `offline-${videoId}-${Date.now()}.ace`,
      wrappedKey: '',
      status: 'PREPARING'
    }
  });

  try {
    const cachedPath = await ensureCached(video.r2Key);
    const aceKey = generateAceKey();
    const wrappedKey = wrapKey(aceKey, env.ACE_STREAM_SIGNING_SECRET);
    const acePath = getAcePath(createdPackage.aceFileKey);

    await encryptFile(cachedPath, acePath, aceKey);

    const readyPackage = await prisma.offlinePackage.update({
      where: { id: createdPackage.id },
      data: {
        wrappedKey,
        status: 'READY'
      }
    });

    return NextResponse.json({
      ok: true,
      package: {
        id: readyPackage.id,
        aceFileKey: readyPackage.aceFileKey,
        status: readyPackage.status
      }
    });
  } catch {
    await prisma.offlinePackage.update({
      where: { id: createdPackage.id },
      data: { status: 'REVOKED' }
    }).catch(() => null);

    return NextResponse.json({ error: 'Offline package could not be prepared right now.' }, { status: 500 });
  }
}
