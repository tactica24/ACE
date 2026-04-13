'use client';

import Image from 'next/image';
import { useState, type ChangeEvent } from 'react';
import { prepareSignatureUpload, uploadContractSignatureAsset } from '@/lib/signature-upload-client';

type FinanceSettings = {
  snackNaira: number;
  standardNaira: number;
  premiereNaira: number;
  snackUsdMinor: number;
  standardUsdMinor: number;
  premiereUsdMinor: number;
  snackEurMinor: number;
  standardEurMinor: number;
  premiereEurMinor: number;
  snackGbpMinor: number;
  standardGbpMinor: number;
  premiereGbpMinor: number;
  snackCadMinor: number;
  standardCadMinor: number;
  premiereCadMinor: number;
  familyPassUsdMinor: number;
  familyPassEurMinor: number;
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
  platformSignatureKey: string;
  platformSignaturePreviewUrl: string | null;
};

const pricingFields: Array<{ key: keyof FinanceSettings; label: string }> = [
  { key: 'snackNaira', label: 'Snack NGN' },
  { key: 'standardNaira', label: 'Standard NGN' },
  { key: 'premiereNaira', label: 'Premiere NGN' },
  { key: 'snackUsdMinor', label: 'Snack USD cents' },
  { key: 'standardUsdMinor', label: 'Standard USD cents' },
  { key: 'premiereUsdMinor', label: 'Premiere USD cents' },
  { key: 'snackEurMinor', label: 'Snack EUR cents' },
  { key: 'standardEurMinor', label: 'Standard EUR cents' },
  { key: 'premiereEurMinor', label: 'Premiere EUR cents' },
  { key: 'snackGbpMinor', label: 'Snack GBP pence' },
  { key: 'standardGbpMinor', label: 'Standard GBP pence' },
  { key: 'premiereGbpMinor', label: 'Premiere GBP pence' },
  { key: 'snackCadMinor', label: 'Snack CAD cents' },
  { key: 'standardCadMinor', label: 'Standard CAD cents' },
  { key: 'premiereCadMinor', label: 'Premiere CAD cents' },
  { key: 'familyPassUsdMinor', label: 'Family pass USD cents' },
  { key: 'familyPassEurMinor', label: 'Family pass EUR cents' },
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
  const [signatureUploading, setSignatureUploading] = useState(false);

  const saveSite = async () => {
    setSaving('site');
    setFeedback(null);
    const sitePayload = {
      homePageMode: site.homePageMode,
      launchTitle: site.launchTitle,
      launchMessage: site.launchMessage,
      launchCountdownAt: site.launchCountdownAt,
      launchCtaLabel: site.launchCtaLabel,
      launchCtaHref: site.launchCtaHref,
      platformSignatureKey: site.platformSignatureKey
    };
    const res = await fetch('/api/admin/settings/site', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sitePayload)
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    setFeedback(res.ok ? 'Launch and contract settings saved.' : data.error || 'Launch and contract settings could not be saved.');
  };

  const saveFinance = async () => {
    setSaving('finance');
    setFeedback(null);
    const res = await fetch('/api/admin/settings/pricing', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finance)
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    setFeedback(res.ok ? 'Pricing settings saved.' : data.error || 'Pricing settings could not be saved.');
  };

  const handleSignatureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSignatureUploading(true);
    setFeedback(null);

    try {
      const prepared = await prepareSignatureUpload(file);
      const uploaded = await uploadContractSignatureAsset(prepared.blob, prepared.filename, 'platform');
      setSite((current) => ({
        ...current,
        platformSignatureKey: uploaded.key,
        platformSignaturePreviewUrl: prepared.previewUrl
      }));
      setFeedback('ACE Studio signature uploaded. Save launch and contract settings to use it on new documents.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to upload the ACE Studio signature.');
    } finally {
      setSignatureUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="grid">
      <div className="card" id="site-controls">
        <h3>Public launch and contract controls</h3>
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
          <label className="field">
            <span className="field-label">ACE Studio signature</span>
            <input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSignatureUpload} disabled={signatureUploading} />
            <span className="field-hint">Upload a clean signature on white paper. It will be flattened to JPEG for the contract preview and PDF.</span>
          </label>
        </div>
        <div className="signature-upload-card" style={{ marginTop: 16 }}>
          <div>
            <strong>Contract signature preview</strong>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              {site.platformSignatureKey ? 'This signature will be placed above the ACE Studio line on new signed documents.' : 'No ACE Studio signature has been uploaded yet. The document will fall back to the typed ACE Studio name until you upload one.'}
            </p>
          </div>
          <div className="signature-upload-preview">
            {site.platformSignaturePreviewUrl ? (
              <Image
                src={site.platformSignaturePreviewUrl}
                alt="ACE Studio signature preview"
                width={220}
                height={82}
                unoptimized
              />
            ) : (
              <span>ACE Studio</span>
            )}
          </div>
        </div>
        {site.launchCountdownAt ? (
          <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
            Countdown preview: {site.launchCountdownAt.replace('T', ' ')}
          </p>
        ) : null}
        <div className="moderation-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={saveSite} disabled={saving === 'site' || signatureUploading}>
            {saving === 'site' ? 'Saving...' : signatureUploading ? 'Uploading signature...' : 'Save launch and contract controls'}
          </button>
        </div>
      </div>

      <div className="card" id="pricing-controls">
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
