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
          <span className="brand-mark">AC</span>
          ACE Studio
        </Link>
        <div className="nav-links">
          <Link href="/browse">Browse</Link>
          <Link href="/highlights">Highlights</Link>
          <Link href="/wallet">Wallet</Link>
          <Link href="/studio">Creator</Link>
          <Link href="/tv">TV</Link>
          {user?.role === 'ADMIN' ? <Link href="/admin">Admin</Link> : null}
        </div>
        <div className="nav-actions">
          {user ? (
            <Link className="btn btn-ghost" href="/account">
              {user.email}
            </Link>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/auth/login">Sign in</Link>
              <Link className="btn btn-primary" href="/auth/register">Join ACE</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}



