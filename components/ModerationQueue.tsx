'use client';

import { useState } from 'react';
import { getMoviePosterUrl } from '@/lib/movie-assets';
import PosterAsset from '@/components/PosterAsset';
import { uploadPreparedStorageAsset } from '@/lib/client-storage-upload';
import type { PreparedStorageUpload } from '@/lib/storage-upload';
import { getDeliveryFormatLabel, getSubtitlePackageStatus, getViewerPackageLabel, getViewerPackageStatus } from '@/lib/delivery-package';
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
    bunnyStreamVideoId?: string | null;
    bunnyStreamReadyAt?: string | null;
    bunnyStreamError?: string | null;
    hlsManifestReady?: boolean;
    subtitleTrackCount?: number;
    subtitleTracks?: Array<{
      id: string;
      label: string;
      languageCode: string;
      kind: string;
      fileKey: string;
      isDefault: boolean;
    }>;
    englishSubtitlesProvided?: boolean;
    episodeCount?: number;
    readyEpisodeCount?: number;
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
};

type ActivityState = {
  label: string;
  progress: number;
  active: boolean;
};

type SubtitleEditorTrack = {
  id: string;
  label: string;
  languageCode: string;
  kind: string;
  fileKey: string;
  file: File | null;
  isDefault: boolean;
};

const ageLabel: Record<string, string> = {
  ALL: 'All',
  PG13: '13+',
  PG16: '16+',
  PG18: '18+'
};

const createSubtitleEditorTrack = (overrides: Partial<SubtitleEditorTrack> = {}): SubtitleEditorTrack => ({
  id:
    overrides.id ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `subtitle-${Math.random().toString(36).slice(2)}`),
  label: overrides.label ?? 'English',
  languageCode: overrides.languageCode ?? 'en',
  kind: overrides.kind ?? 'subtitles',
  fileKey: overrides.fileKey ?? '',
  file: overrides.file ?? null,
  isDefault: overrides.isDefault ?? false
});

const labelize = (value?: string) =>
  value
    ? value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Not set';

const normalizeProcessingStatusLabel = (value?: string | null) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 'Awaiting source';

  const labels: Record<string, string> = {
    NO_MASTER: 'Source missing',
    MASTER_UPLOADED: 'Source attached',
    STREAM_UPLOAD_CREATED: 'Queued for Bunny Stream import',
    STREAM_UPLOAD_UPLOADING: 'Uploading to Bunny Stream',
    ENCODING_STARTED: 'Bunny Stream is processing',
    READY_TO_STREAM: 'Bunny Stream playback ready',
    TRANSCODE_FAILED: 'Bunny Stream needs attention'
  };

  return labels[normalized] ?? labelize(normalized);
};

const hasReadyBunnyPlayback = (video: Item['video']) =>
  Boolean(video.bunnyStreamReadyAt || video.processingStatus === 'READY_TO_STREAM' || video.hlsManifestReady);

const hasFailedBunnyPlayback = (video: Item['video']) =>
  Boolean(video.processingStatus === 'TRANSCODE_FAILED' || video.bunnyStreamError);

const isBunnyPlaybackInProgress = (video: Item['video']) =>
  Boolean(
    video.bunnyStreamVideoId &&
      !hasReadyBunnyPlayback(video) &&
      !hasFailedBunnyPlayback(video)
  );

const getModerationPackageStatus = (video: Item['video']) =>
  getViewerPackageStatus({
    videoType: video.videoType,
    seriesId: video.seriesId,
    masterReady: Boolean(video.masterSourceUrl || video.masterKey),
    bunnyReady: hasReadyBunnyPlayback(video),
    bunnyFailed: hasFailedBunnyPlayback(video),
    bunnyProcessing: isBunnyPlaybackInProgress(video),
    hlsReady: video.hlsManifestReady,
    episodeCount: video.episodeCount,
    readyEpisodeCount: video.readyEpisodeCount
  });

const getModerationSubtitleStatus = (video: Item['video']) =>
  getSubtitlePackageStatus({
    subtitleTrackCount: video.subtitleTrackCount,
    englishSubtitlesProvided: video.englishSubtitlesProvided
  });

