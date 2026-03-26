import Link from 'next/link';
import { notFound } from 'next/navigation';
import PromoteAdminButton from '@/components/PromoteAdminButton';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  await requireAdminUser(`/admin/users/${params.id}`);

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      wallet: true,
      creator: {
        include: {
          settlements: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { video: { select: { title: true } } }
          }
        }
      },
      supportTickets: {
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      unlocks: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { video: { select: { title: true } } }
      }
    }
  });

  if (!user) {
    notFound();
  }

  const creatorSettlements = user.creator?.settlements ?? [];

  return (
    <DashboardShell
      title={user.creator?.displayName ?? user.name ?? user.email}
      description="Read-only account view for admin support, finance tracing, and creator issue resolution."
      sideNav={
        <SideNav
          active="/admin/users"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Creator intake' },
            { href: '/admin/finance', label: 'Finance' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/support', label: 'Support' },
            { href: '/admin/node', label: 'Infrastructure' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
      actions={
        <div className="action-list">
          <PromoteAdminButton userId={user.id} email={user.email} role={user.role} />
          <Link className="btn btn-ghost" href={`mailto:${user.email}`}>Email user</Link>
          <Link className="btn btn-ghost" href="/admin/users">Back to users</Link>
        </div>
      }
    >
      <div className="grid">
        <div className="card">
          <h3>Account summary</h3>
          <div className="stack-list">
            <span className="muted">Email: {user.email}</span>
            <span className="muted">Phone: {user.phone}</span>
            <span className="muted">Role: {user.role}</span>
            <span className="muted">Signup intent: {user.signupIntent}</span>
            <span className="muted">Creator access: {user.creatorAccessStatus}</span>
            <span className="muted">Viewer wallet: NGN {user.wallet?.balanceNaira ?? 0}</span>
            <span className="muted">Viewer credits: {user.wallet?.credits ?? 0}</span>
          </div>
        </div>

        <div className="card">
          <h3>Creator account</h3>
          {user.creator ? (
            <div className="stack-list">
              <span className="muted">Creator number: {user.creator.creatorNumber ?? 'Pending'}</span>
              <span className="muted">Display name: {user.creator.displayName}</span>
              <span className="muted">Creator wallet: NGN {user.creator.earningsBalanceNaira}</span>
              <span className="muted">Verified: {user.creator.verified ? 'Yes' : 'No'}</span>
              <span className="muted">NIN: {user.creator.ninNumber ?? 'Not provided'}</span>
              <span className="muted">Bank: {user.creator.bankName ?? 'Not provided'}</span>
              <span className="muted">Bank account name: {user.creator.bankAccountName ?? 'Not provided'}</span>
              <span className="muted">Bank account number: {user.creator.bankAccountNumber ?? 'Not provided'}</span>
            </div>
          ) : (
            <p className="muted">No creator profile on this account yet.</p>
          )}
        </div>

        <div className="card">
          <h3>Recent viewer wallet statements</h3>
          {user.payments.length ? (
            <div className="stack-list">
              {user.payments.map((payment) => (
                <div key={payment.id} className="stack-row">
                  <div>
                    <strong>{payment.reference}</strong>
                    <p className="muted">{payment.gateway} | {payment.status} | {payment.createdAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <span>NGN {payment.amountNaira}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No wallet payment records yet.</p>
          )}
        </div>

        <div className="card">
          <h3>Recent movie unlocks</h3>
          {user.unlocks.length ? (
            <div className="stack-list">
              {user.unlocks.map((unlock) => (
                <div key={unlock.id} className="stack-row">
                  <div>
                    <strong>{unlock.video.title}</strong>
                    <p className="muted">{unlock.createdAt.toISOString().slice(0, 10)} | {unlock.source}</p>
                  </div>
                  <span>NGN {unlock.amountNaira}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No unlocks recorded yet.</p>
          )}
        </div>

        <div className="card">
          <h3>Recent support requests</h3>
          {user.supportTickets.length ? (
            <div className="stack-list">
              {user.supportTickets.map((ticket) => (
                <div key={ticket.id} className="stack-row">
                  <div>
                    <strong>{ticket.subject}</strong>
                    <p className="muted">{ticket.category} | {ticket.status}</p>
                  </div>
                  <span>{ticket.createdAt.toISOString().slice(0, 10)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No support messages for this account yet.</p>
          )}
        </div>

        <div className="card">
          <h3>Recent creator earnings statements</h3>
          {creatorSettlements.length ? (
            <div className="stack-list">
              {creatorSettlements.map((settlement) => (
                <div key={settlement.id} className="stack-row">
                  <div>
                    <strong>{settlement.video.title}</strong>
                    <p className="muted">{settlement.createdAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <span>Creator NGN {settlement.creatorNaira}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No creator settlement records yet.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
