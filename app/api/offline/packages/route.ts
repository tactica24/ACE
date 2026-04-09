import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAcePath } from '@/lib/cache';
import { encryptFile, generateAceKey, wrapKey } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { ensureCached } from '@/lib/stream';

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

  const rateLimit = await consumeRateLimit({
    key: `offline-package:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 8,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many offline package requests right now. Please wait a moment and try again.' }, { status: 429 });
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

  const packageRecord = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`offline-package:${auth.sub}:${videoId}`}))`;
    const existingPackage = await tx.offlinePackage.findFirst({
      where: {
        ownerId: auth.sub,
        videoId,
        status: { in: ['PREPARING', 'READY'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingPackage) {
      return { package: existingPackage, created: false as const };
    }

    const createdPackage = await tx.offlinePackage.create({
      data: {
        ownerId: auth.sub,
        videoId,
        aceFileKey: `offline-${videoId}-${Date.now()}.ace`,
        wrappedKey: '',
        status: 'PREPARING'
      }
    });

    return { package: createdPackage, created: true as const };
  });

  if (!packageRecord.created) {
    return NextResponse.json({
      ok: true,
      package: {
        id: packageRecord.package.id,
        aceFileKey: packageRecord.package.aceFileKey,
        status: packageRecord.package.status
      }
    });
  }

  try {
    const cachedPath = await ensureCached(video.r2Key);
    const aceKey = generateAceKey();
    const wrappedKey = wrapKey(aceKey, env.ACE_STREAM_SIGNING_SECRET);
    const acePath = getAcePath(packageRecord.package.aceFileKey);

    await encryptFile(cachedPath, acePath, aceKey);

    const readyPackage = await prisma.offlinePackage.update({
      where: { id: packageRecord.package.id },
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
      where: { id: packageRecord.package.id },
      data: { status: 'REVOKED' }
    }).catch(() => null);

    return NextResponse.json({ error: 'Offline package could not be prepared right now.' }, { status: 500 });
  }
}