const getModerationPlaybackStatus = (video: Item['video']) => {
  if (hasReadyBunnyPlayback(video)) return 'Ready in Bunny Stream';
  if (hasFailedBunnyPlayback(video)) return video.bunnyStreamError?.trim() || 'Bunny Stream processing failed';
  if (isBunnyPlaybackInProgress(video)) return 'Bunny Stream import is in progress';
  if (video.masterSourceUrl || video.masterKey) return normalizeProcessingStatusLabel(video.processingStatus);
  return normalizeProcessingStatusLabel(video.processingStatus);
};

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
  purpose: 'trailer' | 'poster' | 'subtitle',
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

export default function ModerationQueue({
  initial,
  mode = 'edit'
}: {
  initial: Item[];
  mode?: 'edit' | 'review' | 'deleted';
}) {
  const [items, setItems] = useState(initial);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, string>>({});
  const [activityStates, setActivityStates] = useState<Record<string, ActivityState | undefined>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VideoDraft>>({});
  const [editAssets, setEditAssets] = useState<Record<string, { trailer: File | null; poster: File | null }>>({});
  const [subtitleEdits, setSubtitleEdits] = useState<Record<string, SubtitleEditorTrack[]>>({});
  const showWorkflowActions = mode === 'review';
  const showDeletedActions = mode === 'deleted';

  const openAssetLink = (href: string) => {
    if (typeof window === 'undefined') return;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

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

  const getSubtitleEdits = (item: Item) =>
    subtitleEdits[item.video.id] ??
    (item.video.subtitleTracks?.length
      ? item.video.subtitleTracks.map((track) =>
          createSubtitleEditorTrack({
            id: track.id,
            label: track.label,
            languageCode: track.languageCode,
            kind: track.kind,
            fileKey: track.fileKey,
            isDefault: track.isDefault
          })
        )
      : []);

  const setSubtitleTrackValue = <K extends keyof SubtitleEditorTrack>(
    item: Item,
    trackId: string,
    key: K,
    value: SubtitleEditorTrack[K]
  ) => {
    const current = getSubtitleEdits(item);
    setSubtitleEdits((prev) => ({
      ...prev,
      [item.video.id]: current.map((track) =>
        track.id === trackId
          ? {
              ...track,
              [key]: value
            }
          : track
      )
    }));
  };

  const setSubtitleDefault = (item: Item, trackId: string) => {
    const current = getSubtitleEdits(item);
    setSubtitleEdits((prev) => ({
      ...prev,
      [item.video.id]: current.map((track) => ({
        ...track,
        isDefault: track.id === trackId
      }))
    }));
  };

  const addSubtitleTrack = (item: Item) => {
    const current = getSubtitleEdits(item);
    setSubtitleEdits((prev) => ({
      ...prev,
      [item.video.id]: [
        ...current,
        createSubtitleEditorTrack({
          isDefault: current.length === 0
        })
      ]
    }));
  };

  const removeSubtitleTrack = (item: Item, trackId: string) => {
    const current = getSubtitleEdits(item);
    const filtered = current.filter((track) => track.id !== trackId);
    setSubtitleEdits((prev) => ({
      ...prev,
      [item.video.id]: filtered.map((track, index) => ({
        ...track,
        isDefault: filtered.some((entry) => entry.isDefault) ? track.isDefault : index === 0
      }))
    }));
  };

  const closeEdit = (videoId: string) => {
    clearEditAssets(videoId);
    setSubtitleEdits((prev) => {
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
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
          availabilityRegion: 'GLOBAL'
        }),
        [key]: value
      }
    }));
  };

  const saveEdit = async (item: Item) => {
    const draft = getDraft(item);
    const assets = getEditAssets(item.video.id);
    const subtitleTracks = getSubtitleEdits(item);
    let trailerKey: string | undefined;
    let posterKey: string | undefined;
    const subtitleUploads = subtitleTracks.filter((track) => track.file);
    const uploadSteps = [
      ...(assets.trailer ? [{ kind: 'trailer' as const, file: assets.trailer }] : []),
      ...(assets.poster ? [{ kind: 'poster' as const, file: assets.poster }] : []),
      ...subtitleUploads.map((track) => ({ kind: 'subtitle' as const, file: track.file!, track }))
    ];
    const uploadRangeStart = 8;
    const uploadRangeEnd = uploadSteps.length ? 84 : 60;
    const saveStartProgress = uploadSteps.length ? 88 : 72;

    clearFeedback(item.video.id);
    setActivityState(item.video.id, 'Preparing your changes...', 8);

    try {
      const uploadedSubtitleKeyByTrackId = new Map<string, string>();

      if (subtitleTracks.some((track) => !track.file && !track.fileKey.trim())) {
        throw new Error('Each subtitle row needs a subtitle file before saving.');
      }

      for (const [index, uploadStep] of uploadSteps.entries()) {
        const stepStart =
          uploadRangeStart + Math.round(((uploadRangeEnd - uploadRangeStart) * index) / uploadSteps.length);
        const stepEnd =
          uploadRangeStart + Math.round(((uploadRangeEnd - uploadRangeStart) * (index + 1)) / uploadSteps.length);

        if (uploadStep.kind === 'trailer') {
          setActivityState(item.video.id, `Uploading trailer: ${uploadStep.file.name}`, stepStart);
          trailerKey = await prepareAssetUpload(uploadStep.file, 'trailer', item.video.id, (loaded, total) => {
            const ratio = total > 0 ? loaded / total : 0;
            const progress = Math.round(stepStart + (stepEnd - stepStart) * ratio);
            setActivityState(item.video.id, `Uploading trailer: ${uploadStep.file.name}`, progress);
          });
          continue;
        }

        if (uploadStep.kind === 'poster') {
          setActivityState(item.video.id, `Uploading poster: ${uploadStep.file.name}`, stepStart);
          posterKey = await prepareAssetUpload(uploadStep.file, 'poster', item.video.id, (loaded, total) => {
            const ratio = total > 0 ? loaded / total : 0;
            const progress = Math.round(stepStart + (stepEnd - stepStart) * ratio);
            setActivityState(item.video.id, `Uploading poster: ${uploadStep.file.name}`, progress);
          });
          continue;
        }

        setActivityState(item.video.id, `Uploading subtitle: ${uploadStep.file.name}`, stepStart);
        const fileKey = await prepareAssetUpload(uploadStep.file, 'subtitle', item.video.id, (loaded, total) => {
          const ratio = total > 0 ? loaded / total : 0;
          const progress = Math.round(stepStart + (stepEnd - stepStart) * ratio);
          setActivityState(item.video.id, `Uploading subtitle: ${uploadStep.file.name}`, progress);
        });
        uploadedSubtitleKeyByTrackId.set(uploadStep.track.id, fileKey);
      }

      const subtitlePayload = subtitleTracks.map((track, index) => ({
        label: track.label.trim() || `Subtitle ${index + 1}`,
        languageCode: track.languageCode.trim().toLowerCase() || 'und',
        kind: track.kind.trim() || 'subtitles',
        fileKey: uploadedSubtitleKeyByTrackId.get(track.id) ?? track.fileKey.trim(),
        isDefault: subtitleTracks.some((entry) => entry.isDefault) ? track.isDefault : index === 0
      }));

      setActivityState(item.video.id, 'Saving title details...', saveStartProgress);
      const res = await fetch('/api/admin/videos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: item.video.id,
          ...draft,
          genres: normalizeSelectedGenres(draft.genres),
          licensedTerritories: draft.licensedTerritories,
          subtitleTracks: subtitlePayload,
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
                  subtitleTrackCount: data.video.subtitleTrackCount ?? data.video.subtitleTracks?.length ?? entry.video.subtitleTrackCount,
                  ...(trailerKey ? { trailerDownloadHref: `/api/admin/videos/${item.video.id}/trailer` } : {}),
                  ...(posterKey ? { posterDownloadHref: `/api/admin/videos/${item.video.id}/poster` } : {})
                }
              }
            : entry
        )
      );
      setEditingId(null);
      clearEditAssets(item.video.id);
      setSubtitleEdits((prev) => {
        const next = { ...prev };
        delete next[item.video.id];
        return next;
      });
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

  const handleDeleteState = async (item: Item, action: 'archive' | 'restore') => {
    clearFeedback(item.video.id);
    setActivityState(
      item.video.id,
      action === 'archive' ? 'Moving title to deleted...' : 'Restoring title to edits...',
      24
    );

    try {
      const res = await fetch('/api/admin/videos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: item.video.id,
          action,
          reason:
            action === 'archive'
              ? 'Removed from edit queue by admin.'
              : undefined
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'This title could not be updated right now.');
      }

      setActivityState(item.video.id, action === 'archive' ? 'Title archived.' : 'Title restored.', 100, false);
      if (action === 'archive') {
        setItems((prev) => prev.filter((entry) => entry.video.id !== item.video.id));
      } else {
        setItems((prev) => prev.filter((entry) => entry.video.id !== item.video.id));
      }
    } catch (error: any) {
      clearActivityState(item.video.id);
      setErrors((prev) => ({
        ...prev,
        [item.video.id]: error?.message || 'This title could not be updated right now.'
      }));
    }
  };

  if (items.length === 0) {
    return (
      <div className="card empty-state">
        <h3>{showDeletedActions ? 'No deleted titles right now' : 'No titles are waiting for review'}</h3>
        <p className="muted">
          {showDeletedActions
            ? 'Archived titles will appear here and can be restored when needed.'
            : 'New producer submissions will appear here automatically.'}
        </p>
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
                  <strong>{item.video.packageLabel ?? getViewerPackageLabel(item.video)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Package status</span>
                  <strong>{getModerationPackageStatus(item.video)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Delivery format</span>
                  <strong>{getDeliveryFormatLabel({ deliveryFormat: item.video.deliveryFormat ?? null })}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Master source</span>
                  <strong>{item.video.bunnyStreamVideoId ? 'Movie upload created' : item.video.masterSourceUrl || item.video.masterKey ? 'Legacy source attached' : 'Source missing'}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Bunny playback</span>
                  <strong>{getModerationPlaybackStatus(item.video)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Subtitles</span>
                  <strong>{getModerationSubtitleStatus(item.video)}</strong>
                </div>
              </div>

              <div className="detail-card" style={{ marginTop: 12 }}>
                <span className="detail-label">What still needs fixing</span>
                <strong>
                  {[
                    !item.video.posterKey ? 'poster' : null,
                    !item.video.masterSourceUrl && !item.video.masterKey && !item.video.bunnyStreamVideoId ? 'movie source' : null,
                    hasFailedBunnyPlayback(item.video)
                      ? 'Bunny Stream failure'
                      : !hasReadyBunnyPlayback(item.video)
                        ? 'Bunny playback sync'
                        : null,
                    !(item.video.genres?.length) ? 'genres' : null
                  ].filter(Boolean).join(', ') || 'No obvious gaps detected'}
                </strong>
              </div>

              {showWorkflowActions ? (
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
              ) : null}
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

                   <div className="field" style={{ gridColumn: '1/-1' }}>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                       <span className="field-label">Subtitle tracks</span>
                       <button className="btn btn-ghost" type="button" disabled={isBusy} onClick={() => addSubtitleTrack(item)}>
                         Add subtitle
                       </button>
                     </div>
                     <div className="stack-list" style={{ marginTop: 10 }}>
                       {getSubtitleEdits(item).length ? (
                         getSubtitleEdits(item).map((track, index) => (
                           <div key={track.id} className="detail-card" style={{ display: 'grid', gap: 12 }}>
                             <div className="field-grid field-grid-3">
                               <label className="field">
                                 <span className="field-label">Label</span>
                                 <input
                                   className="input"
                                   disabled={isBusy}
                                   value={track.label}
                                   onChange={(event) => setSubtitleTrackValue(item, track.id, 'label', event.target.value)}
                                 />
                               </label>
                               <label className="field">
                                 <span className="field-label">Language</span>
                                 <input
                                   className="input"
                                   disabled={isBusy}
                                   value={track.languageCode}
                                   onChange={(event) => setSubtitleTrackValue(item, track.id, 'languageCode', event.target.value)}
                                 />
                               </label>
                               <label className="field">
                                 <span className="field-label">Kind</span>
                                 <input
                                   className="input"
                                   disabled={isBusy}
                                   value={track.kind}
                                   onChange={(event) => setSubtitleTrackValue(item, track.id, 'kind', event.target.value)}
                                 />
                               </label>
                             </div>
                             <label className="field">
                               <span className="field-label">Subtitle file (VTT or SRT)</span>
                               <input
                                 type="file"
                                 accept=".vtt,.srt,text/vtt,application/x-subrip"
                                 disabled={isBusy}
                                 onChange={(event) => setSubtitleTrackValue(item, track.id, 'file', event.target.files?.[0] ?? null)}
                               />
                               {track.file ? (
                                 <span className="muted">Selected: {track.file.name}</span>
                               ) : track.fileKey ? (
                                 <span className="muted">Current subtitle attached - pick file above to replace</span>
                               ) : (
                                 <span className="muted">No subtitle file yet - choose one before saving</span>
                               )}
                             </label>
                             <div className="action-list" style={{ gap: 8 }}>
                               <button
                                 className="btn btn-ghost"
                                 type="button"
                                 disabled={isBusy}
                                 onClick={() => setSubtitleDefault(item, track.id)}
                               >
                                 {track.isDefault ? 'Default subtitle' : `Make default ${index + 1}`}
                               </button>
                               <button
                                 className="btn btn-ghost"
                                 type="button"
                                 disabled={isBusy}
                                 onClick={() => removeSubtitleTrack(item, track.id)}
                               >
                                 Remove subtitle
                               </button>
                             </div>
                           </div>
                         ))
                       ) : (
                         <p className="muted" style={{ margin: 0 }}>No subtitles attached yet.</p>
                       )}
                     </div>
                   </div>

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
                      <button className="btn btn-primary" type="button" disabled={isBusy} onClick={() => saveEdit(item)}>Save changes</button>
                    )}
                     <button className="btn btn-ghost" type="button" disabled={isBusy} onClick={() => closeEdit(item.video.id)}>Cancel</button>
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
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    if (editingId === item.video.id) {
                      closeEdit(item.video.id);
                    } else {
                      setEditingId(item.video.id);
                    }
                  }}
                >
                  {editingId === item.video.id ? 'Close editor' : 'Edit title'}
                </button>
                {item.video.posterDownloadHref ? (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => openAssetLink(item.video.posterDownloadHref!)}
                  >
                    Download artwork
                  </button>
                ) : null}
                {item.video.trailerDownloadHref ? (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => openAssetLink(item.video.trailerDownloadHref!)}
                  >
                    Download trailer
                  </button>
                ) : null}
                {!showWorkflowActions && !showDeletedActions ? (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDeleteState(item, 'archive')}
                  >
                    {isBusy ? 'Working...' : 'Delete title'}
                  </button>
                ) : null}
                {showDeletedActions ? (
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDeleteState(item, 'restore')}
                  >
                    {isBusy ? 'Working...' : 'Restore to edits'}
                  </button>
                ) : null}
                {showWorkflowActions && item.status === 'PENDING' ? (
                  <button className="btn btn-primary" type="button" disabled={isBusy} onClick={() => handleAction(item, 'approve')}>
                    {isBusy ? 'Working...' : 'Approve title'}
                  </button>
                ) : null}
                {showWorkflowActions && item.hasModerationRecord ? (
                  <button className="btn btn-ghost" type="button" disabled={isBusy} onClick={() => handleAction(item, 'reject')}>
                    {isBusy ? 'Working...' : 'Reject title'}
                  </button>
                ) : null}
                {showWorkflowActions ? (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleAction(item, item.video.status === 'DRAFT' ? 'activate' : 'deactivate')}
                  >
                    {isBusy ? 'Working...' : item.video.status === 'DRAFT' ? 'Activate for users' : 'Deactivate for viewers'}
                  </button>
                ) : null}
              </div>

              {item.notes ? <p className="muted form-message">{item.notes}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

