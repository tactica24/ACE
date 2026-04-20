import { notFound } from 'next/navigation';
import UploadForm from '@/components/UploadForm';
import { createCreatorAccessLinkToken, resolveCreatorFromAccessToken } from '@/lib/creator-access-links';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreatorUploadLinkPage({
  searchParams
}: {
  searchParams?: { token?: string | string[] };
}) {
  const token = firstValue(searchParams?.token)?.trim() ?? '';
  if (!token) {
    notFound();
  }

  const creator = await resolveCreatorFromAccessToken(token, 'upload');
  if (!creator) {
    notFound();
  }

  const reportToken = createCreatorAccessLinkToken({
    creatorUserId: creator.id,
    scope: 'report'
  });

  const existingSeries = await prisma.video.findMany({
    where: {
      creatorId: creator.id,
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

  return (
    <div className="section">
      <div className="container">
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ marginTop: 0 }}>Upload your title</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            Signed in as {creator.creator?.displayName ?? creator.name ?? creator.email}
            {creator.creator?.creatorNumber ? ` (${creator.creator.creatorNumber})` : ''}. Fill the form, upload files, and submit.
          </p>
        </div>

        <div className="card">
          <UploadForm
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
            uploadEndpoint={`/api/studio/upload-url?token=${encodeURIComponent(token)}`}
            submissionEndpoint={`/api/studio/video?token=${encodeURIComponent(token)}`}
            contractRedirectBasePath={null}
            successRedirectPath={`/creator-link/report?token=${encodeURIComponent(reportToken)}`}
          />
        </div>
      </div>
    </div>
  );
}

