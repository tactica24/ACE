'use client';

import { useState, type FormEvent } from 'react';

type CreatorAccessLinks = {
  uploadUrl: string;
  reportUrl: string;
};

export default function AdminCreateProducerForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [reliabilityNotes, setReliabilityNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [links, setLinks] = useState<CreatorAccessLinks | null>(null);
  const [loading, setLoading] = useState(false);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Link copied to clipboard.');
    } catch {
      setMessage('Could not copy automatically. You can still copy the link manually.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/creators/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          email,
          address,
          bankName,
          bankAccountName,
          bankAccountNumber,
          reliabilityNotes
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to create producer.');
      }

      const linksResponse = await fetch('/api/admin/creators/access-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorUserId: payload.producer.id
        })
      });
      const linksPayload = await linksResponse.json().catch(() => ({}));
      if (!linksResponse.ok) {
        throw new Error(linksPayload.error ?? 'Producer created, but link generation failed.');
      }

      setCreatorId(payload.producer.id as string);
      setLinks({
        uploadUrl: linksPayload.links.uploadUrl as string,
        reportUrl: linksPayload.links.reportUrl as string
      });
      setMessage(`Approved producer created: ${payload.producer.displayName} (${payload.producer.creatorNumber}). Share the two links below.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create producer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-section" onSubmit={handleSubmit}>
      <div>
        <h3 className="form-section-title">Create approved producer</h3>
        <p className="muted form-section-copy">
          Create a producer record directly from admin, generate the unique producer code immediately, and move straight into uploading titles under that producer ID.
        </p>
      </div>

      <div className="field-grid field-grid-2">
        <label className="field">
          <span className="field-label">Producer name</span>
          <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
      </div>

      <div className="field-grid field-grid-2">
        <label className="field">
          <span className="field-label">Address</span>
          <input className="input" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Optional for internal onboarding" />
        </label>
        <label className="field">
          <span className="field-label">Internal notes</span>
          <input className="input" value={reliabilityNotes} onChange={(event) => setReliabilityNotes(event.target.value)} placeholder="Optional onboarding or partner note" />
        </label>
      </div>

      <div className="field-grid field-grid-3">
        <label className="field">
          <span className="field-label">Bank name</span>
          <input className="input" value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Optional" />
        </label>
        <label className="field">
          <span className="field-label">Bank account name</span>
          <input className="input" value={bankAccountName} onChange={(event) => setBankAccountName(event.target.value)} placeholder="Defaults to producer name" />
        </label>
        <label className="field">
          <span className="field-label">Bank account number</span>
          <input className="input" value={bankAccountNumber} onChange={(event) => setBankAccountNumber(event.target.value)} placeholder="Optional" />
        </label>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating producer...' : 'Create producer and generate links'}
        </button>
        <span className="muted">This producer becomes available immediately in admin upload and link-based creator access.</span>
      </div>

      {creatorId ? (
        <div className="detail-card">
          <span className="detail-label">Admin upload desk</span>
          <a className="btn btn-ghost" href={`/admin/upload?producerId=${encodeURIComponent(creatorId)}`}>Open producer upload workspace</a>
        </div>
      ) : null}

      {links ? (
        <div className="stack-list">
          <div className="detail-card">
            <span className="detail-label">Creator upload link</span>
            <input className="input" value={links.uploadUrl} readOnly />
            <button className="btn btn-ghost" type="button" onClick={() => copyToClipboard(links.uploadUrl)}>Copy upload link</button>
          </div>
          <div className="detail-card">
            <span className="detail-label">Creator report link</span>
            <input className="input" value={links.reportUrl} readOnly />
            <button className="btn btn-ghost" type="button" onClick={() => copyToClipboard(links.reportUrl)}>Copy report link</button>
          </div>
        </div>
      ) : null}

      {message ? <p className="muted form-message">{message}</p> : null}
    </form>
  );
}
