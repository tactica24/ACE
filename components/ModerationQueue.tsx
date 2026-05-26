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
    seriesId?: string | null;
    ageRating?: string;
    rightsTier?: string;
    priceTier?: string;
    unlockPrice?: number | null;
    producerRevenueShare?: number;
    platformRevenueShare?: number;
    taxRevenueShare?: number;
    releaseYear?: number | null;
    originalLanguage?: string | null;
    genres?: string[];
    contentWarnings?: string[];
    posterKey?: string | null;
    posterDownloadHref?: string | null;
    trailerDownloadHref?: string | null;
    createdAt?: string;
    creatorName?: string;
    packageLabel?: string;
    packageStatus?: string;
    subtitleStatus?: string;
    deliveryFormat?: string;
    licensedTerritories?: string[];
    availabilityRegion?: string;
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
  unlockPrice: string;
  producerRevenueShare: string;
  platformRevenueShare: string;
  taxRevenueShare: string;
  rightsTier: string;
  releaseYear: string;
  originalLanguage: string;
  genres: string;
  contentWarnings: string;
  licensedTerritories: string;
  availabilityRegion: string;
};

const categoryOptions = [
  'General',
  'Love',
  'Action',
  'Thriller',
  'Comedy',
  'Drama',
  'Romance',
  'Sci-Fi',
  'Horror',
  'Documentary',
  'Family',
  'Faith',
  'Animation',
];

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

// Minimal upload helpers for trailer/poster assets during moderation edit (reuses studio presigned upload)
const uploadFileToSignedUrl = async (url: string, file: File, contentType: string, onProgress?: (loaded: number, total: number) => void) => {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error('Storage upload failed with status ' + xhr.status + (xhr.responseText ? ': ' + xhr.responseText : '')));
    };
    xhr.onerror = () => reject(new Error('Storage upload failed due to a network error.'));
    xhr.ontimeout = () => reject(new Error('Storage upload timed out before storage accepted the file.'));
    xhr.onabort = () => reject(new Error('Storage upload was cancelled before it completed.'));
    xhr.send(file);
  });
};

const prepareAssetUpload = async (file: File, purpose: 'trailer' | 'poster') => {
  const response = await fetch('/api/studio/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      purpose,
      fileSize: file.size
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url || !payload.key) {
    throw new Error(payload.error || 'Could not prepare upload.');
  }
  await uploadFileToSignedUrl(payload.url, file, file.type || 'application/octet-stream');
  return payload.key as string;
};

