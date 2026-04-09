'use client';

import { useEffect, useState } from 'react';

type Analytics = {
  unlocksToday: number;
  revenueTodayLabel: string;
  totalUnlocks: number;
  totalRevenueLabel: string;
  walletBalanceLabel: string;
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
    <div className="metric-grid">
      <div className="metric-card">
        <span className="muted">Unlocks today</span>
        <strong>{data?.unlocksToday ?? '--'}</strong>
        <span className="trend-up">Daily storefront activity</span>
      </div>
      <div className="metric-card">
        <span className="muted">Revenue today</span>
        <strong>{data?.revenueTodayLabel ?? '--'}</strong>
        <span className="trend-up">Daily credited revenue</span>
      </div>
      <div className="metric-card">
        <span className="muted">Total unlocks</span>
        <strong>{data?.totalUnlocks ?? '--'}</strong>
        <span className="trend-up">All-time release opens</span>
      </div>
      <div className="metric-card">
        <span className="muted">Total revenue</span>
        <strong>{data?.totalRevenueLabel ?? '--'}</strong>
        <span className="trend-up">All-time credited revenue</span>
      </div>
      <div className="metric-card">
        <span className="muted">Producer wallet</span>
        <strong>{data?.walletBalanceLabel ?? '--'}</strong>
        <span className="trend-up">Current available balance</span>
      </div>
    </div>
  );
}
