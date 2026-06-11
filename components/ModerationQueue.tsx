'use client';

import { useState } from 'react';
import { getMoviePosterUrl } from '@/lib/movie-assets';
import PosterAsset from '@/components/PosterAsset';
import { uploadPreparedStorageAsset } from '@/lib/client-storage-upload';
import type { PreparedStorageUpload } from '@/lib/storage-upload';
import {
  PRIMARY_CATEGORY_OPTIONS,
  SECONDARY_GENRE_OPTIONS,
  normalizeSelectedGenres,
  toggleGenreSelection
} from '@/lib/video-taxonomy';

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
    series?: {
      posterKey: string | null;
    } | null;
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
    masterKey?: string | null;
    masterSourceUrl?: string | null;
    processingStatus?: string | null;
    hlsManifestReady?: boolean;
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
  genres: string[];
  contentWarnings: string;
  licensedTerritories: string;
  availabilityRegion: string;
  sourceUrl: string;
};

type ActivityState = {
  label: string;
  progress: number;
  active: boolean;
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

const toStorageUploadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Upload failed.';
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes('direct bunny upload failed') ||
    normalizedMessage.includes('proxy fallback also failed') ||
    normalizedMessage.includes('folder preparation failed')
  ) {
    return message;
  }

  if (normalizedMessage.includes('status 413') || normalizedMessage.includes('payload_too_large')) {
    return 'Proxy fallback was used and hit the request size limit. Direct Bunny browser upload is still not completing for this asset.';
  }

  if (normalizedMessage.includes('browser could not reach the bunny upload endpoint')) {
    return `${message} Check the Bunny S3 endpoint, browser CORS/preflight behavior, and the storage zone credentials.`;
  }

  return message;
};

const prepareAssetUpload = async (
  file: File,
  purpose: 'trailer' | 'poster',
  folderId: string,
  onProgress: (loaded: number, total: number) => void
) => {
  const response = await fetch('/api/uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      purpose,
      folderId,
      fileSize: file.size
    })
  });
  const rawBody = await response.text().catch(() => '');
  const payload = rawBody
    ? (() => {
        try {
          return JSON.parse(rawBody);
        } catch {
          return {};
        }
      })()
    : {};
  if (!response.ok || !payload.key || !payload.strategy) {
    if (payload?.stage === 'storage-folder-prep') {
      throw new Error(
        `Bunny Storage folder preparation failed: ${
          (typeof payload?.error === 'string' && payload.error.trim()) || 'Unknown storage error.'
        }`
      );
    }

    if (payload?.stage === 'direct-upload-preparation') {
      if (payload?.directUploadConfigured) {
        throw new Error(
          `Direct Bunny upload could not be prepared: ${
            (typeof payload?.error === 'string' && payload.error.trim()) || 'Unknown direct upload error.'
          }`
        );
      }

      throw new Error(
        'Direct Bunny upload is not configured in this environment. Add BUNNY_STORAGE_S3_ENDPOINT, BUNNY_STORAGE_ZONE, and the Bunny Storage Zone password as BUNNY_STORAGE_API_KEY.'
      );
    }

    throw new Error(
      (typeof payload?.error === 'string' && payload.error.trim()) ||
        rawBody ||
        'Could not prepare upload.'
    );
  }

  try {
    await uploadPreparedStorageAsset(payload as PreparedStorageUpload, file, onProgress);
  } catch (error) {
    throw new Error(toStorageUploadError(error));
  }

  return payload.key as string;
};

