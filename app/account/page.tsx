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

  return (
    <div className="section">
      <div className="container">
        <div className="card">
          <h2>Account</h2>
          <p className="muted">{user.name ?? 'No name yet'}</p>
          <p className="muted">{user.email}</p>
          <p className="muted">{user.phone}</p>
          <p className="muted">Email verified: {user.emailVerified ? 'Yes' : 'Pending'}</p>
          <p className="muted">Wallet balance: NGN {wallet?.balanceNaira ?? 0}</p>
          <AccountActions />
        </div>
      </div>
    </div>
  );
}
