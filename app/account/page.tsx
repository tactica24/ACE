import Link from 'next/link';
import { headers } from 'next/headers';
import AccountActions from '@/components/AccountActions';
import AccountVerificationPanel from '@/components/AccountVerificationPanel';
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

export default async function AccountPage() {
  const user = await getCurrentUser();
  const requestHeaders = headers();

  if (!user) {
    return (
      <div className="section">
        <div className="container">
          <div className="card">
            <h3>Sign in to view account</h3>
            <Link className="btn btn-primary" href="/auth/login">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  const [wallet, supportTickets, recentUnlocks, continueWatching, totalUnlocks, activeProgressCount] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.sub } }),
    prisma.supportTicket.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 3
    }),
    prisma.unlock.findMany({
      where: {
        userId: user.sub,
        video: getViewerReadyAnyVideoWhere()
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
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
      take: 5,
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

  const unlockedCards = onlyCatalogVideosWithPosters(
    recentUnlocks.map((unlock) =>
      toLibraryCard(unlock.video as LibraryVideo, {
        accessLabel: 'In your library'
      })
    )
  );

  const continueWatchingCards = onlyCatalogVideosWithPosters(
    continueWatching.map((entry) =>
      toLibraryCard(entry.video as LibraryVideo, {
        progressPercent: toProgressPercent(entry.progressSec, entry.durationSec ?? entry.video.durationSec),
        accessLabel: 'Continue watching'
      })
    )
  );

  return (
    <div className="section">
      <div className="container">
        <div className="stack-list">
          <div className="card">
            <h2>Account</h2>
            <p className="muted">{user.name ?? 'No name yet'}</p>
            <AccountVerificationPanel
              email={user.email}
              initialEmailVerified={Boolean(user.emailVerified)}
            />
            <p className="muted">Wallet balance: {getRegionalMoneyDisplay(requestHeaders, wallet?.balanceNaira ?? 0).label}</p>
            <p className="muted">Account type: {user.signupIntent === 'CREATOR' ? 'Producer' : 'Viewer'}</p>
            {user.signupIntent === 'CREATOR' && user.role === 'USER' ? (
              <p className="muted">
                Producer onboarding status:{' '}
                {!user.emailVerified
                  ? 'Verify email'
                  : user.creatorAccessStatus === 'REQUESTED'
                    ? 'Complete onboarding'
                    : user.creatorAccessStatus === 'SUBMITTED'
                      ? 'Under admin review'
                      : user.creatorAccessStatus}
              </p>
            ) : null}
            <AccountActions />
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
            <div className="detail-card">
              <span className="detail-label">Open support</span>
              <strong>{supportTickets.filter((ticket) => ticket.status !== 'RESOLVED').length}</strong>
            </div>
          </div>

          <div className="card" id="my-movies">
            <h3>My Movies</h3>
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
            <h3>Recent support requests</h3>
            {supportTickets.length === 0 ? (
              <p className="muted">No support requests yet.</p>
            ) : (
              <div className="stack-list">
                {supportTickets.map((ticket) => (
                  <div key={ticket.id} className="stack-row">
                    <div>
                      <strong>{ticket.subject}</strong>
                      <p className="muted">{ticket.status}</p>
                    </div>
                    <span className="muted">{ticket.createdAt.toISOString().slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
