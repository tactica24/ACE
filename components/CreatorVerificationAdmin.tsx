'use client';

import Link from 'next/link';
import PromoteAdminButton from '@/components/PromoteAdminButton';

export type CreatorRow = {
  id: string;
  email: string;
  phone: string;
  role: string;
  signupIntent: string;
  creatorAccessStatus: string;
  joinedAt: string;
  creator: null | {
    creatorNumber?: string | null;
    earningsBalanceNaira?: number;
    displayName: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    ninVerified: boolean;
    idVerified: boolean;
    bankVerified: boolean;
    verified: boolean;
    ninNumber?: string | null;
    idCardUrl?: string | null;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    reliabilityNotes?: string | null;
  };
};

const verificationFields = [
  { key: 'phoneVerified', label: 'Phone' },
  { key: 'emailVerified', label: 'Email' },
  { key: 'ninVerified', label: 'NIN' },
  { key: 'idVerified', label: 'ID' },
  { key: 'bankVerified', label: 'Bank' }
] as const;

export default function CreatorVerificationAdmin({ initialUsers }: { initialUsers: CreatorRow[] }) {
  const users = initialUsers;

  const toggle = async (userId: string, field: (typeof verificationFields)[number]['key'], current: boolean) => {
    await fetch('/api/admin/creators/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, field, value: !current })
    });
    window.location.reload();
  };

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Intent</th>
              <th>Account</th>
              <th>Verification</th>
              <th>Creator profile</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>
                  <div className="stack-list" style={{ gap: 8 }}>
                    <strong>{user.role}</strong>
                    <PromoteAdminButton
                      userId={user.id}
                      email={user.email}
                      role={user.role}
                      className="btn btn-ghost"
                    />
                  </div>
                </td>
                <td>
                  <div className="stack-list" style={{ gap: 4 }}>
                    <strong>{user.signupIntent}</strong>
                    <span className="muted">{user.creatorAccessStatus}</span>
                  </div>
                </td>
                <td>
                  <Link className="btn btn-ghost" href={`/admin/users/${user.id}`}>
                    Open account
                  </Link>
                </td>
                <td>
                  {user.creator ? (
                    <div className="action-list">
                      {verificationFields.map((field) => {
                        const active = Boolean(user.creator?.[field.key]);
                        return (
                          <button
                            key={field.key}
                            className={active ? 'btn btn-primary' : 'btn btn-ghost'}
                            style={{ padding: '8px 12px', fontSize: '0.78rem' }}
                            onClick={() => toggle(user.id, field.key, active)}
                          >
                            {field.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="muted">No creator profile</span>
                  )}
                </td>
                <td>
                  {user.creator ? (
                    <div className="stack-list" style={{ gap: 6, minWidth: 220 }}>
                      <strong>{user.creator.displayName}</strong>
                      <span className="muted">{user.creator.creatorNumber || 'No creator number yet'}</span>
                      <span className="muted">Earnings wallet: NGN {user.creator.earningsBalanceNaira ?? 0}</span>
                      <span className="muted">{user.creator.ninNumber || 'No NIN on file'}</span>
                      <span className="muted">{user.creator.bankName || 'No bank on file'}</span>
                      <span className="muted">{user.creator.reliabilityNotes || 'No release notes added'}</span>
                    </div>
                  ) : (
                    <span className="muted">Not started</span>
                  )}
                </td>
                <td>{user.joinedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
