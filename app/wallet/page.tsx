import Link from 'next/link';
import WalletClient from '@/components/WalletClient';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: 20 }}>
          <div className="pill">Ace Studio Wallet</div>
          <h1 className="hero-title" style={{ marginTop: 12 }}>Instant unlocks, no delay.</h1>
          <p className="muted">Wallet unlock to play in under 2 seconds.</p>
        </div>
        <WalletClient balance={wallet?.balanceNaira ?? 0} credits={wallet?.credits ?? 0} />
      </div>
    </div>
  );
}
