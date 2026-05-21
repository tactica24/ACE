'use client';

import { useEffect, useState } from 'react';

type AccessLink = {
  token: string;
  url: string;
  expiresAt: string | null;
};

type AccessLinks = {
  upload: AccessLink | null;
  report: AccessLink | null;
  shortUpload: AccessLink | null;
};

type LinkScope = 'upload' | 'report' | 'short-upload';

function scopeToStateKey(scope: LinkScope): keyof AccessLinks {
  return scope === 'short-upload' ? 'shortUpload' : scope;
}

export default function AdminCreatorAccessLinks({
  creatorUserId,
  initialCreatorNumber
}: {
  creatorUserId: string;
  initialCreatorNumber?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [links, setLinks] = useState<AccessLinks>({ upload: null, report: null, shortUpload: null });
  const [creatorNumber, setCreatorNumber] = useState(initialCreatorNumber ?? null);

  async function fetchLinks() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/creators/access-links?creatorId=${encodeURIComponent(creatorUserId)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to fetch creator links.');
      }
      setLinks({
        upload: payload.links.upload,
        report: payload.links.report,
        shortUpload: payload.links.shortUpload ?? null
      });
      setCreatorNumber(payload.creatorNumber ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to fetch creator links.');
    } finally {
      setLoading(false);
    }
  }

  async function generateLink(scope: 'upload' | 'report' | 'short-upload') {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/creators/access-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: creatorUserId, scope })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? `Unable to generate ${scope} link.`);
      }

      setLinks((current) => ({
        ...current,
        [scopeToStateKey(scope)]: {
          token: payload.token,
          url: payload.url,
          expiresAt: payload.expiresAt
        }
      }));
      setMessage(
        scope === 'upload'
          ? 'Upload link generated.'
          : scope === 'report'
            ? 'Report link generated.'
            : 'Upload link generated.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to generate ${scope} link.`);
    } finally {
      setLoading(false);
    }
   }

  async function generateProducerId() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/creators/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: creatorUserId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to generate producer ID.');
      }
      setCreatorNumber(payload.creatorNumber);
      setMessage(`Producer ID generated: ${payload.creatorNumber}`);
      await fetchLinks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate producer ID.');
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Link copied to clipboard.');
    } catch {
      setMessage('Could not copy automatically. You can still copy the link manually.');
    }
  };

  useEffect(() => {
    void fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorUserId]);

  return (
    <div className="stack-list">
      <div className="detail-card">
        <span className="detail-label">Producer ID</span>
        <strong>{creatorNumber ?? 'Not assigned yet'}</strong>
        {!creatorNumber ? (
          <button className="btn btn-primary" type="button" onClick={() => void generateProducerId()} disabled={loading}>
            {loading ? 'Generating...' : 'Generate producer ID'}
          </button>
        ) : null}
      </div>

      <div className="action-list">
        <button className="btn btn-ghost" type="button" onClick={() => generateLink('upload')} disabled={loading || !creatorNumber}>
          {loading ? 'Generating...' : (links.upload ? 'Get upload link' : 'Generate upload link')}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => generateLink('short-upload')} disabled={loading || !creatorNumber}>
          {loading ? 'Generating...' : (links.shortUpload ? 'Get producer upload link' : 'Generate producer upload link')}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => generateLink('report')} disabled={loading || !creatorNumber}>
          {loading ? 'Generating...' : (links.report ? 'Get report link' : 'Generate report link')}
        </button>
      </div>

      {!creatorNumber ? <p className="muted">Generate the producer ID before creating upload or report links.</p> : null}

      {links.upload ? (
        <div className="detail-card">
          <span className="detail-label">Upload link</span>
          <input className="input" value={links.upload.url} readOnly />
          <button className="btn btn-ghost" type="button" onClick={() => copyToClipboard(links.upload!.url)}>Copy upload link</button>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Does not expire while the producer account remains active.
          </span>
        </div>
      ) : (
        <p className="muted">No upload link generated yet.</p>
      )}

      {links.shortUpload ? (
        <div className="detail-card">
          <span className="detail-label">Producer upload link</span>
          <input className="input" value={links.shortUpload.url} readOnly />
          <button className="btn btn-ghost" type="button" onClick={() => copyToClipboard(links.shortUpload!.url)}>Copy producer upload link</button>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Share this with producers for the quick upload workflow.
          </span>
        </div>
      ) : (
        <p className="muted">No producer upload link generated yet.</p>
      )}

      {links.report ? (
        <div className="detail-card">
          <span className="detail-label">Report link</span>
          <input className="input" value={links.report.url} readOnly />
          <button className="btn btn-ghost" type="button" onClick={() => copyToClipboard(links.report!.url)}>Copy report link</button>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Does not expire while the producer account remains active.
          </span>
        </div>
      ) : (
        <p className="muted">No report link generated yet.</p>
      )}

      {message ? <p className="muted" style={{ marginBottom: 0 }}>{message}</p> : null}
    </div>
  );
}

