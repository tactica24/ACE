'use client';

import { useState } from 'react';

export type AdminMatchSource = { id: string; channelId: string; title: string; channelUrl: string; sport: string; lastCheckedAt: string | null; builtIn?: boolean };

export default function MatchSourceManager({ initialSources }: { initialSources: AdminMatchSource[] }) {
  const [sources, setSources] = useState(initialSources);
  const [url, setUrl] = useState('');
  const [sport, setSport] = useState('Football');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/match-sources', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, sport }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Unable to inspect this YouTube link.');
      setMessage(payload.message ?? 'YouTube source added.'); setUrl('');
      if (payload.source) {
        const saved: AdminMatchSource = { id: payload.source.id, channelId: payload.source.channelId, title: payload.source.title, channelUrl: payload.source.channelUrl, sport: payload.source.sport, lastCheckedAt: payload.source.lastCheckedAt ?? null };
        setSources((current) => [...current.filter((source) => source.channelId !== saved.channelId), saved]);
      }
      window.setTimeout(() => window.location.reload(), 900);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to inspect this YouTube link.'); }
    finally { setSaving(false); }
  }

  async function remove(source: AdminMatchSource) {
    if (source.builtIn || !window.confirm(`Stop automatically checking ${source.title}? Existing drafts will remain.`)) return;
    const response = await fetch(`/api/admin/match-sources?id=${encodeURIComponent(source.id)}`, { method: 'DELETE' });
    if (response.ok) setSources((current) => current.filter((item) => item.id !== source.id));
  }

  return <section className="match-source-panel">
    <div className="section-heading live-admin-heading"><div><h2>YouTube intake</h2><p className="muted">Paste one live/upcoming video to draft it now, or paste a channel to check it automatically.</p></div></div>
    <form className="match-source-form" onSubmit={submit}>
      <label className="field match-source-url"><span>YouTube video or channel link</span><input type="text" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://youtube.com/watch?v=… or https://youtube.com/@channel" disabled={saving} required /></label>
      <label className="field"><span>Sport for channel links</span><input value={sport} onChange={(event) => setSport(event.target.value)} placeholder="Football" disabled={saving} required /></label>
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Checking…' : 'Check and add'}</button>
    </form>
    <div aria-live="polite">{message ? <p className="form-message success">{message}</p> : null}{error ? <p className="form-message error" role="alert">{error}</p> : null}</div>
    <p className="muted match-source-help">Only active or scheduled broadcasts with embedding enabled become drafts. Adding a channel never publishes its videos automatically.</p>
    <div className="match-source-list">{sources.map((source) => <article className="match-source-row" key={`${source.builtIn ? 'built-in' : 'saved'}-${source.channelId}`}>
      <div><strong>{source.title}</strong><span>{source.sport} · {source.builtIn ? 'Built-in approved source' : source.lastCheckedAt ? `Checked ${new Date(source.lastCheckedAt).toLocaleString()}` : 'Waiting for first check'}</span></div>
      <a className="btn btn-ghost btn-compact" href={source.channelUrl} target="_blank" rel="noreferrer">Open channel</a>
      {!source.builtIn ? <button className="btn btn-ghost btn-compact" type="button" onClick={() => void remove(source)}>Remove</button> : null}
    </article>)}</div>
  </section>;
}
