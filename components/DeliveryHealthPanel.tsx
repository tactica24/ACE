'use client';

import { useState } from 'react';

type DeliveryHealthVideo = {
  id: string;
  title: string;
  status: string;
  masterKey: string | null;
  masterSourceUrl?: string | null;
  hlsManifestReady?: boolean;
  playbackUrl: string | null;
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
      if (!response.ok) throw new Error(payload.error ?? 'Unable to validate MP4.');

      setMessage(
        payload.passed
          ? 'Playback validation passed.'
          : `Validation failed: ${(payload.errors ?? ['Unknown error']).join(', ')}` 
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to validate playback.');
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
                <p className="muted">Status: {video.status}</p>
              </div>
              <div className="action-list">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={pendingId === video.id}
                  onClick={() => void validate(video.id)}
                >
                  {pendingId === video.id ? 'Validating...' : 'Re-validate playback'}
                </button>
              </div>
            </div>

            <div className="detail-grid" style={{ marginTop: 14 }}>
              <div className="detail-card">
                <span className="detail-label">Master source</span>
                <strong>{video.masterSourceUrl ? 'Dropbox attached' : video.masterKey || 'Not set'}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Bunny playback ready</span>
                <strong>{video.hlsManifestReady ? 'Yes' : 'No'}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Playback</span>
                <strong>{video.playbackUrl || 'Gateway stream token'}</strong>
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
          <h3>No delivery items yet</h3>
          <p className="muted">Titles with attached sources or verified Bunny playback will appear here after admin processing.</p>
        </div>
      )}
    </div>
  );
}
