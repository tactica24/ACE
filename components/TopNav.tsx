import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

export default async function TopNav() {
  const user = await getCurrentUser();

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link className="brand" href="/">
          <span className="brand-mark brand-mark-image">
            <Image src="/ace-studio-mark.svg" alt="Ace Studio" width={38} height={38} priority />
          </span>
          <span>
            <strong>Ace Studio</strong>
          </span>
        </Link>
        <div className="nav-links">
          <Link href="/browse">Browse</Link>
          {user ? <Link href="/wallet">Wallet</Link> : null}
        </div>
        <div className="nav-actions">
          {user ? (
            <Link className="btn btn-ghost" href="/account">
              {user.name ?? user.email}
            </Link>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/auth/login">Sign in</Link>
              <Link className="btn btn-primary" href="/auth/register">Create account</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
