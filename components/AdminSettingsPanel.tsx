'use client';

import { useState } from 'react';

type FinanceSettings = {
  snackNaira: number;
  standardNaira: number;
  premiereNaira: number;
  snackUsdMinor: number;
  standardUsdMinor: number;
  premiereUsdMinor: number;
  snackGbpMinor: number;
  standardGbpMinor: number;
  premiereGbpMinor: number;
  snackCadMinor: number;
  standardCadMinor: number;
  premiereCadMinor: number;
  familyPassUsdMinor: number;
  familyPassGbpMinor: number;
  familyPassCadMinor: number;
};

type SiteSettings = {
  homePageMode: 'LIVE' | 'LAUNCH';
  launchTitle: string;
  launchMessage: string;
  launchCountdownAt: string;
  launchCtaLabel: string;
  launchCtaHref: string;
};

const pricingFields: Array<{ key: keyof FinanceSettings; label: string }> = [
  { key: 'snackNaira', label: 'Snack NGN' },
  { key: 'standardNaira', label: 'Standard NGN' },
  { key: 'premiereNaira', label: 'Premiere NGN' },
  { key: 'snackUsdMinor', label: 'Snack USD cents' },
  { key: 'standardUsdMinor', label: 'Standard USD cents' },
  { key: 'premiereUsdMinor', label: 'Premiere USD cents' },
  { key: 'snackGbpMinor', label: 'Snack GBP pence' },
  { key: 'standardGbpMinor', label: 'Standard GBP pence' },
  { key: 'premiereGbpMinor', label: 'Premiere GBP pence' },
  { key: 'snackCadMinor', label: 'Snack CAD cents' },
  { key: 'standardCadMinor', label: 'Standard CAD cents' },
  { key: 'premiereCadMinor', label: 'Premiere CAD cents' },
  { key: 'familyPassUsdMinor', label: 'Family pass USD cents' },
  { key: 'familyPassGbpMinor', label: 'Family pass GBP pence' },
  { key: 'familyPassCadMinor', label: 'Family pass CAD cents' }
];

export default function AdminSettingsPanel({
  initialFinance,
  initialSite
}: {
  initialFinance: FinanceSettings;
  initialSite: SiteSettings;
}) {
  const [finance, setFinance] = useState(initialFinance);
  const [site, setSite] = useState(initialSite);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState<'site' | 'finance' | null>(null);

  const saveSite = async () => {
    setSaving('site');
    setFeedback(null);
    const res = await fetch('/api/admin/settings/site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site)
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    setFeedback(res.ok ? 'Launch settings saved.' : data.error || 'Launch settings could not be saved.');
  };

  const saveFinance = async () => {
    setSaving('finance');
    setFeedback(null);
    const res = await fetch('/api/admin/settings/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finance)
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    setFeedback(res.ok ? 'Pricing settings saved.' : data.error || 'Pricing settings could not be saved.');
  };

  return (
    <div className="grid">
      <div className="card">
        <h3>Public launch controls</h3>
        <div className="detail-grid">
          <label className="field">
            <span className="field-label">Homepage mode</span>
            <select className="input" value={site.homePageMode} onChange={(event) => setSite((current) => ({ ...current, homePageMode: event.target.value as 'LIVE' | 'LAUNCH' }))}>
              <option value="LIVE">Live</option>
              <option value="LAUNCH">Launch / under construction</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Launch title</span>
            <input className="input" value={site.launchTitle} onChange={(event) => setSite((current) => ({ ...current, launchTitle: event.target.value }))} />
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span className="field-label">Launch message</span>
            <textarea className="input" rows={4} value={site.launchMessage} onChange={(event) => setSite((current) => ({ ...current, launchMessage: event.target.value }))} />
          </label>
          <label className="field">
            <span className="field-label">Countdown date</span>
            <input className="input" type="datetime-local" value={site.launchCountdownAt} onChange={(event) => setSite((current) => ({ ...current, launchCountdownAt: event.target.value }))} />
          </label>
          <label className="field">
            <span className="field-label">CTA label</span>
            <input className="input" value={site.launchCtaLabel} onChange={(event) => setSite((current) => ({ ...current, launchCtaLabel: event.target.value }))} />
          </label>
          <label className="field">
            <span className="field-label">CTA link</span>
            <input className="input" value={site.launchCtaHref} onChange={(event) => setSite((current) => ({ ...current, launchCtaHref: event.target.value }))} />
          </label>
        </div>
        <div className="moderation-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={saveSite} disabled={saving === 'site'}>
            {saving === 'site' ? 'Saving...' : 'Save launch controls'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Catalog pricing controls</h3>
        <p className="muted">Change tier prices here without editing code. Producers can still choose tiers per title, and admins can adjust a specific title in moderation before approval.</p>
        <div className="detail-grid">
          {pricingFields.map(({ key, label }) => (
            <label key={key} className="field">
              <span className="field-label">{label}</span>
              <input
                className="input"
                type="number"
                min={0}
                value={finance[key]}
                onChange={(event) => setFinance((current) => ({ ...current, [key]: Math.max(0, Number(event.target.value || '0')) }))}
              />
            </label>
          ))}
        </div>
        <div className="moderation-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={saveFinance} disabled={saving === 'finance'}>
            {saving === 'finance' ? 'Saving...' : 'Save pricing controls'}
          </button>
        </div>
      </div>

      {feedback ? <p className="muted form-message">{feedback}</p> : null}
    </div>
  );
}
