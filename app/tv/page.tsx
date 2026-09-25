import TvPairingPanel from '@/components/TvPairingPanel';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { onlyCatalogVideosWithPosters } from '@/lib/catalog-posters';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSiteSettings } from '@/lib/site-settings';
import { getRegionalPriceForVideo } from '@/lib/video-pricing';
import { getViewerReadyCatalogWhere } from '@/lib/video-visibility';

export const dynamic = 'force-dynamic';

export default async function TvPage() {
  const user = await getCurrentUser();
  const siteSettings = await getSiteSettings();
  if (user) {
    const primaryAppPath = getPrimaryAppPath(user);
    if (primaryAppPath !== '/browse') {
      redirect(primaryAppPath);
    }
  }

  if (siteSettings.homePageMode === 'LAUNCH' && !user) {
    redirect('/');
  }

let videos: Awaited<ReturnType<typeof prisma.video.findMany>> = [];
  try {
    const catalogVideos = await prisma.video.findMany({
      where: getViewerReadyCatalogWhere(),
      include: {
        series: {
          select: {
            posterKey: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    videos = catalogVideos.map((video) => ({
      ...video,
      posterKey: video.posterKey ?? video.series?.posterKey ?? null
    }));
  } catch {
    videos = [];
  }

  const requestHeaders = await headers();
  const pricingConfig = await getFinanceConfig();

  return (
    <div className="section">
      <div className="container">
        <div className="tv-layout">
          <div className="hero-card">
            <div className="pill">Ace Studio TV</div>
            <h1 className="hero-title" style={{ marginTop: 14 }}>Watch ACE Studio on a larger screen</h1>
            <p className="hero-sub">The TV surface uses the same catalog and account access system, with a pairing flow that lets any signed-in device authorize the TV screen.</p>
            <div className="detail-grid" style={{ marginTop: 22 }}>
              <div className="detail-card">
                <span className="detail-label">Titles on screen</span>
                <strong>{videos.length}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Layout</span>
                <strong>Poster-first</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Pairing</span>
                <strong>Code-based sign-in</strong>
              </div>
            </div>
          </div>

          <TvPairingPanel />
        </div>

        {videos.length ? (
          <div className="video-grid tv-grid">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={{ ...video, price: getRegionalPriceForVideo(requestHeaders, video, pricingConfig) }}
              />
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <h3>No approved titles are ready for TV yet</h3>
            <p className="muted">Approved titles will appear here automatically once they are available for viewers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
