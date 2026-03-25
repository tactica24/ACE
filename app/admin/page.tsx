import Link from 'next/link';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdminUser('/admin');

  let users = 0;
  let videos = 0;
  let pending = 0;
  let creatorsPending = 0;
  let creatorRequests = 0;
  let supportOpen = 0;
  let recentTitles: Array<{ id: string; title: string; status: string; createdAt: Date }> = [];

  try {
    [users, videos, pending, creatorsPending, creatorRequests, supportOpen, recentTitles] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.moderationItem.count({ where: { status: 'PENDING' } }),
      prisma.creatorProfile.count({ where: { verified: false } }),
      prisma.user.count({ where: { signupIntent: 'CREATOR', creatorAccessStatus: 'REQUESTED' } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.video.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true }
      })
    ]);
  } catch {
    users = 0;
    videos = 0;
    pending = 0;
    creatorsPending = 0;
    creatorRequests = 0;
    supportOpen = 0;
    recentTitles = [];
  }

  return (
    <DashboardShell
      title="Admin console"
      description="Review submissions, verify creators, and keep the storefront ready for release."
      sideNav={
        <SideNav
          active="/admin"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Creator intake', count: `${creatorRequests}` },
            { href: '/admin/finance', label: 'Finance' },
            { href: '/admin/moderation', label: 'Moderation', count: `${pending}` },
            { href: '/admin/support', label: 'Support', count: `${supportOpen}` },
            { href: '/admin/node', label: 'Node monitor' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
      actions={<Link className="btn btn-primary" href="/admin/moderation">Open moderation</Link>}
    >
      <div className="metric-grid">
        <div className="metric-card">
          <span className="muted">Users</span>
          <strong>{users}</strong>
          <span className="trend-up">Accounts on platform</span>
        </div>
        <div className="metric-card">
          <span className="muted">Titles</span>
          <strong>{videos}</strong>
          <span className="trend-up">Uploaded to catalog</span>
        </div>
        <div className="metric-card">
          <span className="muted">Pending moderation</span>
          <strong>{pending}</strong>
          <span className={pending > 15 ? 'trend-warn' : 'trend-up'}>
            {pending > 15 ? 'Needs review attention' : 'Within review capacity'}
          </span>
        </div>
        <div className="metric-card">
          <span className="muted">Creators pending verification</span>
          <strong>{creatorsPending}</strong>
          <span className={creatorsPending > 10 ? 'trend-warn' : 'trend-up'}>
            {creatorsPending > 10 ? 'Verification backlog building' : 'Verification queue healthy'}
          </span>
        </div>
        <div className="metric-card">
          <span className="muted">Creator requests</span>
          <strong>{creatorRequests}</strong>
          <span className={creatorRequests > 5 ? 'trend-warn' : 'trend-up'}>
            {creatorRequests > 5 ? 'New creator queue growing' : 'Creator intake under control'}
          </span>
        </div>
        <div className="metric-card">
          <span className="muted">Support inbox</span>
          <strong>{supportOpen}</strong>
          <span className={supportOpen > 10 ? 'trend-warn' : 'trend-up'}>
            {supportOpen > 10 ? 'Support responses need attention' : 'Support queue healthy'}
          </span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Immediate actions</h3>
          <div className="action-list">
            <Link className="btn btn-ghost" href="/admin/intake">Review creator requests</Link>
            <Link className="btn btn-ghost" href="/admin/finance">Open finance console</Link>
            <Link className="btn btn-ghost" href="/admin/moderation">Review pending titles</Link>
            <Link className="btn btn-ghost" href="/admin/users">Check creator verification</Link>
            <Link className="btn btn-ghost" href="/admin/support">Open support inbox</Link>
            <Link className="btn btn-ghost" href="/admin/node">Inspect platform health</Link>
          </div>
        </div>

        <div className="card">
          <h3>Recent uploads</h3>
          {recentTitles.length ? (
            <div className="stack-list">
              {recentTitles.map((video) => (
                <div key={video.id} className="stack-row">
                  <div>
                    <strong>{video.title}</strong>
                    <p className="muted">{video.createdAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <span className={`status-chip ${video.status === 'APPROVED' ? 'status-live' : 'status-review'}`}>{video.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Uploads will appear here as creators submit titles.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
