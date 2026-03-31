import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { buildContractDocument, createContractDownloadFileName, type RightsTierValue } from '@/lib/contracts';
import { prisma } from '@/lib/db';

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

  const fallbackDocument = buildContractDocument({
    effectiveDate: contract.effectiveDate ?? contract.createdAt,
    producerDisplayName: contract.producerLegalName ?? contract.creator.displayName ?? contract.creator.user.name ?? contract.creator.user.email,
    producerNumber: contract.creator.creatorNumber,
    producerSignedName: contract.producerSignedName,
    producerSignedDate: contract.producerSignedAt ?? contract.effectiveDate,
    videoTitle: contract.video.title,
    rightsTier: contract.video.rightsTier as RightsTierValue,
    payoutSplit: contract.rightsTier === 'EXCLUSIVE' ? contract.creator.payoutSplitExclusive : contract.creator.payoutSplitStandard
  });

  const documentHtml = contract.documentHtml ?? fallbackDocument.html;
  const fileName = createContractDownloadFileName(contract.video.title, contract.creator.creatorNumber);

  return new NextResponse(documentHtml, {
    headers: {
      'Content-Type': 'application/msword; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
