import VideoCard from '@/components/VideoCard';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalPrice } from '@/lib/pricing';

export default async function BrowsePage() {
  let videos = [] as {
    id: string;
    title: string;
    description: string;
    priceTier: PriceTierValue;
    posterKey: string | null;
    videoType: string;
    ageRating: string;
    category: string;
  }[];
  try {
    videos = await prisma.video.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' }
    });
  } catch {
    videos = [];
  }

  const requestHeaders = headers();

  return (
    <div className="section">
      <div className="container">
        <div className="hero" style={{ marginBottom: 24 }}>
          <div>
            <div className="pill">Ace Studio Marketplace</div>
            <h1 className="hero-title" style={{ marginTop: 12 }}>Browse Africa-first cinema</h1>
            <p className="muted">Pay per title, stream instantly, share offline with secure unlocks.</p>
          </div>
          <div className="card card-soft">
            <div className="stat">
              <span className="muted">Pricing Tiers</span>
              <strong>NGN 100 · NGN 200 · NGN 500</strong>
              <span className="muted">Snack, Standard, Premiere</span>
            </div>
          </div>
        </div>

        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={{ ...video, price: getRegionalPrice(requestHeaders, video.priceTier) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
