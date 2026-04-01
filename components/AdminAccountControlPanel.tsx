'use client';

import { useState } from 'react';

type AdminAccountControlPanelProps = {
  userId: string;
  email: string;
  role: 'USER' | 'CREATOR' | 'ADMIN';
  signupIntent: 'VIEWER' | 'CREATOR';
  creatorAccessStatus: 'NONE' | 'REQUESTED' | 'INVITED' | 'SUBMITTED';
  hasCreatorProfile: boolean;
  isCurrentAdmin: boolean;
};

export default function AdminAccountControlPanel({
  userId,
  email,
  role,
  signupIntent,
  creatorAccessStatus,
  hasCreatorProfile,
  isCurrentAdmin
}: AdminAccountControlPanelProps) {
  const [nextRole, setNextRole] = useState(role);
  const [nextCreatorStatus, setNextCreatorStatus] = useState(creatorAccessStatus);
  const [confirmation, setConfirmation] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const runAction = async (payload: Record<string, unknown>, loadingKey: string, successMessage: string) => {
    setBusy(loadingKey);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Admin action failed.');
      }

      setFeedback(successMessage);
      if (loadingKey === 'delete-user') {
        window.location.href = '/admin/users';
        return;
      }

      window.location.reload();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Admin action failed.');
    } finally {
      setBusy(null);
    }
  };

  const requireConfirmation = () => confirmation.trim().toLowerCase() === email.toLowerCase();

  return (
    <div className="card">
      <h3>Account controls</h3>
      <p className="muted">
        Change roles, correct producer access, or remove records when the account has no blocking history.
      </p>

      <div className="field-grid field-grid-2">
        <label className="field">
          <span className="field-label">Role access</span>
          <select className="input" value={nextRole} onChange={(event) => setNextRole(event.target.value as typeof role)} disabled={isCurrentAdmin}>
            <option value="USER">Viewer only</option>
            <option value="CREATOR">Producer studio</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">Producer access flow</span>
          <select className="input" value={nextCreatorStatus} onChange={(event) => setNextCreatorStatus(event.target.value as typeof creatorAccessStatus)}>
            <option value="NONE">None</option>
            <option value="REQUESTED">Requested</option>
            <option value="INVITED">Invited</option>
            <option value="SUBMITTED">Submitted</option>
          </select>
        </label>
      </div>

      <div className="action-list" style={{ marginTop: 12 }}>
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy === 'role' || isCurrentAdmin || nextRole === role}
          onClick={() => runAction({ action: 'SET_ROLE', role: nextRole }, 'role', 'Account role updated.')}
        >
          {busy === 'role' ? 'Saving role...' : 'Update role'}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={busy === 'creator-status' || nextCreatorStatus === creatorAccessStatus}
          onClick={() =>
            runAction(
              { action: 'SET_CREATOR_STATUS', creatorAccessStatus: nextCreatorStatus },
              'creator-status',
              'Producer access status updated.'
            )
          }
        >
          {busy === 'creator-status' ? 'Saving status...' : 'Update producer access'}
        </button>
      </div>

      <div className="admin-control-danger">
        <h4 style={{ margin: 0 }}>Restricted actions</h4>
        <p className="muted" style={{ margin: 0 }}>
          Type the account email to unlock destructive actions. The app will still block deletes when financial, support, or content history exists.
        </p>
        <label className="field">
          <span className="field-label">Confirm with account email</span>
          <input
            className="input"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={email}
          />
        </label>
        <div className="action-list">
          {hasCreatorProfile ? (
            <button
              className="btn btn-danger"
              type="button"
              disabled={busy === 'delete-producer' || !requireConfirmation()}
              onClick={() =>
                runAction(
                  { action: 'DELETE_PRODUCER_PROFILE' },
                  'delete-producer',
                  'Producer profile removed.'
                )
              }
            >
              {busy === 'delete-producer' ? 'Removing producer...' : 'Delete producer profile'}
            </button>
          ) : null}
          <button
            className="btn btn-danger"
            type="button"
            disabled={busy === 'delete-user' || !requireConfirmation() || isCurrentAdmin}
            onClick={() => runAction({ action: 'DELETE_USER' }, 'delete-user', 'User deleted.')}
          >
            {busy === 'delete-user' ? 'Deleting user...' : 'Delete user account'}
          </button>
        </div>
      </div>

      <div className="detail-grid" style={{ marginTop: 12 }}>
        <div className="detail-card">
          <span className="detail-label">Current role</span>
          <strong>{role}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Signup intent</span>
          <strong>{signupIntent}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Producer access</span>
          <strong>{creatorAccessStatus}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Producer profile</span>
          <strong>{hasCreatorProfile ? 'On file' : 'None'}</strong>
        </div>
      </div>

      {feedback ? <p className="muted" style={{ marginBottom: 0, marginTop: 14 }}>{feedback}</p> : null}
    </div>
  );
}
