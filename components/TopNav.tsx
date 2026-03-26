import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import UserMenu from '@/components/UserMenu';

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
            <UserMenu
              name={user.name ?? user.email}
              email={user.email}
              showCreatorStudio={user.role === 'CREATOR' || user.role === 'ADMIN'}
              showCreatorOnboarding={user.signupIntent === 'CREATOR' && user.creatorAccessStatus === 'INVITED'}
            />
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
