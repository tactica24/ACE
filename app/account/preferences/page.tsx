import Link from 'next/link';
import { headers } from 'next/headers';

import AccountActions from '@/components/AccountActions';
import AccountVerificationPanel from '@/components/AccountVerificationPanel';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

function PreferenceStatus({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="stack-row" style={{ justifyContent: 'space-between', gap: 16 }}>
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default async function PreferencesPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="section">
        <div className="container">
          <div className="card">
            <h2>Preferences</h2>
            <p className="muted">Sign in to view your account settings.</p>
            <Link className="btn btn-primary" href="/auth/login">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const requestHeaders = headers();
  const [wallet, supportTickets, unlockCount] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.sub } }),
    prisma.supportTicket.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.unlock.count({ where: { userId: user.sub } }),
  ]);

  const balanceLabel = getRegionalMoneyDisplay(
    requestHeaders,
    wallet?.balanceNaira ?? 0
  ).label;
  const acceptLanguage = requestHeaders.get('accept-language') ?? 'Unknown';

  return (
    <div className="section">
      <div className="container">
        <div className="stack-list">
          <div className="card">
            <h2>Preferences</h2>
            <p className="muted">
              This page only shows live account state and supported account actions.
            </p>
            <AccountVerificationPanel
              email={user.email}
              initialEmailVerified={Boolean(user.emailVerified)}
            />
            <div className="stack-list" style={{ marginTop: 16 }}>
              <PreferenceStatus label="Name" value={user.name?.trim() || user.email.split('@')[0]} />
              <PreferenceStatus label="Role" value={user.signupIntent === 'CREATOR' ? 'Producer' : 'Viewer'} />
              <PreferenceStatus label="Wallet balance" value={balanceLabel} />
              <PreferenceStatus label="Unlocked titles" value={String(unlockCount)} />
              <PreferenceStatus label="Browser locale" value={acceptLanguage} />
            </div>
            <div style={{ marginTop: 16 }}>
              <AccountActions />
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
                    <span className="muted">
                      {ticket.createdAt.toISOString().slice(0, 10)}
                    </span>
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