export default function ModerationQueue({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VideoDraft>>({});
  const [editAssets, setEditAssets] = useState<Record<string, { trailer: File | null; poster: File | null }>>({});

  const getDraft = (item: Item) =>
    drafts[item.video.id] ?? {
      title: item.video.title,
      description: item.video.description,
      category: item.video.category ?? 'General',
      videoType: item.video.videoType ?? 'FEATURE',
      ageRating: item.video.ageRating ?? 'ALL',
      priceTier: item.video.priceTier ?? 'STANDARD',
      unlockPrice: item.video.unlockPrice ? String(item.video.unlockPrice) : '',
      producerRevenueShare: String(item.video.producerRevenueShare ?? 70),
      platformRevenueShare: String(item.video.platformRevenueShare ?? 30),
      taxRevenueShare: String(item.video.taxRevenueShare ?? 0),
      rightsTier: item.video.rightsTier ?? 'SHARED',
      releaseYear: item.video.releaseYear ? String(item.video.releaseYear) : '',
      originalLanguage: item.video.originalLanguage ?? 'en',
      genres: (item.video.genres ?? []).join(', '),
      contentWarnings: (item.video.contentWarnings ?? []).join(', '),
      licensedTerritories: (item.video.licensedTerritories ?? []).join(', '),
      availabilityRegion: item.video.availabilityRegion ?? 'GLOBAL'
    };

  const getEditAssets = (videoId: string) => editAssets[videoId] ?? { trailer: null, poster: null };

  const setEditAsset = (videoId: string, type: 'trailer' | 'poster', file: File | null) => {
    setEditAssets((prev) => ({
      ...prev,
      [videoId]: {
        ...getEditAssets(videoId),
        [type]: file
      }
    }));
  };

  const clearEditAssets = (videoId: string) => {
    setEditAssets((prev) => {
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
  };

  const closeEdit = (videoId: string) => {
    clearEditAssets(videoId);
    setEditingId(null);
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
          unlockPrice: '',
          producerRevenueShare: '70',
          platformRevenueShare: '30',
          taxRevenueShare: '0',
          rightsTier: 'SHARED',
          releaseYear: '',
          originalLanguage: 'en',
          genres: '',
          contentWarnings: '',
          licensedTerritories: '',
          availabilityRegion: 'GLOBAL'
        }),
        [key]: value
      }
    }));
  };

  const saveEdit = async (item: Item) => {
    const draft = getDraft(item);
    const assets = getEditAssets(item.video.id);
    let trailerKey: string | undefined;
    let posterKey: string | undefined;

    try {
      if (assets.trailer) {
        trailerKey = await prepareAssetUpload(assets.trailer, 'trailer');
      }
      if (assets.poster) {
        posterKey = await prepareAssetUpload(assets.poster, 'poster');
      }
    } catch (uploadErr: any) {
      setErrors((prev) => ({ ...prev, [item.video.id]: uploadErr?.message || 'Failed to upload trailer or poster.' }));
      return;
    }

    const res = await fetch('/api/admin/videos/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: item.video.id,
        ...draft,
        licensedTerritories: draft.licensedTerritories,
        ...(trailerKey ? { trailerKey } : {}),
        ...(posterKey ? { posterKey } : {})
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
                ...data.video,
                ...(trailerKey ? { trailerDownloadHref: `/api/admin/videos/${item.video.id}/trailer` } : {}),
                ...(posterKey ? { posterDownloadHref: `/api/admin/videos/${item.video.id}/poster` } : {})
              }
            }
          : entry
      )
    );
    setEditingId(null);
    clearEditAssets(item.video.id);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[item.video.id];
      return next;
    });
    setSuccesses((prev) => ({ ...prev, [item.video.id]: 'Saved successfully!' }));
    setTimeout(() => {
      setSuccesses((prev) => {
        const next = { ...prev };
        delete next[item.video.id];
        return next;
      });
    }, 2500);
  };

  const handleAction = async (item: Item, action: 'approve' | 'reject' | 'deactivate' | 'activate') => {
    if ((action === 'approve' || action === 'reject') && !item.hasModerationRecord) {
      setErrors((prev) => ({
        ...prev,
        [item.video.id]: 'This title has no moderation record yet. Use the visibility toggle below to hide or reactivate it.'
      }));
      return;
    }

    const isVisibilityToggle = action === 'deactivate' || action === 'activate';
    const targetStatus = action === 'deactivate' ? 'DRAFT' : action === 'activate' ? 'APPROVED' : null;

    let endpoint: string;
    let payload: Record<string, unknown>;

    if (isVisibilityToggle) {
      endpoint = '/api/admin/videos/status';
      const reason = (reasons[item.video.id] ?? '').trim();
      if (action === 'deactivate' && !reason) {
        setErrors((prev) => ({ ...prev, [item.video.id]: 'Add a note before hiding this title from viewers.' }));
        return;
      }
      payload = { videoId: item.video.id, status: targetStatus, reason: reason || undefined };
    } else {
      endpoint = `/api/admin/moderation/${action}`;
      const reason = (reasons[item.video.id] ?? '').trim();
      payload = { id: item.id, reason };
    }

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

      if (isVisibilityToggle) {
        // Flip the status locally so button updates without reload; keep in list for reactivate/deactivate toggle
        setItems((prev) =>
          prev.map((entry) =>
            entry.video.id === item.video.id
              ? {
                  ...entry,
                  video: {
                    ...entry.video,
                    status: targetStatus!
                  }
                }
              : entry
          )
        );
        const newStatus = targetStatus === 'DRAFT' ? 'hidden' : 'live';
        setSuccesses((prev) => ({ ...prev, [item.video.id]: `Title is now ${newStatus} for viewers.` }));
        setTimeout(() => {
          setSuccesses((prev) => {
            const next = { ...prev };
            delete next[item.video.id];
            return next;
          });
        }, 2500);
      } else {
        setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      }
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
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 56,
                      height: 76,
                      borderRadius: 12,
                      flexShrink: 0,
                      background: posterUrl
                        ? `center / cover no-repeat url(${posterUrl})`
                        : 'linear-gradient(135deg, rgba(244,211,94,0.18), rgba(255,255,255,0.04))',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                  <div>
                  <h3>{item.video.title}</h3>
                  <p className="muted">{item.video.description}</p>
                  </div>
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
                <div className="detail-card">
                  <span className="detail-label">Unlock price</span>
                  <strong>{item.video.unlockPrice ? `NGN ${item.video.unlockPrice.toLocaleString()}` : 'Tier default'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Revenue split</span>
                  <strong>{item.video.producerRevenueShare ?? 70}:{item.video.platformRevenueShare ?? 30}:{item.video.taxRevenueShare ?? 0}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Availability</span>
                  <strong>{item.video.availabilityRegion === 'AFRICA' ? 'Africa only' : 'Global'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Territories</span>
                  <strong>{item.video.licensedTerritories?.length ? item.video.licensedTerritories.join(', ') : 'Not recorded'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Viewer package</span>
                  <strong>{item.video.packageLabel ?? '1080p MP4 + 720p MP4'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Package status</span>
                  <strong>{item.video.packageStatus ?? 'Pending package review'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Delivery format</span>
                  <strong>{item.video.deliveryFormat ?? 'MP4 viewer package'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Subtitles</span>
                  <strong>{item.video.subtitleStatus ?? 'No subtitles uploaded'}</strong>
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
              {successes[item.video.id] ? <p className="muted form-message" style={{ color: '#22c55e' }}>{successes[item.video.id]}</p> : null}

              {editingId === item.video.id ? (
                <div className="detail-grid" style={{ marginTop: 12 }}>
                  <label className="field">
                    <span className="field-label">Title</span>
                    <input className="input" value={getDraft(item).title} onChange={(event) => updateDraft(item.video.id, 'title', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Category</span>
                    <select className="input" value={getDraft(item).category} onChange={(event) => updateDraft(item.video.id, 'category', event.target.value)}>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
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
                    <span className="field-label">Unlock price (NGN)</span>
                    <input className="input" type="number" min={0} value={getDraft(item).unlockPrice} onChange={(event) => updateDraft(item.video.id, 'unlockPrice', event.target.value)} placeholder="Use tier default" />
                  </label>
                  <label className="field">
                    <span className="field-label">Producer share %</span>
                    <input className="input" type="number" min={0} max={100} step="0.1" value={getDraft(item).producerRevenueShare} onChange={(event) => updateDraft(item.video.id, 'producerRevenueShare', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">ACE share %</span>
                    <input className="input" type="number" min={0} max={100} step="0.1" value={getDraft(item).platformRevenueShare} onChange={(event) => updateDraft(item.video.id, 'platformRevenueShare', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Withholding / reserve %</span>
                    <input className="input" type="number" min={0} max={100} step="0.1" value={getDraft(item).taxRevenueShare} onChange={(event) => updateDraft(item.video.id, 'taxRevenueShare', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Viewing availability</span>
                    <select className="input" value={getDraft(item).availabilityRegion} onChange={(event) => updateDraft(item.video.id, 'availabilityRegion', event.target.value)}>
                      <option value="GLOBAL">Global</option>
                      <option value="AFRICA">Africa only</option>
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
                  <label className="field">
                    <span className="field-label">Licensed territories</span>
                    <input className="input" value={getDraft(item).licensedTerritories} onChange={(event) => updateDraft(item.video.id, 'licensedTerritories', event.target.value)} />
                  </label>
                   <label className="field" style={{ gridColumn: '1/-1' }}>
                     <span className="field-label">Description</span>
                     <textarea className="input" rows={4} value={getDraft(item).description} onChange={(event) => updateDraft(item.video.id, 'description', event.target.value)}></textarea>
                   </label>

                   <label className="field" style={{ gridColumn: '1/-1' }}>
                     <span className="field-label">Marketing trailer (MP4) — optional, replaces existing</span>
                     <input
                       type="file"
                       accept="video/mp4,video/quicktime"
                       onChange={(event) => setEditAsset(item.video.id, 'trailer', event.target.files?.[0] ?? null)}
                     />
                     {getEditAssets(item.video.id).trailer ? (
                       <span className="muted">Selected: {getEditAssets(item.video.id).trailer?.name}</span>
                     ) : item.video.trailerDownloadHref ? (
                       <span className="muted">Current trailer attached — pick file above to replace</span>
                     ) : (
                       <span className="muted">No trailer yet — pick file to attach</span>
                     )}
                   </label>

                   <label className="field" style={{ gridColumn: '1/-1' }}>
                     <span className="field-label">Poster / key art (JPG/PNG/WEBP) — optional, replaces existing</span>
                     <input
                       type="file"
                       accept="image/jpeg,image/png,image/webp"
                       onChange={(event) => setEditAsset(item.video.id, 'poster', event.target.files?.[0] ?? null)}
                     />
                     {getEditAssets(item.video.id).poster ? (
                       <span className="muted">Selected: {getEditAssets(item.video.id).poster?.name}</span>
                     ) : item.video.posterDownloadHref ? (
                       <span className="muted">Current poster attached — pick file above to replace</span>
                     ) : (
                       <span className="muted">No poster yet — pick file to attach</span>
                     )}
                   </label>

                   <div className="moderation-actions" style={{ gridColumn: '1/-1' }}>
                    <button className="btn btn-primary" onClick={() => saveEdit(item)}>Save changes</button>
                     <button className="btn btn-ghost" onClick={() => closeEdit(item.video.id)}>Cancel</button>
                  </div>
                </div>
              ) : null}

              <div className="moderation-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    if (editingId === item.video.id) {
                      closeEdit(item.video.id);
                    } else {
                      setEditingId(item.video.id);
                    }
                  }}
                >
                  {editingId === item.video.id ? 'Close editor' : 'Edit details'}
                </button>
                {item.video.posterDownloadHref ? (
                  <a className="btn btn-ghost" href={item.video.posterDownloadHref}>
                    Download artwork
                  </a>
                ) : null}
                {item.video.trailerDownloadHref ? (
                  <a className="btn btn-ghost" href={item.video.trailerDownloadHref}>
                    Download trailer
                  </a>
                ) : null}
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
                <button
                  className="btn btn-ghost"
                  onClick={() => handleAction(item, item.video.status === 'DRAFT' ? 'activate' : 'deactivate')}
                >
                  {item.video.status === 'DRAFT' ? 'Activate for users' : 'Deactivate for viewers'}
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
