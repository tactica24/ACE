import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import LaunchPage from '@/components/LaunchPage';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { formatCurrencyMinor } from '@/lib/format';
import { getMediaAssetUrl } from '@/lib/media';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalCurrency, getRegionalPriceFromConfig } from '@/lib/pricing';
import { UI_LANGUAGE_OPTIONS, getUiCopy } from '@/lib/ui-language';
import { getPreferredUiLanguage } from '@/lib/ui-language-server';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

type HomeVideo = {
  id: string;
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
};

type HomeRow = {
  title: string;
  description: string;
  items: HomeVideo[];
};

function dedupeVideos(videos: HomeVideo[]) {
  const seen = new Set<string>();
  return videos.filter((video) => {
    if (seen.has(video.id)) {
      return false;
    }

    seen.add(video.id);
    return true;
  });
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
  const user = await getCurrentUser();
  if (user) {
    const primaryAppPath = getPrimaryAppPath(user);
    if (primaryAppPath !== '/browse') {
      redirect(primaryAppPath);
    }
  }

  const language = await getPreferredUiLanguage();
  const copy = getUiCopy(language);
  const siteSettings = await getSiteSettings();

  if (siteSettings.homePageMode === 'LAUNCH' && (!user || user.role === 'USER')) {
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

  let continueWatching: HomeVideo[] = [];
  let unlockedVideos: HomeVideo[] = [];

  if (user) {
    const [watchHistory, unlocks] = await Promise.all([
      prisma.watchHistory.findMany({
        where: {
          userId: user.sub,
          completedAt: null,
          progressSec: { gt: 0 },
          video: { status: 'APPROVED' }
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        include: { video: true }
      }),
      prisma.unlock.findMany({
        where: {
          userId: user.sub,
          video: { status: 'APPROVED' }
        },
        orderBy: { createdAt: 'desc' },
        take: 18,
        include: { video: true }
      })
    ]);

    continueWatching = dedupeVideos(
      watchHistory.map((item) => item.video as HomeVideo)
    );
    unlockedVideos = dedupeVideos(
      unlocks.map((item) => item.video as HomeVideo)
    );
  }

  const requestHeaders = headers();
  const pricingConfig = await getFinanceConfig();
  const regionalCurrency = getRegionalCurrency(requestHeaders);
  const featured = continueWatching[0] ?? unlockedVideos[0] ?? videos[0] ?? null;
  const featuredPoster = getMediaAssetUrl(featured?.posterKey);
  const featuredPrice = featured ? getRegionalPriceFromConfig(requestHeaders, featured.priceTier, pricingConfig) : null;
  const rows = buildRows({ videos, continueWatching, unlockedVideos, language });

  return (
    <div className="viewer-home">
      <section
        className="home-hero"
        style={featuredPoster ? { backgroundImage: `linear-gradient(90deg, rgba(3, 5, 14, 0.92) 0%, rgba(3, 5, 14, 0.58) 48%, rgba(3, 5, 14, 0.88) 100%), url(${featuredPoster})` } : undefined}
      >
        <div className="container home-hero-inner">
          <div className="home-hero-layout">
            <div className="home-hero-copy">
              <span className="home-kicker">{continueWatching.length ? copy.watchStory : copy.nowStreaming}</span>
              <h1 className="home-title">
                {featured?.title ?? 'A premium home for bold films, series, and originals'}
              </h1>
              <p className="home-summary">
                {featured?.description ?? 'Discover premium storytelling with regional pricing, multilingual discovery, and a polished viewing experience on every screen.'}
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
              <div className="home-trust-grid">
                <div className="home-trust-card">
                  <span className="home-trust-label">Local checkout</span>
                  <strong>{regionalCurrency.currency}</strong>
                  <p className="muted" style={{ margin: 0 }}>
                    {featuredPrice ? formatCurrencyMinor(featuredPrice.amountMinor, featuredPrice.currency) : 'Regional pricing enabled'}
                  </p>
                </div>
                <div className="home-trust-card">
                  <span className="home-trust-label">Playback flow</span>
                  <strong>Resume beautifully</strong>
                  <p className="muted" style={{ margin: 0 }}>Progress, unlocks, and wallet state stay with the account.</p>
                </div>
                <div className="home-trust-card">
                  <span className="home-trust-label">Global audience</span>
                  <strong>{UI_LANGUAGE_OPTIONS.length} interface languages</strong>
                  <p className="muted" style={{ margin: 0 }}>Designed for multilingual discovery, captions, and family viewing.</p>
                </div>
              </div>
            </div>

            <aside className="home-hero-panel">
              <div className="home-hero-panel-block">
                <span className="home-trust-label">Watching with Ace</span>
                <h2 style={{ margin: '6px 0 0' }}>Premium viewing, designed for audiences across countries, currencies, and languages.</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Localized pricing, progress sync, pass-first unlocks, and easy playback controls keep watching simple on every screen.
                </p>
              </div>
              <div className="home-hero-panel-metrics">
                <div className="home-hero-panel-metric">
                  <span className="home-trust-label">Current region</span>
                  <strong>{regionalCurrency.currency}</strong>
                </div>
                <div className="home-hero-panel-metric">
                  <span className="home-trust-label">Featured price</span>
                  <strong>{featuredPrice ? formatCurrencyMinor(featuredPrice.amountMinor, featuredPrice.currency) : 'Ready'}</strong>
                </div>
              </div>
              <div className="home-language-cloud">
                {UI_LANGUAGE_OPTIONS.map((option) => (
                  <span key={option.code} className="home-language-pill">{option.label}</span>
                ))}
              </div>
            </aside>
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
                        video={{ ...video, price: getRegionalPriceFromConfig(requestHeaders, video.priceTier, pricingConfig) }}
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
