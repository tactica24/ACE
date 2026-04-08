import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getStoredSignatureAsset } from '@/lib/contract-signatures';
import { buildContractPdf } from '@/lib/contract-pdf';
import { createContractDownloadFileName, type RightsTierValue } from '@/lib/contracts';
import { prisma } from '@/lib/db';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      creator: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      },
      video: {
        select: {
          title: true,
          rightsTier: true
        }
      }
    }
  });

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  }

  if (auth.role !== 'ADMIN' && contract.creator.userId !== auth.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteSettings = await getSiteSettings();
  const [platformSignatureAsset, producerSignatureAsset] = await Promise.all([
    getStoredSignatureAsset(contract.platformSignatureKey ?? siteSettings.platformSignatureKey),
    getStoredSignatureAsset(contract.producerSignatureKey)
  ]);

  const fileName = createContractDownloadFileName(contract.video.title, contract.creator.creatorNumber);
  const pdf = buildContractPdf({
    effectiveDate: contract.effectiveDate ?? contract.createdAt,
    producerDisplayName: contract.producerLegalName ?? contract.creator.displayName ?? contract.creator.user.name ?? contract.creator.user.email,
    producerNumber: contract.creator.creatorNumber,
    producerSignedName: contract.producerSignedName,
    producerSignedDate: contract.producerSignedAt ?? contract.effectiveDate,
    platformSignatureImageUrl: platformSignatureAsset?.dataUrl ?? null,
    producerSignatureImageUrl: producerSignatureAsset?.dataUrl ?? null,
    videoTitle: contract.video.title,
    rightsTier: contract.video.rightsTier as RightsTierValue,
    payoutSplit: contract.rightsTier === 'EXCLUSIVE' ? contract.creator.payoutSplitExclusive : contract.creator.payoutSplitStandard,
    platformSignatureJpeg: platformSignatureAsset?.contentType === 'image/jpeg' ? platformSignatureAsset.buffer : null,
    producerSignatureJpeg: producerSignatureAsset?.contentType === 'image/jpeg' ? producerSignatureAsset.buffer : null
  });

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
