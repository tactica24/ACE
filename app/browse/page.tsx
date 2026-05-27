import Link from 'next/link';
import LaunchPage from '@/components/LaunchPage';
import BrowseCatalog from '@/components/BrowseCatalog';
import PublicPageAutoRedirect from '@/components/PublicPageAutoRedirect';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { getFinanceConfig } from '@/lib/finance';
import { getMediaAssetUrl } from '@/lib/media';
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
  unlockPrice?: number | null;
  posterKey: string | null;
  genres: string[];
  videoType: string;
  ageRating: string;
  category: string;
  episodeCount?: number | null;
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function hasPosterAsset(video: BrowseVideo) {
  return Boolean(getMediaAssetUrl(video.posterKey));
}

export default async function BrowsePage({
  searchParams
}: {
  searchParams?: {
    q?: string | string[];
    category?: string | string[];
    type?: string | string[];
  };
}) {
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
    videos = (await getApprovedCatalogVideos()).filter(hasPosterAsset);
  } catch {
    videos = [];
  }

  const pricingConfig = await getFinanceConfig();

  return (
    <div className="section">
      <PublicPageAutoRedirect allowedPath="/browse" />
      <div className="container">
        <div className="section-heading browse-hero-header">
          <div>
            <span className="pill">Live catalog</span>
            <h1 className="hero-title" style={{ fontSize: '2.65rem', marginBottom: 8, marginTop: 14 }}>Browse</h1>
            <p className="muted" style={{ maxWidth: 720, marginBottom: 0 }}>
              Explore films and series by title, genre, category, and format.
            </p>
          </div>
          <Link className="btn btn-ghost" href="/">Back to home</Link>
        </div>

        {videos.length ? (
          <BrowseCatalog
            initialQuery={firstValue(searchParams?.q) ?? ''}
            initialCategory={firstValue(searchParams?.category) ?? 'All'}
            initialVideoType={firstValue(searchParams?.type) ?? 'All'}
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
