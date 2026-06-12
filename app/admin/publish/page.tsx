import { DashboardShell, SideNav } from '@/components/DashboardShell';
import PublishQueuePanel from '@/components/PublishQueuePanel';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { hasReadyMoviePlayback } from '@/lib/movie-assets';

export const dynamic = 'force-dynamic';

export default async function AdminPublishPage() {
  await requireAdminUser('/admin/publish');

  const videos = await prisma.video.findMany({
    where: {
      seriesId: null,
      status: { not: 'PUBLISHED' }
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      category: true,
      videoType: true,
      updatedAt: true,
      posterKey: true,
      creator: {
        select: {
          email: true,
          creator: {
            select: { displayName: true }
          }
        }
      },
      technicalMetadata: {
        select: {
          processingStatus: true,
          bunnyStreamReadyAt: true,
          bunnyStreamError: true,
          playbackUrl: true,
          bunnyStreamVideoId: true,
          hlsManifestKey: true,
          hlsReadyAt: true,
          masterKey: true,
          masterSourceUrl: true
        }
      },
      primaryStorageKey: true,
      fallbackStorageKey: true
    }
  });

  const publishItems = videos.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    status: video.status,
    category: video.category,
    videoType: video.videoType,
    creatorName: video.creator.creator?.displayName ?? video.creator.email,
    updatedAt: video.updatedAt.toISOString(),
    processingStatus: video.technicalMetadata?.processingStatus ?? null,
    bunnyStreamReadyAt: video.technicalMetadata?.bunnyStreamReadyAt?.toISOString() ?? null,
    bunnyStreamError: video.technicalMetadata?.bunnyStreamError ?? null,
    playbackUrl: video.technicalMetadata?.playbackUrl ?? null,
    posterKey: video.posterKey ?? null,
    playbackReady: hasReadyMoviePlayback(video)
  }));

  const readyCount = publishItems.filter((item) => item.playbackReady).length;
  const needsFixCount = publishItems.length - readyCount;

  return (
    <DashboardShell
      title="Publish queue"
      description="This is the only place where titles move from internal prep into the live viewer catalog."
      sideNav={<SideNav active="/admin/publish" items={getAdminNavItems({ pendingPublish: readyCount })} />}
      actions={
        <div className="action-list">
          <a className="btn btn-primary" href="/admin/moderation">Edit titles</a>
          <a className="btn btn-ghost" href="/admin/live">Live titles</a>
          <a className="btn btn-ghost" href="/admin/videos">Pipeline monitor</a>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Unpublished titles</span>
          <strong>{publishItems.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Ready now</span>
          <strong>{readyCount}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Need fixes</span>
          <strong>{needsFixCount}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Outcome</span>
          <strong>Publish means live for viewers</strong>
        </div>
      </div>
      <PublishQueuePanel initial={publishItems} />
    </DashboardShell>
  );
}