export default function ModerationQueue({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, string>>({});
  const [activityStates, setActivityStates] = useState<Record<string, ActivityState | undefined>>({});
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
      genres: normalizeSelectedGenres(item.video.genres ?? []),
      contentWarnings: (item.video.contentWarnings ?? []).join(', '),
      licensedTerritories: (item.video.licensedTerritories ?? []).join(', '),
      availabilityRegion: item.video.availabilityRegion ?? 'GLOBAL',
      sourceUrl: item.video.masterSourceUrl ?? ''
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

  const setActivityState = (videoId: string, label: string, progress: number, active = true) => {
    setActivityStates((prev) => ({
      ...prev,
      [videoId]: { label, progress, active }
    }));
  };

  const clearActivityState = (videoId: string) => {
    setActivityStates((prev) => {
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
  };

  const clearFeedback = (videoId: string) => {
    setErrors((prev) => {
      if (!prev[videoId]) return prev;
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
    setSuccesses((prev) => {
      if (!prev[videoId]) return prev;
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
  };

  const updateDraft = <K extends keyof VideoDraft>(videoId: string, key: K, value: VideoDraft[K]) => {
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
          genres: [],
          contentWarnings: '',
          licensedTerritories: '',
          availabilityRegion: 'GLOBAL',
          sourceUrl: ''
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
    const hasTrailerUpload = Boolean(assets.trailer);
    const hasPosterUpload = Boolean(assets.poster);
    const hasSourceUpdate =
      Boolean(draft.sourceUrl.trim()) && draft.sourceUrl.trim() !== (item.video.masterSourceUrl ?? '');

    const uploadProgressRange = hasTrailerUpload && hasPosterUpload ? 32 : hasTrailerUpload || hasPosterUpload ? 48 : 0;
    const beforeUploadsProgress = 8;
    const afterUploadsProgress = beforeUploadsProgress + uploadProgressRange;
    const sourceProgress = hasSourceUpdate ? 12 : 0;
    const saveStartProgress = hasTrailerUpload || hasPosterUpload || hasSourceUpdate ? 88 : 72;

    clearFeedback(item.video.id);
    setActivityState(item.video.id, 'Preparing your changes...', 8);

    try {
      if (assets.trailer) {
        const trailerStart = beforeUploadsProgress;
        const trailerEnd = beforeUploadsProgress + (hasPosterUpload ? 16 : uploadProgressRange || 48);
        setActivityState(item.video.id, `Uploading trailer: ${assets.trailer.name}`, trailerStart);
        trailerKey = await prepareAssetUpload(assets.trailer, 'trailer', item.video.id, (loaded, total) => {
          const ratio = total > 0 ? loaded / total : 0;
          const progress = Math.round(trailerStart + (trailerEnd - trailerStart) * ratio);
          setActivityState(item.video.id, `Uploading trailer: ${assets.trailer?.name ?? 'Trailer'}`, progress);
        });
      }
      if (assets.poster) {
        const posterStart = hasTrailerUpload ? beforeUploadsProgress + 16 : beforeUploadsProgress;
        const posterEnd = hasTrailerUpload ? afterUploadsProgress : beforeUploadsProgress + (uploadProgressRange || 48);
        setActivityState(item.video.id, `Uploading poster: ${assets.poster.name}`, posterStart);
        posterKey = await prepareAssetUpload(assets.poster, 'poster', item.video.id, (loaded, total) => {
          const ratio = total > 0 ? loaded / total : 0;
          const progress = Math.round(posterStart + (posterEnd - posterStart) * ratio);
          setActivityState(item.video.id, `Uploading poster: ${assets.poster?.name ?? 'Poster'}`, progress);
        });
      }

      if (hasSourceUpdate) {
        setActivityState(item.video.id, 'Attaching Dropbox source...', afterUploadsProgress + sourceProgress);
        const sourceResponse = await fetch('/api/admin/videos/master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: item.video.id, sourceUrl: draft.sourceUrl.trim() })
        });
        const sourcePayload = await sourceResponse.json().catch(() => ({}));
        if (!sourceResponse.ok) {
          throw new Error(sourcePayload.error || 'The Dropbox master source could not be attached.');
        }
      }

      setActivityState(item.video.id, 'Saving title details...', saveStartProgress);
      const res = await fetch('/api/admin/videos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: item.video.id,
          ...draft,
          genres: normalizeSelectedGenres(draft.genres),
          licensedTerritories: draft.licensedTerritories,
          ...(trailerKey ? { trailerKey } : {}),
          ...(posterKey ? { posterKey } : {})
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.video) {
        throw new Error(data.error || 'The video details could not be updated right now.');
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
      setActivityState(item.video.id, 'Saved successfully.', 100, false);
      setSuccesses((prev) => ({ ...prev, [item.video.id]: 'Saved successfully!' }));
      setTimeout(() => {
        clearActivityState(item.video.id);
        setSuccesses((prev) => {
          const next = { ...prev };
          delete next[item.video.id];
          return next;
        });
      }, 2500);
    } catch (error: any) {
      clearActivityState(item.video.id);
      setErrors((prev) => ({
        ...prev,
        [item.video.id]: error?.message || 'Failed to save changes for this title.'
      }));
    }
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

    const actionLabels: Record<typeof action, string> = {
      approve: 'Approving title...',
      reject: 'Rejecting title...',
      deactivate: 'Hiding title from viewers...',
      activate: 'Activating title for viewers...'
    };

    clearFeedback(item.video.id);
    setActivityState(item.video.id, actionLabels[action], 28);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setActivityState(item.video.id, 'Finalizing update...', 88);

        if (isVisibilityToggle) {
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
          setActivityState(item.video.id, 'Viewer availability updated.', 100, false);
          setSuccesses((prev) => ({ ...prev, [item.video.id]: `Title is now ${newStatus} for viewers.` }));
          setTimeout(() => {
            clearActivityState(item.video.id);
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
      throw new Error(data.error || 'This action could not be completed right now.');
    } catch (error: any) {
      clearActivityState(item.video.id);
      setErrors((prev) => ({ ...prev, [item.video.id]: error?.message || 'This action could not be completed right now.' }));
    }
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
        const posterUrl = getMoviePosterUrl(item.video);
        const activityState = activityStates[item.video.id];
        const isBusy = activityState?.active ?? false;

        return (
          <div key={item.id} className="card moderation-card">
            <div className="moderation-poster">
              <PosterAsset src={posterUrl} imgClassName="moderation-poster-img" />
            </div>

            <div className="moderation-content">
              <div className="moderation-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div className="moderation-mini-poster">
                    <PosterAsset src={posterUrl} imgClassName="moderation-mini-poster-img" fallbackLabel="" />
                  </div>
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
                  <span className="detail-label">Genres</span>
                  <strong>{item.video.genres?.length ? item.video.genres.join(', ') : 'Not set yet'}</strong>
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
                  <strong>{item.video.packageLabel ?? 'Bunny playback package'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Package status</span>
                  <strong>{item.video.packageStatus ?? 'Pending package review'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Delivery format</span>
                  <strong>{item.video.deliveryFormat ?? 'Bunny viewer package'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Master source</span>
                  <strong>{item.video.masterSourceUrl ? 'Dropbox attached' : item.video.masterKey ? 'Legacy source attached' : 'Source missing'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Bunny playback</span>
                  <strong>{item.video.hlsManifestReady ? 'Ready in Bunny' : item.video.processingStatus ?? 'Awaiting source'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Subtitles</span>
                  <strong>{item.video.subtitleStatus ?? 'No subtitles uploaded'}</strong>
                </div>
              </div>

              <div className="detail-card" style={{ marginTop: 12 }}>
                <span className="detail-label">What still needs fixing</span>
                <strong>
                  {[
                    !item.video.posterKey ? 'poster' : null,
                    !item.video.masterSourceUrl && !item.video.masterKey ? 'movie source' : null,
                    !item.video.hlsManifestReady ? 'Bunny playback sync' : null,
                    !(item.video.genres?.length) ? 'genres' : null
                  ].filter(Boolean).join(', ') || 'No obvious gaps detected'}
                </strong>
              </div>

              <label className="field">
                <span className="field-label">Admin note</span>
                <input
                  className="input"
                  disabled={isBusy}
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
              {errors[item.video.id] && editingId !== item.video.id ? <p className="muted form-message">{errors[item.video.id]}</p> : null}
              {successes[item.video.id] ? <p className="muted form-message" style={{ color: '#22c55e' }}>{successes[item.video.id]}</p> : null}

              {editingId === item.video.id ? (
                <div className="detail-grid" style={{ marginTop: 12 }}>
                  <label className="field">
                    <span className="field-label">Title</span>
                    <input className="input" disabled={isBusy} value={getDraft(item).title} onChange={(event) => updateDraft(item.video.id, 'title', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Category</span>
                    <select className="input" disabled={isBusy} value={getDraft(item).category} onChange={(event) => updateDraft(item.video.id, 'category', event.target.value)}>
                      {PRIMARY_CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Type</span>
                    <select className="input" disabled={isBusy} value={getDraft(item).videoType} onChange={(event) => updateDraft(item.video.id, 'videoType', event.target.value)}>
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
                    <select className="input" disabled={isBusy} value={getDraft(item).ageRating} onChange={(event) => updateDraft(item.video.id, 'ageRating', event.target.value)}>
                      <option value="ALL">All</option>
                      <option value="PG13">13+</option>
                      <option value="PG16">16+</option>
                      <option value="PG18">18+</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Price tier</span>
                    <select className="input" disabled={isBusy} value={getDraft(item).priceTier} onChange={(event) => updateDraft(item.video.id, 'priceTier', event.target.value)}>
                      <option value="SNACK">Snack</option>
                      <option value="STANDARD">Standard</option>
                      <option value="PREMIERE">Premiere</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Unlock price (NGN)</span>
                    <input className="input" disabled={isBusy} type="number" min={0} value={getDraft(item).unlockPrice} onChange={(event) => updateDraft(item.video.id, 'unlockPrice', event.target.value)} placeholder="Use tier default" />
                  </label>
                  <label className="field">
                    <span className="field-label">Producer share %</span>
                    <input className="input" disabled={isBusy} type="number" min={0} max={100} step="0.1" value={getDraft(item).producerRevenueShare} onChange={(event) => updateDraft(item.video.id, 'producerRevenueShare', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">ACE share %</span>
                    <input className="input" disabled={isBusy} type="number" min={0} max={100} step="0.1" value={getDraft(item).platformRevenueShare} onChange={(event) => updateDraft(item.video.id, 'platformRevenueShare', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Withholding / reserve %</span>
                    <input className="input" disabled={isBusy} type="number" min={0} max={100} step="0.1" value={getDraft(item).taxRevenueShare} onChange={(event) => updateDraft(item.video.id, 'taxRevenueShare', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Viewing availability</span>
                    <select className="input" disabled={isBusy} value={getDraft(item).availabilityRegion} onChange={(event) => updateDraft(item.video.id, 'availabilityRegion', event.target.value)}>
                      <option value="GLOBAL">Global</option>
                      <option value="AFRICA">Africa only</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Rights</span>
                    <select className="input" disabled={isBusy} value={getDraft(item).rightsTier} onChange={(event) => updateDraft(item.video.id, 'rightsTier', event.target.value)}>
                      <option value="SHARED">Shared</option>
                      <option value="EXCLUSIVE">Exclusive</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Production year</span>
                    <input className="input" disabled={isBusy} type="number" min={1900} max={new Date().getFullYear() + 2} value={getDraft(item).releaseYear} onChange={(event) => updateDraft(item.video.id, 'releaseYear', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Original language</span>
                    <input className="input" disabled={isBusy} value={getDraft(item).originalLanguage} onChange={(event) => updateDraft(item.video.id, 'originalLanguage', event.target.value)} />
                  </label>
                  <div className="field" style={{ gridColumn: '1/-1' }}>
                    <span className="field-label">Genres</span>
                    <div className="action-list" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {SECONDARY_GENRE_OPTIONS.map((genre) => {
                        const selected = getDraft(item).genres.includes(genre);
                        const disabled = !selected && getDraft(item).genres.length >= 3;
                        return (
                          <button
                            key={genre}
                            type="button"
                            className="btn btn-ghost"
                            disabled={disabled || isBusy}
                            onClick={() =>
                              updateDraft(
                                item.video.id,
                                'genres',
                                normalizeSelectedGenres(toggleGenreSelection(getDraft(item).genres, genre))
                              )
                            }
                            style={{
                              borderColor: selected ? '#2563eb' : undefined,
                              backgroundColor: selected ? '#dbeafe' : undefined,
                              color: selected ? '#1d4ed8' : undefined
                            }}
                          >
                            {selected ? `Selected: ${genre}` : genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="field">
                    <span className="field-label">Warnings</span>
                    <input className="input" disabled={isBusy} value={getDraft(item).contentWarnings} onChange={(event) => updateDraft(item.video.id, 'contentWarnings', event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Licensed territories</span>
                    <input className="input" disabled={isBusy} value={getDraft(item).licensedTerritories} onChange={(event) => updateDraft(item.video.id, 'licensedTerritories', event.target.value)} />
                  </label>
                  <label className="field" style={{ gridColumn: '1/-1' }}>
                    <span className="field-label">Dropbox master source URL</span>
                    <input
                      className="input"
                      type="url"
                      disabled={isBusy}
                      value={getDraft(item).sourceUrl}
                      onChange={(event) => updateDraft(item.video.id, 'sourceUrl', event.target.value)}
                      placeholder="Paste Dropbox share link"
                    />
                  </label>
                   <label className="field" style={{ gridColumn: '1/-1' }}>
                     <span className="field-label">Description</span>
                     <textarea className="input" disabled={isBusy} rows={4} value={getDraft(item).description} onChange={(event) => updateDraft(item.video.id, 'description', event.target.value)}></textarea>
                   </label>

                   <label className="field" style={{ gridColumn: '1/-1' }}>
                     <span className="field-label">Marketing trailer (MP4) — optional, replaces existing</span>
                     <input
                       type="file"
                       accept="video/mp4"
                       disabled={isBusy}
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
                       disabled={isBusy}
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
                    {activityState ? (
                      <div
                        className="upload-progress"
                        aria-live="polite"
                        style={{ flex: '1 1 280px', minWidth: 240, padding: '12px 14px' }}
                      >
                        <div className="upload-progress-meta">
                          <strong style={{ fontSize: '0.9rem' }}>{activityState.label}</strong>
                          <span className="muted">{activityState.progress}%</span>
                        </div>
                        <div
                          className="upload-progress-track"
                          role="progressbar"
                          aria-valuenow={activityState.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span className="upload-progress-fill" style={{ width: `${activityState.progress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn-primary" disabled={isBusy} onClick={() => saveEdit(item)}>Save changes</button>
                    )}
                     <button className="btn btn-ghost" disabled={isBusy} onClick={() => closeEdit(item.video.id)}>Cancel</button>
                  </div>
                  {editingId === item.video.id && errors[item.video.id] ? (
                    <p className="muted form-message" style={{ gridColumn: '1/-1', marginTop: 0 }}>
                      {errors[item.video.id]}
                    </p>
                  ) : null}
                  {editingId === item.video.id && successes[item.video.id] ? (
                    <p className="muted form-message" style={{ gridColumn: '1/-1', marginTop: 0, color: '#22c55e' }}>
                      {successes[item.video.id]}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="moderation-actions">
                <button
                  className="btn btn-ghost"
                  disabled={isBusy}
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
                  <button className="btn btn-primary" disabled={isBusy} onClick={() => handleAction(item, 'approve')}>
                    {isBusy ? 'Working...' : 'Approve title'}
                  </button>
                ) : null}
                {item.hasModerationRecord ? (
                  <button className="btn btn-ghost" disabled={isBusy} onClick={() => handleAction(item, 'reject')}>
                    {isBusy ? 'Working...' : 'Reject title'}
                  </button>
                ) : null}
                <button
                  className="btn btn-ghost"
                  disabled={isBusy}
                  onClick={() => handleAction(item, item.video.status === 'DRAFT' ? 'activate' : 'deactivate')}
                >
                  {isBusy ? 'Working...' : item.video.status === 'DRAFT' ? 'Activate for users' : 'Deactivate for viewers'}
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

