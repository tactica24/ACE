import Link from 'next/link';
import AccountActions from '@/components/AccountActions';
import AccountVerificationPanel from '@/components/AccountVerificationPanel';
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
        <div className="stack-list">
          <div className="card">
            <h2>Account</h2>
            <p className="muted">{user.name ?? 'No name yet'}</p>
            <AccountVerificationPanel
              email={user.email}
              phone={user.phone}
              initialEmailVerified={Boolean(user.emailVerified)}
            />
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
