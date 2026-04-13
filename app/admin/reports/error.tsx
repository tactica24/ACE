'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function AdminReportsError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin reports route error', error);
  }, [error]);

  return (
    <div className="section">
      <div className="container">
        <div className="card">
          <span className="pill">Reports unavailable</span>
          <h1 className="hero-title" style={{ fontSize: '2.2rem', marginTop: 12 }}>The investor reports page hit a server issue</h1>
          <p className="muted">
            The reporting route is now isolated so it should stop showing the generic application crash screen. If this happens again,
            the digest below will help trace the exact production error.
          </p>
          <div className="stack-list" style={{ marginTop: 18 }}>
            <span className="muted">Digest: {error.digest ?? 'Not provided'}</span>
            <span className="muted">Message: {error.message || 'Unexpected server error'}</span>
          </div>
          <div className="action-list" style={{ marginTop: 18 }}>
            <button className="btn btn-primary" type="button" onClick={() => reset()}>
              Retry reports
            </button>
            <Link className="btn btn-ghost" href="/admin/finance">Open finance console</Link>
            <Link className="btn btn-ghost" href="/admin">Back to admin dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
