'use client';

import { useState } from 'react';

type AccessLinks = {
  uploadUrl: string;
  reportUrl: string;
};

export default function AdminCreatorAccessLinks({
  creatorUserId
}: {
  creatorUserId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [links, setLinks] = useState<AccessLinks | null>(null);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Link copied to clipboard.');
    } catch {
      setMessage('Could not copy automatically. You can still copy the link manually.');
    }
  };

  const generateLinks = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/creators/access-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorUserId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to generate creator links.');
      }

      setLinks({
        uploadUrl: payload.links.uploadUrl as string,
        reportUrl: payload.links.reportUrl as string
      });
      setMessage('Fresh creator links generated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate creator links.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack-list">
      <button className="btn btn-ghost" type="button" onClick={generateLinks} disabled={loading}>
        {loading ? 'Generating links...' : 'Generate creator links'}
      </button>
      {links ? (
        <>
          <div className="detail-card">
            <span className="detail-label">Upload link</span>
            <input className="input" value={links.uploadUrl} readOnly />
            <button className="btn btn-ghost" type="button" onClick={() => copyToClipboard(links.uploadUrl)}>Copy upload link</button>
          </div>
          <div className="detail-card">
            <span className="detail-label">Report link</span>
            <input className="input" value={links.reportUrl} readOnly />
            <button className="btn btn-ghost" type="button" onClick={() => copyToClipboard(links.reportUrl)}>Copy report link</button>
          </div>
        </>
      ) : null}
      {message ? <p className="muted" style={{ marginBottom: 0 }}>{message}</p> : null}
    </div>
  );
}

