import Link from 'next/link';
import LaunchPage from '@/components/LaunchPage';
import PublicPageAutoRedirect from '@/components/PublicPageAutoRedirect';
import VideoCard from '@/components/VideoCard';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { getFinanceConfig } from '@/lib/finance';
import { getMediaAssetUrl } from '@/lib/media';
import { type PriceTierValue } from '@/lib/media-types';
import { getUiCopy } from '@/lib/ui-language';
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
  episodeCount?: number | null;
};

type HomeRow = {
  title: string;
  description: string;
  items: HomeVideo[];
};

function formatRuntime(durationSec?: number | null) {
  if (!durationSec || durationSec <= 0) return null;

  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.max(1, Math.round((durationSec % 3600) / 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function buildRows({
  videos,
  continueWatching,
  unlockedVideos,
  language
}: {
  videos: HomeVideo[];
  continueWatching: HomeVideo[];
  unlockedVideos: HomeVideo[];
  language: string;
}) {
  const copy = getUiCopy(language);
  const rows: HomeRow[] = [];

  if (continueWatching.length) {
    rows.push({
      title: copy.continueWatchingRow,
      description: copy.continueWatchingSummary,
      items: continueWatching.slice(0, 12)
    });
  }

  if (unlockedVideos.length) {
    rows.push({
      title: copy.unlockedMovies,
      description: copy.unlockedMoviesSummary,
      items: unlockedVideos.slice(0, 12)
    });
  }

  if (videos.length) {
    rows.push({
      title: copy.trendingNow,
      description: copy.trendingNowSummary,
      items: videos.slice(0, 12)
    });
  }

  const familyNight = videos.filter((video) => video.ageRating === 'ALL' || video.ageRating === 'PG13');
  if (familyNight.length >= 2) {
    rows.push({
      title: copy.familyNight,
      description: copy.familyNightSummary,
      items: familyNight.slice(0, 12)
    });
  }

  const quickPicks = videos.filter((video) => video.durationSec <= 30 * 60 || ['SHORT', 'SKIT'].includes(video.videoType));
  if (quickPicks.length >= 2) {
    rows.push({
      title: copy.quickPicks,
      description: copy.quickPicksSummary,
      items: quickPicks.slice(0, 12)
    });
  }

  const byCategory = new Map<string, HomeVideo[]>();
  for (const video of videos) {
    const current = byCategory.get(video.category) ?? [];
    current.push(video);
    byCategory.set(video.category, current);
  }

  for (const [category, items] of byCategory) {
    if (items.length >= 2) {
      rows.push({
        title: category,
        description: `Explore more from ${category.toLowerCase()}.`,
        items: items.slice(0, 12)
      });
    }
  }

  return rows.slice(0, 6);
}

export default async function HomePage() {
  const language = 'en';
  const copy = getUiCopy(language);
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
    videos = (await getApprovedCatalogVideos()).slice(0, 30);
  } catch {
    videos = [];
  }

  const pricingConfig = await getFinanceConfig();
  const continueWatching: HomeVideo[] = [];
  const unlockedVideos: HomeVideo[] = [];
  const featured = videos[0] ?? null;
  const featuredPoster = getMediaAssetUrl(featured?.posterKey);
  const rows = buildRows({ videos, continueWatching, unlockedVideos, language });
  const featuredRuntime = formatRuntime(featured?.durationSec);

  return (
    <div className="viewer-home">
      <PublicPageAutoRedirect allowedPath="/browse" />
      <section
        className="home-hero"
        style={featuredPoster ? { backgroundImage: `linear-gradient(90deg, rgba(3, 5, 14, 0.92) 0%, rgba(3, 5, 14, 0.58) 48%, rgba(3, 5, 14, 0.88) 100%), url(${featuredPoster})` } : undefined}
      >
        <div className="container home-hero-inner">
          <div className="home-hero-layout">
            <div className="home-hero-copy">
              <span className="home-kicker">{continueWatching.length ? copy.watchStory : copy.nowStreaming}</span>
              <h1 className="home-title">
                {featured?.title ?? 'Stream bold films and series on ACE Studio'}
              </h1>
              <p className="home-summary">
                {featured?.description ?? 'Discover standout stories from the ACE Studio catalog.'}
              </p>
              <div className="home-actions">
                <Link className="btn btn-primary" href={featured ? `/v/${featured.id}` : '/auth/register'}>
                  {featured ? copy.watchNow : copy.createAccount}
                </Link>
                <Link className="btn btn-ghost" href="/browse">{copy.browseCatalog}</Link>
              </div>
              {featured ? (
                <div className="home-badges">
                  <span className="badge">{featured.category}</span>
                  <span className="badge">{featured.videoType}</span>
                  <span className="badge">{featured.ageRating}</span>
                </div>
              ) : null}
              {featured ? (
                <div className="home-feature-band">
                  <div className="home-feature-stat">
                    <span className="home-feature-label">Featured now</span>
                    <strong>{featured.category}</strong>
                  </div>
                  {featured.releaseYear ? (
                    <div className="home-feature-stat">
                      <span className="home-feature-label">Year</span>
                      <strong>{featured.releaseYear}</strong>
                    </div>
                  ) : null}
                  {featuredRuntime ? (
                    <div className="home-feature-stat">
                      <span className="home-feature-label">Runtime</span>
                      <strong>{featuredRuntime}</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="home-shelves">
        <div className="container">
          {rows.length ? (
            rows.map((row) => (
              <div key={row.title} className="home-shelf">
                <div className="home-shelf-header">
                  <div>
                    <h2>{row.title}</h2>
                    <p className="muted" style={{ marginBottom: 0 }}>{row.description}</p>
                  </div>
                </div>
                <div className="home-carousel">
                  {row.items.map((video) => (
                    <div key={`${row.title}-${video.id}`} className="home-carousel-item">
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
              </div>
            ))
          ) : (
            <div className="home-empty">
              <h2>{copy.freshReleases}</h2>
              <p className="muted">{copy.freshReleasesSummary}</p>
              <div className="home-actions">
                <Link className="btn btn-primary" href="/auth/register">{copy.createAccount}</Link>
                <Link className="btn btn-ghost" href="/auth/login">{copy.signIn}</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
