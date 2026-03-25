'use client';

import { useState } from 'react';

export type CreatorIntentRow = {
  id: string;
  email: string;
  phone: string;
  name: string | null;
  role: string;
  creatorAccessStatus: string;
  joinedAt: string;
  onboardingLink: string;
};

export default function CreatorIntakeAdmin({ initialUsers }: { initialUsers: CreatorIntentRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);

  const grantAccess = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch('/api/admin/creator-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, creatorAccessStatus: 'INVITED' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Unable to update creator onboarding access.');

      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, creatorAccessStatus: data.user.creatorAccessStatus } : user
        )
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid">
      {users.length === 0 ? (
        <div className="card">
          <h3>No creator requests yet</h3>
          <p className="muted">New film creator signups will appear here with their email and onboarding status.</p>
        </div>
      ) : (
        users.map((user) => (
          <div key={user.id} className="card">
            <div className="stack-row" style={{ alignItems: 'flex-start', gap: 16 }}>
              <div className="stack-list" style={{ gap: 6, flex: 1 }}>
                <strong>{user.name ?? user.email}</strong>
                <span className="muted">{user.email}</span>
                <span className="muted">{user.phone}</span>
                <span className="muted">
                  Joined {user.joinedAt} | {user.role} | {user.creatorAccessStatus}
                </span>
                <span className="muted">Onboarding link: {user.onboardingLink}</span>
              </div>
              <div className="action-list" style={{ alignItems: 'stretch' }}>
                <a
                  className="btn btn-ghost"
                  href={`mailto:${user.email}?subject=${encodeURIComponent('Ace Studio creator onboarding')}&body=${encodeURIComponent(`Hello,\n\nYour creator onboarding is ready. Please continue here:\n${user.onboardingLink}\n\nRegards,\nAce Studio Admin`)}`}
                >
                  Email creator
                </a>
                <button
                  className="btn btn-primary"
                  disabled={busyId === user.id || user.creatorAccessStatus === 'INVITED' || user.creatorAccessStatus === 'SUBMITTED'}
                  onClick={() => grantAccess(user.id)}
                >
                  {user.creatorAccessStatus === 'INVITED' || user.creatorAccessStatus === 'SUBMITTED'
                    ? 'Access granted'
                    : 'Grant onboarding access'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
