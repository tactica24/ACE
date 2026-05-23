'use client';

import { useState } from 'react';

type DeliveryHealthVideo = {
  id: string;
  title: string;
  status: string;
  hlsUrl: string | null;
  hlsVersion: string | null;
  qualities: string[];
  updatedAt: string;
};

export default function DeliveryHealthPanel({ videos }: { videos: DeliveryHealthVideo[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function validate(videoId: string) {
    setPendingId(videoId);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/videos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: videoId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to validate HLS.');

      setMessage(
        payload.passed
          ? 'Validation passed.'
          : `Validation failed: ${(payload.errors ?? ['Unknown error']).join(', ')}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to validate HLS.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="stack-list">
      {message ? <div className="card">{message}</div> : null}
      {videos.length ? (
        videos.map((video) => (
          <div key={video.id} className="card">
            <div className="stack-row" style={{ alignItems: 'flex-start' }}>
              <div>
                <h3>{video.title}</h3>
                <p className="muted">Status: {video.status} | Version: {video.hlsVersion ?? 'N/A'}</p>
              </div>
              <div className="action-list">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={pendingId === video.id}
                  onClick={() => void validate(video.id)}
                >
                  {pendingId === video.id ? 'Validating...' : 'Re-validate'}
                </button>
              </div>
            </div>

            <div className="detail-grid" style={{ marginTop: 14 }}>
              <div className="detail-card">
                <span className="detail-label">HLS URL</span>
                <strong>{video.hlsUrl || 'Not set'}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Qualities</span>
                <strong>{video.qualities.join(', ') || 'None'}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Last Updated</span>
                <strong>{video.updatedAt}</strong>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="card">
          <h3>No HLS videos yet</h3>
          <p className="muted">Uploaded HLS folders will appear here after admin processing.</p>
        </div>
      )}
    </div>
  );
}
