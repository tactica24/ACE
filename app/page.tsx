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

function GuestProfessionalHome({ videos, pricingConfig }: { videos: HomeVideo[]; pricingConfig: any }) {
  const guestHeroVideos = videos.slice(0, 5);
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
          {guestHeroVideos.map((video, index) => {
            const posterUrl = getMoviePosterUrl(video);
            if (!posterUrl) return null;

            const positions = [
              { left: '9%', top: '15%', scale: 1.02, rot: -5 },
              { left: '31%', top: '10%', scale: 0.96, rot: 4 },
              { left: '56%', top: '16%', scale: 1.04, rot: -3 },
              { left: '72%', top: '11%', scale: 0.92, rot: 6 },
              { left: '84%', top: '18%', scale: 0.86, rot: -4 }
            ];
            const pos = positions[index % positions.length];

            return (
              <Image
                key={video.id}
                className="nmhp-hero-poster"
                src={posterUrl}
                alt=""
                width={320}
                height={480}
                sizes="(max-width: 768px) 34vw, 260px"
                unoptimized
                loading={index === 0 ? 'eager' : 'lazy'}
                style={{
                  left: pos.left,
                  top: pos.top,
                  transform: `scale(${pos.scale}) rotate(${pos.rot}deg)`
                }}
              />
            );
          })}
        </div>

        <div className="nmhp-hero-overlay-strong" />

        <div className="nmhp-hero-content">
          <h1 className="nmhp-hero-title">
            Watch Premium Movies.
            <br />
            Pay only for what you watch.
          </h1>
          <p className="nmhp-hero-subtitle">
            From just <strong>₦50 per movie</strong>. No subscriptions, no commitments, and no ads.
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
     return <GuestProfessionalHome videos={posterBackedVideos} pricingConfig={pricingConfig} />;
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
