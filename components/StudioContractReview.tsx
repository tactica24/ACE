'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { buildContractDocument, formatContractDate, type RightsTierValue } from '@/lib/contracts';

type StudioContractReviewProps = {
  videoId: string;
  videoTitle: string;
  rightsTier: RightsTierValue;
  payoutSplit: number;
  producerName: string;
  producerNumber?: string | null;
  initialContract?: {
    id: string;
    producerAccepted: boolean;
    producerSignedName: string | null;
    effectiveDate: string | null;
    producerSignedAt: string | null;
    documentHtml: string | null;
  } | null;
};

function toDateInputValue(value?: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

export default function StudioContractReview({
  videoId,
  videoTitle,
  rightsTier,
  payoutSplit,
  producerName,
  producerNumber,
  initialContract
}: StudioContractReviewProps) {
  const [agreed, setAgreed] = useState(initialContract?.producerAccepted ?? false);
  const [signedName, setSignedName] = useState(initialContract?.producerSignedName ?? producerName);
  const [effectiveDate, setEffectiveDate] = useState(toDateInputValue(initialContract?.effectiveDate));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedContract, setSavedContract] = useState(initialContract);

  const preview = useMemo(
    () =>
      buildContractDocument({
        effectiveDate,
        producerDisplayName: signedName.trim() || producerName,
        producerNumber,
        producerSignedName: signedName,
        producerSignedDate: effectiveDate,
        videoTitle,
        rightsTier,
        payoutSplit
      }),
    [effectiveDate, payoutSplit, producerName, producerNumber, rightsTier, signedName, videoTitle]
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!agreed) {
      setMessage('You need to agree to the distribution terms before submitting.');
      return;
    }

    if (!signedName.trim()) {
      setMessage('Enter the producer representative name before submitting.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/studio/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          producerSignedName: signedName.trim(),
          effectiveDate,
          agreed
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to save the signed contract.');
      }

      setSavedContract({
        id: data.contractId,
        producerAccepted: true,
        producerSignedName: signedName.trim(),
        effectiveDate,
        producerSignedAt: data.producerSignedAt ?? effectiveDate,
        documentHtml: data.documentHtml ?? preview.html
      });
      setMessage('Contract signed and stored. You can download the document now.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the signed contract.');
    } finally {
      setLoading(false);
    }
  };

  const downloadHref = savedContract ? `/api/studio/contracts/${savedContract.id}/download` : null;

  return (
    <div className="contract-review-shell">
      <div className="contract-review-sidebar card">
        <span className="detail-label">Final step</span>
        <h3 style={{ marginTop: 8 }}>Review and sign your distribution agreement</h3>
        <p className="muted">
          This agreement is stored with your producer number and attached to this upload after you submit it.
        </p>
        <div className="detail-grid">
          <div className="detail-card">
            <span className="detail-label">Title</span>
            <strong>{videoTitle}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Producer number</span>
            <strong>{producerNumber ?? 'Pending'}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Signed status</span>
            <strong>{savedContract?.producerAccepted ? 'Signed' : 'Awaiting signature'}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Effective date</span>
            <strong>{formatContractDate(effectiveDate)}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <label className="field">
            <span className="field-label">Producer representative name</span>
            <input
              className="input"
              value={signedName}
              onChange={(event) => setSignedName(event.target.value)}
              placeholder="Enter your full legal name"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Agreement date</span>
            <input
              className="input"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
              required
            />
          </label>

          <label className="contract-checkbox">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>
              I have read this agreement, I have authority to sign for this title, and I agree to the ACE Studio distribution terms.
            </span>
          </label>

          <div className="action-list">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving signature...' : savedContract?.producerAccepted ? 'Update signed contract' : 'Agree and sign'}
            </button>
            {downloadHref ? (
              <a className="btn btn-ghost" href={downloadHref}>
                Download document
              </a>
            ) : null}
            <Link className="btn btn-ghost" href="/studio/library">Back to library</Link>
          </div>
          {message ? <p className="muted form-message">{message}</p> : null}
        </form>
      </div>

      <div className="contract-preview-panel">
        <div className="contract-preview-header">
          <span className="detail-label">Document preview</span>
          <strong>Microsoft Word compatible download</strong>
        </div>
        <iframe
          className="contract-document-frame"
          title="Contract document preview"
          srcDoc={savedContract?.documentHtml ?? preview.html}
        />
      </div>
    </div>
  );
}
