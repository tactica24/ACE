'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';

type CreatorApplyProps = {
  lockedName: string;
  initialProfile?: {
    address?: string;
    idCardNumber?: string;
    idCardUrl?: string;
    bankName?: string;
    bankAccountNumber?: string;
  };
};

export default function CreatorApply({ lockedName, initialProfile }: CreatorApplyProps) {
  const [form, setForm] = useState({
    address: initialProfile?.address ?? '',
    idCardNumber: initialProfile?.idCardNumber ?? '',
    idCardUrl: initialProfile?.idCardUrl ?? '',
    bankName: initialProfile?.bankName ?? '',
    bankAccountNumber: initialProfile?.bankAccountNumber ?? ''
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleIdUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const uploadRes = await fetch('/api/studio/id-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type
        })
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData.url || !uploadData.key) {
        throw new Error(uploadData.error ?? 'Unable to prepare your ID upload.');
      }

      const putRes = await fetch(uploadData.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!putRes.ok) {
        throw new Error('Unable to upload your ID file.');
      }

      setForm((prev) => ({ ...prev, idCardUrl: uploadData.key }));
      setMessage('ID file uploaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload your ID file.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Unable to save onboarding');
      window.location.href = '/creator?submitted=1';
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
          <h3 className="form-section-title">Identity</h3>
          <p className="muted form-section-copy">Your registered name is locked here and will also be used for your payout account name.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Registered name</span>
            <input className="input" value={lockedName} disabled readOnly />
          </label>
          <label className="field">
            <span className="field-label">ID card number</span>
            <input
              className="input"
              value={form.idCardNumber}
              onChange={(event) => handleChange('idCardNumber', event.target.value)}
              required
            />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Address</span>
          <textarea
            className="input"
            rows={3}
            value={form.address}
            onChange={(event) => handleChange('address', event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">ID card upload</span>
          <input className="input" type="file" accept="image/*,application/pdf" onChange={handleIdUpload} />
        </label>
        <p className="muted">
          {form.idCardUrl ? 'ID file uploaded and ready for review.' : 'Upload a clear ID card image or PDF from this device.'}
        </p>
      </div>

      <div className="form-section">
        <div>
          <h3 className="form-section-title">Payout details</h3>
          <p className="muted form-section-copy">Payout account name stays aligned with your registered identity for admin approval and withdrawals.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Bank name</span>
            <input
              className="input"
              value={form.bankName}
              onChange={(event) => handleChange('bankName', event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Bank account name</span>
            <input className="input" value={lockedName} disabled readOnly />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Bank account number</span>
          <input
            className="input"
            value={form.bankAccountNumber}
            onChange={(event) => handleChange('bankAccountNumber', event.target.value)}
            required
          />
        </label>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={loading || uploading || !lockedName}>
          {loading ? 'Submitting profile...' : uploading ? 'Uploading ID...' : 'Submit creator profile'}
        </button>
        {message ? <p className="muted form-message">{message}</p> : null}
      </div>
    </form>
  );
}
