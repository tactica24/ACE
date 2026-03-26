'use client';

import Link from 'next/link';
import ApproveCreatorButton from '@/components/ApproveCreatorButton';
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
    address?: string | null;
    idCardNumber?: string | null;
    idCardUrl?: string | null;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
  };
};

export default function CreatorVerificationAdmin({ initialUsers }: { initialUsers: CreatorRow[] }) {
  const users = initialUsers;

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
              <th>Approval</th>
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
                    <ApproveCreatorButton
                      userId={user.id}
                      approved={user.role === 'CREATOR'}
                      className="btn btn-primary"
                    />
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
                      <span className="muted">{user.creator.address || 'No address on file'}</span>
                      <span className="muted">{user.creator.idCardNumber || 'No ID number on file'}</span>
                      <span className="muted">{user.creator.bankName || 'No bank on file'}</span>
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
