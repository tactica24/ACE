'use client';

import { useState } from 'react';

type PayoutRow = {
  id: string;
  creatorName: string;
  creatorEmail: string;
  amountNaira: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  status: string;
  requestedAt: string;
  adminNote: string | null;
};

export default function CreatorPayoutAdmin({ initialRequests }: { initialRequests: PayoutRow[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);

  const updateRequest = async (payoutRequestId: string, action: 'approve' | 'reject' | 'mark_paid') => {
    setBusyId(payoutRequestId);
    try {
      const res = await fetch('/api/admin/creator-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutRequestId, action })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to update payout request.');
      }
      window.location.reload();
    } catch (error) {
      setRequests((current) =>
        current.map((item) =>
          item.id === payoutRequestId
            ? { ...item, adminNote: error instanceof Error ? error.message : 'Unable to update payout request.' }
            : item
        )
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card">
      <h3>Producer payout requests</h3>
      {requests.length ? (
        <div className="stack-list">
          {requests.map((request) => (
            <div key={request.id} className="stack-row" style={{ alignItems: 'flex-start' }}>
              <div className="stack-list" style={{ gap: 6 }}>
                <strong>{request.creatorName}</strong>
                <span className="muted">{request.creatorEmail}</span>
                <span className="muted">NGN {request.amountNaira} | {request.requestedAt}</span>
                <span className="muted">
                  {request.bankName} | {request.bankAccountName} | {request.bankAccountNumber}
                </span>
                {request.adminNote ? <span className="muted">{request.adminNote}</span> : null}
              </div>
              <div className="action-list">
                <span className={`status-chip ${request.status === 'PAID' ? 'status-live' : 'status-review'}`}>{request.status}</span>
                {request.status === 'PENDING' ? (
                  <>
                    <button type="button" className="btn btn-primary" disabled={busyId === request.id} onClick={() => updateRequest(request.id, 'approve')}>
                      Approve
                    </button>
                    <button type="button" className="btn btn-ghost" disabled={busyId === request.id} onClick={() => updateRequest(request.id, 'reject')}>
                      Reject
                    </button>
                  </>
                ) : null}
                {request.status === 'APPROVED' ? (
                  <button type="button" className="btn btn-primary" disabled={busyId === request.id} onClick={() => updateRequest(request.id, 'mark_paid')}>
                    Mark paid
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Producer withdrawal requests will appear here as soon as producers start cashing out.</p>
      )}
    </div>
  );
}
