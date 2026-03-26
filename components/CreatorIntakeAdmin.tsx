'use client';

import Link from 'next/link';
import ApproveCreatorButton from '@/components/ApproveCreatorButton';

export type CreatorIntentRow = {
  id: string;
  email: string;
  phone: string;
  name: string | null;
  role: string;
  creatorAccessStatus: string;
  joinedAt: string;
  emailVerified: boolean;
  creatorProfile: null | {
    address: string | null;
    idCardNumber: string | null;
    idCardUrl: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
  };
};

export default function CreatorIntakeAdmin({ initialUsers }: { initialUsers: CreatorIntentRow[] }) {
  const users = initialUsers;

  return (
    <div className="grid">
      {users.length === 0 ? (
        <div className="card">
          <h3>No creator requests yet</h3>
          <p className="muted">Submitted creator onboarding profiles will appear here for one-time admin review.</p>
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
                <span className="muted">Email verified: {user.emailVerified ? 'Yes' : 'No'}</span>
                {user.creatorProfile ? (
                  <>
                    <span className="muted">Address: {user.creatorProfile.address ?? 'Not provided'}</span>
                    <span className="muted">ID number: {user.creatorProfile.idCardNumber ?? 'Not provided'}</span>
                    <span className="muted">Bank: {user.creatorProfile.bankName ?? 'Not provided'}</span>
                  </>
                ) : (
                  <span className="muted">Onboarding form has not been submitted yet.</span>
                )}
              </div>
              <div className="action-list" style={{ alignItems: 'stretch' }}>
                <Link className="btn btn-ghost" href={`/admin/users/${user.id}`}>
                  Open account
                </Link>
                <ApproveCreatorButton
                  userId={user.id}
                  approved={user.role === 'CREATOR'}
                  className="btn btn-primary"
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
