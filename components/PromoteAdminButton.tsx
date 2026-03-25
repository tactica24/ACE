'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function PromoteAdminButton({
  userId,
  email,
  role,
  className = 'btn btn-primary'
}: {
  userId: string;
  email: string;
  role: string;
  className?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  if (role === 'ADMIN') {
    return <span className="status-chip status-live">Already admin</span>;
  }

  const promote = async () => {
    const confirmed = window.confirm(`Promote ${email} to admin access?`);
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/users/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to promote this user right now.');
      }

      setMessage(`${data.user?.email ?? email} is now an admin.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to promote this user right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack-list" style={{ gap: 8 }}>
      <button className={className} type="button" onClick={() => void promote()} disabled={loading || isPending}>
        {loading || isPending ? 'Promoting...' : 'Make admin'}
      </button>
      {message ? <span className="field-hint">{message}</span> : null}
    </div>
  );
}
