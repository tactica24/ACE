'use client';

import { useEffect, useState } from 'react';

export default function NodeMonitor() {
  const [data, setData] = useState<{
    nodeName: string;
    region: string;
    cpuLoad: number;
    memoryUsed: number;
    diskFreeGb: number;
    cacheHitRate: number;
    latencyMs: number;
    deliveryMode: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/node');
        const json = await res.json();
        if (active) setData(json);
      } catch {
        if (active) setData(null);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="grid">
      <div className="card">
        <div className="stat">
          <span className="muted">Runtime</span>
          <strong>{data?.nodeName ?? '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Mode</span>
          <strong>{data?.deliveryMode ?? '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Region</span>
          <strong>{data?.region ?? '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">CPU load</span>
          <strong>{data ? (data.cpuLoad * 100).toFixed(1) + '%' : '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Memory</span>
          <strong>{data ? (data.memoryUsed * 100).toFixed(1) + '%' : '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Disk Free</span>
          <strong>{data ? data.diskFreeGb.toFixed(1) + ' GB' : '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Cache Hit Rate</span>
          <strong>{data ? (data.cacheHitRate * 100).toFixed(1) + '%' : '--'}</strong>
        </div>
      </div>
      <div className="card">
        <div className="stat">
          <span className="muted">Latency</span>
          <strong>{data ? data.latencyMs.toFixed(1) + ' ms' : '--'}</strong>
        </div>
      </div>
    </div>
  );
}



