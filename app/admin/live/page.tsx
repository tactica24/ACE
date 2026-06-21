import Link from 'next/link';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function ownerName(creator: { email: string; creator: { displayName: string | null } | null }) {
  return creator.creator?.displayName ?? creator.email;
}

export default async function AdminLiveMoviesPage() {
  await requireAdminUser('/admin/live');
  const liveVideos = await prisma.video.findMany({
    where: {
      seriesId: null,
      OR: [
        { status: { in: ['READY', 'PUBLISHED'] } },
        { technicalMetadata: { processingStatus: 'READY_TO_STREAM' } }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      videoType: true,
      releaseYear: true,
      updatedAt: true,
      technicalMetadata: {
        select: { masterKey: true, masterSourceUrl: true, processingStatus: true, playbackUrl: true, hlsManifestKey: true, hlsReadyAt: true }
      },
      creator: { select: { email: true, creator: { select: { displayName: true } } } }
    }
  });
  const published = liveVideos.filter((video) => video.status === 'PUBLISHED').length;
  const playbackReady = liveVideos.filter((video) => video.technicalMetadata?.processingStatus === 'READY_TO_STREAM' || video.technicalMetadata?.hlsReadyAt).length;

  return <DashboardShell
    title="Live movies"
    eyebrow="Streaming catalogue"
    description="Published and playback-ready movies currently available on ACE."
    sideNav={<SideNav active="/admin/live" items={getAdminNavItems()} />}
  >
    <div className="detail-grid" style={{ marginBottom: 20 }}>
      <div className="detail-card"><span className="detail-label">Total live titles</span><strong>{liveVideos.length}</strong></div>
      <div className="detail-card"><span className="detail-label">Published</span><strong>{published}</strong></div>
      <div className="detail-card"><span className="detail-label">Playback ready</span><strong>{playbackReady}</strong></div>
      <div className="detail-card"><span className="detail-label">Latest update</span><strong>{liveVideos[0]?.updatedAt.toLocaleDateString() ?? 'N/A'}</strong></div>
    </div>

    {liveVideos.length ? <div className="live-admin-list">
      {liveVideos.map((video) => {
        const ready = video.technicalMetadata?.processingStatus === 'READY_TO_STREAM' || Boolean(video.technicalMetadata?.hlsReadyAt);
        const source = video.technicalMetadata?.masterSourceUrl ? 'Imported source' : video.technicalMetadata?.masterKey ? 'Bunny Storage' : 'Unknown source';
        return <article className="live-admin-row" key={video.id}>
          <div className={`live-status-dot ${video.status === 'PUBLISHED' ? 'live' : 'upcoming'}`} />
          <div className="live-admin-match-copy">
            <div className="live-admin-badges"><span>{video.status}</span><span>{ready ? 'Playback ready' : 'Processing'}</span><span>{source}</span></div>
            <h3>{video.title}</h3>
            <p>{ownerName(video.creator)} · {[video.category, video.videoType, video.releaseYear].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="live-admin-chat-count"><strong>{video.technicalMetadata?.playbackUrl ? 'Ready' : 'Pending'}</strong><span>player</span></div>
          <div className="live-admin-actions"><Link className="btn btn-ghost btn-compact" href={`/v/${video.id}`} target="_blank">View movie</Link></div>
        </article>;
      })}
    </div> : <div className="live-empty-admin"><h3>No live movies yet</h3><p>Publish movies from the upload and moderation workflow to see them here.</p></div>}
  </DashboardShell>;
}
