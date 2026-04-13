import LaunchPage from '@/components/LaunchPage';
import BrowseCatalog from '@/components/BrowseCatalog';
import PublicPageAutoRedirect from '@/components/PublicPageAutoRedirect';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { getFinanceConfig } from '@/lib/finance';
import { type PriceTierValue } from '@/lib/media-types';
import { getSiteSettings } from '@/lib/site-settings';
import { getUnlockAmountNairaForVideo } from '@/lib/video-pricing';

export const revalidate = 300;

type BrowseVideo = {
  id: string;
  seriesId?: string | null;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  posterKey: string | null;
  genres: string[];
  videoType: string;
  ageRating: string;
  category: string;
  episodeCount?: number | null;
};

export default async function BrowsePage() {
  const siteSettings = await getSiteSettings();

  if (siteSettings.homePageMode === 'LAUNCH') {
    return (
      <LaunchPage
        title={siteSettings.launchTitle}
        message={siteSettings.launchMessage}
        countdownAt={siteSettings.launchCountdownAt?.toISOString() ?? null}
        ctaLabel={siteSettings.launchCtaLabel}
        ctaHref={siteSettings.launchCtaHref}
      />
    );
  }

  let videos: BrowseVideo[] = [];
  try {
    videos = await getApprovedCatalogVideos();
  } catch {
    videos = [];
  }

  const pricingConfig = await getFinanceConfig();

  return (
    <div className="section">
      <PublicPageAutoRedirect allowedPath="/browse" />
      <div className="container">
        <div className="section-heading">
          <div>
            <h1 className="hero-title" style={{ fontSize: '2.45rem', marginBottom: 8 }}>Browse</h1>
          </div>
          <div className="pill">Live catalog</div>
        </div>

        {videos.length ? (
          <BrowseCatalog
            videos={videos.map((video) => ({
              ...video,
              price: {
                currency: 'NGN',
                amountNaira: getUnlockAmountNairaForVideo(video, pricingConfig),
                amountMinor: getUnlockAmountNairaForVideo(video, pricingConfig) * 100
              }
            }))}
          />
        ) : (
          <div className="card empty-state">
            <h3>No approved titles are available yet</h3>
            <p className="muted">New releases will appear here as soon as they are available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
