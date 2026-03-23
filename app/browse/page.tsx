import VideoCard from '@/components/VideoCard';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalPrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

type BrowseVideo = {
  id: string;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  posterKey: string | null;
  videoType: string;
  ageRating: string;
  category: string;
};

export default async function BrowsePage() {
  let videos: BrowseVideo[] = [];
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
        <div className="section-heading">
          <div>
            <h1 className="hero-title" style={{ fontSize: '2.2rem' }}>Browse</h1>
            <p className="muted">Every approved title is listed here with the same artwork, pricing, and metadata used across the app.</p>
          </div>
          <div className="pill">Live catalog</div>
        </div>

        {videos.length ? (
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={{ ...video, price: getRegionalPrice(requestHeaders, video.priceTier) }}
              />
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <h3>No approved titles are available yet</h3>
            <p className="muted">Approve a creator submission in admin moderation and it will appear here immediately.</p>
          </div>
        )}
      </div>
    </div>
  );
}
