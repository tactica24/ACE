'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type StatementRow = {
  id: string;
  reportCode: string;
  status: string;
  monthKey: string;
  rightsHolder: string;
  titleCount: number;
  currentAmountDueNaira: number;
  createdAt: string;
  updatedAt: string;
};

const STATUS_FLOW = ['DRAFT', 'REVIEWED', 'APPROVED', 'ISSUED', 'PAID', 'SUPERSEDED'] as const;

export default function AdminReportRecordsPanel({
  monthKey,
  selectedVideoIds,
  recentStatements,
  activeStatementId,
  amountFormatter
}: {
  monthKey: string;
  selectedVideoIds: string[];
  recentStatements: StatementRow[];
  activeStatementId?: string | null;
  amountFormatter: (amountNaira: number) => string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function saveStatement() {
    setFeedback(null);

    const response = await fetch('/api/admin/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monthKey,
        selectedVideoIds
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error ?? 'Unable to save this statement right now.');
    }

    setFeedback(`Saved ${data.reportCode} as a draft statement.`);
    router.push(`/admin/reports?statementId=${encodeURIComponent(data.statementId)}`);
    router.refresh();
  }

  async function updateStatus(statementId: string, status: (typeof STATUS_FLOW)[number]) {
    setFeedback(null);

    const response = await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statementId,
        status
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error ?? 'Unable to update report status right now.');
    }

    setFeedback(`Statement moved to ${data.status}.`);
    router.refresh();
  }

  return (
    <div className="card no-print">
      <div className="reports-records-header">
        <div>
          <h3>Saved statements</h3>
          <p className="muted">Persist each monthly report as a controlled statement record, then advance it through review, approval, issue, and payment.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={isPending || selectedVideoIds.length === 0}
          onClick={() => startTransition(() => void saveStatement().catch((error) => setFeedback(error.message)))}
        >
          {isPending ? 'Saving...' : 'Save as statement'}
        </button>
      </div>

      {feedback ? <p className="muted" style={{ marginTop: 10 }}>{feedback}</p> : null}

      {recentStatements.length ? (
        <div className="stack-list" style={{ marginTop: 16 }}>
          {recentStatements.map((statement) => (
            <div
              key={statement.id}
              className={`reports-record-row ${activeStatementId === statement.id ? 'active' : ''}`}
            >
              <div className="reports-record-copy">
                <strong>{statement.reportCode}</strong>
                <p className="muted">{statement.rightsHolder} | {statement.titleCount} titles | {statement.monthKey}</p>
                <p className="muted">Current due {amountFormatter(statement.currentAmountDueNaira)}</p>
              </div>
              <div className="reports-record-actions">
                <span className={`status-chip ${
                  statement.status === 'PAID' || statement.status === 'ISSUED'
                    ? 'status-live'
                    : statement.status === 'SUPERSEDED'
                      ? 'status-warn'
                      : 'status-review'
                }`}>
                  {statement.status}
                </span>
                <Link className="btn btn-ghost btn-compact" href={`/admin/reports?statementId=${statement.id}`}>
                  Open
                </Link>
                <select
                  className="input reports-status-select"
                  defaultValue={statement.status}
                  disabled={isPending}
                  onChange={(event) =>
                    startTransition(() =>
                      void updateStatus(statement.id, event.target.value as (typeof STATUS_FLOW)[number]).catch((error) =>
                        setFeedback(error.message)
                      )
                    )
                  }
                >
                  {STATUS_FLOW.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 16 }}>No report statements have been saved yet.</p>
      )}
    </div>
  );
}
