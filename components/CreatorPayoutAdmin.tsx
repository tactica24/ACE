'use client';

import { useMemo, useState } from 'react';
import AdminDisclosureSection from '@/components/AdminDisclosureSection';

type PayoutRow = {
  id: string;
  creatorName: string;
  creatorEmail: string;
  amountLabel: string;
  settlementLabel: string;
  amountNaira: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | string;
  requestedAt: string;
  reviewedAt?: string | null;
  paidAt?: string | null;
  adminNote: string | null;
};

const STATUS_SECTIONS: Array<{
  key: PayoutRow['status'];
  title: string;
  description: string;
}> = [
  {
    key: 'PENDING',
    title: 'Needs action',
    description: 'Reserved from producer wallets and waiting for admin review.'
  },
  {
    key: 'APPROVED',
    title: 'Approved and waiting transfer',
    description: 'These requests have been approved and should be paid out by operations.'
  },
  {
    key: 'PAID',
    title: 'Completed payouts',
    description: 'Transferred successfully and already reflected as paid in producer history.'
  },
  {
    key: 'REJECTED',
    title: 'Rejected requests',
    description: 'Returned to the producer wallet and stored in request history.'
  }
];

function getStatusChip(status: string) {
  if (status === 'PAID') return 'status-live';
  if (status === 'REJECTED') return 'status-warn';
  return 'status-review';
}

export default function CreatorPayoutAdmin({
  initialRequests,
  reservedExposureLabel
}: {
  initialRequests: PayoutRow[];
  reservedExposureLabel?: string;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initialRequests.map((request) => [request.id, request.adminNote ?? '']))
  );

  const counts = useMemo(() => ({
    pending: requests.filter((request) => request.status === 'PENDING').length,
    approved: requests.filter((request) => request.status === 'APPROVED').length,
    paid: requests.filter((request) => request.status === 'PAID').length,
    rejected: requests.filter((request) => request.status === 'REJECTED').length,
    totalReservedNaira: requests
      .filter((request) => request.status === 'PENDING' || request.status === 'APPROVED')
      .reduce((sum, request) => sum + request.amountNaira, 0)
  }), [requests]);

  const updateRequest = async (payoutRequestId: string, action: 'approve' | 'reject' | 'mark_paid') => {
    setBusyId(payoutRequestId);
    try {
      const res = await fetch('/api/admin/creator-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutRequestId,
          action,
          adminNote: notes[payoutRequestId]?.trim() ?? ''
        })
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

  if (!requests.length) {
    return (
      <div className="card">
        <h3>Producer payout requests</h3>
        <p className="muted">Producer withdrawal requests will appear here as soon as producers start cashing out.</p>
      </div>
    );
  }

  return (
    <div className="stack-list" style={{ gap: 18 }}>
      <div className="card">
        <h3>Payments operations board</h3>
        <p className="muted">Approve, reject, and complete producer withdrawal requests from one organized queue.</p>
        <div className="detail-grid" style={{ marginTop: 14 }}>
          <div className="detail-card">
            <span className="detail-label">Needs action</span>
            <strong>{counts.pending}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Approved waiting transfer</span>
            <strong>{counts.approved}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Completed</span>
            <strong>{counts.paid}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Rejected</span>
            <strong>{counts.rejected}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Reserved exposure</span>
            <strong>{reservedExposureLabel ?? `${counts.totalReservedNaira.toLocaleString()} ledger units`}</strong>
          </div>
        </div>
      </div>

      {STATUS_SECTIONS.map((section) => {
        const rows = requests.filter((request) => request.status === section.key);
        if (!rows.length) return null;

        return (
          <AdminDisclosureSection
            key={section.key}
            title={`${section.title} (${rows.length})`}
            description={section.description}
            badge={section.key}
            defaultOpen={section.key === 'PENDING'}
          >
            <div className="card">
              <div className="stack-list" style={{ marginTop: 16 }}>
                {rows.map((request) => (
                  <div key={request.id} className="payout-admin-row">
                    <div className="stack-list" style={{ gap: 8 }}>
                      <div className="detail-badges">
                        <span className={`status-chip ${getStatusChip(request.status)}`}>{request.status}</span>
                        <span className="badge">Requested {request.requestedAt}</span>
                        {request.reviewedAt ? <span className="badge">Reviewed {request.reviewedAt}</span> : null}
                        {request.paidAt ? <span className="badge">Paid {request.paidAt}</span> : null}
                      </div>
                      <div>
                        <strong>{request.creatorName}</strong>
                        <p className="muted" style={{ margin: '4px 0 0' }}>{request.creatorEmail}</p>
                      </div>
                      <div className="stack-list" style={{ gap: 4 }}>
                        <strong>{request.amountLabel}</strong>
                        {request.settlementLabel !== request.amountLabel ? (
                          <span className="muted">Settlement ledger: {request.settlementLabel}</span>
                        ) : null}
                        <span className="muted">
                          {request.bankName} | {request.bankAccountName} | {request.bankAccountNumber}
                        </span>
                      </div>
                      <label className="field" style={{ margin: 0 }}>
                        <span className="field-label">Admin note</span>
                        <textarea
                          className="input"
                          rows={3}
                          value={notes[request.id] ?? ''}
                          onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                          placeholder="Add a bank reference, rejection reason, or payout note."
                        />
                      </label>
                      {request.adminNote && request.adminNote !== notes[request.id] ? (
                        <p className="muted" style={{ margin: 0 }}>{request.adminNote}</p>
                      ) : null}
                    </div>
                    <div className="action-list">
                      {request.status === 'PENDING' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busyId === request.id}
                            onClick={() => updateRequest(request.id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={busyId === request.id}
                            onClick={() => updateRequest(request.id, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {request.status === 'APPROVED' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busyId === request.id}
                            onClick={() => updateRequest(request.id, 'mark_paid')}
                          >
                            Mark paid
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={busyId === request.id}
                            onClick={() => updateRequest(request.id, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AdminDisclosureSection>
        );
      })}
    </div>
  );
}
