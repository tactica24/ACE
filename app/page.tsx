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

type EditorialCollection = {
  title: string;
  description: string;
  href: string;
  spotlight: HomeVideo;
  supporting: HomeVideo[];
};

function normalizeVideoText(video: HomeVideo) {
  const genres = Array.isArray(video.genres) ? video.genres : [];

  return [
    video.title ?? '',
    video.description ?? '',
    video.category ?? '',
    video.videoType ?? '',
    ...genres
  ]
    .join(' ')
    .toLowerCase();
}

function getVideoCreatedTime(video: Pick<HomeVideo, 'createdAt'>) {
  if (video.createdAt instanceof Date) {
    return video.createdAt.getTime();
  }

  const timestamp = Date.parse(video.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

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

function pickVideos(videos: HomeVideo[], predicate: (video: HomeVideo) => boolean, take = 12) {
  return dedupeVideos(videos.filter(predicate)).slice(0, take);
}

function formatRuntime(_durationSec?: number | null) {
  return '90m';
}

function buildRows(videos: HomeVideo[]) {
  return [{
    id: 'trending',
    title: 'Trending Now',
    description: 'Stories viewers are returning to on ACE Studio.',
    items: videos.slice(0, 16)
  }];
}

function buildEditorialCollections(videos: HomeVideo[]): EditorialCollection[] {
  const definitions = [
    {
      title: 'Award-Winning Films',
      description: 'Prestige-led films and festival-minded discoveries.',
      href: '/browse?q=Award',
      items: pickVideos(videos, (video) => /award|festival|premiere|drama/.test(normalizeVideoText(video)), 4)
    },
    {
      title: 'Editor\'s Choice',
      description: 'A handpicked blend of standout films and series.',
      href: '/browse',
      items: videos.slice(2, 6)
    },
    {
      title: 'Stories from Africa',
      description: 'Voices, settings, and perspectives grounded in African storytelling power.',
      href: '/browse?q=African',
      items: pickVideos(videos, (video) => /africa|african|nollywood|ghana|kenya/.test(normalizeVideoText(video)), 4)
    },
    {
      title: 'Festival Favorites',
      description: 'Stylish discoveries for viewers who want something a bit more curated.',
      href: '/browse?q=Festival',
      items: pickVideos(videos, (video) => /festival|arthouse|drama|indie/.test(normalizeVideoText(video)), 4)
    }
  ];

  return definitions
    .map((collection) => ({
      ...collection,
      items: collection.items.length >= 4 ? collection.items : videos.slice(0, 4)
    }))
    .filter((collection) => collection.items.length >= 4)
    .map((collection) => ({
      title: collection.title,
      description: collection.description,
      href: collection.href,
      spotlight: collection.items[0],
      supporting: collection.items.slice(1, 4)
    }))
    .slice(0, 4);
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

  const trendingItems = videos.slice(0, 5);
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
                <div className="home-carousel home-carousel-marquee">
                  {[...row.items, ...row.items].map((video, index) => (
                    <div key={`${video.id}-${index}`} className="home-carousel-item">
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
    videos = (await getApprovedCatalogVideos()).slice(0, 40);
  } catch {
    videos = [];
  }

  // Curate landing to ONLY the approved titles provided (careful exact-ish match on normalized title)
  const APPROVED_LANDING_TITLES = [
    'paranormal far 1', 'paranormal far 2', 'paranormal far 3',
    'diminuendo',
    'aiden',
    'a world of worlds: rise of the king',
    'hunters lodge',
    'only andy',
    'the mystery of mr e',
    'only fantasy island',
    'the caretaker',
    'arctic void',
    'manhattan romance',
    'the naked umbrella'
  ];
  videos = videos.filter((video) => {
    const title = (video.title || '').toLowerCase().trim();
    return APPROVED_LANDING_TITLES.some((allowed) => title.includes(allowed) || allowed.includes(title));
  });

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
                <div className="home-carousel home-carousel-marquee">
                  {[...row.items, ...row.items].map((video, index) => (
                    <div key={`${row.id}-${video.id}-${index}`} className="home-carousel-item">
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
