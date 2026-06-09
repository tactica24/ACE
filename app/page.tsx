import Link from 'next/link';
import Image from 'next/image';
import PublicPageAutoRedirect from '@/components/PublicPageAutoRedirect';
import HomeMovieHero from '@/components/HomeMovieHero';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { onlyCatalogVideosWithPosters } from '@/lib/catalog-posters';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { type PriceTierValue } from '@/lib/media-types';
import { getMoviePosterUrl } from '@/lib/movie-assets';
import { getUnlockAmountNairaForVideo } from '@/lib/video-pricing';
import { getViewerReadyCatalogWhere } from '@/lib/video-visibility';

export const dynamic = 'force-dynamic';

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
};

type HomeRow = {
  id: string;
  title: string;
  description: string;
  items: HomeVideo[];
};

const CURATED_GUEST_TITLE_PATTERNS = ['hunters', 'diminuendo', 'caretaker'];

function dedupeVideos(items: HomeVideo[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function formatRuntime(_durationSec?: number | null) {
  if (!_durationSec || _durationSec <= 0) return 'Feature film';
  const totalMinutes = Math.max(1, Math.round(_durationSec / 60));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatNaira(amount: number) {
  return `NGN ${amount.toLocaleString('en-NG')}`;
}

function scoreGuestSpotlight(video: HomeVideo) {
  const haystack = `${video.title} ${video.description} ${video.category} ${(video.genres ?? []).join(' ')}`.toLowerCase();
  const keywordIndex = CURATED_GUEST_TITLE_PATTERNS.findIndex((keyword) => haystack.includes(keyword));

  return {
    keywordBoost: keywordIndex === -1 ? 0 : CURATED_GUEST_TITLE_PATTERNS.length - keywordIndex,
    releaseBoost: video.releaseYear ?? 0,
    createdBoost: new Date(video.createdAt).getTime() || 0
  };
}

function prioritizeGuestSpotlight(videos: HomeVideo[]) {
  return [...videos].sort((left, right) => {
    const a = scoreGuestSpotlight(left);
    const b = scoreGuestSpotlight(right);
    if (b.keywordBoost !== a.keywordBoost) return b.keywordBoost - a.keywordBoost;
    if (b.releaseBoost !== a.releaseBoost) return b.releaseBoost - a.releaseBoost;
    return b.createdBoost - a.createdBoost;
  });
}

function buildRows(videos: HomeVideo[], unlockedVideos: HomeVideo[] = []) {
  const rows: HomeRow[] = [];

  if (unlockedVideos.length) {
    rows.push({
      id: 'my-library',
      title: 'Top Picks for You',
      description: 'Titles already available on your account.',
      items: unlockedVideos.slice(0, 10)
    });
  }

  rows.push({
    id: 'trending',
    title: 'Trending Now',
    description: 'Stories viewers are returning to on ACE Studio.',
    items: videos.slice(0, 12)
  });

  return rows.slice(0, 2);
}

function buildGuestRows(videos: HomeVideo[]) {
  const ranked = prioritizeGuestSpotlight(videos);
  const recent = [...ranked].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime() || 0;
    const bTime = new Date(b.createdAt).getTime() || 0;
    return bTime - aTime;
  });

  return [
    {
      id: 'licensed-spotlight',
      title: 'Licensed Spotlight',
      description: 'Priority titles with approved artwork and premium front-door placement.',
      items: ranked.slice(0, 12)
    },
    {
      id: 'fresh-on-ace',
      title: 'Fresh on ACE',
      description: 'New approved titles ready for instant playback.',
      items: recent.slice(0, 12)
    }
  ].filter((row) => row.items.length > 0);
}

function GuestProfessionalHome({ videos, pricingConfig }: { videos: HomeVideo[]; pricingConfig: any }) {
  const rankedGuestVideos = prioritizeGuestSpotlight(videos);
  const heroLineup = rankedGuestVideos.slice(0, 6);
  const featured = heroLineup[0] ?? null;
  const supporting = heroLineup.slice(1, 5);
  const featuredRows = buildGuestRows(videos);
  const featuredPosterUrl = featured ? getMoviePosterUrl(featured) : null;
  const featuredPrice = featured ? getUnlockAmountNairaForVideo(featured, pricingConfig) : 50;

  return (
    <div className="nmhp-landing">
      <section className="nmhp-hero">
        <div
          className="nmhp-hero-bg"
          aria-hidden="true"
          style={
            featuredPosterUrl
              ? {
                  backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.52) 50%, rgba(0,0,0,0.92) 100%), url(${featuredPosterUrl})`,
                  backgroundPosition: 'center 24%',
                  backgroundSize: 'cover',
                  opacity: 0.34
                }
              : undefined
          }
        >
          {supporting.map((video, index) => {
            const posterUrl = getMoviePosterUrl(video);
            if (!posterUrl) return null;

            const positions = [
              { left: '57%', top: '10%', rot: -4 },
              { left: '70%', top: '15%', rot: 4 },
              { left: '82%', top: '12%', rot: -3 },
              { left: '88%', top: '31%', rot: 5 }
            ];
            const pos = positions[index % positions.length];

            return (
              <Image
                key={video.id}
                className="nmhp-hero-poster"
                src={posterUrl}
                alt=""
                width={360}
                height={540}
                sizes="(max-width: 960px) 28vw, 320px"
                unoptimized
                loading="lazy"
                style={{
                  left: pos.left,
                  top: pos.top,
                  width: '18%',
                  maxWidth: 310,
                  transform: `rotate(${pos.rot}deg)`
                }}
              />
            );
          })}
        </div>

        <div className="nmhp-hero-overlay-strong" />

        <div
          className="nmhp-hero-content"
          style={{
            maxWidth: 1160,
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 28,
            alignItems: 'end',
            textAlign: 'left'
          }}
        >
          <div>
            <span className="pill" style={{ marginBottom: 18, display: 'inline-flex' }}>Premium movie access</span>
            <h1 className="nmhp-hero-title" style={{ maxWidth: 720, marginBottom: 18 }}>
              Bigger posters.
              <br />
              Cleaner shelves.
              <br />
              Premium films without subscription pressure.
            </h1>
            <p className="nmhp-hero-subtitle" style={{ maxWidth: 640, marginBottom: 18 }}>
              ACE Studio gives approved titles a stronger cinema-style front page and lets viewers pay only when they are ready to watch.
            </p>
            {featured ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18, color: 'rgba(255,255,255,0.86)', fontSize: '0.95rem' }}>
                <strong style={{ color: '#fff' }}>{featured.title}</strong>
                <span>{featured.releaseYear ?? 'New release'}</span>
                <span>{formatRuntime(featured.durationSec)}</span>
                <span>{featured.category}</span>
                <span style={{ color: '#f87171' }}>From {formatNaira(featuredPrice)}</span>
              </div>
            ) : null}
            <div className="nmhp-hero-cta" style={{ justifyContent: 'flex-start' }}>
              <Link href="/auth/register" className="nmhp-cta-btn nmhp-cta-primary">Start watching</Link>
              <Link href="/browse" className="nmhp-cta-btn nmhp-cta-secondary">Browse catalog</Link>
              <Link href="/auth/login" className="nmhp-cta-btn nmhp-cta-secondary">Sign in</Link>
            </div>
            <p className="nmhp-hero-disclaimer" style={{ textAlign: 'left' }}>
              Watch instantly on web, tablet, TV, and Flutter mobile. No monthly subscription required.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {featured ? (
              <Link
                href={`/v/${featured.id}`}
                className="detail-card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(128px, 160px) minmax(0, 1fr)',
                  gap: 16,
                  padding: 16,
                  background: 'linear-gradient(180deg, rgba(12,14,24,0.96), rgba(7,9,18,0.92))',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 26px 60px rgba(0,0,0,0.35)'
                }}
              >
                {featuredPosterUrl ? (
                  <Image
                    src={featuredPosterUrl}
                    alt={featured.title}
                    width={240}
                    height={360}
                    unoptimized
                    style={{ width: '100%', height: '100%', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: 12 }}
                  />
                ) : (
                  <div style={{ aspectRatio: '2 / 3', borderRadius: 12, background: 'rgba(255,255,255,0.08)' }} />
                )}
                <div style={{ display: 'grid', gap: 10, alignContent: 'center' }}>
                  <span className="detail-label">Featured tonight</span>
                  <strong style={{ fontSize: '1.25rem', color: '#fff' }}>{featured.title}</strong>
                  <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>{featured.description}</p>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="viewer-home guest-home">
        <section className="home-shelves" id="discover">
          <div className="container">
            {heroLineup.length ? (
              <section className="home-shelf" style={{ marginBottom: 28 }}>
                <div className="home-shelf-header">
                  <div>
                    <span className="home-row-kicker">Editorial picks</span>
                    <h2>Front and center</h2>
                    <p className="muted" style={{ marginBottom: 0 }}>
                      Bigger poster treatment for the titles we want visitors to feel immediately.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18 }}>
                  {heroLineup.slice(0, 5).map((video) => {
                    const posterUrl = getMoviePosterUrl(video);
                    const amount = getUnlockAmountNairaForVideo(video, pricingConfig);

                    return (
                      <Link
                        key={video.id}
                        href={`/v/${video.id}`}
                        className="detail-card"
                        style={{
                          display: 'grid',
                          gap: 12,
                          padding: 12,
                          background: 'linear-gradient(180deg, rgba(12,14,24,0.96), rgba(7,9,18,0.92))',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 22px 54px rgba(0,0,0,0.32)'
                        }}
                      >
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={video.title}
                            width={320}
                            height={480}
                            unoptimized
                            style={{ width: '100%', height: 'auto', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: 12 }}
                          />
                        ) : (
                          <div style={{ aspectRatio: '2 / 3', borderRadius: 12, background: 'rgba(255,255,255,0.08)' }} />
                        )}
                        <div style={{ display: 'grid', gap: 6 }}>
                          <strong style={{ color: '#fff', fontSize: '1rem' }}>{video.title}</strong>
                          <span className="muted" style={{ fontSize: '0.82rem' }}>
                            {video.releaseYear ?? 'New'} | {video.category} | ₦{amount}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {featuredRows.length > 0 ? featuredRows.map((row) => (
              <section key={row.id} className="home-shelf">
                <div className="home-shelf-header">
                  <div>
                    <h2>{row.title}</h2>
                    <p className="muted" style={{ marginBottom: 0 }}>{row.description}</p>
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
            )) : (
              <div className="home-empty">
                <h2>Fresh releases are loading in</h2>
                <p className="muted">Approved movies with posters will appear here as soon as they are ready.</p>
                <div className="home-actions">
                  <Link className="btn btn-primary" href="/auth/register">Create account</Link>
                  <Link className="btn btn-ghost" href="/browse">Browse catalog</Link>
                </div>
              </div>
            )}
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
    const catalogVideos = await getApprovedCatalogVideos();
    videos = dedupeVideos(catalogVideos).slice(0, 40);
  } catch {
    videos = [];
  }

  const posterBackedVideos = onlyCatalogVideosWithPosters(videos);

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
    return <GuestProfessionalHome videos={dedupeVideos(onlyCatalogVideosWithPosters(videos))} pricingConfig={pricingConfig} />;
  }

  let unlockedVideos: HomeVideo[] = [];

  if (process.env.DATABASE_URL?.trim()) {
    try {
      const unlocks = await prisma.unlock.findMany({
        where: {
          userId: user.sub,
          video: getViewerReadyCatalogWhere()
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          video: {
            include: {
              series: {
                select: {
                  posterKey: true
                }
              }
            }
          }
        }
      });

      unlockedVideos = unlocks.map((entry) => ({
        ...entry.video,
        posterKey: entry.video.posterKey ?? entry.video.series?.posterKey ?? null
      }));
    } catch {
      unlockedVideos = [];
    }
  }

  const unlockedVideosWithPosters = onlyCatalogVideosWithPosters(unlockedVideos);
  const rows = buildRows(posterBackedVideos, unlockedVideosWithPosters);
  const spotlightVideos = posterBackedVideos.slice(0, 5).map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    category: video.category,
    durationSec: video.durationSec,
    videoType: video.videoType,
    posterKey: video.posterKey,
    releaseYear: video.releaseYear
  }));

  return (
    <div className="viewer-home">
      <PublicPageAutoRedirect allowedPath="/browse" />
      <HomeMovieHero videos={spotlightVideos} />

      <section className="home-shelves" id="categories">
        <div className="container">
          {rows.length ? rows.map((row) => (
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
          )) : (
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
