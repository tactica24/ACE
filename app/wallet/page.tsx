import Link from 'next/link';
import { headers } from 'next/headers';
import WalletClient from '@/components/WalletClient';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRegionalCurrency } from '@/lib/pricing';

export default async function WalletPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="section">
        <div className="container">
          <div className="card">
            <h3>Sign in to access wallet</h3>
            <Link className="btn btn-primary" href="/auth/login">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.sub } });
  const pass = await prisma.subscriptionPass.findFirst({
    where: { userId: user.sub, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' }
  });
  const payments = await prisma.payment.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  const recentUnlocks = await prisma.unlock.findMany({
    where: { userId: user.sub },
    include: { video: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
    take: 8
  });
  const region = getRegionalCurrency(headers());

  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: 20 }}>
          <div className="pill">Ace Studio Wallet</div>
          <h1 className="hero-title" style={{ marginTop: 12 }}>Instant unlocks, no delay.</h1>
          <p className="muted">Add funds, unlock titles quickly, and keep track of your recent payments.</p>
        </div>
        <WalletClient
          balance={wallet?.balanceNaira ?? 0}
          credits={wallet?.credits ?? 0}
          passCredits={pass?.creditsRemaining ?? 0}
          isDiaspora={region.region === 'DIASPORA'}
        />
        <div className="grid" style={{ marginTop: 20 }}>
          <div className="card card-soft">
            <h3>How unlocks work</h3>
            <p className="muted">Ace Studio always tries your active pass credits first, then wallet credits, then wallet balance. You are only asked to top up when nothing usable is left.</p>
            <p className="muted" style={{ marginBottom: 0 }}>Your unlocked titles remain tied to this account so you can return and keep watching from where you stopped, while playback stays limited to 3 active devices at a time.</p>
          </div>
          <div className="card">
            <h3>Recent unlock activity</h3>
            {recentUnlocks.length ? (
              <div className="stack-list">
                {recentUnlocks.map((unlock) => (
                  <div key={unlock.id} className="stack-row">
                    <div>
                      <strong>{unlock.video.title}</strong>
                      <p className="muted">{unlock.source} {unlock.amountNaira > 0 ? `| NGN ${unlock.amountNaira}` : ''}</p>
                    </div>
                    <span className="muted">{unlock.createdAt.toISOString().slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Your recent unlocks will appear here once you start watching full titles.</p>
            )}
          </div>
        </div>
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Recent wallet statements</h3>
          {payments.length ? (
            <div className="stack-list">
              {payments.map((payment) => (
                <div key={payment.id} className="stack-row">
                  <div>
                    <strong>{payment.reference}</strong>
                    <p className="muted">
                      {payment.gateway} | {payment.status} | {payment.currency}
                    </p>
                  </div>
                  <span>NGN {payment.amountNaira}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Top-ups and wallet payment statements will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
