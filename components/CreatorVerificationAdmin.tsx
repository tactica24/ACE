'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
    earningsBalanceLabel?: string;
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
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [producerFilter, setProducerFilter] = useState('ALL');
  const producerProfiles = initialUsers.filter((user) => user.creator).length;
  const pendingReview = initialUsers.filter((user) => user.creatorAccessStatus === 'SUBMITTED').length;
  const admins = initialUsers.filter((user) => user.role === 'ADMIN').length;

  const users = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return initialUsers.filter((user) => {
      if (roleFilter !== 'ALL' && user.role !== roleFilter) {
        return false;
      }

      if (producerFilter === 'WITH_PROFILE' && !user.creator) {
        return false;
      }

      if (producerFilter === 'PENDING_REVIEW' && user.creatorAccessStatus !== 'SUBMITTED') {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchText = [
        user.email,
        user.phone,
        user.role,
        user.signupIntent,
        user.creatorAccessStatus,
        user.creator?.displayName,
        user.creator?.creatorNumber
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(normalizedQuery);
    });
  }, [initialUsers, producerFilter, query, roleFilter]);

  return (
    <div className="card">
      <div className="detail-grid" style={{ marginBottom: 18 }}>
        <div className="detail-card">
          <span className="detail-label">Visible accounts</span>
          <strong>{users.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Producer profiles</span>
          <strong>{producerProfiles}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Pending producer review</span>
          <strong>{pendingReview}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Admins</span>
          <strong>{admins}</strong>
        </div>
      </div>

      <div className="field-grid field-grid-3" style={{ marginBottom: 18 }}>
        <label className="field">
          <span className="field-label">Search accounts</span>
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Email, phone, producer number"
          />
        </label>
        <label className="field">
          <span className="field-label">Role filter</span>
          <select className="input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="ALL">All roles</option>
            <option value="USER">Users</option>
            <option value="CREATOR">Creators</option>
            <option value="ADMIN">Admins</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Producer state</span>
          <select className="input" value={producerFilter} onChange={(event) => setProducerFilter(event.target.value)}>
            <option value="ALL">All accounts</option>
            <option value="WITH_PROFILE">With producer profile</option>
            <option value="PENDING_REVIEW">Pending producer review</option>
          </select>
        </label>
      </div>

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
              <th>Producer profile</th>
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
                    <span className="muted">No producer profile</span>
                  )}
                </td>
                <td>
                  {user.creator ? (
                    <div className="stack-list" style={{ gap: 6, minWidth: 220 }}>
                      <strong>{user.creator.displayName}</strong>
                      <span className="muted">{user.creator.creatorNumber || 'No producer number yet'}</span>
                      <span className="muted">Earnings wallet: {user.creator.earningsBalanceLabel ?? user.creator.earningsBalanceNaira ?? 0}</span>
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
