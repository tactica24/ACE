import WalletClient from '@/components/WalletClient';
import { prisma } from '@/lib/db';
import { getAuthCookie, verifyAuthToken } from '@/lib/auth';
import Link from 'next/link';

export default async function WalletPage() {
  const token = getAuthCookie();
  const user = token ? (() => {
    try {
      return verifyAuthToken(token);
    } catch {
      return null;
    }
  })() : null;

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
          <div className="pill">ACE Wallet</div>
          <h1 className="hero-title" style={{ marginTop: 12 }}>Instant unlocks, no delay.</h1>
          <p className="muted">Wallet unlock to play in under 2 seconds.</p>
        </div>
        <WalletClient balance={wallet?.balanceNaira ?? 0} credits={wallet?.credits ?? 0} />
      </div>
    </div>
  );
}




