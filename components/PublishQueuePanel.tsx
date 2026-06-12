'use client';

import { useState } from 'react';
import Link from 'next/link';
import PosterAsset from '@/components/PosterAsset';
import { getMoviePosterUrl } from '@/lib/movie-assets';

type PublishItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string | null;
  videoType: string;
  creatorName: string;
  updatedAt: string;
  processingStatus: string | null;
  bunnyStreamReadyAt: string | null;
  bunnyStreamError: string | null;
  playbackUrl: string | null;
  posterKey: string | null;
  playbackReady: boolean;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getIssueLabel(item: PublishItem) {
  if (item.bunnyStreamError?.trim()) return item.bunnyStreamError.trim();
  if (!item.posterKey) return 'Poster is still missing.';
  if (!item.playbackReady) return 'Playback is not ready yet. Wait for Bunny processing or fix the upload.';
  return 'Ready to publish.';
}

export default function PublishQueuePanel({ initial }: { initial: PublishItem[] }) {
  const [items, setItems] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function publish(videoId: string) {
    setPendingId(videoId);
    setMessages((prev) => ({ ...prev, [videoId]: 'Publishing title...' }));
    try {
      const response = await fetch('/api/admin/videos/processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'PUBLISH' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to publish this title right now.');
      }

      setItems((current) => current.filter((item) => item.id !== videoId));
    } catch (error) {
      setMessages((prev) => ({
        ...prev,
        [videoId]: error instanceof Error ? error.message : 'Unable to publish this title right now.'
      }));
    } finally {
      setPendingId(null);
    }
  }

  if (!items.length) {
    return (
      <div className="card empty-state">
        <h3>No titles are waiting in the publish queue</h3>
        <p className="muted">Anything already published will appear under Live. Anything still being corrected stays under Edit titles.</p>
      </div>
    );
  }

  return (
    <div className="stack-list">
      {items.map((item) => {
        const posterUrl = getMoviePosterUrl({ id: item.id, posterKey: item.posterKey });
        const busy = pendingId === item.id;
        const issueLabel = getIssueLabel(item);

        return (
          <div key={item.id} className="card moderation-card">
            <div className="moderation-poster">
              <PosterAsset src={posterUrl} imgClassName="moderation-poster-img" />
            </div>
            <div className="moderation-content">
              <div className="moderation-header">
                <div className="stack-list" style={{ gap: 6 }}>
                  <div className="stack-row" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0 }}>{item.title}</h3>
                    <span className={`status-chip ${item.playbackReady ? 'status-live' : 'status-review'}`}>
                      {item.playbackReady ? 'Ready to publish' : 'Needs fix'}
                    </span>
                    <span className="status-chip">{item.status}</span>
                  </div>
                  <p className="muted" style={{ margin: 0 }}>{item.description || 'No synopsis added yet.'}</p>
                  <p className="muted" style={{ margin: 0 }}>
                    {item.creatorName} | {item.videoType} | {item.category || 'General'} | Updated {formatDate(item.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="detail-grid" style={{ marginTop: 12 }}>
                <div className="detail-card">
                  <span className="detail-label">Playback status</span>
                  <strong>{item.playbackReady ? 'Ready' : item.processingStatus || 'Waiting'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Bunny ready</span>
                  <strong>{item.bunnyStreamReadyAt ? formatDate(item.bunnyStreamReadyAt) : 'Not yet'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Playback URL</span>
                  <strong>{item.playbackUrl ? 'Attached' : 'Pending'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Current issue</span>
                  <strong>{issueLabel}</strong>
                </div>
              </div>

              {messages[item.id] ? <p className="muted form-message">{messages[item.id]}</p> : null}

              <div className="moderation-actions">
                <Link className="btn btn-ghost" href="/admin/moderation">
                  Edit title
                </Link>
                <Link className="btn btn-ghost" href={`/v/${item.id}`} target="_blank">
                  Preview page
                </Link>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={busy || !item.playbackReady}
                  onClick={() => void publish(item.id)}
                >
                  {busy ? 'Publishing...' : 'Publish to live'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
