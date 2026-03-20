import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyAuthToken } from '@/lib/auth';

function getUser() {
  const token = cookies().get('ace_token')?.value;
  if (!token) return null;
  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

export default function TopNav() {
  const user = getUser();

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link className="brand" href="/">
          <span className="brand-mark brand-mark-image">
            <Image src="/ace-studio-mark.svg" alt="Ace Studio" width={38} height={38} priority />
          </span>
          <span>
            <strong>Ace Studio</strong>
            <small>TV | Mobile | Creator Economy</small>
          </span>
        </Link>
        <div className="nav-links">
          <Link href="/browse">Browse</Link>
          <Link href="/highlights">Highlights</Link>
          <Link href="/wallet">Wallet</Link>
          <Link href="/creator">Creator</Link>
          <Link href="/tv">TV</Link>
          {user?.role === 'ADMIN' ? <Link href="/admin">Admin Console</Link> : null}
        </div>
        <div className="nav-actions">
          {user ? (
            <Link className="btn btn-ghost" href="/account">
              {user.email}
            </Link>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/auth/login">Sign in</Link>
              <Link className="btn btn-primary" href="/auth/register">Join Ace Studio</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
