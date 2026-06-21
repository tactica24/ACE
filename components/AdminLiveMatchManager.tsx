'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, ExternalLink, MessageCircle, Pencil, Plus, Radio, Trash2, X } from '@/components/LiveIcons';
import { LIVE_MATCH_STATUSES, type LiveMatchStatusValue } from '@/lib/live-matches';

export type AdminLiveMatch = {
  id: string;
  slug: string;
  title: string;
  sport: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: LiveMatchStatusValue;
  embedUrl: string;
  posterUrl: string | null;
  description: string | null;
  venue: string | null;
  sourceLabel: string | null;
  youtubeVideoId: string | null;
  youtubeChannelId: string | null;
  isPublished: boolean;
  chatEnabled: boolean;
  _count: { messages: number };
};

const emptyForm = {
  title: '', sport: 'Football', competition: '', homeTeam: '', awayTeam: '', kickoffAt: '',
  status: 'UPCOMING' as LiveMatchStatusValue, embedCode: '', posterUrl: '', description: '', venue: '',
  sourceLabel: '', isPublished: false, chatEnabled: true
};

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function AdminLiveMatchManager({ initialMatches }: { initialMatches: AdminLiveMatch[] }) {
  const [matches, setMatches] = useState(initialMatches);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const stats = useMemo(() => ({
    live: matches.filter((match) => match.status === 'LIVE' && match.isPublished).length,
    drafts: matches.filter((match) => !match.isPublished).length,
    messages: matches.reduce((total, match) => total + match._count.messages, 0)
  }), [matches]);
  const drafts = matches.filter((match) => !match.isPublished);
  const published = matches.filter((match) => match.isPublished);

  function update(name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
    setOpen(true);
  }

  function startEdit(match: AdminLiveMatch) {
    setEditingId(match.id);
    setForm({
      title: match.title, sport: match.sport, competition: match.competition, homeTeam: match.homeTeam,
      awayTeam: match.awayTeam, kickoffAt: toLocalInput(match.kickoffAt), status: match.status,
      embedCode: match.embedUrl, posterUrl: match.posterUrl ?? '', description: match.description ?? '',
      venue: match.venue ?? '', sourceLabel: match.sourceLabel ?? '', isPublished: match.isPublished,
      chatEnabled: match.chatEnabled
    });
    setMessage('');
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/live-matches', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, id: editingId })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Unable to save match.');
      const saved = { ...payload.match, kickoffAt: new Date(payload.match.kickoffAt).toISOString(), _count: editingId ? matches.find((item) => item.id === editingId)?._count ?? { messages: 0 } : { messages: 0 } };
      setMatches((current) => editingId ? current.map((item) => item.id === editingId ? saved : item) : [saved, ...current]);
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save match.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(match: AdminLiveMatch) {
    if (!window.confirm(`Delete ${match.title}? Its chat history will also be deleted.`)) return;
    const response = await fetch(`/api/admin/live-matches?id=${encodeURIComponent(match.id)}`, { method: 'DELETE' });
    if (response.ok) setMatches((current) => current.filter((item) => item.id !== match.id));
  }

  async function setPublished(match: AdminLiveMatch, isPublished: boolean) {
    setMessage('');
    const response = await fetch('/api/admin/live-matches', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: match.id, action: isPublished ? 'publish' : 'unpublish' })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? 'Unable to update this match.');
      return;
    }
    setMatches((current) => current.map((item) => item.id === match.id ? { ...item, isPublished } : item));
  }

  function renderMatches(items: AdminLiveMatch[]) {
    if (!items.length) return <div className="live-empty-admin"><Radio size={34} /><h3>No matches here</h3><p>The daily collector will place eligible broadcasts into Drafts.</p></div>;
    return <div className="live-admin-list">{items.map((match) => <article className="live-admin-row" key={match.id}>
      <div className={`live-status-dot ${match.status.toLowerCase()}`} />
      <div className="live-admin-match-copy">
        <div className="live-admin-badges"><span>{match.sport}</span><span>{match.competition}</span><span>{match.status}</span>{!match.isPublished ? <span>Draft</span> : null}{match.youtubeVideoId ? <span>Verified YouTube</span> : null}</div>
        <h3>{match.homeTeam} <span>vs</span> {match.awayTeam}</h3>
        <p><CalendarClock size={14} /> {new Date(match.kickoffAt).toLocaleString()} {match.venue ? ` · ${match.venue}` : ''}</p>
      </div>
      <div className="live-admin-chat-count"><MessageCircle size={16} /><strong>{match._count.messages}</strong><span>messages</span></div>
      <div className="live-admin-actions">
        {!match.isPublished ? <button className="btn btn-primary btn-compact" type="button" onClick={() => void setPublished(match, true)}>Publish</button> : <button className="btn btn-ghost btn-compact" type="button" onClick={() => void setPublished(match, false)}>Unpublish</button>}
        {match.isPublished ? <a className="btn btn-ghost btn-compact" href={`/live/${match.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> View</a> : null}
        <button className="btn btn-ghost btn-compact" type="button" onClick={() => startEdit(match)}><Pencil size={15} /> Edit</button>
        <button className="icon-danger-button" type="button" aria-label={`Delete ${match.title}`} onClick={() => void remove(match)}><Trash2 size={17} /></button>
      </div>
    </article>)}</div>;
  }

  return <div className="admin-live-manager">
    <div className="live-admin-stats">
      <div className="detail-card"><span className="detail-label">Live now</span><strong>{stats.live}</strong></div>
      <div className="detail-card"><span className="detail-label">Drafts</span><strong>{stats.drafts}</strong></div>
      <div className="detail-card"><span className="detail-label">Match rooms</span><strong>{matches.length}</strong></div>
      <div className="detail-card"><span className="detail-label">Chat messages</span><strong>{stats.messages}</strong></div>
    </div>

    <div className="section-heading live-admin-heading">
      <div><h2>Draft matches</h2><p className="muted">Review each automatic import, then publish it with one click.</p></div>
      <button className="btn btn-primary" type="button" onClick={startCreate}><Plus size={17} /> Add live match</button>
    </div>
    {message ? <p className="form-message error">{message}</p> : null}
    {renderMatches(drafts)}

    <div className="section-heading live-admin-heading"><div><h2>Published matches</h2><p className="muted">These matches are visible to the audience.</p></div></div>
    {renderMatches(published)}

    {open ? <div className="live-modal-backdrop" role="presentation">
      <div className="live-admin-modal" role="dialog" aria-modal="true" aria-labelledby="live-form-title">
        <div className="live-modal-header"><div><span className="pill">Control room</span><h2 id="live-form-title">{editingId ? 'Edit live match' : 'Add live match'}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X /></button></div>
        <form onSubmit={save} className="live-admin-form">
          <div className="live-form-grid two"><label className="field"><span>Display title</span><input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Sunday night football" required /></label><label className="field"><span>Sport</span><input value={form.sport} onChange={(e) => update('sport', e.target.value)} placeholder="Football" required /></label></div>
          <label className="field"><span>Competition</span><input value={form.competition} onChange={(e) => update('competition', e.target.value)} placeholder="Premier League" required /></label>
          <div className="live-form-grid two"><label className="field"><span>Home team</span><input value={form.homeTeam} onChange={(e) => update('homeTeam', e.target.value)} required /></label><label className="field"><span>Away team</span><input value={form.awayTeam} onChange={(e) => update('awayTeam', e.target.value)} required /></label></div>
          <div className="live-form-grid two"><label className="field"><span>Kickoff</span><input type="datetime-local" value={form.kickoffAt} onChange={(e) => update('kickoffAt', e.target.value)} required /></label><label className="field"><span>Status</span><select value={form.status} onChange={(e) => update('status', e.target.value)}>{LIVE_MATCH_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label></div>
          <label className="field"><span>Player URL or iframe embed code</span><textarea rows={3} value={form.embedCode} onChange={(e) => update('embedCode', e.target.value)} placeholder={'https://player.example.com/... or <iframe src="https://..."></iframe>'} required /><small>ACE extracts only the secure HTTPS player URL. Use a source that permits embedding and public playback.</small></label>
          <div className="live-form-grid two"><label className="field"><span>Poster URL (optional)</span><input type="url" value={form.posterUrl} onChange={(e) => update('posterUrl', e.target.value)} placeholder="https://..." /></label><label className="field"><span>Venue (optional)</span><input value={form.venue} onChange={(e) => update('venue', e.target.value)} /></label></div>
          <label className="field"><span>Source label (optional)</span><input value={form.sourceLabel} onChange={(e) => update('sourceLabel', e.target.value)} placeholder="Official broadcast partner" /></label>
          <label className="field"><span>Match notes</span><textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Build-up, team news, or viewing details" /></label>
          <div className="live-toggle-row"><label><input type="checkbox" checked={form.isPublished} onChange={(e) => update('isPublished', e.target.checked)} /><span><strong>Publish match</strong><small>Visible in Live Matches</small></span></label><label><input type="checkbox" checked={form.chatEnabled} onChange={(e) => update('chatEnabled', e.target.checked)} /><span><strong>Open chat</strong><small>Signed-in users can join</small></span></label></div>
          {message ? <p className="form-message error">{message}</p> : null}
          <div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create match'}</button><button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      </div>
    </div> : null}
  </div>;
}
