'use client';

import { useState } from 'react';

type Item = {
  id: string;
  video: { id: string; title: string; description: string; category?: string; status?: string };
  status: string;
  notes?: string | null;
};

export type ModerationQueueItem = Item;

export default function ModerationQueue({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const handleAction = async (item: Item, action: 'approve' | 'reject' | 'remove') => {
    const endpoint = action === 'remove' ? '/api/admin/videos/delete' : `/api/admin/moderation/${action}`;
    const payload = action === 'remove'
      ? { videoId: item.video.id, reason: reasons[item.video.id] || 'Removed by admin review' }
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
    return <p className="muted">No items awaiting review.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {items.map((item) => (
        <div key={item.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3>{item.video.title}</h3>
              <p className="muted">{item.video.description}</p>
              <p className="muted">{item.video.category} | Moderation {item.status} | Video {item.video.status}</p>
            </div>
            <span className="badge">{item.status}</span>
          </div>
          <input
            className="input"
            style={{ marginTop: 12 }}
            placeholder="Reason for rejection or removal"
            value={reasons[item.video.id] ?? ''}
            onChange={(e) => setReasons((prev) => ({ ...prev, [item.video.id]: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            {item.status === 'PENDING' ? (
              <button className="btn btn-primary" onClick={() => handleAction(item, 'approve')}>Approve</button>
            ) : null}
            <button className="btn btn-ghost" onClick={() => handleAction(item, 'reject')}>Reject</button>
            <button className="btn btn-ghost" onClick={() => handleAction(item, 'remove')}>Remove from production</button>
          </div>
        </div>
      ))}
    </div>
  );
}
