'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type SupportTicketCategoryValue } from '@/lib/media-types';
import { supportCategoryLabels } from '@/lib/support';

export default function SupportContactForm({
  categories,
  title,
  description
}: {
  categories: SupportTicketCategoryValue[];
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<SupportTicketCategoryValue>(categories[0] ?? 'OTHER');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setFeedback('Enter a subject and message so our support team can help properly.');
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject: subject.trim(), message: message.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to send support request.');
      }

      setSubject('');
      setMessage('');
      setFeedback('Your message has been sent to support.');
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to send support request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div>
        <h3 style={{ marginBottom: 6 }}>{title}</h3>
        <p className="muted" style={{ marginTop: 0 }}>{description}</p>
      </div>
      <label className="field">
        <span className="field-label">Issue type</span>
        <select className="input" value={category} onChange={(event) => setCategory(event.target.value as SupportTicketCategoryValue)}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {supportCategoryLabels[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Subject</span>
        <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} required />
      </label>
      <label className="field">
        <span className="field-label">Message</span>
        <textarea className="input" rows={6} value={message} onChange={(event) => setMessage(event.target.value)} required />
      </label>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send message'}
        </button>
        {feedback ? <p className="muted form-message">{feedback}</p> : null}
      </div>
    </form>
  );
}
