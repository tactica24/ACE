'use client';

import { useMemo, useState } from 'react';
import { type SupportTicketStatusValue } from '@/lib/media-types';
import { supportCategoryLabels, supportStatusLabels } from '@/lib/support';

export type AdminSupportTicketRow = {
  id: string;
  status: SupportTicketStatusValue;
  category: keyof typeof supportCategoryLabels;
  subject: string;
  message: string;
  adminNotes: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    phone: string;
    role: string;
    signupIntent: string;
  };
};

export default function AdminSupportInbox({ initialTickets }: { initialTickets: AdminSupportTicketRow[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SupportTicketStatusValue>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | keyof typeof supportCategoryLabels>('ALL');

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (statusFilter !== 'ALL' && ticket.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'ALL' && ticket.category !== categoryFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchText = [
        ticket.subject,
        ticket.message,
        ticket.user.email,
        ticket.user.phone,
        ticket.user.role,
        ticket.category,
        ticket.status
      ]
        .join(' ')
        .toLowerCase();

      return searchText.includes(normalizedQuery);
    });
  }, [categoryFilter, query, statusFilter, tickets]);

  const saveTicket = async (ticketId: string, status: SupportTicketStatusValue, adminNotes: string) => {
    setSavingId(ticketId);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status, adminNotes })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Unable to update support ticket.');

      setTickets((current) =>
        current.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, status: data.ticket.status, adminNotes: data.ticket.adminNotes }
            : ticket
        )
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="field-grid field-grid-3">
          <label className="field">
            <span className="field-label">Search support</span>
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Subject, user email, phone, message"
            />
          </label>
          <label className="field">
            <span className="field-label">Status</span>
            <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | SupportTicketStatusValue)}>
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'ALL' | keyof typeof supportCategoryLabels)}>
              <option value="ALL">All categories</option>
              {Object.entries(supportCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="action-list" style={{ marginTop: 12 }}>
          <span className="badge">{filteredTickets.length} visible</span>
          <span className="badge">{tickets.filter((ticket) => ticket.status === 'OPEN').length} open</span>
          <span className="badge">{tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length} in progress</span>
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="card">
          <h3>No tickets match this view</h3>
          <p className="muted">Adjust the filters or wait for new viewer and producer requests.</p>
        </div>
      ) : (
        filteredTickets.map((ticket) => (
          <SupportCard key={ticket.id} ticket={ticket} saving={savingId === ticket.id} onSave={saveTicket} />
        ))
      )}
    </div>
  );
}

function SupportCard({
  ticket,
  saving,
  onSave
}: {
  ticket: AdminSupportTicketRow;
  saving: boolean;
  onSave: (ticketId: string, status: SupportTicketStatusValue, adminNotes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(ticket.adminNotes ?? '');

  return (
    <details className="admin-disclosure">
      <summary className="admin-disclosure-summary">
        <div className="admin-disclosure-copy">
          <span className={`status-chip ${ticket.status === 'RESOLVED' ? 'status-live' : 'status-review'}`}>
            {supportStatusLabels[ticket.status]}
          </span>
          <div>
            <strong>{ticket.subject}</strong>
            <p className="muted">
              {supportCategoryLabels[ticket.category]} | {ticket.user.email} | {ticket.createdAt}
            </p>
          </div>
        </div>
        <span className="admin-disclosure-toggle">Open ticket</span>
      </summary>
      <div className="admin-disclosure-body">
        <div className="card">
          <div className="stack-row" style={{ alignItems: 'flex-start', gap: 16 }}>
            <div className="stack-list" style={{ gap: 6, flex: 1 }}>
              <span className="muted">
                {ticket.user.email} | {ticket.user.phone} | {ticket.user.role} | {ticket.user.signupIntent}
              </span>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.message}</p>
              <label className="field">
                <span className="field-label">Admin notes</span>
                <textarea className="input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>
            </div>
            <div className="action-list" style={{ alignItems: 'stretch' }}>
              <a
                className="btn btn-ghost"
                href={`mailto:${ticket.user.email}?subject=${encodeURIComponent(`Re: ${ticket.subject}`)}`}
              >
                Email user
              </a>
              <a className="btn btn-ghost" href={`/admin/users/${ticket.user.id}`}>
                Open support tools
              </a>
              {ticket.category === 'PAYMENT' ? (
                <a className="btn btn-ghost" href={`/admin/users/${ticket.user.id}#payment-incidents`}>
                  Open payment incidents
                </a>
              ) : null}
              <button className="btn btn-ghost" disabled={saving} onClick={() => onSave(ticket.id, 'IN_PROGRESS', notes)}>
                In progress
              </button>
              <button className="btn btn-primary" disabled={saving} onClick={() => onSave(ticket.id, 'RESOLVED', notes)}>
                Resolve
              </button>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}
