import Link from 'next/link';
import { headers } from 'next/headers';
import VideoCard from '@/components/VideoCard';
import { prisma } from '@/lib/db';
import { getMediaAssetUrl } from '@/lib/media';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalPrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

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

type VideoRow = {
  title: string;
  items: HomeVideo[];
};

function buildRows(videos: HomeVideo[]) {
  const rows: VideoRow[] = [];

  if (videos.length) {
    rows.push({ title: 'Trending now', items: videos.slice(0, 10) });
  }

  const byCategory = new Map<string, HomeVideo[]>();
  for (const video of videos) {
    const current = byCategory.get(video.category) ?? [];
    current.push(video);
    byCategory.set(video.category, current);
  }

  for (const [category, items] of byCategory) {
    if (items.length >= 2) {
      rows.push({ title: category, items: items.slice(0, 10) });
    }
  }

  if (videos.length > 6) {
    rows.push({ title: 'New releases', items: videos.slice(2, 12) });
  }

  return rows.slice(0, 4);
}

export default async function HomePage() {
  let videos: HomeVideo[] = [];

  try {
    videos = await prisma.video.findMany({
      where: { status: 'APPROVED' },
      take: 18,
      orderBy: { createdAt: 'desc' }
    });
  } catch {
    videos = [];
  }

  const requestHeaders = headers();
  const featured = videos[0] ?? null;
  const featuredPoster = getMediaAssetUrl(featured?.posterKey);
  const rows = buildRows(videos);

  return (
    <div className="viewer-home">
      <section
        className="home-hero"
        style={featuredPoster ? { backgroundImage: `linear-gradient(90deg, rgba(3, 5, 14, 0.92) 0%, rgba(3, 5, 14, 0.58) 48%, rgba(3, 5, 14, 0.88) 100%), url(${featuredPoster})` } : undefined}
      >
        <div className="container home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-kicker">Now streaming</span>
            <h1 className="home-title">
              {featured?.title ?? 'Watch bold films, series, and originals in one place'}
            </h1>
            <p className="home-summary">
              {featured?.description ?? 'Create an account, sign in, and start watching a premium lineup built for viewers first.'}
            </p>
            <div className="home-actions">
              <Link className="btn btn-primary" href={featured ? `/v/${featured.id}` : '/auth/register'}>
                {featured ? 'Watch now' : 'Create account'}
              </Link>
              <Link className="btn btn-ghost" href="/auth/login">Sign in</Link>
            </div>
            {featured ? (
              <div className="home-badges">
                <span className="badge">{featured.category}</span>
                <span className="badge">{featured.videoType}</span>
                <span className="badge">{featured.ageRating}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="home-shelves">
        <div className="container">
          {rows.length ? (
            rows.map((row) => (
              <div key={row.title} className="home-shelf">
                <div className="home-shelf-header">
                  <h2>{row.title}</h2>
                </div>
                <div className="home-carousel">
                  {row.items.map((video) => (
                    <div key={`${row.title}-${video.id}`} className="home-carousel-item">
                      <VideoCard
                        video={{ ...video, price: getRegionalPrice(requestHeaders, video.priceTier) }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="home-empty">
              <h2>Fresh releases are loading</h2>
              <p className="muted">Sign in or create an account to be ready when the catalog goes live.</p>
              <div className="home-actions">
                <Link className="btn btn-primary" href="/auth/register">Create account</Link>
                <Link className="btn btn-ghost" href="/auth/login">Sign in</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
