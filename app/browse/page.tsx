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

const fallbackVideos: BrowseVideo[] = [
  {
    id: 'demo-1',
    title: 'Midnight in Lagos',
    description: '',
    priceTier: 'PREMIERE',
    posterKey: '/demo/midnight-lagos.svg',
    videoType: 'FEATURE',
    ageRating: 'PG16',
    category: 'Thriller'
  },
  {
    id: 'demo-2',
    title: 'Sahara Run',
    description: '',
    priceTier: 'STANDARD',
    posterKey: '/demo/sahara-run.svg',
    videoType: 'FEATURE',
    ageRating: 'PG13',
    category: 'Action'
  },
  {
    id: 'demo-3',
    title: 'City of Rhythms',
    description: '',
    priceTier: 'STANDARD',
    posterKey: '/demo/city-rhythms.svg',
    videoType: 'DOCUMENTARY',
    ageRating: 'ALL',
    category: 'Music'
  }
];

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
  const catalog = videos.length ? videos : fallbackVideos;

  return (
    <div className="section">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 className="hero-title" style={{ fontSize: '2.2rem' }}>Browse</h1>
          <div className="pill">Live Catalog</div>
        </div>

        <div className="video-grid">
          {catalog.map((video) => (
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
