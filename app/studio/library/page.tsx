import Link from 'next/link';
import { headers } from 'next/headers';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import VideoCard from '@/components/VideoCard';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { getStudioNavItems } from '@/lib/studio-nav';
import { getRegionalPriceForVideo } from '@/lib/video-pricing';
import {
  getDeliveryFormatLabel,
  getSubtitlePackageStatus,
  getViewerPackageLabel,
  getViewerPackageStatus
} from '@/lib/delivery-package';

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
      technicalMetadata: {
        select: {
          deliveryFormat: true,
          englishSubtitlesProvided: true,
          masterKey: true
        }
      },
      episodes: {
        select: {
          status: true,
          r2Key: true,
          fallbackR2Key: true,
          technicalMetadata: {
            select: {
              masterKey: true
            }
          }
        }
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
              {(() => {
                const readyEpisodeCount = video.episodes.filter(
                  (episode) => episode.status === 'APPROVED' && Boolean(episode.r2Key || episode.fallbackR2Key || episode.technicalMetadata?.masterKey)
                ).length;

                return (
                  <>
                    {video.technicalMetadata?.masterKey ? (
                      <div className="badge badge-info" style={{ marginBottom: 8 }}>
                        MP4 master uploaded for playback validation
                      </div>
                    ) : null}
                    <VideoCard video={{ ...video, price: getRegionalPriceForVideo(requestHeaders, video, pricingConfig) }} />
                    <div className="detail-grid">
                      <div className="detail-card">
                        <span className="detail-label">Status</span>
                        <strong>{video.status}</strong>
                      </div>
                      <div className="detail-card">
                        <span className="detail-label">Viewer package</span>
                        <strong>{getViewerPackageLabel(video)}</strong>
                      </div>
                      <div className="detail-card">
                        <span className="detail-label">Package status</span>
                        <strong>
                          {getViewerPackageStatus({
                            videoType: video.videoType,
                            seriesId: video.seriesId,
                            primaryReady: Boolean(video.r2Key),
                            fallbackReady: Boolean(video.fallbackR2Key),
                            masterReady: Boolean(video.technicalMetadata?.masterKey),
                            episodeCount: video._count.episodes,
                            readyEpisodeCount
                          })}
                        </strong>
                      </div>
                      <div className="detail-card">
                        <span className="detail-label">Delivery format</span>
                        <strong>{getDeliveryFormatLabel({ deliveryFormat: video.technicalMetadata?.deliveryFormat ?? null })}</strong>
                      </div>
                      <div className="detail-card">
                        <span className="detail-label">Subtitles</span>
                        <strong>
                          {getSubtitlePackageStatus({
                            subtitleTrackCount: video._count.subtitleTracks,
                            englishSubtitlesProvided: video.technicalMetadata?.englishSubtitlesProvided ?? false
                          })}
                        </strong>
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
                      {video.videoType === 'SERIES' ? (
                        <div className="detail-card">
                          <span className="detail-label">Episodes</span>
                          <strong>{video._count.episodes}</strong>
                        </div>
                      ) : null}
                    </div>
                  </>
                );
              })()}
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
