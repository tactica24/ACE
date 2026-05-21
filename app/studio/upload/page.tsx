import { DashboardShell, SideNav } from '@/components/DashboardShell';
import StudioContractReview from '@/components/StudioContractReview';
import UploadForm from '@/components/UploadForm';
import { requireCreatorUser } from '@/lib/auth-page';
import { getStoredSignatureDataUrl } from '@/lib/contract-signatures';
import { prisma } from '@/lib/db';
import { getSiteSettings } from '@/lib/site-settings';
import { getStudioNavItems } from '@/lib/studio-nav';

export default async function UploadPage({
  searchParams
}: {
  searchParams?: { contractVideoId?: string | string[]; seriesId?: string | string[] };
}) {
  const user = await requireCreatorUser('/studio/upload');
  const contractVideoId = typeof searchParams?.contractVideoId === 'string'
    ? searchParams.contractVideoId.trim()
    : undefined;
  const initialSeriesId = typeof searchParams?.seriesId === 'string'
    ? searchParams.seriesId.trim()
    : undefined;
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: user.sub }
  });
  const existingSeries = await prisma.video.findMany({
    where: {
      creatorId: user.sub,
      videoType: 'SERIES',
      seriesId: null
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { episodes: true }
      }
    }
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
      title={contractVideo ? 'Review your contract' : 'Upload a new release'}
      description={
        contractVideo
          ? 'Read the agreement for this upload, sign it with your uploaded signature, and download the stored PDF document.'
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
          <UploadForm
            initialSeriesId={initialSeriesId}
            seriesOptions={existingSeries.map((series) => ({
              id: series.id,
              title: series.title,
              status: series.status,
              priceTier: series.priceTier,
              rightsTier: series.rightsTier,
              category: series.category,
              ageRating: series.ageRating,
              originalLanguage: series.originalLanguage,
              audioLanguages: series.audioLanguages,
              releaseYear: series.releaseYear,
              episodeCount: series._count.episodes
            }))}
          />
        )}
      </div>
    </DashboardShell>
  );
}
