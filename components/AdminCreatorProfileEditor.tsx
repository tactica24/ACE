'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';

type AdminCreatorProfileEditorProps = {
  userId: string;
  initialValues: {
    name: string;
    phone?: string;
    address: string;
    idCardNumber: string;
    idCardUrl: string;
    bankName: string;
    bankAccountNumber: string;
  };
};

export default function AdminCreatorProfileEditor({ userId, initialValues }: AdminCreatorProfileEditorProps) {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const uploadRes = await fetch('/api/studio/id-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          filename: file.name,
          contentType: file.type
        })
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData.key || !uploadData.url) {
        throw new Error(uploadData.error ?? 'Unable to upload ID file.');
      }

      const putRes = await fetch(uploadData.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!putRes.ok) {
        throw new Error('Unable to upload ID file.');
      }

      setForm((prev) => ({ ...prev, idCardUrl: uploadData.key }));
      setMessage('ID file updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload ID file.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/creators/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...form })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to update producer profile.');
      }
      setMessage('Producer profile saved.');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update producer profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input type="hidden" value={userId} readOnly />
      <label className="field">
        <span className="field-label">Registered name</span>
        <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
      </label>
      <label className="field">
        <span className="field-label">Address</span>
        <textarea className="input" rows={3} value={form.address} onChange={(event) => updateField('address', event.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">ID card number</span>
        <input className="input" value={form.idCardNumber} onChange={(event) => updateField('idCardNumber', event.target.value)} />
      </label>
      <div className="field-grid field-grid-2">
        <label className="field">
          <span className="field-label">Bank name</span>
          <input className="input" value={form.bankName} onChange={(event) => updateField('bankName', event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Bank account number</span>
          <input className="input" value={form.bankAccountNumber} onChange={(event) => updateField('bankAccountNumber', event.target.value)} />
        </label>
      </div>
      <div className="field-grid field-grid-2">
        <label className="field">
          <span className="field-label">Bank account name</span>
          <input className="input" value={form.name} disabled readOnly />
        </label>
        <label className="field">
          <span className="field-label">Replace ID file</span>
          <input className="input" type="file" accept="image/*,application/pdf" onChange={handleUpload} />
        </label>
      </div>
      <p className="muted">{form.idCardUrl ? 'ID file is on record.' : 'No ID file has been uploaded yet.'}</p>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={saving || uploading}>
          {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save producer profile'}
        </button>
        {message ? <p className="muted form-message">{message}</p> : null}
      </div>
    </form>
  );
}
