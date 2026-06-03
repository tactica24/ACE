import { DashboardShell, SideNav } from '@/components/DashboardShell';
import DropboxMovieIntakeForm from '@/components/DropboxMovieIntakeForm';
import StudioContractReview from '@/components/StudioContractReview';
import { requireCreatorUser } from '@/lib/auth-page';
import { getStoredSignatureDataUrl } from '@/lib/contract-signatures';
import { prisma } from '@/lib/db';
import { getSiteSettings } from '@/lib/site-settings';
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
  const siteSettings = await getSiteSettings();

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
  const [platformSignaturePreviewUrl, producerSignaturePreviewUrl] = await Promise.all([
    getStoredSignatureDataUrl(existingContract?.platformSignatureKey ?? siteSettings.platformSignatureKey),
    getStoredSignatureDataUrl(existingContract?.producerSignatureKey)
  ]);

  const payoutSplit = contractVideo?.rightsTier === 'EXCLUSIVE'
    ? creatorProfile?.payoutSplitExclusive ?? 0.6
    : creatorProfile?.payoutSplitStandard ?? 0.6;

  return (
    <DashboardShell
      title={contractVideo ? 'Review your contract' : 'Create a new title'}
      description={
        contractVideo
          ? 'Read the agreement for this title, sign it with your uploaded signature, and download the stored PDF document.'
          : 'Create the movie record with metadata and a Dropbox master source link. Poster and trailer can be attached later during review.'
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
            platformSignaturePreviewUrl={platformSignaturePreviewUrl}
            initialContract={
              existingContract
                ? {
                    id: existingContract.id,
                    producerAccepted: existingContract.producerAccepted,
                    producerSignedName: existingContract.producerSignedName,
                    producerSignatureKey: existingContract.producerSignatureKey,
                    producerSignaturePreviewUrl,
                    effectiveDate: existingContract.effectiveDate?.toISOString() ?? null,
                    producerSignedAt: existingContract.producerSignedAt?.toISOString() ?? null
                  }
                : null
            }
          />
        ) : (
          <DropboxMovieIntakeForm />
        )}
      </div>
    </DashboardShell>
  );
}
