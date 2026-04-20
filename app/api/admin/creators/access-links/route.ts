import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { createCreatorAccessLinkToken } from '@/lib/creator-access-links';
import { prisma } from '@/lib/db';

function normalizeOrigin(req: NextRequest) {
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const creatorUserId = typeof body.creatorUserId === 'string' ? body.creatorUserId.trim() : '';
  if (!creatorUserId) {
    return NextResponse.json({ error: 'Creator account is required.' }, { status: 400 });
  }

  const creatorUser = await prisma.user.findFirst({
    where: {
      id: creatorUserId,
      OR: [
        { role: 'CREATOR' },
        { signupIntent: 'CREATOR' },
        { creator: { isNot: null } }
      ]
    },
    select: {
      id: true,
      email: true,
      name: true,
      creator: {
        select: {
          displayName: true,
          creatorNumber: true
        }
      }
    }
  });

  if (!creatorUser) {
    return NextResponse.json({ error: 'Creator account was not found.' }, { status: 404 });
  }

  const uploadToken = createCreatorAccessLinkToken({
    creatorUserId,
    scope: 'upload'
  });
  const reportToken = createCreatorAccessLinkToken({
    creatorUserId,
    scope: 'report'
  });

  const uploadPath = `/creator-link/upload?token=${encodeURIComponent(uploadToken)}`;
  const reportPath = `/creator-link/report?token=${encodeURIComponent(reportToken)}`;
  const origin = normalizeOrigin(req);

  return NextResponse.json({
    ok: true,
    creator: {
      id: creatorUser.id,
      email: creatorUser.email,
      displayName: creatorUser.creator?.displayName ?? creatorUser.name ?? creatorUser.email,
      creatorNumber: creatorUser.creator?.creatorNumber ?? null
    },
    links: {
      uploadPath,
      reportPath,
      uploadUrl: `${origin}${uploadPath}`,
      reportUrl: `${origin}${reportPath}`
    }
  });
}

