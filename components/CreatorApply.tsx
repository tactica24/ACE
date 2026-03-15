'use client';

import { useState } from 'react';

export default function CreatorApply() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/studio/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });
      if (!res.ok) throw new Error('Apply failed');
      window.location.href = '/studio';
    } catch {
      alert('Unable to activate creator profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>Become a creator</h3>
      <p className="muted">Enable ACE Studio tools for uploads, analytics, and contracts.</p>
      <input className="input" placeholder="Creator name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      <button className="btn btn-primary" onClick={handleApply} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? 'Activating...' : 'Activate Creator Profile'}
      </button>
    </div>
  );
}



