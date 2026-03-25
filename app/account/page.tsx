import Link from 'next/link';
import AccountActions from '@/components/AccountActions';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function AccountPage() {
  const user = await getCurrentUser();

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

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.sub } });
  const supportTickets = await prisma.supportTicket.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: 'desc' },
    take: 3
  });

  return (
    <div className="section">
      <div className="container">
        <div className="grid">
          <div className="card">
            <h2>Account</h2>
            <p className="muted">{user.name ?? 'No name yet'}</p>
            <p className="muted">{user.email}</p>
            <p className="muted">{user.phone}</p>
            <p className="muted">Email verified: {user.emailVerified ? 'Yes' : 'Pending'}</p>
            <p className="muted">Wallet balance: NGN {wallet?.balanceNaira ?? 0}</p>
            <p className="muted">Account type: {user.signupIntent === 'CREATOR' ? 'Film creator' : 'Viewer'}</p>
            {user.signupIntent === 'CREATOR' && user.role === 'USER' ? (
              <p className="muted">
                Creator onboarding status:{' '}
                {user.creatorAccessStatus === 'REQUESTED'
                  ? 'Requested'
                  : user.creatorAccessStatus === 'INVITED'
                    ? 'Access granted'
                    : user.creatorAccessStatus}
              </p>
            ) : null}
            <AccountActions />
          </div>

          <div className="card card-soft">
            <h3>Contact admin</h3>
            <p className="muted">Get help with payments, account access, and catalog issues directly from your account.</p>
            <div className="action-list">
              <Link className="btn btn-ghost" href="/wallet">Open wallet</Link>
              <Link className="btn btn-primary" href="/account/contact">Open contact</Link>
              {user.signupIntent === 'CREATOR' && user.creatorAccessStatus === 'INVITED' ? (
                <Link className="btn btn-ghost" href="/studio/onboarding">Continue creator onboarding</Link>
              ) : null}
            </div>
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
