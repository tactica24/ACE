import BrowseCatalog from '@/components/BrowseCatalog';
import { headers } from 'next/headers';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalPrice } from '@/lib/pricing';

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
  let videos: BrowseVideo[] = [];
  try {
    videos = await getApprovedCatalogVideos();
  } catch {
    videos = [];
  }

  const requestHeaders = headers();

  return (
    <div className="section">
      <div className="container">
        <div className="section-heading">
          <div>
            <h1 className="hero-title" style={{ fontSize: '2.2rem' }}>Browse</h1>
            <p className="muted">Every approved title is listed here with the same artwork, pricing, and metadata used across the app.</p>
          </div>
          <div className="pill">Live catalog</div>
        </div>

        {videos.length ? (
          <BrowseCatalog
            videos={videos.map((video) => ({
              ...video,
              price: getRegionalPrice(requestHeaders, video.priceTier)
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
