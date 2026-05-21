import Link from 'next/link';
import { headers } from 'next/headers';
import AccountActions from '@/components/AccountActions';
import AccountVerificationPanel from '@/components/AccountVerificationPanel';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRegionalMoneyDisplay } from '@/lib/pricing';
import { getViewerReadyAnyVideoWhere } from '@/lib/video-visibility';

function getViewerTitleHref(video: { id: string; seriesId?: string | null }) {
  return video.seriesId ? `/v/${video.seriesId}?episode=${video.id}` : `/v/${video.id}`;
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
            seriesId: true
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
            durationSec: true
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

          <div className="card">
            <h3>Recent unlocks</h3>
            {recentUnlocks.length === 0 ? (
              <p className="muted">No unlocks recorded on this account yet.</p>
            ) : (
              <div className="stack-list">
                {recentUnlocks.map((unlock) => (
                  <div key={unlock.id} className="stack-row">
                    <div>
                      <strong>{unlock.video.title}</strong>
                      <p className="muted">{unlock.createdAt.toISOString().slice(0, 10)}</p>
                    </div>
                    <Link className="btn btn-ghost" href={getViewerTitleHref(unlock.video)}>
                      Open title
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3>Continue watching</h3>
            {continueWatching.length === 0 ? (
              <p className="muted">Playback progress will appear here after you start a title.</p>
            ) : (
              <div className="stack-list">
                {continueWatching.map((entry) => {
                  const percent = Math.max(
                    1,
                    Math.min(
                      99,
                      Math.round((entry.progressSec / Math.max(entry.durationSec ?? entry.video.durationSec, 1)) * 100)
                    )
                  );

                  return (
                    <div key={entry.id} className="stack-row">
                      <div>
                        <strong>{entry.video.title}</strong>
                        <p className="muted">{percent}% watched</p>
                      </div>
                      <Link className="btn btn-ghost" href={getViewerTitleHref(entry.video)}>
                        Resume
                      </Link>
                    </div>
                  );
                })}
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
