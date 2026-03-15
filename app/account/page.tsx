import { prisma } from '@/lib/db';
import { getAuthCookie, verifyAuthToken } from '@/lib/auth';
import Link from 'next/link';
import AccountActions from '@/components/AccountActions';

export default async function AccountPage() {
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
            <h3>Sign in to view account</h3>
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
        <div className="card">
          <h2>Account</h2>
          <p className="muted">{user.email}</p>
          <p className="muted">{user.phone}</p>
          <p className="muted">Wallet balance: ?{wallet?.balanceNaira ?? 0}</p>
          <AccountActions />
        </div>
      </div>
    </div>
  );
}




