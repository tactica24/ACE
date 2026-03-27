import LaunchPage from '@/components/LaunchPage';
import BrowseCatalog from '@/components/BrowseCatalog';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { getFinanceConfig } from '@/lib/finance';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalPriceFromConfig } from '@/lib/pricing';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

type BrowseVideo = {
  id: string;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  posterKey: string | null;
  genres: string[];
  videoType: string;
  ageRating: string;
  category: string;
};

export default async function BrowsePage() {
  const user = await getCurrentUser();
  const siteSettings = await getSiteSettings();
  if (user) {
    const primaryAppPath = getPrimaryAppPath(user);
    if (primaryAppPath !== '/browse') {
      redirect(primaryAppPath);
    }
  }

  if (siteSettings.homePageMode === 'LAUNCH' && (!user || user.role === 'USER')) {
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

  const requestHeaders = headers();
  const pricingConfig = await getFinanceConfig();

  return (
    <div className="section">
      <div className="container">
        <div className="section-heading">
          <div>
            <h1 className="hero-title" style={{ fontSize: '2.45rem', marginBottom: 8 }}>Browse</h1>
            <p className="muted" style={{ maxWidth: '52ch', marginTop: 0 }}>
              Search, filter, and move through the catalog with a cleaner cinema-style layout built for fast discovery.
            </p>
          </div>
          <div className="pill">Live catalog</div>
        </div>

        {videos.length ? (
          <BrowseCatalog
            videos={videos.map((video) => ({
              ...video,
              price: getRegionalPriceFromConfig(requestHeaders, video.priceTier, pricingConfig)
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
