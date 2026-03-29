import Link from 'next/link';
import { headers } from 'next/headers';
import WalletClient from '@/components/WalletClient';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { formatRecordedCharge } from '@/lib/format';
import { getChargeForNaira, getFamilyPassPriceFromConfig, getRegionalCurrency } from '@/lib/pricing';

const PASS_PRICE_NAIRA = 2500;

function getPaymentLabel(payment: {
  reference: string;
  metadata: unknown;
}) {
  const metadata = payment.metadata as { type?: string } | null;
  switch (metadata?.type) {
    case 'pass':
      return 'Hybrid pass';
    case 'family':
      return 'Family bundle';
    case 'topup':
      return 'Wallet top-up';
    default:
      return payment.reference;
  }
}

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
  const requestHeaders = headers();
  const region = getRegionalCurrency(requestHeaders);
  const financeConfig = await getFinanceConfig();
  const passCharge = getChargeForNaira(requestHeaders, PASS_PRICE_NAIRA);
  const familyPassCharge = getFamilyPassPriceFromConfig(requestHeaders, financeConfig);

  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: 20 }}>
          <div className="pill">Wallet</div>
          <h1 className="hero-title" style={{ marginTop: 12 }}>Manage balance, credits, and family sharing.</h1>
        </div>
        <WalletClient
          balance={wallet?.balanceNaira ?? 0}
          credits={wallet?.credits ?? 0}
          passCredits={pass?.creditsRemaining ?? 0}
          isDiaspora={region.region === 'DIASPORA'}
          checkoutCurrency={region.currency}
          passChargeLabel={formatRecordedCharge({
            amountMinor: passCharge.amountMinor,
            amountNaira: PASS_PRICE_NAIRA,
            currency: passCharge.currency
          })}
          familyPassChargeLabel={
            familyPassCharge.amountMinor > 0
              ? formatRecordedCharge({
                  amountMinor: familyPassCharge.amountMinor,
                  amountNaira: familyPassCharge.amountNaira,
                  currency: familyPassCharge.currency
                })
              : null
          }
        />
        <div className="grid" style={{ marginTop: 20 }}>
          <div className="card">
            <h3>Recently unlocked</h3>
            {recentUnlocks.length ? (
              <div className="stack-list">
                {recentUnlocks.map((unlock) => (
                  <div key={unlock.id} className="stack-row">
                    <div>
                      <strong>{unlock.video.title}</strong>
                      <p className="muted">
                        {unlock.source}
                        {unlock.amountNaira > 0
                          ? ` | ${formatRecordedCharge({
                              amountMinor: unlock.amountMinor,
                              amountNaira: unlock.amountNaira,
                              currency: unlock.currency
                            })}`
                          : ''}
                      </p>
                    </div>
                    <span className="muted">{unlock.createdAt.toISOString().slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No unlocked titles yet.</p>
            )}
          </div>
        </div>
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Wallet activity</h3>
          {payments.length ? (
            <div className="stack-list">
              {payments.map((payment) => (
                <div key={payment.id} className="stack-row">
                  <div>
                    <strong>{getPaymentLabel(payment)}</strong>
                    <p className="muted">
                      {payment.gateway} | {payment.status} | {payment.createdAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <span>
                    {formatRecordedCharge({
                      amountMinor: payment.amountMinor,
                      amountNaira: payment.amountNaira,
                      currency: payment.currency
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No wallet activity yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
