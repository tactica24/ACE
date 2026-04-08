'use client';

import Link from 'next/link';
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { buildContractDocument, formatContractDate, type RightsTierValue } from '@/lib/contracts';
import { prepareSignatureUpload, uploadContractSignatureAsset } from '@/lib/signature-upload-client';

type StudioContractReviewProps = {
  videoId: string;
  videoTitle: string;
  rightsTier: RightsTierValue;
  payoutSplit: number;
  producerName: string;
  producerNumber?: string | null;
  platformSignaturePreviewUrl?: string | null;
  initialContract?: {
    id: string;
    producerAccepted: boolean;
    producerSignedName: string | null;
    producerSignatureKey: string | null;
    producerSignaturePreviewUrl?: string | null;
    effectiveDate: string | null;
    producerSignedAt: string | null;
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
  platformSignaturePreviewUrl,
  initialContract
}: StudioContractReviewProps) {
  const [agreed, setAgreed] = useState(initialContract?.producerAccepted ?? false);
  const [signedName, setSignedName] = useState(initialContract?.producerSignedName ?? producerName);
  const [effectiveDate, setEffectiveDate] = useState(toDateInputValue(initialContract?.effectiveDate));
  const [producerSignatureKey, setProducerSignatureKey] = useState(initialContract?.producerSignatureKey ?? '');
  const [producerSignaturePreviewUrl, setProducerSignaturePreviewUrl] = useState(initialContract?.producerSignaturePreviewUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
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
        producerSignatureImageUrl: producerSignaturePreviewUrl,
        platformSignatureImageUrl: platformSignaturePreviewUrl,
        videoTitle,
        rightsTier,
        payoutSplit
      }),
    [
      effectiveDate,
      payoutSplit,
      platformSignaturePreviewUrl,
      producerName,
      producerNumber,
      producerSignaturePreviewUrl,
      rightsTier,
      signedName,
      videoTitle
    ]
  );

  const handleSignatureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSignatureUploading(true);
    setMessage(null);

    try {
      const prepared = await prepareSignatureUpload(file);
      const uploaded = await uploadContractSignatureAsset(prepared.blob, prepared.filename, 'producer');
      setProducerSignatureKey(uploaded.key);
      setProducerSignaturePreviewUrl(prepared.previewUrl);
      setMessage('Producer signature uploaded. Review the preview, then sign the agreement.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload your signature image.');
    } finally {
      setSignatureUploading(false);
      event.target.value = '';
    }
  };

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

    if (!producerSignatureKey.trim()) {
      setMessage('Upload the producer signature image before submitting.');
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
          producerSignatureKey,
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
        producerSignatureKey,
        producerSignaturePreviewUrl,
        effectiveDate,
        producerSignedAt: data.producerSignedAt ?? effectiveDate
      });
      setMessage('Contract signed and stored as a PDF-ready document. You can download it now.');
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
        <p className="muted" style={{ margin: 0 }}>
          Upload a clean signature on white paper, confirm the producer name and date, and ACE Studio will store the finished agreement as a PDF.
        </p>

        <div className="detail-grid">
          <div className="detail-card">
            <span className="detail-label">Content title</span>
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
            <span className="detail-label">Agreement date</span>
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

          <label className="field">
            <span className="field-label">Producer signature upload</span>
            <input
              className="input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleSignatureUpload}
              disabled={signatureUploading}
            />
            <span className="field-hint">Use a neat signature on white paper. It will appear above your signature line in the document and PDF.</span>
          </label>

          <div className="signature-upload-card">
            <div>
              <strong>Signature preview</strong>
              <p className="muted" style={{ margin: '6px 0 0' }}>
                {producerSignatureKey
                  ? 'This signature will be printed above your name on the agreement.'
                  : 'Upload your signature image to place it in the document before signing.'}
              </p>
            </div>
            <div className="signature-upload-preview">
              {producerSignaturePreviewUrl ? (
                <img src={producerSignaturePreviewUrl} alt="Producer signature preview" />
              ) : (
                <span>{signedName.trim() || producerName}</span>
              )}
            </div>
          </div>

          <label className="contract-checkbox">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>
              I have read this agreement, I have authority to sign for this title, and I agree to the ACE Studio distribution terms.
            </span>
          </label>

          <div className="action-list">
            <button className="btn btn-primary" type="submit" disabled={loading || signatureUploading}>
              {loading ? 'Saving signature...' : signatureUploading ? 'Uploading signature...' : savedContract?.producerAccepted ? 'Update signed contract' : 'Agree and sign'}
            </button>
            {downloadHref ? (
              <a className="btn btn-ghost" href={downloadHref}>
                Download PDF
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
          <strong>PDF contract preview</strong>
        </div>
        <iframe
          className="contract-document-frame"
          title="Contract document preview"
          srcDoc={preview.html}
        />
      </div>
    </div>
  );
}
