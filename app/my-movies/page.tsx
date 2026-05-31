import Link from 'next/link';
import { headers } from 'next/headers';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { onlyCatalogVideosWithPosters } from '@/lib/catalog-posters';
import { prisma } from '@/lib/db';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalMoneyDisplay } from '@/lib/pricing';
import { getViewerReadyAnyVideoWhere } from '@/lib/video-visibility';

type LibraryVideo = {
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
  series?: {
    posterKey: string | null;
  } | null;
};

function toLibraryCard(video: LibraryVideo, options?: { progressPercent?: number; accessLabel?: string }) {
  return {
    ...video,
    posterKey: video.posterKey ?? video.series?.posterKey ?? null,
    progressPercent: options?.progressPercent,
    accessLabel: options?.accessLabel
  };
}

function toProgressPercent(progressSec: number, durationSec: number) {
  return Math.max(1, Math.min(99, Math.round((progressSec / Math.max(durationSec, 1)) * 100)));
}

export default async function MyMoviesPage() {
  const user = await getCurrentUser();
  const requestHeaders = headers();

  if (!user) {
    return (
      <div className="section">
        <div className="container">
          <div className="card">
            <h3>Sign in to view My Movies</h3>
            <Link className="btn btn-primary" href="/auth/login">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  const [wallet, recentUnlocks, continueWatching, totalUnlocks, activeProgressCount] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.sub } }),
    prisma.unlock.findMany({
      where: {
        userId: user.sub,
        video: getViewerReadyAnyVideoWhere()
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
      include: {
        video: {
          select: {
            id: true,
            title: true,
            seriesId: true,
            description: true,
            priceTier: true,
            unlockPrice: true,
            posterKey: true,
            genres: true,
            durationSec: true,
            releaseYear: true,
            videoType: true,
            ageRating: true,
            category: true,
            series: {
              select: {
                posterKey: true
              }
            }
          }
        }
      }
    }),
    prisma.watchHistory.findMany({
      where: {
        userId: user.sub,
        completedAt: null,
        video: getViewerReadyAnyVideoWhere()
      },
      orderBy: { updatedAt: 'desc' },
      take: 24,
      include: {
        video: {
          select: {
            id: true,
            title: true,
            seriesId: true,
            description: true,
            priceTier: true,
            unlockPrice: true,
            posterKey: true,
            genres: true,
            durationSec: true,
            releaseYear: true,
            videoType: true,
            ageRating: true,
            category: true,
            series: {
              select: {
                posterKey: true
              }
            }
          }
        }
      }
    }),
    prisma.unlock.count({
      where: {
        userId: user.sub,
        video: getViewerReadyAnyVideoWhere()
      }
    }),
    prisma.watchHistory.count({
      where: {
        userId: user.sub,
        completedAt: null,
        video: getViewerReadyAnyVideoWhere()
      }
    })
  ]);

  const continueWatchingCards = onlyCatalogVideosWithPosters(
    continueWatching.map((entry) =>
      toLibraryCard(entry.video as LibraryVideo, {
        progressPercent: toProgressPercent(entry.progressSec, entry.durationSec ?? entry.video.durationSec),
        accessLabel: 'Continue watching'
      })
    )
  );

  const unlockedCards = onlyCatalogVideosWithPosters(
    recentUnlocks.map((unlock) =>
      toLibraryCard(unlock.video as LibraryVideo, {
        accessLabel: 'In your library'
      })
    )
  );

  return (
    <div className="section">
      <div className="container">
        <div className="stack-list">
          <div className="card">
            <h2>My Movies</h2>
            <p className="muted">Unlocked titles and everything you are currently watching.</p>
          </div>

          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-label">Wallet balance</span>
              <strong>{getRegionalMoneyDisplay(requestHeaders, wallet?.balanceNaira ?? 0).label}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Unlocked titles</span>
              <strong>{totalUnlocks}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Continue watching</span>
              <strong>{activeProgressCount}</strong>
            </div>
          </div>

          <div className="card">
            <h3>Continue watching</h3>
            {continueWatchingCards.length === 0 ? (
              <p className="muted">Playback progress will appear here after you start a title.</p>
            ) : (
              <div className="video-grid">
                {continueWatchingCards.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3>Unlocked titles</h3>
            {unlockedCards.length === 0 ? (
              <p className="muted">No unlocks recorded on this account yet.</p>
            ) : (
              <div className="video-grid">
                {unlockedCards.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
