'use client';

import { useEffect, useState } from 'react';

type Analytics = {
  unlocksToday: number;
  revenueToday: number;
  totalUnlocks: number;
  totalRevenue: number;
  walletBalance: number;
};

export default function AnalyticsTicker() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    let active = true;
    const eventSource = new EventSource('/api/studio/analytics/live');

    eventSource.onmessage = (event) => {
      if (!active) return;
      try {
        setData(JSON.parse(event.data));
      } catch {
        return;
      }
    };

    eventSource.onerror = async () => {
      try {
        const res = await fetch('/api/studio/analytics');
        const json = await res.json();
        if (active) setData(json);
      } catch {
        if (active) setData(null);
      }
    };

    return () => {
      active = false;
      eventSource.close();
    };
  }, []);

  return (
    <div className="grid">
      <div className="card">
        <div className="stat">
          <span className="muted">Unlocks today</span>
          <strong>{data?.unlocksToday ?? '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Revenue today</span>
          <strong>NGN {data?.revenueToday ?? '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Total unlocks</span>
          <strong>{data?.totalUnlocks ?? '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Total revenue</span>
          <strong>NGN {data?.totalRevenue ?? '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Producer wallet</span>
          <strong>NGN {data?.walletBalance ?? '--'}</strong>
        </div>
      </div>
    </div>
  );
}
