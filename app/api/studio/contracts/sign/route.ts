import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { buildContractDocument, type RightsTierValue } from '@/lib/contracts';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    videoId,
    producerSignedName,
    effectiveDate,
    agreed
  } = body as {
    videoId?: string;
    producerSignedName?: string;
    effectiveDate?: string;
    agreed?: boolean;
  };

  const safeVideoId = videoId?.trim();
  const safeSignedName = producerSignedName?.trim();
  const safeEffectiveDate = effectiveDate?.trim();

  if (!safeVideoId || !safeSignedName || !safeEffectiveDate || !agreed) {
    return NextResponse.json({ error: 'Video, signature name, agreement date, and acceptance are required.' }, { status: 400 });
  }

  const signedDate = new Date(safeEffectiveDate);
  if (Number.isNaN(signedDate.getTime())) {
    return NextResponse.json({ error: 'Enter a valid agreement date.' }, { status: 400 });
  }

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: auth.sub }
  });
  if (!creatorProfile) {
    return NextResponse.json({ error: 'Producer profile not found.' }, { status: 404 });
  }

  const video = await prisma.video.findFirst({
    where: {
      id: safeVideoId,
      creatorId: auth.sub
    }
  });
  if (!video) {
    return NextResponse.json({ error: 'Uploaded title not found for this producer.' }, { status: 404 });
  }

  const payoutSplit = video.rightsTier === 'EXCLUSIVE'
    ? creatorProfile.payoutSplitExclusive
    : creatorProfile.payoutSplitStandard;

  const document = buildContractDocument({
    effectiveDate: signedDate,
    producerDisplayName: safeSignedName,
    producerNumber: creatorProfile.creatorNumber,
    producerSignedName: safeSignedName,
    producerSignedDate: signedDate,
    videoTitle: video.title,
    rightsTier: video.rightsTier as RightsTierValue,
    payoutSplit
  });

  const existingContract = await prisma.contract.findFirst({
    where: {
      creatorId: creatorProfile.id,
      videoId: video.id
    },
    orderBy: { createdAt: 'desc' }
  });

  const contract = existingContract
    ? await prisma.contract.update({
        where: { id: existingContract.id },
        data: {
          rightsTier: video.rightsTier,
          contractText: document.plainText,
          documentHtml: document.html,
          producerLegalName: safeSignedName,
          producerSignedName: safeSignedName,
          producerAccepted: true,
          effectiveDate: signedDate,
          producerSignedAt: new Date()
        }
      })
    : await prisma.contract.create({
        data: {
          creatorId: creatorProfile.id,
          videoId: video.id,
          rightsTier: video.rightsTier,
          contractText: document.plainText,
          documentHtml: document.html,
          producerLegalName: safeSignedName,
          producerSignedName: safeSignedName,
          producerAccepted: true,
          effectiveDate: signedDate,
          producerSignedAt: new Date()
        }
      });

  return NextResponse.json({
    ok: true,
    contractId: contract.id,
    producerSignedAt: contract.producerSignedAt?.toISOString() ?? null,
    documentHtml: contract.documentHtml
  });
}
