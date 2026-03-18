'use client';

type CreatorRow = {
  id: string;
  email: string;
  phone: string;
  role: string;
  joinedAt: string;
  creator: null | {
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
      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Verification</th>
            <th>Reliability</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.phone}</td>
              <td>{user.role}</td>
              <td>
                {user.creator ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                ) : '--'}
              </td>
              <td>
                {user.creator ? (
                  <div className="muted" style={{ maxWidth: 280 }}>
                    <div>{user.creator.displayName}</div>
                    <div>{user.creator.ninNumber || 'No NIN'}</div>
                    <div>{user.creator.bankName || 'No bank'}</div>
                    <div>{user.creator.reliabilityNotes || 'No notes'}</div>
                  </div>
                ) : '--'}
              </td>
              <td>{user.joinedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
