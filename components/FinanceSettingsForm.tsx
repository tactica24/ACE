'use client';

import { useState } from 'react';

type FinanceConfigShape = {
  creatorSharePercent: number;
  platformSharePercent: number;
  gatewayFeePercent: number;
  taxPercent: number;
};

export default function FinanceSettingsForm({ initialConfig }: { initialConfig: FinanceConfigShape }) {
  const [config, setConfig] = useState(initialConfig);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = (key: keyof FinanceConfigShape, value: number) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/finance-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Unable to save finance settings.');
      setConfig(data.config);
      setMessage('Finance split settings saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save finance settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>Split controls</h3>
      <div className="field-grid field-grid-2">
        <label className="field">
          <span className="field-label">Producer %</span>
          <input className="input" type="number" step="0.1" value={config.creatorSharePercent} onChange={(event) => update('creatorSharePercent', Number(event.target.value || 0))} />
        </label>
        <label className="field">
          <span className="field-label">Ace Studio %</span>
          <input className="input" type="number" step="0.1" value={config.platformSharePercent} onChange={(event) => update('platformSharePercent', Number(event.target.value || 0))} />
        </label>
        <label className="field">
          <span className="field-label">Gateway fee %</span>
          <input className="input" type="number" step="0.1" value={config.gatewayFeePercent} onChange={(event) => update('gatewayFeePercent', Number(event.target.value || 0))} />
        </label>
        <label className="field">
          <span className="field-label">Tax %</span>
          <input className="input" type="number" step="0.1" value={config.taxPercent} onChange={(event) => update('taxPercent', Number(event.target.value || 0))} />
        </label>
      </div>
      <p className="muted">These global defaults are applied to new unlock settlements.</p>
      <div className="form-actions">
        <button className="btn btn-primary" type="button" disabled={loading} onClick={handleSave}>
          {loading ? 'Saving...' : 'Save split settings'}
        </button>
        {message ? <p className="muted form-message">{message}</p> : null}
      </div>
    </div>
  );
}
