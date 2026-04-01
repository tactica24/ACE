import { DashboardShell, SideNav } from '@/components/DashboardShell';
import StudioContractReview from '@/components/StudioContractReview';
import UploadForm from '@/components/UploadForm';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getStudioNavItems } from '@/lib/studio-nav';

export default async function UploadPage({
  searchParams
}: {
  searchParams?: { contractVideoId?: string | string[] };
}) {
  const user = await requireCreatorUser('/studio/upload');
  const contractVideoId = typeof searchParams?.contractVideoId === 'string'
    ? searchParams.contractVideoId.trim()
    : undefined;
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: user.sub }
  });

  const contractVideo = contractVideoId
    ? await prisma.video.findFirst({
        where: {
          id: contractVideoId,
          creatorId: user.sub
        }
      })
    : null;

  const existingContract = contractVideo && creatorProfile
    ? await prisma.contract.findFirst({
        where: {
          creatorId: creatorProfile.id,
          videoId: contractVideo.id
        },
        orderBy: { createdAt: 'desc' }
      })
    : null;

  const payoutSplit = contractVideo?.rightsTier === 'EXCLUSIVE'
    ? creatorProfile?.payoutSplitExclusive ?? 0.6
    : creatorProfile?.payoutSplitStandard ?? 0.6;

  return (
    <DashboardShell
      title={contractVideo ? 'Review your contract' : 'Upload a new release'}
      description={
        contractVideo
          ? 'Read the agreement for this upload, sign it, and download the stored producer document.'
          : 'Enter the same title, artwork, pricing, and runtime details that will appear in review and on the storefront.'
      }
      sideNav={
        <SideNav
          active="/studio/upload"
          items={getStudioNavItems()}
        />
      }
    >
      <div className="card">
        {contractVideo ? (
          <StudioContractReview
            videoId={contractVideo.id}
            videoTitle={contractVideo.title}
            rightsTier={contractVideo.rightsTier}
            payoutSplit={payoutSplit}
            producerName={user.name ?? creatorProfile?.displayName ?? user.email}
            producerNumber={creatorProfile?.creatorNumber}
            initialContract={
              existingContract
                ? {
                    id: existingContract.id,
                    producerAccepted: existingContract.producerAccepted,
                    producerSignedName: existingContract.producerSignedName,
                    effectiveDate: existingContract.effectiveDate?.toISOString() ?? null,
                    producerSignedAt: existingContract.producerSignedAt?.toISOString() ?? null,
                    documentHtml: existingContract.documentHtml
                  }
                : null
            }
          />
        ) : (
          <UploadForm />
        )}
      </div>
    </DashboardShell>
  );
}
