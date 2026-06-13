import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
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
import { getRegionalMoneyDisplay } from '@/lib/pricing';
import { getRegionalPriceForVideo, getUnlockAmountNairaForVideo } from '@/lib/video-pricing';
import { getViewerReadyCatalogWhere } from '@/lib/video-visibility';

export const dynamic = 'force-dynamic';

const VISITOR_HERO_POSTERS = [
  { src: '/visitor-posters/LK_005093_GB_poster.jpg', title: 'Featured title 1' },
  { src: '/visitor-posters/LK_005974_eng_WW_poster.png', title: 'Featured title 2' },
  { src: '/visitor-posters/LK_006130_eng_WW_poster.png', title: 'Featured title 3' },
  { src: '/visitor-posters/LK_006237_WW_poster.png', title: 'Featured title 4' },
  { src: '/visitor-posters/LK_009016_eng_WW_poster.png', title: 'Featured title 5' },
  { src: '/visitor-posters/LK_009476_world_WW_poster.jpg', title: 'Featured title 6' },
  { src: '/visitor-posters/LK_009787_world_WW_poster.jpg', title: 'Featured title 7' },
  { src: '/visitor-posters/LK_010611_eng_WW_poster.jpg', title: 'Featured title 8' },
  { src: '/visitor-posters/LK_011779_ww_WW_poster.jpg', title: 'Featured title 9' },
  { src: '/visitor-posters/LK_012046_eng_WW_poster.jpg', title: 'Featured title 10' }
] as const;

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

function formatRuntime(_durationSec?: number | null) {
  return '90m';
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

function GuestProfessionalHome({
  videos,
  pricingConfig,
  requestHeaders
}: {
  videos: HomeVideo[];
  pricingConfig: any;
  requestHeaders: Headers;
}) {
  const guestHeroVideos = videos.slice(0, 5);
  const leftPosterWall = VISITOR_HERO_POSTERS.slice(0, 5);
  const rightPosterWall = VISITOR_HERO_POSTERS.slice(5);
  const heroPriceLabel = getRegionalMoneyDisplay(
    requestHeaders,
    getUnlockAmountNairaForVideo(
      {
        priceTier: 'STANDARD',
        videoType: 'FEATURE'
      },
      pricingConfig
    )
  ).label;
  const featuredRows = guestHeroVideos.length
    ? [
        {
          id: 'trending',
          title: 'Trending Now',
          description: 'Approved movies now available on ACE Studio.',
          items: guestHeroVideos
        }
      ]
    : [];

  return (
    <div className="nmhp-landing">
      <section className="nmhp-hero">
        <div className="nmhp-hero-bg" aria-hidden="true">
          <div className="nmhp-poster-wall nmhp-poster-wall-left">
            {leftPosterWall.map((poster, index) => (
              <div key={poster.title} className={`nmhp-poster-slot nmhp-poster-slot-${index + 1}`}>
                <Image
                  className="nmhp-hero-poster"
                  src={poster.src}
                  alt=""
                  sizes="(max-width: 768px) 28vw, 240px"
                  priority={index < 2}
                />
              </div>
            ))}
          </div>
          <div className="nmhp-poster-wall nmhp-poster-wall-right">
            {rightPosterWall.map((poster, index) => (
              <div key={poster.title} className={`nmhp-poster-slot nmhp-poster-slot-${index + 6}`}>
                <Image
                  className="nmhp-hero-poster"
                  src={poster.src}
                  alt=""
                  sizes="(max-width: 768px) 28vw, 240px"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="nmhp-hero-overlay-strong" />

        <div className="nmhp-hero-content nmhp-hero-content-plain">
          <span className="nmhp-hero-kicker">ACE Studio</span>
          <h1 className="nmhp-hero-title">
            <span>Watch Premium Movies.</span>
            <span>Pay only for what you watch.</span>
          </h1>
          <p className="nmhp-hero-subtitle">
            From just <strong>{heroPriceLabel} per movie</strong>. No subscriptions, no commitments, and no ads.
          </p>
          <div className="nmhp-hero-cta">
            <Link href="/auth/register" className="nmhp-cta-btn nmhp-cta-primary">
              Register now
            </Link>
            <Link href="/auth/login" className="nmhp-cta-btn nmhp-cta-secondary">
              Sign In
            </Link>
          </div>
          <p className="nmhp-hero-disclaimer">Cancel anytime. Watch instantly on any device.</p>
        </div>
      </section>

      <section className="nmhp-features">
        <div className="nmhp-features-grid">
          <div className="nmhp-feature-card">
            <h3>Pay as you go</h3>
            <p>Only pay for the movies you want to watch. Starting at just {heroPriceLabel}.</p>
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

      <div className="viewer-home guest-home">
        <section className="home-shelves" id="discover">
          <div className="container">
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
                          price: getRegionalPriceForVideo(requestHeaders, video, pricingConfig)
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
  const requestHeaders = headers();

   let videos: HomeVideo[] = [];
   try {
     const catalogVideos = await getApprovedCatalogVideos();
     videos = dedupeVideos(catalogVideos).slice(0, 40);
   } catch {
     videos = [];
   }

   // Filter to only videos with posters for consistent display (like visitor homepage)
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
     return <GuestProfessionalHome videos={posterBackedVideos} pricingConfig={pricingConfig} requestHeaders={requestHeaders} />;
   }

   let unlockedVideos: HomeVideo[] = [];

   if (user && process.env.DATABASE_URL?.trim()) {
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

   // Use only videos with posters for consistent display
   const rows = buildRows(posterBackedVideos, unlockedVideos);
   const spotlightVideos = posterBackedVideos.slice(0, 5).map((video) => ({
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
                          price: getRegionalPriceForVideo(requestHeaders, video, pricingConfig)
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
