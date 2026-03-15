'use client';

import { useState } from 'react';

type Item = {
  id: string;
  video: { id: string; title: string; description: string };
  status: string;
};

export default function ModerationQueue({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    const res = await fetch(`/api/admin/moderation/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  if (items.length === 0) {
    return <p className="muted">No items awaiting review.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {items.map((item) => (
        <div key={item.id} className="card">
          <h3>{item.video.title}</h3>
          <p className="muted">{item.video.description}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => handleAction(item.id, 'approve')}>Approve</button>
            <button className="btn btn-ghost" onClick={() => handleAction(item.id, 'reject')}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}



