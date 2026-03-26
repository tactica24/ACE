import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { getApprovedCatalogVideos } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { getMediaAssetUrl } from '@/lib/media';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalPrice } from '@/lib/pricing';
import { getUiCopy } from '@/lib/ui-language';
import { getPreferredUiLanguage } from '@/lib/ui-language-server';

export const dynamic = 'force-dynamic';

type HomeVideo = {
  id: string;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  posterKey: string | null;
  genres: string[];
  durationSec: number;
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
  const featured = continueWatching[0] ?? unlockedVideos[0] ?? videos[0] ?? null;
  const featuredPoster = getMediaAssetUrl(featured?.posterKey);
  const rows = buildRows({ videos, continueWatching, unlockedVideos, language });

  return (
    <div className="viewer-home">
      <section
        className="home-hero"
        style={featuredPoster ? { backgroundImage: `linear-gradient(90deg, rgba(3, 5, 14, 0.92) 0%, rgba(3, 5, 14, 0.58) 48%, rgba(3, 5, 14, 0.88) 100%), url(${featuredPoster})` } : undefined}
      >
        <div className="container home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-kicker">{continueWatching.length ? copy.watchStory : copy.nowStreaming}</span>
            <h1 className="home-title">
              {featured?.title ?? 'Watch bold films, series, and originals in one place'}
            </h1>
            <p className="home-summary">
              {featured?.description ?? 'Create an account, sign in, and start watching a premium lineup built for viewers first.'}
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
                        video={{ ...video, price: getRegionalPrice(requestHeaders, video.priceTier) }}
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
