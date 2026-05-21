import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { createCreatorAccessLinkToken, createCreatorAccessLinkUrl } from '@/lib/creator-access-links';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const creatorId = searchParams.get('creatorId')?.trim();

  if (!creatorId) {
    return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
  }

  try {
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: creatorId },
      select: {
        id: true,
        displayName: true,
        creatorNumber: true,
        uploadAccessToken: true,
        uploadAccessTokenExpiresAt: true
      }
    });

    if (!creatorProfile) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    let uploadAccessToken = creatorProfile.uploadAccessToken;
    if (creatorProfile.creatorNumber && (!uploadAccessToken || creatorProfile.uploadAccessTokenExpiresAt)) {
      uploadAccessToken = createCreatorAccessLinkToken({ creatorUserId: creatorId, scope: 'upload' });
      await prisma.creatorProfile.update({
        where: { userId: creatorId },
        data: {
          uploadAccessToken,
          uploadAccessTokenExpiresAt: null
        }
      });
    }

    return NextResponse.json({
       creatorId,
       displayName: creatorProfile.displayName,
       creatorNumber: creatorProfile.creatorNumber,
       links: {
          upload: uploadAccessToken
            ? {
                token: uploadAccessToken,
                expiresAt: null,
                url: createCreatorAccessLinkUrl({ creatorNumber: creatorProfile.creatorNumber!, scope: 'upload' })
              }
            : null,
          report: creatorProfile.creatorNumber
            ? {
                token: '',
                expiresAt: null,
                url: createCreatorAccessLinkUrl({ creatorNumber: creatorProfile.creatorNumber, scope: 'report' })
              }
            : null,
          shortUpload: creatorProfile.creatorNumber
            ? {
                token: '',
                expiresAt: null,
                url: createCreatorAccessLinkUrl({ creatorNumber: creatorProfile.creatorNumber, scope: 'short-upload' })
              }
            : null
       }
     });
  } catch (error) {
    console.error('Error fetching creator access links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator access links' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const rawCreatorId = body?.creatorId ?? body?.creatorUserId;
    const creatorId = typeof rawCreatorId === 'string' ? rawCreatorId.trim() : '';
    const { scope } = body ?? {};

    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }

    const validScopes = ['upload', 'report', 'short-upload'] as const;
    if (!scope || !validScopes.includes(scope)) {
      return NextResponse.json({ error: 'Valid scope (upload, report or short-upload) is required' }, { status: 400 });
    }

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: creatorId },
      select: {
        creatorNumber: true,
        uploadAccessToken: true,
        uploadAccessTokenExpiresAt: true
      }
    });

    if (!creatorProfile) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    if (!creatorProfile.creatorNumber) {
      return NextResponse.json({ error: 'Generate the producer ID before creating access links.' }, { status: 400 });
    }

    let token = creatorProfile.uploadAccessToken ?? null;
    if (scope === 'upload') {
      if (!token || creatorProfile.uploadAccessTokenExpiresAt) {
        token = createCreatorAccessLinkToken({
          creatorUserId: creatorId,
          scope
        });

        await prisma.creatorProfile.update({
          where: { userId: creatorId },
          data: {
            uploadAccessToken: token,
            uploadAccessTokenExpiresAt: null
          }
        });
      }
    }

    const url = createCreatorAccessLinkUrl({ creatorNumber: creatorProfile.creatorNumber, scope });

    return NextResponse.json({
      success: true,
      scope,
      token,
      expiresAt: null,
      url
    });
  } catch (error) {
    console.error('Error creating creator access link:', error);
    return NextResponse.json(
      { error: 'Failed to create access link' },
      { status: 500 }
    );
  }
}
