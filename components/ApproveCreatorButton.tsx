'use client';

import { useState } from 'react';

type ApproveCreatorButtonProps = {
  userId: string;
  approved: boolean;
  className?: string;
};

export default function ApproveCreatorButton({ userId, approved, className = 'btn btn-primary' }: ApproveCreatorButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const approve = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/creators/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to approve creator.');
      }
      setMessage('Creator approved.');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to approve creator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack-list" style={{ gap: 8 }}>
      <button type="button" className={className} onClick={approve} disabled={loading || approved}>
        {approved ? 'Creator approved' : loading ? 'Approving...' : 'Approve creator'}
      </button>
      {message ? <span className="muted">{message}</span> : null}
    </div>
  );
}
