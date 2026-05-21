'use client';

import Link from 'next/link';

export default function StudioErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="section">
      <div className="container">
        <div className="card empty-state">
          <h2>Studio page could not load</h2>
          <p className="muted">
            The page hit a data issue while loading. Try again, return to your studio dashboard, or open your release library.
          </p>
          {error.digest ? <p className="muted">Error reference: {error.digest}</p> : null}
          <div className="action-list">
            <button className="btn btn-primary" type="button" onClick={reset}>
              Try again
            </button>
            <Link className="btn btn-ghost" href="/studio">
              Studio dashboard
            </Link>
            <Link className="btn btn-ghost" href="/studio/library">
              Release library
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
