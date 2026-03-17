'use client';

import { useState } from 'react';

export default function CreatorApply() {
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    ninNumber: '',
    idCardUrl: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    reliabilityNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/studio/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unable to save onboarding');
      setMessage('Creator onboarding submitted. Email and phone are captured, while ID, NIN, and bank details await verification review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="card card-soft" style={{ padding: 16 }}>
        <strong>Verification checklist</strong>
        <p className="muted" style={{ marginTop: 8 }}>
          To unlock creator payouts, we collect phone, email, ID card, NIN, and bank account details for trust and settlement review.
        </p>
      </div>
      <input className="input" placeholder="Display name" value={form.displayName} onChange={(e) => handleChange('displayName', e.target.value)} />
      <textarea className="input" rows={3} placeholder="Bio" value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} />
      <div className="grid">
        <input className="input" placeholder="NIN" value={form.ninNumber} onChange={(e) => handleChange('ninNumber', e.target.value)} />
        <input className="input" placeholder="ID card upload URL" value={form.idCardUrl} onChange={(e) => handleChange('idCardUrl', e.target.value)} />
      </div>
      <div className="grid">
        <input className="input" placeholder="Bank name" value={form.bankName} onChange={(e) => handleChange('bankName', e.target.value)} />
        <input className="input" placeholder="Bank account name" value={form.bankAccountName} onChange={(e) => handleChange('bankAccountName', e.target.value)} />
      </div>
      <input className="input" placeholder="Bank account number" value={form.bankAccountNumber} onChange={(e) => handleChange('bankAccountNumber', e.target.value)} />
      <textarea className="input" rows={3} placeholder="Reliability notes, links, or release history" value={form.reliabilityNotes} onChange={(e) => handleChange('reliabilityNotes', e.target.value)} />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit creator onboarding'}
      </button>
      {message ? <p className="muted" style={{ margin: 0 }}>{message}</p> : null}
    </form>
  );
}
