import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import VideoCard from '@/components/VideoCard';
import { prisma } from '@/lib/db';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalPrice } from '@/lib/pricing';

type HomeVideo = {
  id: string;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  posterKey: string | null;
  videoType: string;
  ageRating: string;
  category: string;
};

const demoSlides: HomeVideo[] = [
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
  },
  {
    id: 'demo-4',
    title: 'Red Sand Protocol',
    description: '',
    priceTier: 'PREMIERE',
    posterKey: '/demo/red-sand.svg',
    videoType: 'SERIES',
    ageRating: 'PG18',
    category: 'Sci-Fi'
  }
];

export default async function HomePage() {
  let videos: HomeVideo[] = [];

  try {
    videos = await prisma.video.findMany({
      where: { status: 'APPROVED' },
      take: 8,
      orderBy: { createdAt: 'desc' }
    });
  } catch {
    videos = [];
  }

  const requestHeaders = headers();
  const featured = videos.length ? videos : demoSlides;

  return (
    <div>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container hero">
          <div className="hero-card">
            <div className="pill">ACE ORIGINALS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '22px 0 18px' }}>
              <Image src="/ace-studio-mark.svg" alt="Ace Studio" width={88} height={88} priority />
              <h1 className="hero-title">Ace Studio</h1>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/browse">Browse</Link>
              <Link className="btn btn-ghost" href="/tv">TV Mode</Link>
              <Link className="btn btn-ghost" href="/studio">Studio</Link>
            </div>
          </div>
          <div className="hero-carousel">
            {demoSlides.map((slide) => (
              <div key={slide.id} className="hero-slide" style={{ backgroundImage: `url(${slide.posterKey})` }}>
                <span>{slide.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="section-title">Now Streaming</h2>
          <div className="video-grid">
            {featured.map((video) => (
              <VideoCard
                key={video.id}
                video={{ ...video, price: getRegionalPrice(requestHeaders, video.priceTier) }}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
