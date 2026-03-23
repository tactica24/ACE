'use client';

import { useState } from 'react';
import { getMediaAssetUrl } from '@/lib/media';

type Item = {
  id: string;
  video: {
    id: string;
    title: string;
    description: string;
    category?: string;
    status?: string;
    videoType?: string;
    ageRating?: string;
    rightsTier?: string;
    priceTier?: string;
    posterKey?: string | null;
    createdAt?: string;
    creatorName?: string;
  };
  status: string;
  notes?: string | null;
};

export type ModerationQueueItem = Item;

const ageLabel: Record<string, string> = {
  ALL: 'All',
  PG13: '13+',
  PG16: '16+',
  PG18: '18+'
};

const labelize = (value?: string) =>
  value
    ? value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Not set';

export default function ModerationQueue({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const handleAction = async (item: Item, action: 'approve' | 'reject' | 'remove') => {
    const endpoint = action === 'remove' ? '/api/admin/videos/delete' : `/api/admin/moderation/${action}`;
    const payload =
      action === 'remove'
        ? { videoId: item.video.id, reason: reasons[item.video.id] || 'Removed during admin review' }
        : { id: item.id };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    }
  };

  if (items.length === 0) {
    return (
      <div className="card empty-state">
        <h3>No titles are waiting for review</h3>
        <p className="muted">New creator submissions will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="moderation-grid">
      {items.map((item) => {
        const posterUrl = getMediaAssetUrl(item.video.posterKey);

        return (
          <div key={item.id} className="card moderation-card">
            <div
              className="moderation-poster"
              style={posterUrl ? { backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!posterUrl ? <span>Ace Studio</span> : null}
            </div>

            <div className="moderation-content">
              <div className="moderation-header">
                <div>
                  <h3>{item.video.title}</h3>
                  <p className="muted">{item.video.description}</p>
                </div>
                <div className="moderation-statuses">
                  <span className="badge">{item.status}</span>
                  <span className={`status-chip ${item.video.status === 'APPROVED' ? 'status-live' : 'status-review'}`}>
                    {item.video.status ?? 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-card">
                  <span className="detail-label">Creator</span>
                  <strong>{item.video.creatorName ?? 'Unknown creator'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Category</span>
                  <strong>{item.video.category ?? 'General'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Type</span>
                  <strong>{labelize(item.video.videoType)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Age rating</span>
                  <strong>{ageLabel[item.video.ageRating ?? ''] ?? labelize(item.video.ageRating)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Rights</span>
                  <strong>{labelize(item.video.rightsTier)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Price tier</span>
                  <strong>{labelize(item.video.priceTier)}</strong>
                </div>
              </div>

              <label className="field">
                <span className="field-label">Admin note</span>
                <input
                  className="input"
                  value={reasons[item.video.id] ?? ''}
                  onChange={(event) => setReasons((prev) => ({ ...prev, [item.video.id]: event.target.value }))}
                />
              </label>

              <div className="moderation-actions">
                {item.status === 'PENDING' ? (
                  <button className="btn btn-primary" onClick={() => handleAction(item, 'approve')}>
                    Approve title
                  </button>
                ) : null}
                <button className="btn btn-ghost" onClick={() => handleAction(item, 'reject')}>
                  Reject title
                </button>
                <button className="btn btn-ghost" onClick={() => handleAction(item, 'remove')}>
                  Remove from catalog
                </button>
              </div>

              {item.notes ? <p className="muted form-message">{item.notes}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
