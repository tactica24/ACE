import Link from 'next/link';
import { headers } from 'next/headers';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import VideoCard from '@/components/VideoCard';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { getStudioNavItems } from '@/lib/studio-nav';
import { getRegionalPriceForVideo } from '@/lib/video-pricing';

export default async function LibraryPage() {
  const user = await requireCreatorUser('/studio/library');
  const videos = await prisma.video.findMany({
    where: { creatorId: user.sub, seriesId: null },
    orderBy: { createdAt: 'desc' },
    include: {
      contracts: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      _count: {
        select: { subtitleTracks: true, episodes: true }
      }
    }
  });
  const requestHeaders = headers();
  const pricingConfig = await getFinanceConfig();

  return (
    <DashboardShell
      title="Your library"
      description="Review exactly how each release is stored for moderation and storefront display."
      sideNav={
        <SideNav
          active="/studio/library"
          items={getStudioNavItems()}
        />
      }
      actions={<Link className="btn btn-primary" href="/studio/upload">Upload another title</Link>}
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Total titles</span>
          <strong>{videos.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Approved</span>
          <strong>{videos.filter((video) => video.status === 'APPROVED').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Pending or draft</span>
          <strong>{videos.filter((video) => video.status !== 'APPROVED').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Unsigned contracts</span>
          <strong>{videos.filter((video) => !video.contracts[0]?.producerAccepted).length}</strong>
        </div>
      </div>

      {videos.length ? (
        <div className="library-grid">
          {videos.map((video) => (
            <div key={video.id} className="card library-card">
              <VideoCard video={{ ...video, price: getRegionalPriceForVideo(requestHeaders, video, pricingConfig) }} />
              <div className="detail-grid">
                <div className="detail-card">
                  <span className="detail-label">Status</span>
                  <strong>{video.status}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Rights</span>
                  <strong>{video.rightsTier}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Uploaded</span>
                  <strong>{video.createdAt.toISOString().slice(0, 10)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Production year</span>
                  <strong>{video.releaseYear ?? 'Not set'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Category</span>
                  <strong>{video.category}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Age</span>
                  <strong>{video.ageRating}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Original language</span>
                  <strong>{video.originalLanguage ?? 'en'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Audio metadata</span>
                  <strong>{video.audioLanguages.length ? video.audioLanguages.join(', ') : 'Single track'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Advisories</span>
                  <strong>{video.contentWarnings.length ? video.contentWarnings.join(', ') : 'None'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Subtitles</span>
                  <strong>{video._count.subtitleTracks}</strong>
                </div>
                {video.videoType === 'SERIES' ? (
                  <div className="detail-card">
                    <span className="detail-label">Episodes</span>
                    <strong>{video._count.episodes}</strong>
                  </div>
                ) : null}
              </div>
              <div className="action-list">
                {video.videoType !== 'SERIES' ? (
                  <Link className="btn btn-ghost" href={`/studio/library/${video.id}`}>
                    Audience insights
                  </Link>
                ) : null}
                {video.videoType === 'SERIES' ? (
                  <Link className="btn btn-ghost" href={`/studio/upload?seriesId=${video.id}`}>
                    Add episodes
                  </Link>
                ) : null}
                {video.contracts[0]?.producerAccepted ? (
                  <a className="btn btn-ghost" href={`/api/studio/contracts/${video.contracts[0].id}/download`}>
                    Download document
                  </a>
                ) : (
                  <Link className="btn btn-primary" href={`/studio/upload?contractVideoId=${video.id}`}>
                    Review document
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h3>No producer uploads yet</h3>
          <p className="muted">Your releases will appear here after you submit them for moderation.</p>
        </div>
      )}
    </DashboardShell>
  );
}
