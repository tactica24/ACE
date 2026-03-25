'use client';

import { useState } from 'react';
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
      {tickets.length === 0 ? (
        <div className="card">
          <h3>Support inbox is clear</h3>
          <p className="muted">New user and creator contact requests will appear here.</p>
        </div>
      ) : (
        tickets.map((ticket) => (
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
    <div className="card">
      <div className="stack-row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div className="stack-list" style={{ gap: 6, flex: 1 }}>
          <strong>{ticket.subject}</strong>
          <span className="muted">
            {supportCategoryLabels[ticket.category]} | {supportStatusLabels[ticket.status]} | {ticket.createdAt}
          </span>
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
          <button className="btn btn-ghost" disabled={saving} onClick={() => onSave(ticket.id, 'IN_PROGRESS', notes)}>
            In progress
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={() => onSave(ticket.id, 'RESOLVED', notes)}>
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
}
