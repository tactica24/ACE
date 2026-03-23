'use client';

import { useState, type FormEvent } from 'react';

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
      setMessage('Creator profile submitted for review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="form-section">
        <div>
          <h3 className="form-section-title">Profile</h3>
          <p className="muted form-section-copy">This information helps the team verify your public creator identity and payout setup.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Display name</span>
            <input className="input" value={form.displayName} onChange={(event) => handleChange('displayName', event.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">NIN</span>
            <input className="input" value={form.ninNumber} onChange={(event) => handleChange('ninNumber', event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Bio</span>
          <textarea className="input" rows={4} value={form.bio} onChange={(event) => handleChange('bio', event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">ID card upload URL</span>
          <input className="input" value={form.idCardUrl} onChange={(event) => handleChange('idCardUrl', event.target.value)} />
        </label>
      </div>

      <div className="form-section">
        <div>
          <h3 className="form-section-title">Payout details</h3>
          <p className="muted form-section-copy">Bank details are kept in the admin verification view so approvals and settlements line up cleanly.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Bank name</span>
            <input className="input" value={form.bankName} onChange={(event) => handleChange('bankName', event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Bank account name</span>
            <input className="input" value={form.bankAccountName} onChange={(event) => handleChange('bankAccountName', event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Bank account number</span>
          <input className="input" value={form.bankAccountNumber} onChange={(event) => handleChange('bankAccountNumber', event.target.value)} />
        </label>
      </div>

      <div className="form-section">
        <label className="field">
          <span className="field-label">Release history or reliability notes</span>
          <textarea className="input" rows={4} value={form.reliabilityNotes} onChange={(event) => handleChange('reliabilityNotes', event.target.value)} />
        </label>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Submitting profile...' : 'Submit creator profile'}
        </button>
        {message ? <p className="muted form-message">{message}</p> : null}
      </div>
    </form>
  );
}
