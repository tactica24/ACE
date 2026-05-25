import Link from 'next/link';
import PublicPageAutoRedirect from '@/components/PublicPageAutoRedirect';
import HomeMovieHero from '@/components/HomeMovieHero';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { type PriceTierValue } from '@/lib/media-types';
import { getUnlockAmountNairaForVideo } from '@/lib/video-pricing';
import { getViewerReadyCatalogWhere } from '@/lib/video-visibility';

export const revalidate = 300;

type HomeVideo = {
  id: string;
  seriesId?: string | null;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  unlockPrice: number | null;
  posterKey: string | null;
  genres: string[];
  durationSec: number;
  releaseYear: number | null;
  videoType: string;
  ageRating: string;
  category: string;
  createdAt: Date | string;
  progressPercent?: number;
  technicalMetadata?: {
    deliveryFormat: string | null;
    englishSubtitlesProvided: boolean;
    castCredits: unknown;
    crewCredits: unknown;
    promotionalStillKeys: string[];
  } | null;
};

type HomeRow = {
  id: string;
  title: string;
  description: string;
  items: HomeVideo[];
};

function dedupeVideos(items: HomeVideo[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function buildRows(videos: HomeVideo[]) {
  return [{
    id: 'trending',
    title: 'Trending Now',
    description: 'Stories viewers are returning to on ACE Studio.',
    items: videos.slice(0, 16)
  }];
}

function GuestProfessionalHome({ videos, pricingConfig }: { videos: HomeVideo[]; pricingConfig: any }) {
  const heroVideos = videos.slice(0, 5).map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    category: video.category,
    durationSec: video.durationSec,
    videoType: video.videoType,
    posterKey: video.posterKey,
    releaseYear: video.releaseYear,
  }));

  const trendingItems = videos.slice(0, 14);
  const featuredRows = trendingItems.length
    ? [
        {
          id: 'trending',
          title: 'Trending Now',
          description: 'Stories viewers are returning to on ACE Studio.',
          items: trendingItems
        }
      ]
    : [];

  return (
    <div className="viewer-home guest-home">
      <HomeMovieHero videos={heroVideos} />
      <section className="home-shelves" id="discover">
          <div className="container">
            {featuredRows.length > 0 && featuredRows.map((row) => (
              <section key={row.id} className="home-shelf">
                <div className="home-shelf-header">
                  <div>
                    <h2>{row.title}</h2>
                  </div>
                  <Link className="btn btn-ghost btn-compact" href="/browse">Browse all</Link>
                </div>
                <div className="home-carousel">
                  {row.items.map((video) => (
                    <div key={video.id} className="home-carousel-item">
                      <VideoCard
                        video={{
                          ...video,
                          price: {
                            currency: 'NGN',
                            amountNaira: getUnlockAmountNairaForVideo(video, pricingConfig),
                            amountMinor: getUnlockAmountNairaForVideo(video, pricingConfig) * 100
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();

  let videos: HomeVideo[] = [];
  try {
    videos = dedupeVideos((await getApprovedCatalogVideos()).filter((video) => Boolean(video.posterKey))).slice(0, 40);
  } catch {
    videos = [];
  }

  let pricingConfig: any;
  try {
    pricingConfig = await getFinanceConfig();
  } catch {
    pricingConfig = {
      standardNaira: 50,
      premiereNaira: 50,
      snackNaira: 50
    };
  }

  if (!user) {
    return <GuestProfessionalHome videos={videos} pricingConfig={pricingConfig} />;
  }

  let continueWatching: HomeVideo[] = [];
  let unlockedVideos: HomeVideo[] = [];

  if (user && process.env.DATABASE_URL?.trim()) {
    try {
      const [watchHistory, unlocks] = await Promise.all([
        prisma.watchHistory.findMany({
          where: {
            userId: user.sub,
            video: getViewerReadyCatalogWhere()
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          include: {
            video: true
          }
        }),
        prisma.unlock.findMany({
          where: {
            userId: user.sub,
            video: getViewerReadyCatalogWhere()
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            video: true
          }
        })
      ]);

      continueWatching = watchHistory.map((entry) => ({
        ...entry.video,
        progressPercent: entry.completedAt
          ? 100
          : Math.max(
              8,
              Math.min(
                98,
                Math.round((entry.progressSec / Math.max(entry.durationSec ?? entry.video.durationSec, 1)) * 100)
              )
            )
      }));

      unlockedVideos = unlocks.map((entry) => ({
        ...entry.video
      }));
    } catch {
      continueWatching = [];
      unlockedVideos = [];
    }
  }

  const rows = buildRows(videos);
  const spotlightVideos = videos.slice(0, 5).map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    category: video.category,
    durationSec: video.durationSec,
    videoType: video.videoType,
    posterKey: video.posterKey,
    releaseYear: video.releaseYear,
  }));

  return (
    <div className="viewer-home">
      <PublicPageAutoRedirect allowedPath="/browse" />

      <HomeMovieHero videos={spotlightVideos} />

      <section className="home-shelves" id="categories">
        <div className="container">
          {rows.length ? (
            rows.map((row) => (
              <section key={row.id} id={row.id} className="home-shelf">
                <div className="home-shelf-header">
                  <div>
                    <h2>{row.title}</h2>
                    <p className="muted" style={{ marginBottom: 0 }}>{row.description}</p>
                  </div>
                  <Link className="btn btn-ghost btn-compact" href="/browse">Browse more</Link>
                </div>
                <div className="home-carousel">
                  {row.items.map((video) => (
                    <div key={`${row.id}-${video.id}`} className="home-carousel-item">
                      <VideoCard
                        video={{
                          ...video,
                          price: {
                            currency: 'NGN',
                            amountNaira: getUnlockAmountNairaForVideo(video, pricingConfig),
                            amountMinor: getUnlockAmountNairaForVideo(video, pricingConfig) * 100
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="home-empty">
              <h2>Fresh releases are loading in</h2>
              <p className="muted">New titles will appear here as soon as they are available.</p>
              <div className="home-actions">
                <Link className="btn btn-primary" href="/auth/register">Create account</Link>
                <Link className="btn btn-ghost" href="/browse">Browse catalog</Link>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
