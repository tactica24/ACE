import Link from 'next/link';
import LaunchPage from '@/components/LaunchPage';
import PublicPageAutoRedirect from '@/components/PublicPageAutoRedirect';
import HomeSpotlightPreview, { type HomeSpotlightVideo } from '@/components/HomeSpotlightPreview';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { getMediaAssetUrl } from '@/lib/media';
import { type PriceTierValue } from '@/lib/media-types';
import { getSiteSettings } from '@/lib/site-settings';
import { getUnlockAmountNairaForVideo } from '@/lib/video-pricing';

export const revalidate = 300;

type HomeVideo = {
  id: string;
  seriesId?: string | null;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  posterKey: string | null;
  genres: string[];
  durationSec: number;
  releaseYear: number | null;
  videoType: string;
  ageRating: string;
  category: string;
  createdAt: Date;
  progressPercent?: number;
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

function formatRuntime(durationSec?: number | null) {
  if (!durationSec || durationSec <= 0) return null;

  const totalMinutes = Math.max(1, Math.round(durationSec / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${totalMinutes}m`;
}

function normalizeVideoText(video: HomeVideo) {
  return [
    video.title,
    video.description,
    video.category,
    video.videoType,
    ...video.genres
  ]
    .join(' ')
    .toLowerCase();
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

function buildRows(videos: HomeVideo[], continueWatching: HomeVideo[], unlockedVideos: HomeVideo[]) {
  const rows: HomeRow[] = [];
  const freshReleases = [...videos]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 12);
  const nollywood = pickVideos(videos, (video) => /nollywood|nigeria|naija/.test(normalizeVideoText(video)));
  const africanOriginals = pickVideos(videos, (video) => /africa|african|ghana|kenya|south africa/.test(normalizeVideoText(video)));
  const asianCinema = pickVideos(videos, (video) => /korean|asia|asian|k-drama/.test(normalizeVideoText(video)));
  const actionThriller = pickVideos(videos, (video) => /action|thriller|crime|spy/.test(normalizeVideoText(video)));
  const romance = pickVideos(videos, (video) => /romance|love|relationship/.test(normalizeVideoText(video)));
  const family = pickVideos(
    videos,
    (video) =>
      /family|kids|children|animation|faith/.test(normalizeVideoText(video)) ||
      video.ageRating === 'ALL' ||
      video.ageRating === 'PG13'
  );

  if (continueWatching.length) {
    rows.push({
      id: 'continue-watching',
      title: 'Continue Watching',
      description: 'Pick up exactly where you left off across your most recent sessions.',
      items: continueWatching
    });
  }

  if (unlockedVideos.length) {
    rows.push({
      id: 'my-library',
      title: 'Top Picks for You',
      description: 'Accessible titles already connected to your account and ready to resume.',
      items: unlockedVideos
    });
  }

  rows.push({
    id: 'trending',
    title: 'Trending Now',
    description: 'The stories currently shaping the conversation on ACE Studio.',
    items: videos.slice(0, 12)
  });

  const rowDefinitions = [
    {
      id: 'nollywood',
      title: 'Nollywood Spotlight',
      description: 'Premium local storytelling with a world-class presentation.',
      items: nollywood
    },
    {
      id: 'african-originals',
      title: 'African Originals',
      description: 'Curated voices, bold visuals, and new stories from across the continent.',
      items: africanOriginals
    },
    {
      id: 'asian-cinema',
      title: 'Korean & Asian Cinema',
      description: 'Elegant dramas, thrillers, and modern favorites from Asia.',
      items: asianCinema
    },
    {
      id: 'action-thriller',
      title: 'Action & Thriller',
      description: 'Tension, pace, and edge-of-your-seat momentum.',
      items: actionThriller
    },
    {
      id: 'romance',
      title: 'Romance',
      description: 'Relationship stories with warmth, longing, and emotional payoff.',
      items: romance
    },
    {
      id: 'family',
      title: 'Family & Kids',
      description: 'Friendly viewing options for shared moments and lighter nights.',
      items: family
    },
    {
      id: 'new-releases',
      title: 'New Releases',
      description: 'Fresh arrivals, recent drops, and titles worth discovering early.',
      items: freshReleases
    }
  ];

  for (const row of rowDefinitions) {
    if (row.items.length >= 3) {
      rows.push(row);
    }
  }

  return rows.slice(0, 8);
}

function buildEditorialCollections(videos: HomeVideo[]): EditorialCollection[] {
  const definitions = [
    {
      title: 'Award-Winning Films',
      description: 'Confident cinematic picks that feel polished, prestige-led, and conversation-worthy.',
      href: '/browse?q=Award',
      items: pickVideos(videos, (video) => /award|festival|premiere|drama/.test(normalizeVideoText(video)), 4)
    },
    {
      title: 'Editor’s Choice',
      description: 'A handpicked blend of premium titles worth leading with on the platform.',
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

export default async function HomePage() {
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

  let videos: HomeVideo[] = [];
  try {
    videos = (await getApprovedCatalogVideos()).slice(0, 40);
  } catch {
    videos = [];
  }

  const user = await getCurrentUser();
  let continueWatching: HomeVideo[] = [];
  let unlockedVideos: HomeVideo[] = [];

  if (user && process.env.DATABASE_URL?.trim()) {
    try {
      const [watchHistory, unlocks] = await Promise.all([
        prisma.watchHistory.findMany({
          where: {
            userId: user.sub,
            video: {
              status: 'APPROVED',
              seriesId: null
            }
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
            video: {
              status: 'APPROVED',
              seriesId: null
            }
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

  const pricingConfig = await getFinanceConfig();
  const featured = videos[0] ?? null;
  const featuredPoster = getMediaAssetUrl(featured?.posterKey);
  const featuredRuntime = formatRuntime(featured?.durationSec);
  const rows = buildRows(videos, continueWatching, unlockedVideos);
  const editorialCollections = buildEditorialCollections(videos);
  const spotlightVideos: HomeSpotlightVideo[] = videos.slice(1, 4).map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    category: video.category,
    durationSec: video.durationSec,
    videoType: video.videoType,
    posterKey: video.posterKey
  }));
  const featuredSpotlightVideo: HomeSpotlightVideo | null = featured
    ? {
        id: featured.id,
        title: featured.title,
        description: featured.description,
        category: featured.category,
        durationSec: featured.durationSec,
        videoType: featured.videoType,
        posterKey: featured.posterKey
      }
    : null;

  return (
    <div className="viewer-home">
      <PublicPageAutoRedirect allowedPath="/browse" />

      <section
        className="home-cinematic-hero"
        style={
          featuredPoster
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(4, 6, 12, 0.96) 0%, rgba(4, 6, 12, 0.68) 42%, rgba(4, 6, 12, 0.9) 100%), url(${featuredPoster})`
              }
            : undefined
        }
      >
        <div className="container home-cinematic-inner">
          <div className="home-cinematic-grid">
            <div className="home-cinematic-copy">
              <span className="home-premium-kicker">Premium streaming for African and global audiences</span>
              <h1 className="home-title">
                {featured?.title ?? 'ACE Studio brings premium cinematic discovery to every screen.'}
              </h1>
              <p className="home-summary">
                {featured?.description ??
                  'Discover bold films, standout series, and a cinematic viewing journey built to feel premium from the first frame.'}
              </p>
              <div className="home-meta-row">
                {featured?.releaseYear ? <span>{featured.releaseYear}</span> : null}
                {featuredRuntime ? <span>{featuredRuntime}</span> : null}
                {featured?.category ? <span>{featured.category}</span> : null}
                {featured?.videoType ? <span>{featured.videoType}</span> : null}
                {featured?.ageRating ? <span>{featured.ageRating}</span> : null}
              </div>
              <div className="home-actions">
                <Link className="btn btn-primary" href={featured ? `/v/${featured.id}` : '/browse'}>
                  {featured ? 'Watch Now' : 'Browse Catalog'}
                </Link>
                <Link className="btn btn-ghost" href="/highlights">Watch Highlights</Link>
              </div>
            </div>

            <HomeSpotlightPreview featured={featuredSpotlightVideo} spotlightVideos={spotlightVideos} />
          </div>
        </div>
      </section>

      <section className="home-shelves">
        <div className="container">
          {rows.length ? (
            rows.map((row) => (
              <section key={row.id} id={row.id} className="home-shelf">
                <div className="home-shelf-header">
                  <div>
                    <span className="home-row-kicker">Curated row</span>
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
              <p className="muted">As soon as approved titles arrive, this homepage will automatically fill with shelves, collections, and featured discovery.</p>
              <div className="home-actions">
                <Link className="btn btn-primary" href="/auth/register">Create account</Link>
                <Link className="btn btn-ghost" href="/browse">Browse catalog</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {editorialCollections.length ? (
        <section className="section home-editorial-section">
          <div className="container">
            <div className="home-section-heading">
              <div>
                <span className="pill">Editorial collections</span>
                <h2 className="section-title home-section-title">A premium layer for curated discovery and standout storytelling</h2>
                <p className="muted home-section-copy">
                  Designed to feel deliberate, cinematic, and globally competitive rather than just functional.
                </p>
              </div>
            </div>
            <div className="home-editorial-grid">
              {editorialCollections.map((collection) => {
                const spotlightPoster = getMediaAssetUrl(collection.spotlight.posterKey);

                return (
                  <Link
                    key={collection.title}
                    className="home-editorial-card"
                    href={collection.href}
                    style={
                      spotlightPoster
                        ? {
                            backgroundImage: `linear-gradient(180deg, rgba(8, 10, 17, 0.38), rgba(8, 10, 17, 0.9)), url(${spotlightPoster})`
                          }
                        : undefined
                    }
                  >
                    <div className="home-editorial-copy">
                      <span className="home-editorial-kicker">{collection.title}</span>
                      <strong>{collection.spotlight.title}</strong>
                      <p>{collection.description}</p>
                    </div>
                    <div className="home-editorial-supporting">
                      {collection.supporting.map((video) => (
                        <div key={video.id} className="home-editorial-supporting-item">
                          <strong>{video.title}</strong>
                          <span>{video.category} / {formatRuntime(video.durationSec) ?? video.videoType}</span>
                        </div>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
