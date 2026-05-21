import Link from 'next/link';
import PublicPageAutoRedirect from '@/components/PublicPageAutoRedirect';
import HomeMovieHero from '@/components/HomeMovieHero';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { getMediaAssetUrl } from '@/lib/media';
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

function buildRows(videos: HomeVideo[], continueWatching: HomeVideo[], unlockedVideos: HomeVideo[]) {
  const rows: HomeRow[] = [];
  const freshReleases = [...videos]
    .sort((left, right) => getVideoCreatedTime(right) - getVideoCreatedTime(left))
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
      description: 'Resume the titles you started most recently.',
      items: continueWatching
    });
  }

  if (unlockedVideos.length) {
    rows.push({
      id: 'my-library',
      title: 'Top Picks for You',
      description: 'Titles already available on your account.',
      items: unlockedVideos
    });
  }

  rows.push({
    id: 'trending',
    title: 'Trending Now',
    description: 'Stories viewers are returning to on ACE Studio.',
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

  const featuredRows = buildRows(videos, [], []);

  return (
    <div className="nmhp-landing">
      {/* Netflix-style Hero Section (global TopNav provides ACE branding + auth) */}
      <section className="nmhp-hero">
        <div className="nmhp-hero-content">
          <h1 className="nmhp-hero-title">
            Watch premium African &amp; global films.<br />
            Pay only for what you watch.
          </h1>
          <p className="nmhp-hero-subtitle">
            As little as <strong>₦50 per movie</strong>. No subscriptions. No commitments.
          </p>
          <div className="nmhp-hero-cta">
            <Link href="/auth/register" className="nmhp-cta-btn nmhp-cta-primary">
              Register now
            </Link>
            <Link href="/auth/login" className="nmhp-cta-btn nmhp-cta-secondary">
              Sign In
            </Link>
          </div>
          <p className="nmhp-hero-disclaimer">
            Cancel anytime. Watch instantly on any device.
          </p>
        </div>
        <div className="nmhp-hero-overlay"></div>
      </section>

      {/* Features Section */}
      <section className="nmhp-features">
        <div className="nmhp-features-grid">
          <div className="nmhp-feature-card">
            <h3>Pay as you go</h3>
            <p>Only pay for the movies you want to watch. Starting at just ₦50.</p>
          </div>
          <div className="nmhp-feature-card">
            <h3>Watch anywhere</h3>
            <p>Stream instantly on your phone, tablet, computer or TV.</p>
          </div>
          <div className="nmhp-feature-card">
            <h3>Premium African &amp; global films</h3>
            <p>Curated selection of Nollywood, African cinema and international titles.</p>
          </div>
        </div>
      </section>

      {/* Original Browse Content */}
      <div className="viewer-home guest-home">
        <section className="home-shelves" id="discover">
          <div className="container">
            {featuredRows.length > 0 && featuredRows.map((row) => (
              <section key={row.id} className="home-shelf">
                <div className="home-shelf-header">
                  <div>
                    <span className="home-row-kicker">Featured on ACE</span>
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

  const rows = buildRows(videos, continueWatching, unlockedVideos);
  const editorialCollections = buildEditorialCollections(videos);
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
                    <span className="home-row-kicker">ACE selection</span>
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

      {editorialCollections.length ? (
        <section className="section home-editorial-section">
          <div className="container">
            <div className="home-section-heading">
              <div>
                <span className="pill">Editorial collections</span>
                <h2 className="section-title home-section-title">Curated discovery for standout storytelling</h2>
                <p className="muted home-section-copy">
                  Editorial picks, fresh shelves, and refined ways to find your next title.
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
