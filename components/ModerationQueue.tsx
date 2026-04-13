'use client';

import { useState } from 'react';
import { getMediaAssetUrl } from '@/lib/media';

type Item = {
  id: string;
  hasModerationRecord: boolean;
  video: {
    id: string;
    title: string;
    description: string;
    category?: string;
    status?: string;
    videoType?: string;
    ageRating?: string;
    rightsTier?: string;
    priceTier?: string;
    releaseYear?: number | null;
    originalLanguage?: string | null;
    genres?: string[];
    contentWarnings?: string[];
    posterKey?: string | null;
    createdAt?: string;
    creatorName?: string;
  };
  status: string;
  notes?: string | null;
};

export type ModerationQueueItem = Item;

type VideoDraft = {
  title: string;
  description: string;
  category: string;
  videoType: string;
  ageRating: string;
  priceTier: string;
  rightsTier: string;
  releaseYear: string;
  originalLanguage: string;
  genres: string;
  contentWarnings: string;
};

const ageLabel: Record<string, string> = {
  ALL: 'All',
  PG13: '13+',
  PG16: '16+',
  PG18: '18+'
};

const labelize = (value?: string) =>
  value
    ? value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Not set';

export default function ModerationQueue({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VideoDraft>>({});

  const getDraft = (item: Item) =>
    drafts[item.video.id] ?? {
      title: item.video.title,
      description: item.video.description,
      category: item.video.category ?? 'General',
      videoType: item.video.videoType ?? 'FEATURE',
      ageRating: item.video.ageRating ?? 'ALL',
      priceTier: item.video.priceTier ?? 'STANDARD',
      rightsTier: item.video.rightsTier ?? 'SHARED',
      releaseYear: item.video.releaseYear ? String(item.video.releaseYear) : '',
      originalLanguage: item.video.originalLanguage ?? 'en',
      genres: (item.video.genres ?? []).join(', '),
      contentWarnings: (item.video.contentWarnings ?? []).join(', ')
    };

  const updateDraft = (videoId: string, key: keyof VideoDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [videoId]: {
        ...(prev[videoId] ?? {
          title: '',
          description: '',
          category: 'General',
          videoType: 'FEATURE',
          ageRating: 'ALL',
          priceTier: 'STANDARD',
          rightsTier: 'SHARED',
          releaseYear: '',
          originalLanguage: 'en',
          genres: '',
          contentWarnings: ''
        }),
        [key]: value
      }
    }));
  };

  const saveEdit = async (item: Item) => {
    const draft = getDraft(item);
    const res = await fetch('/api/admin/videos/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: item.video.id,
        ...draft
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.video) {
      setErrors((prev) => ({ ...prev, [item.video.id]: data.error || 'The video details could not be updated right now.' }));
      return;
    }

    setItems((prev) =>
      prev.map((entry) =>
        entry.video.id === item.video.id
          ? {
              ...entry,
              video: {
                ...entry.video,
                ...data.video
              }
            }
          : entry
      )
    );
    setEditingId(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[item.video.id];
      return next;
    });
  };

  const handleAction = async (item: Item, action: 'approve' | 'reject' | 'remove') => {
    if ((action === 'approve' || action === 'reject') && !item.hasModerationRecord) {
      setErrors((prev) => ({
        ...prev,
        [item.video.id]: 'This title has no moderation record yet. Use "Deactivate for viewers" to hide it from the catalog.'
      }));
      return;
    }

    const endpoint = action === 'remove' ? '/api/admin/videos/delete' : `/api/admin/moderation/${action}`;
    const reason = (reasons[item.video.id] ?? '').trim();

    if (action === 'remove' && !reason) {
      setErrors((prev) => ({ ...prev, [item.video.id]: 'Add a note before hiding this title from viewers.' }));
      return;
    }

    const payload =
      action === 'remove'
        ? { videoId: item.video.id, reason }
        : { id: item.id, reason };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[item.video.id];
        return next;
      });
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      return;
    }

    const data = await res.json().catch(() => ({}));
    setErrors((prev) => ({ ...prev, [item.video.id]: data.error || 'This action could not be completed right now.' }));
  };

  if (items.length === 0) {
    return (
      <div className="card empty-state">
        <h3>No titles are waiting for review</h3>
        <p className="muted">New producer submissions will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="moderation-grid">
      {items.map((item) => {
        const posterUrl = getMediaAssetUrl(item.video.posterKey);

        return (
          <div key={item.id} className="card moderation-card">
            <div
              className="moderation-poster"
              style={posterUrl ? { backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!posterUrl ? <span>Ace Studio</span> : null}
            </div>

            <div className="moderation-content">
              <div className="moderation-header">
                <div>
                  <h3>{item.video.title}</h3>
                  <p className="muted">{item.video.description}</p>
                </div>
                <div className="moderation-statuses">
                  <span className="badge">{item.status}</span>
                  <span className={`status-chip ${item.video.status === 'APPROVED' ? 'status-live' : 'status-review'}`}>
                    {item.video.status ?? 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-card">
                  <span className="detail-label">Producer</span>
                  <strong>{item.video.creatorName ?? 'Unknown producer'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Category</span>
                  <strong>{item.video.category ?? 'General'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Type</span>
                  <strong>{labelize(item.video.videoType)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Age rating</span>
                  <strong>{ageLabel[item.video.ageRating ?? ''] ?? labelize(item.video.ageRating)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Rights</span>
                  <strong>{labelize(item.video.rightsTier)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Production year</span>
                  <strong>{item.video.releaseYear ?? 'Not set'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Price tier</span>
                  <strong>{labelize(item.video.priceTier)}</strong>
                </div>
              </div>

              <label className="field">
                <span className="field-label">Admin note</span>
                <input
                  className="input"
                  value={reasons[item.video.id] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setReasons((prev) => ({ ...prev, [item.video.id]: value }));
                    setErrors((prev) => {
                      if (!prev[item.video.id]) return prev;
                      const next = { ...prev };
                      delete next[item.video.id];
                      return next;
                    });
                  }}
                />
              </label>
              {errors[item.video.id] ? <p className="muted form-message">{errors[item.video.id]}</p> : null}

              {editingId === item.video.id ? (
                <div className="detail-grid" style={{ marginTop: 12 }}>
                  <label className="field">
                    <span className="field-label">Title</span>
                    <input className="input" value={getDraft(item).title} onChange={(event) => updateDraft(item.video.id, 'title', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Category</span>
                    <input className="input" value={getDraft(item).category} onChange={(event) => updateDraft(item.video.id, 'category', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Type</span>
                    <select className="input" value={getDraft(item).videoType} onChange={(event) => updateDraft(item.video.id, 'videoType', event.target.value)}>
                      <option value="FEATURE">Feature</option>
                      <option value="SERIES">Series</option>
                      <option value="SHORT">Short</option>
                      <option value="SKIT">Skit</option>
                      <option value="DOCUMENTARY">Documentary</option>
                      <option value="ADVERT">Advert</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Age rating</span>
                    <select className="input" value={getDraft(item).ageRating} onChange={(event) => updateDraft(item.video.id, 'ageRating', event.target.value)}>
                      <option value="ALL">All</option>
                      <option value="PG13">13+</option>
                      <option value="PG16">16+</option>
                      <option value="PG18">18+</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Price tier</span>
                    <select className="input" value={getDraft(item).priceTier} onChange={(event) => updateDraft(item.video.id, 'priceTier', event.target.value)}>
                      <option value="SNACK">Snack</option>
                      <option value="STANDARD">Standard</option>
                      <option value="PREMIERE">Premiere</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Rights</span>
                    <select className="input" value={getDraft(item).rightsTier} onChange={(event) => updateDraft(item.video.id, 'rightsTier', event.target.value)}>
                      <option value="SHARED">Shared</option>
                      <option value="EXCLUSIVE">Exclusive</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Production year</span>
                    <input className="input" type="number" min={1900} max={new Date().getFullYear() + 2} value={getDraft(item).releaseYear} onChange={(event) => updateDraft(item.video.id, 'releaseYear', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Original language</span>
                    <input className="input" value={getDraft(item).originalLanguage} onChange={(event) => updateDraft(item.video.id, 'originalLanguage', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Genres</span>
                    <input className="input" value={getDraft(item).genres} onChange={(event) => updateDraft(item.video.id, 'genres', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Warnings</span>
                    <input className="input" value={getDraft(item).contentWarnings} onChange={(event) => updateDraft(item.video.id, 'contentWarnings', event.target.value)} />
                  </label>
                  <label className="field" style={{ gridColumn: '1 / -1' }}>
                    <span className="field-label">Description</span>
                    <textarea className="input" rows={4} value={getDraft(item).description} onChange={(event) => updateDraft(item.video.id, 'description', event.target.value)} />
                  </label>
                  <div className="moderation-actions" style={{ gridColumn: '1 / -1' }}>
                    <button className="btn btn-primary" onClick={() => saveEdit(item)}>Save changes</button>
                    <button className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : null}

              <div className="moderation-actions">
                <button className="btn btn-ghost" onClick={() => setEditingId((current) => current === item.video.id ? null : item.video.id)}>
                  {editingId === item.video.id ? 'Close editor' : 'Edit details'}
                </button>
                {item.status === 'PENDING' ? (
                  <button className="btn btn-primary" onClick={() => handleAction(item, 'approve')}>
                    Approve title
                  </button>
                ) : null}
                {item.hasModerationRecord ? (
                  <button className="btn btn-ghost" onClick={() => handleAction(item, 'reject')}>
                    Reject title
                  </button>
                ) : null}
                <button className="btn btn-ghost" onClick={() => handleAction(item, 'remove')}>
                  Deactivate for viewers
                </button>
              </div>

              {item.notes ? <p className="muted form-message">{item.notes}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
