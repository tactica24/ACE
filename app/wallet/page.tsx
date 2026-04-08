import Link from 'next/link';
import { headers } from 'next/headers';
import WalletClient from '@/components/WalletClient';
import { getCurrentUser } from '@/lib/auth';
import { DEFAULT_FAMILY_BUNDLE_CREDITS, PASS_CREDITS, PASS_PRICE_NAIRA } from '@/lib/commerce';
import { formatCredits, getCreditsForNaira, storedUnitsToCredits } from '@/lib/credits';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { getFinanceConfig } from '@/lib/finance';
import { formatRecordedCharge } from '@/lib/format';
import { getChargeForNaira, getFamilyPassPriceFromConfig, getRegionalCurrency } from '@/lib/pricing';

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
  const pass = await prisma.subscriptionPass.findMany({
    where: { userId: user.sub, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'asc' }
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
  const familyBundleCredits = Number(env.ACE_FAMILY_PASS_CREDITS ?? DEFAULT_FAMILY_BUNDLE_CREDITS);

  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: 20 }}>
          <div className="pill">Wallet</div>
          <h1 className="hero-title" style={{ marginTop: 12 }}>Manage balance, credits, and family sharing.</h1>
        </div>
        <WalletClient
          balance={wallet?.balanceNaira ?? 0}
          credits={storedUnitsToCredits(wallet?.credits ?? 0)}
          passCredits={storedUnitsToCredits(pass.reduce((total, item) => total + item.creditsRemaining, 0))}
          passCreditsPerBundle={PASS_CREDITS}
          familyBundleCredits={familyBundleCredits}
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
                          ? ` | ${formatCredits(getCreditsForNaira(unlock.amountNaira))} | ${formatRecordedCharge({
                              amountMinor: unlock.amountMinor ?? unlock.amountNaira * 100,
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
                    {`${formatRecordedCharge({
                      amountMinor: payment.amountMinor ?? payment.amountNaira * 100,
                      amountNaira: payment.amountNaira,
                      currency: payment.currency
                    })} | ${formatCredits(getCreditsForNaira(payment.amountNaira))}`}
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
