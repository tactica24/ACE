'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  CONTENT_WARNING_OPTIONS,
  LANGUAGE_OPTIONS,
  SUBTITLE_KIND_OPTIONS,
  getLanguageLabel,
  type SubtitleKindValue
} from '@/lib/media-types';
import {
  MAX_MASTER_BYTES,
  MAX_POSTER_BYTES,
  MAX_SUBTITLE_BYTES,
  MAX_TRAILER_BYTES,
  MAX_VIDEO_BYTES,
  MULTIPART_CHUNK_BYTES,
  SINGLE_PUT_SAFE_BYTES,
  formatUploadLimit
} from '@/lib/upload-limits';

type UploadFormProps = {
  initialSeriesId?: string | null;
  seriesOptions: Array<{
    id: string;
    title: string;
    status: string;
    priceTier: string;
    rightsTier: string;
    category: string;
    ageRating: string;
    originalLanguage: string | null;
    audioLanguages: string[];
    releaseYear: number | null;
    episodeCount: number;
  }>;
  uploadEndpoint?: string;
  submissionEndpoint?: string;
  extraPayload?: Record<string, unknown>;
  requestHeaders?: Record<string, string>;
  successRedirectPath?: string;
  contractRedirectBasePath?: string | null;
};

type UploadState = {
  title: string;
  description: string;
  priceTier: string;
  rightsTier: string;
  releaseYear: number;
  durationSec: number;
  videoType: string;
  ageRating: string;
  category: string;
  genres: string;
  tags: string;
  highlightSeconds: string;
  originalLanguage: string;
  audioLanguages: string[];
  contentWarnings: string[];
};

type SubtitleDraft = {
  id: string;
  label: string;
  languageCode: string;
  kind: SubtitleKindValue;
  isDefault: boolean;
  file: File | null;
};

type EpisodeDraft = {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string;
  durationSec: number;
  highlightSeconds: string;
  primaryVideoFile: File | null;
  fallbackVideoFile: File | null;
  posterFile: File | null;
  subtitleTracks: SubtitleDraft[];
};

type DeliveryMetadataState = {
  vendorId: string;
  studioReleaseTitle: string;
  countriesOfOrigin: string;
  productionCountries: string;
  copyrightLine: string;
  licensedTerritories: string;
  localizations: string;
  productAvailability: string;
  deliveryFormat: string;
  deliveryNotes: string;
  castCredits: string;
  crewCredits: string;
  englishSubtitlesProvided: boolean;
};

type UploadStepStatus = 'pending' | 'uploading' | 'done' | 'failed';

type UploadStep = {
  id: string;
  label: string;
  fileName: string;
  loaded: number;
  total: number;
  status: UploadStepStatus;
  error?: string;
};

const initialState: UploadState = {
  title: '',
  description: '',
  priceTier: 'STANDARD',
  rightsTier: 'SHARED',
  releaseYear: new Date().getFullYear(),
  durationSec: 0,
  videoType: 'FEATURE',
  ageRating: 'ALL',
  category: 'General',
  genres: '',
  tags: '',
  highlightSeconds: '',
  originalLanguage: 'en',
  audioLanguages: ['en'],
  contentWarnings: []
};

const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4'];
const SUPPORTED_VIDEO_MIME_TYPES = ['video/mp4', 'application/octet-stream'];
const SUPPORTED_TRAILER_EXTENSIONS = ['.mp4'];
const SUPPORTED_TRAILER_MIME_TYPES = ['video/mp4'];
const SUPPORTED_MASTER_EXTENSIONS = ['.mp4'];
const SUPPORTED_MASTER_MIME_TYPES = ['video/mp4', 'application/octet-stream'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const SUPPORTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateFileSize(file: File, maxBytes: number, label: string): string | null {
  if (file.size > maxBytes) {
    return `${label} file is too large. Keep it under ${formatUploadLimit(maxBytes)}.`;
  }
  return null;
}

function isSupportedImageFile(file: File | null) {
  if (!file) {
    return true;
  }

  const lowerName = file.name.toLowerCase();
  const hasSupportedExtension = SUPPORTED_IMAGE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  const hasSupportedMimeType = !file.type || SUPPORTED_IMAGE_MIME_TYPES.includes(file.type);
  return hasSupportedExtension && hasSupportedMimeType;
}

const initialDeliveryMetadataState: DeliveryMetadataState = {
  vendorId: '',
  studioReleaseTitle: '',
  countriesOfOrigin: '',
  productionCountries: '',
  copyrightLine: '',
  licensedTerritories: '',
  localizations: '',
  productAvailability: '',
  deliveryFormat: '1080p Full HD playable MP4 (H.264/AAC preferred)',
  deliveryNotes: '',
  castCredits: '',
  crewCredits: '',
  englishSubtitlesProvided: false
};

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createSubtitleDraft(languageCode = 'en'): SubtitleDraft {
  return {
    id: createId(),
    label: getLanguageLabel(languageCode),
    languageCode,
    kind: 'subtitles',
    isDefault: false,
    file: null
  };
}

function createEpisodeDraft(seasonNumber = 1, episodeNumber = 1): EpisodeDraft {
  return {
    id: createId(),
    seasonNumber,
    episodeNumber,
    title: '',
    description: '',
    durationSec: 1500,
    highlightSeconds: '',
    primaryVideoFile: null,
    fallbackVideoFile: null,
    posterFile: null,
    subtitleTracks: []
  };
}

function formatUploadBytes(value: number): string {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function toStorageUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Upload failed';
  if (message.toLowerCase().includes('network error') || message.toLowerCase().includes('failed to fetch')) {
    return (
      'Storage upload failed before R2 accepted the file. This usually means the R2 bucket CORS does not allow this website origin. ' +
      'Allow both https://www.acestudio.ng and https://acestudio.ng on the upload bucket, then try again.'
    );
  }
  return message;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadFileToSignedUrl(
  url: string,
  file: File,
  contentType: string,
  onProgress: (loaded: number, total: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(
            `Storage upload failed with status ${xhr.status}${xhr.responseText ? `: ${xhr.responseText}` : ''}`
          )
        );
      }
    };
    xhr.onerror = () => reject(new Error('Storage upload failed due to a network error.'));
    xhr.ontimeout = () => reject(new Error('Storage upload timed out before R2 accepted the file.'));
    xhr.onabort = () => reject(new Error('Storage upload was cancelled before it completed.'));
    xhr.send(file);
  });
}

async function uploadBlobToSignedUrl(
  url: string,
  blob: Blob,
  onProgress: (loaded: number, total: number) => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag');
        if (!etag) {
          reject(new Error('Storage upload completed but R2 did not return a part ETag.'));
          return;
        }
        resolve(etag);
      } else {
        reject(
          new Error(
            `Storage upload failed with status ${xhr.status}${xhr.responseText ? `: ${xhr.responseText}` : ''}`
          )
        );
      }
    };
    xhr.onerror = () => reject(new Error('Storage upload failed due to a network error.'));
    xhr.ontimeout = () => reject(new Error('Storage upload timed out before R2 accepted the file.'));
    xhr.onabort = () => reject(new Error('Storage upload was cancelled before it completed.'));
    xhr.send(blob);
  });
}

function isSupportedVideoFile(file: File | null) {
  if (!file) {
    return false;
  }

  const lowerName = file.name.toLowerCase();
  const hasSupportedExtension = SUPPORTED_VIDEO_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  const hasSupportedMimeType = !file.type || SUPPORTED_VIDEO_MIME_TYPES.includes(file.type);
  return hasSupportedExtension && hasSupportedMimeType;
}

function isSupportedTrailerFile(file: File | null) {
  if (!file) {
    return true;
  }

  const lowerName = file.name.toLowerCase();
  const hasSupportedExtension = SUPPORTED_TRAILER_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  const hasSupportedMimeType = !file.type || SUPPORTED_TRAILER_MIME_TYPES.includes(file.type);
  return hasSupportedExtension && hasSupportedMimeType;
}

function isSupportedMasterFile(file: File | null) {
  if (!file) {
    return true;
  }

  const lowerName = file.name.toLowerCase();
  const hasSupportedExtension = SUPPORTED_MASTER_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  const hasSupportedMimeType = !file.type || SUPPORTED_MASTER_MIME_TYPES.includes(file.type);
  return hasSupportedExtension && hasSupportedMimeType;
}

function normalizeCreditEntries(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\r\n,]+/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 80);
}

function normalizeCodeEntries(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\r\n,]+/g)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 240);
}

function normalizeLineEntries(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 240);
}

export default function UploadForm({
  initialSeriesId = null,
  seriesOptions,
  uploadEndpoint = '/api/studio/upload-url',
  submissionEndpoint = '/api/studio/video',
  extraPayload,
  requestHeaders,
  successRedirectPath = '/studio/library',
  contractRedirectBasePath = '/studio/upload?contractVideoId='
}: UploadFormProps) {
  const [form, setForm] = useState<UploadState>({
    ...initialState,
    videoType: initialSeriesId ? 'SERIES' : initialState.videoType
  });
  const [seriesMode, setSeriesMode] = useState<'new' | 'existing'>(initialSeriesId ? 'existing' : 'new');
  const [selectedSeriesId, setSelectedSeriesId] = useState(initialSeriesId ?? seriesOptions[0]?.id ?? '');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [deliveryMetadata, setDeliveryMetadata] = useState<DeliveryMetadataState>(initialDeliveryMetadataState);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleDraft[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeDraft[]>([createEpisodeDraft()]);
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState<string | null>(null);
   const [uploadProgress, setUploadProgress] = useState(0);
   const [uploadLabel, setUploadLabel] = useState<string | null>(null);
   const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([]);
   const router = useRouter();

  const selectedSeries = seriesOptions.find((series) => series.id === selectedSeriesId) ?? null;
  const isSeriesUpload = form.videoType === 'SERIES';
  const isAddingToExistingSeries = isSeriesUpload && seriesMode === 'existing';

  const updateField = <K extends keyof UploadState>(key: K, value: UploadState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateDeliveryField = <K extends keyof DeliveryMetadataState>(key: K, value: DeliveryMetadataState[K]) => {
    setDeliveryMetadata((current) => ({ ...current, [key]: value }));
  };

  const toggleAudioLanguage = (languageCode: string) => {
    setForm((current) => {
      const exists = current.audioLanguages.includes(languageCode);
      const nextAudioLanguages = exists
        ? current.audioLanguages.filter((value) => value !== languageCode)
        : [...current.audioLanguages, languageCode];

      return {
        ...current,
        audioLanguages: nextAudioLanguages.length ? nextAudioLanguages : [current.originalLanguage]
      };
    });
  };

  const toggleContentWarning = (warning: string) => {
    setForm((current) => ({
      ...current,
      contentWarnings: current.contentWarnings.includes(warning)
        ? current.contentWarnings.filter((value) => value !== warning)
        : [...current.contentWarnings, warning]
    }));
  };

  const updateOriginalLanguage = (languageCode: string) => {
    setForm((current) => ({
      ...current,
      originalLanguage: languageCode,
      audioLanguages: current.audioLanguages.includes(languageCode)
        ? current.audioLanguages
        : [languageCode, ...current.audioLanguages]
    }));
  };

  const updateSubtitleTrack = (id: string, updates: Partial<SubtitleDraft>) => {
    setSubtitleTracks((current) => current.map((track) => (track.id === id ? { ...track, ...updates } : track)));
  };

  const markDefaultSubtitle = (id: string) => {
    setSubtitleTracks((current) => current.map((track) => ({ ...track, isDefault: track.id === id })));
  };

  const removeSubtitleTrack = (id: string) => {
    setSubtitleTracks((current) => current.filter((track) => track.id !== id));
  };

  const updateEpisode = (id: string, updates: Partial<EpisodeDraft>) => {
    setEpisodes((current) => current.map((episode) => (episode.id === id ? { ...episode, ...updates } : episode)));
  };

  const updateEpisodeSubtitleTrack = (episodeId: string, trackId: string, updates: Partial<SubtitleDraft>) => {
    setEpisodes((current) =>
      current.map((episode) =>
        episode.id !== episodeId
          ? episode
          : {
              ...episode,
              subtitleTracks: episode.subtitleTracks.map((track) =>
                track.id === trackId ? { ...track, ...updates } : track
              )
            }
      )
    );
  };

  const addEpisodeSubtitleTrack = (episodeId: string, languageCode = 'en') => {
    setEpisodes((current) =>
      current.map((episode) =>
        episode.id !== episodeId
          ? episode
          : {
              ...episode,
              subtitleTracks: [...episode.subtitleTracks, { ...createSubtitleDraft(languageCode), isDefault: episode.subtitleTracks.length === 0 }]
            }
      )
    );
  };

  const removeEpisodeSubtitleTrack = (episodeId: string, trackId: string) => {
    setEpisodes((current) =>
      current.map((episode) =>
        episode.id !== episodeId
          ? episode
          : {
              ...episode,
              subtitleTracks: episode.subtitleTracks.filter((track) => track.id !== trackId)
            }
      )
    );
  };

  const markEpisodeDefaultSubtitle = (episodeId: string, trackId: string) => {
    setEpisodes((current) =>
      current.map((episode) =>
        episode.id !== episodeId
          ? episode
          : {
              ...episode,
              subtitleTracks: episode.subtitleTracks.map((track) => ({
                ...track,
                isDefault: track.id === trackId
              }))
            }
      )
    );
  };

  const removeEpisode = (id: string) => {
    setEpisodes((current) => current.filter((episode) => episode.id !== id));
  };

  const addEpisode = () => {
    const lastEpisode = episodes[episodes.length - 1];
    setEpisodes((current) => [...current, createEpisodeDraft(lastEpisode?.seasonNumber ?? 1, (lastEpisode?.episodeNumber ?? 0) + 1)]);
  };

  const uploadAsset = async (
    file: File,
    purpose: 'video' | 'trailer' | 'poster' | 'subtitle' | 'master',
    onProgress: (loaded: number, total: number) => void
  ) => {
    if (file.size > SINGLE_PUT_SAFE_BYTES) {
      return uploadMultipartAsset(file, purpose, onProgress);
    }

    const presign = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(requestHeaders ?? {}) },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        purpose
      })
    });
    const presignData = await presign.json().catch(() => ({}));
    if (!presign.ok || !presignData.url || !presignData.key) {
      throw new Error(presignData.error || 'Unable to prepare upload');
    }

    const uploadContentType = (presignData.contentType as string) || file.type || 'application/octet-stream';
    await uploadFileToSignedUrl(presignData.url as string, file, uploadContentType, onProgress);
    return presignData.key as string;
  };

  const uploadMultipartAsset = async (
    file: File,
    purpose: 'video' | 'trailer' | 'poster' | 'subtitle' | 'master',
    onProgress: (loaded: number, total: number) => void
  ) => {
    const headers = { 'Content-Type': 'application/json', ...(requestHeaders ?? {}) };
    const initiate = await fetch('/api/studio/multipart-upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'initiate',
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        purpose
      })
    });
    const session = await initiate.json().catch(() => ({}));
    if (!initiate.ok || !session.key || !session.uploadId) {
      throw new Error(session.error || 'Unable to start large file upload.');
    }

    const key = session.key as string;
    const uploadId = session.uploadId as string;
    const parts: Array<{ ETag: string; PartNumber: number }> = [];
    let uploadedBeforeCurrentPart = 0;

    try {
      const totalParts = Math.ceil(file.size / MULTIPART_CHUNK_BYTES);
      for (let index = 0; index < totalParts; index += 1) {
        const partNumber = index + 1;
        const start = index * MULTIPART_CHUNK_BYTES;
        const end = Math.min(file.size, start + MULTIPART_CHUNK_BYTES);
        const blob = file.slice(start, end);
        const partResponse = await fetch('/api/studio/multipart-upload', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'part', key, uploadId, purpose, partNumber })
        });
        const partPayload = await partResponse.json().catch(() => ({}));
        if (!partResponse.ok || !partPayload.url) {
          throw new Error(partPayload.error || `Unable to prepare upload part ${partNumber}.`);
        }

        const ETag = await uploadBlobToSignedUrl(partPayload.url as string, blob, (loaded) => {
          onProgress(uploadedBeforeCurrentPart + loaded, file.size);
        });
        uploadedBeforeCurrentPart += blob.size;
        parts.push({ ETag, PartNumber: partNumber });
      }

      const complete = await fetch('/api/studio/multipart-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'complete', key, uploadId, purpose, parts })
      });
      const completePayload = await complete.json().catch(() => ({}));
      if (!complete.ok) {
        throw new Error(completePayload.error || 'Unable to finalize large file upload.');
      }
      onProgress(file.size, file.size);
      return key;
    } catch (error) {
      await fetch('/api/studio/multipart-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'abort', key, uploadId, purpose })
      }).catch(() => null);
      throw error;
    }
  };

  const markUploadStep = (id: string, patch: Partial<UploadStep>) => {
    setUploadSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  };

  const uploadTrackedAsset = async (
    item: {
      id: string;
      label: string;
      file: File;
      purpose: 'video' | 'trailer' | 'poster' | 'subtitle' | 'master';
    },
    completedBytes: number,
    totalBytes: number
  ) => {
    setUploadLabel(item.label);
    markUploadStep(item.id, { status: 'uploading', loaded: 0, total: item.file.size, error: undefined });
    try {
      const fileKey = await uploadAsset(item.file, item.purpose, (loaded, total) => {
        const safeTotal = total || item.file.size || 1;
        const safeLoaded = Math.min(loaded, safeTotal);
        const overallLoaded = completedBytes + safeLoaded;
        markUploadStep(item.id, { loaded: safeLoaded, total: safeTotal, status: 'uploading' });
        setUploadProgress(Math.min(99, Math.round((overallLoaded / Math.max(totalBytes, 1)) * 100)));
      });
      markUploadStep(item.id, { status: 'done', loaded: item.file.size, total: item.file.size });
      return fileKey;
    } catch (error) {
      markUploadStep(item.id, { status: 'failed', error: toStorageUploadError(error) });
      throw error;
    }
  };

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (isSeriesUpload) {
      if (!isSupportedTrailerFile(trailerFile)) {
        setMessage('Trailer upload must be an MP4 file.');
        return;
      }
      if (isAddingToExistingSeries && !selectedSeries) {
        setMessage('Choose the series you want to add episodes to.');
        return;
      }
      if (!episodes.length) {
        setMessage('Add at least one episode before submitting.');
        return;
      }
      if (episodes.some((episode) => !episode.title.trim() || !episode.description.trim())) {
        setMessage('Each episode needs a title and synopsis.');
        return;
      }
      if (episodes.some((episode) => !isSupportedVideoFile(episode.primaryVideoFile) && !isSupportedVideoFile(episode.fallbackVideoFile))) {
        setMessage('Each episode needs at least one video file (1080p or 720p MP4).');
        return;
      }
      for (const episode of episodes) {
        if (episode.primaryVideoFile) {
          const sizeError = validateFileSize(episode.primaryVideoFile, MAX_VIDEO_BYTES, 'Episode 1080p');
          if (sizeError) {
            setMessage(`Season ${episode.seasonNumber} Episode ${episode.episodeNumber}: ${sizeError}`);
            return;
          }
        }
        if (episode.fallbackVideoFile) {
          const sizeError = validateFileSize(episode.fallbackVideoFile, MAX_VIDEO_BYTES, 'episode 720p');
          if (sizeError) {
            setMessage(`Season ${episode.seasonNumber} Episode ${episode.episodeNumber}: ${sizeError}`);
            return;
          }
        }
        if (episode.posterFile) {
          const sizeError = validateFileSize(episode.posterFile, MAX_POSTER_BYTES, 'episode poster');
          if (sizeError) {
            setMessage(`Season ${episode.seasonNumber} Episode ${episode.episodeNumber}: ${sizeError}`);
            return;
          }
          if (!isSupportedImageFile(episode.posterFile)) {
            setMessage(`Season ${episode.seasonNumber} Episode ${episode.episodeNumber}: episode poster must be JPG, PNG, or WEBP. HEIC photos from phones must be exported as JPG, PNG, or WEBP first.`);
            return;
          }
        }

        if (episode.subtitleTracks.some((track) => !track.file)) {
          setMessage(`Season ${episode.seasonNumber} Episode ${episode.episodeNumber}: each subtitle row needs a subtitle file before submitting.`);
          return;
        }

        for (const track of episode.subtitleTracks) {
          if (track.file) {
            const subtitleSizeError = validateFileSize(track.file, MAX_SUBTITLE_BYTES, 'Episode subtitle');
            if (subtitleSizeError) {
              setMessage(`Season ${episode.seasonNumber} Episode ${episode.episodeNumber}: ${subtitleSizeError}`);
              return;
            }
          }
        }
      }

      if (
        deliveryMetadata.englishSubtitlesProvided &&
        !episodes.some((episode) => episode.subtitleTracks.some((track) => track.languageCode === 'en' && track.file))
      ) {
        setMessage('English subtitles were marked as available. Add an English subtitle track to at least one episode or turn that toggle off.');
        return;
      }
    } else {
      if (!masterFile || !isSupportedMasterFile(masterFile)) {
        setMessage('Upload a final playable MP4 master before submitting.');
        return;
      }
      const masterSizeError = validateFileSize(masterFile, MAX_MASTER_BYTES, 'Master');
      if (masterSizeError) {
        setMessage(masterSizeError);
        return;
      }
      if (trailerFile) {
        const trailerSizeError = validateFileSize(trailerFile, MAX_TRAILER_BYTES, 'Trailer');
        if (trailerSizeError) {
          setMessage(trailerSizeError);
          return;
        }
      }
      if (posterFile) {
        const posterSizeError = validateFileSize(posterFile, MAX_POSTER_BYTES, 'Poster');
        if (posterSizeError) {
          setMessage(posterSizeError);
          return;
        }
        if (!isSupportedImageFile(posterFile)) {
          setMessage('Poster upload must be JPG, PNG, or WEBP. HEIC photos from phones must be exported as JPG, PNG, or WEBP first.');
          return;
        }
      }
      if (!posterFile && (!isSeriesUpload || !isAddingToExistingSeries)) {
        setMessage('Upload one poster artwork file. This poster is the only artwork used across the app.');
        return;
      }
      if (!isSupportedTrailerFile(trailerFile)) {
        setMessage('Trailer upload must be an MP4 file.');
        return;
      }
      if (subtitleTracks.some((track) => !track.file)) {
        setMessage('Each subtitle row needs a subtitle file before submitting.');
        return;
      }
      for (const track of subtitleTracks) {
        if (track.file) {
          const subtitleSizeError = validateFileSize(track.file, MAX_SUBTITLE_BYTES, 'Subtitle');
          if (subtitleSizeError) {
            setMessage(subtitleSizeError);
            return;
          }
        }
      }
      if (
        deliveryMetadata.englishSubtitlesProvided &&
        !subtitleTracks.some((track) => track.languageCode === 'en' && track.file)
      ) {
        setMessage('English subtitles were marked as available. Add an English subtitle track or turn that toggle off.');
        return;
      }
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadLabel('Preparing upload...');
    setUploadSteps([]);

    try {
      if (!isSeriesUpload) {
        type UploadQueueItem = {
          id: string;
          label: string;
          file: File;
          purpose: 'video' | 'trailer' | 'poster' | 'subtitle' | 'master';
          subtitleMeta?: {
            label: string;
            languageCode: string;
            kind: SubtitleKindValue;
            isDefault: boolean;
          };
        };

        const uploadQueue: UploadQueueItem[] = [
          ...(masterFile
            ? [{
                id: 'master',
                label: `Uploading final playable MP4 master: ${masterFile.name}`,
                file: masterFile,
                purpose: 'master' as const
              }]
            : []),
          ...(posterFile
            ? [{
                id: 'poster',
                label: `Uploading poster: ${posterFile.name}`,
                file: posterFile,
                purpose: 'poster' as const
              }]
            : []),
          ...(trailerFile
            ? [{
                id: 'trailer',
                label: `Uploading trailer: ${trailerFile.name}`,
                file: trailerFile,
                purpose: 'trailer' as const
              }]
            : []),
          ...subtitleTracks.map((track, index) => ({
            id: track.id,
            label: `Uploading subtitle ${index + 1}: ${track.file?.name ?? track.label}`,
            file: track.file as File,
            purpose: 'subtitle' as const,
            subtitleMeta: {
              label: track.label.trim() || getLanguageLabel(track.languageCode),
              languageCode: track.languageCode,
              kind: track.kind,
              isDefault: track.isDefault || (index === 0 && !subtitleTracks.some((item) => item.isDefault))
            }
          }))
        ];

        const totalBytes = uploadQueue.reduce((sum, item) => sum + item.file.size, 0);
        setUploadSteps(uploadQueue.map((item) => ({
          id: item.id,
          label: item.label,
          fileName: item.file.name,
          loaded: 0,
          total: item.file.size,
          status: 'pending'
        })));
        let completedBytes = 0;
        let storedMasterKey: string | null = null;
        let storedPrimaryVideoKey = '';
        let storedFallbackVideoKey = '';
        let storedPosterKey: string | null = null;
        let storedTrailerKey: string | null = null;
        const subtitlePayload: Array<{
          label: string;
          languageCode: string;
          kind: SubtitleKindValue;
          isDefault: boolean;
          fileKey: string;
        }> = [];

        for (const item of uploadQueue) {
          const fileKey = await uploadTrackedAsset(item, completedBytes, totalBytes);

          completedBytes += item.file.size;

          if (item.purpose === 'master') {
            storedMasterKey = fileKey;
          } else if (item.purpose === 'video') {
            if (item.id === 'video-1080p') {
              storedPrimaryVideoKey = fileKey;
            } else {
              storedFallbackVideoKey = fileKey;
            }
          } else if (item.purpose === 'trailer') {
            storedTrailerKey = fileKey;
          } else if (item.purpose === 'poster') {
            storedPosterKey = fileKey;
          } else if ('subtitleMeta' in item && item.subtitleMeta) {
            subtitlePayload.push({
              ...item.subtitleMeta,
              fileKey
            });
          }
        }

        setUploadLabel('Finalizing release...');
        setUploadProgress(100);

        const create = await fetch(submissionEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(requestHeaders ?? {}) },
          body: JSON.stringify({
            ...(extraPayload ?? {}),
            title: form.title,
            description: form.description,
            videoType: form.videoType,
            ageRating: form.ageRating,
            category: form.category,
            originalLanguage: form.originalLanguage,
            audioLanguages: Array.from(new Set([form.originalLanguage, ...form.audioLanguages])),
            contentWarnings: form.contentWarnings,
            genres: form.genres.split(',').map((tag) => tag.trim()).filter(Boolean),
            priceTier: form.priceTier,
            rightsTier: form.rightsTier,
            durationSec: form.durationSec,
            tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
            releaseYear: form.releaseYear,
            highlightSeconds: form.highlightSeconds
              .split(',')
              .map((value) => parseInt(value.trim(), 10))
              .filter((value) => Number.isFinite(value)),
            subtitleTracks: subtitlePayload,
            r2Key: null,
            fallbackR2Key: null,
            posterKey: storedPosterKey,
            masterUploadKey: storedMasterKey,
            masterFileName: masterFile?.name ?? null,
            masterFileSize: masterFile?.size ?? null,
            deliveryMetadata: {
              vendorId: deliveryMetadata.vendorId,
              studioReleaseTitle: deliveryMetadata.studioReleaseTitle,
              countriesOfOrigin: normalizeCodeEntries(deliveryMetadata.countriesOfOrigin),
              productionCountries: normalizeCodeEntries(deliveryMetadata.productionCountries),
              copyrightLine: deliveryMetadata.copyrightLine,
              licensedTerritories: normalizeCodeEntries(deliveryMetadata.licensedTerritories),
              localizations: normalizeLineEntries(deliveryMetadata.localizations),
              productAvailability: normalizeLineEntries(deliveryMetadata.productAvailability),
              landscapeArtworkKey: null,
              deliveryFormat: deliveryMetadata.deliveryFormat,
              deliveryNotes: deliveryMetadata.deliveryNotes,
              trailerKey: storedTrailerKey,
              promotionalStillKeys: [],
              castCredits: normalizeCreditEntries(deliveryMetadata.castCredits),
              crewCredits: normalizeCreditEntries(deliveryMetadata.crewCredits),
              englishSubtitlesProvided: deliveryMetadata.englishSubtitlesProvided
            }
          })
        });

        const data = await create.json().catch(() => ({}));
        if (!create.ok || !data.videoId) {
          throw new Error(data.error || 'Unable to save release');
        }

         setMessage('Upload successful. Opening the contract page...');
         setUploadLabel('Upload successful.');
         await wait(900);
         router.push(contractRedirectBasePath
           ? `${contractRedirectBasePath}${encodeURIComponent(data.videoId)}`
           : successRedirectPath);
        return;
      }

      const metadataAssetBytes = isAddingToExistingSeries
        ? 0
        : (posterFile?.size ?? 0) + (trailerFile?.size ?? 0);
      const totalBytes =
        episodes.reduce(
          (sum, episode) =>
            sum
            + (episode.primaryVideoFile?.size ?? 0)
            + (episode.fallbackVideoFile?.size ?? 0)
            + (episode.posterFile?.size ?? 0)
            + episode.subtitleTracks.reduce((trackSum, track) => trackSum + (track.file?.size ?? 0), 0),
          0
        )
        + metadataAssetBytes;
      const seriesUploadSteps: UploadStep[] = [];
      if (!isAddingToExistingSeries && posterFile) {
        seriesUploadSteps.push({
          id: 'series-poster',
          label: `Uploading series poster: ${posterFile.name}`,
          fileName: posterFile.name,
          loaded: 0,
          total: posterFile.size,
          status: 'pending'
        });
      }
      if (!isAddingToExistingSeries && trailerFile) {
        seriesUploadSteps.push({
          id: 'series-trailer',
          label: `Uploading trailer: ${trailerFile.name}`,
          fileName: trailerFile.name,
          loaded: 0,
          total: trailerFile.size,
          status: 'pending'
        });
      }
      episodes.forEach((episode) => {
        const episodeLabel = episode.title || `Season ${episode.seasonNumber} Episode ${episode.episodeNumber}`;
        if (episode.primaryVideoFile) {
          seriesUploadSteps.push({
            id: `${episode.id}-primary`,
            label: `Uploading ${episodeLabel} 1080p`,
            fileName: episode.primaryVideoFile.name,
            loaded: 0,
            total: episode.primaryVideoFile.size,
            status: 'pending'
          });
        }
        if (episode.fallbackVideoFile) {
          seriesUploadSteps.push({
            id: `${episode.id}-fallback`,
            label: `Uploading ${episodeLabel} 720p`,
            fileName: episode.fallbackVideoFile.name,
            loaded: 0,
            total: episode.fallbackVideoFile.size,
            status: 'pending'
          });
        }
        if (episode.posterFile) {
          seriesUploadSteps.push({
            id: `${episode.id}-poster`,
            label: `Uploading ${episodeLabel} poster`,
            fileName: episode.posterFile.name,
            loaded: 0,
            total: episode.posterFile.size,
            status: 'pending'
          });
        }
        episode.subtitleTracks.forEach((track, index) => {
          if (track.file) {
            seriesUploadSteps.push({
              id: `${episode.id}-subtitle-${track.id}`,
              label: `Uploading ${episodeLabel} subtitle ${index + 1}: ${track.file.name}`,
              fileName: track.file.name,
              loaded: 0,
              total: track.file.size,
              status: 'pending'
            });
          }
        });
      });
      setUploadSteps(seriesUploadSteps);
      let completedBytes = 0;
      let storedSeriesPosterKey: string | null = null;
      let storedSeriesTrailerKey: string | null = null;

      if (!isAddingToExistingSeries && posterFile) {
        storedSeriesPosterKey = await uploadTrackedAsset({
          id: 'series-poster',
          label: `Uploading series poster: ${posterFile.name}`,
          file: posterFile,
          purpose: 'poster'
        }, completedBytes, totalBytes);
        completedBytes += posterFile.size;
      }

      if (!isAddingToExistingSeries) {
        if (trailerFile) {
          storedSeriesTrailerKey = await uploadTrackedAsset({
            id: 'series-trailer',
            label: `Uploading trailer: ${trailerFile.name}`,
            file: trailerFile,
            purpose: 'trailer'
          }, completedBytes, totalBytes);
          completedBytes += trailerFile.size;
        }
      }

      const episodePayload = [];
      for (const episode of episodes) {
        setUploadLabel(`Uploading ${episode.title || `Season ${episode.seasonNumber} Episode ${episode.episodeNumber}`}`);
        let primaryVideoKey: string | undefined;
        let fallbackVideoKey: string | undefined;

        if (episode.primaryVideoFile) {
          primaryVideoKey = await uploadTrackedAsset({
            id: `${episode.id}-primary`,
            label: `Uploading ${episode.title || `Season ${episode.seasonNumber} Episode ${episode.episodeNumber}`} 1080p`,
            file: episode.primaryVideoFile,
            purpose: 'video'
          }, completedBytes, totalBytes);
          completedBytes += episode.primaryVideoFile.size;
        }

        if (episode.fallbackVideoFile) {
          fallbackVideoKey = await uploadTrackedAsset({
            id: `${episode.id}-fallback`,
            label: `Uploading ${episode.title || `Season ${episode.seasonNumber} Episode ${episode.episodeNumber}`} 720p`,
            file: episode.fallbackVideoFile,
            purpose: 'video'
          }, completedBytes, totalBytes);
          completedBytes += episode.fallbackVideoFile.size;
        }

        let episodePosterKey: string | null = null;
        if (episode.posterFile) {
          episodePosterKey = await uploadTrackedAsset({
            id: `${episode.id}-poster`,
            label: `Uploading ${episode.title || `Season ${episode.seasonNumber} Episode ${episode.episodeNumber}`} poster`,
            file: episode.posterFile,
            purpose: 'poster'
          }, completedBytes, totalBytes);
          completedBytes += episode.posterFile.size;
        }

        const episodeSubtitleKeys: Array<{
          label: string;
          languageCode: string;
          kind: SubtitleKindValue;
          isDefault: boolean;
          fileKey: string;
        }> = [];

        for (const [trackIndex, track] of episode.subtitleTracks.entries()) {
          if (!track.file) continue;
          const fileKey = await uploadTrackedAsset({
            id: `${episode.id}-subtitle-${track.id}`,
            label: `Uploading ${episode.title || `Season ${episode.seasonNumber} Episode ${episode.episodeNumber}`} subtitle ${trackIndex + 1}: ${track.file.name}`,
            file: track.file,
            purpose: 'subtitle'
          }, completedBytes, totalBytes);
          completedBytes += track.file.size;
          episodeSubtitleKeys.push({
            label: track.label.trim() || getLanguageLabel(track.languageCode),
            languageCode: track.languageCode,
            kind: track.kind,
            isDefault: track.isDefault || (trackIndex === 0 && !episode.subtitleTracks.some((item) => item.isDefault)),
            fileKey
          });
        }

        episodePayload.push({
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          description: episode.description,
          durationSec: episode.durationSec,
          highlightSeconds: episode.highlightSeconds
            .split(',')
            .map((value) => parseInt(value.trim(), 10))
            .filter((value) => Number.isFinite(value)),
          r2Key: primaryVideoKey || '',
          fallbackR2Key: fallbackVideoKey || '',
          posterKey: episodePosterKey,
          subtitleTracks: episodeSubtitleKeys.length ? episodeSubtitleKeys : undefined
        });
      }

      setUploadLabel(isAddingToExistingSeries ? 'Adding episodes...' : 'Creating series...');
      setUploadProgress(100);

      const create = await fetch(submissionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(requestHeaders ?? {}) },
        body: JSON.stringify(
          isAddingToExistingSeries
            ? {
                ...(extraPayload ?? {}),
                videoType: 'SERIES',
                seriesId: selectedSeries?.id,
                priceTier: selectedSeries?.priceTier,
                rightsTier: selectedSeries?.rightsTier,
                episodes: episodePayload
              }
            : {
                ...(extraPayload ?? {}),
                title: form.title,
                description: form.description,
                videoType: 'SERIES',
                ageRating: form.ageRating,
                category: form.category,
                originalLanguage: form.originalLanguage,
                audioLanguages: Array.from(new Set([form.originalLanguage, ...form.audioLanguages])),
                contentWarnings: form.contentWarnings,
                genres: form.genres.split(',').map((tag) => tag.trim()).filter(Boolean),
                priceTier: form.priceTier,
                rightsTier: form.rightsTier,
                tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
                releaseYear: form.releaseYear,
                posterKey: storedSeriesPosterKey,
                deliveryMetadata: {
                  vendorId: deliveryMetadata.vendorId,
                  studioReleaseTitle: deliveryMetadata.studioReleaseTitle,
                  countriesOfOrigin: normalizeCodeEntries(deliveryMetadata.countriesOfOrigin),
                  productionCountries: normalizeCodeEntries(deliveryMetadata.productionCountries),
                  copyrightLine: deliveryMetadata.copyrightLine,
                  licensedTerritories: normalizeCodeEntries(deliveryMetadata.licensedTerritories),
                  localizations: normalizeLineEntries(deliveryMetadata.localizations),
                  productAvailability: normalizeLineEntries(deliveryMetadata.productAvailability),
                  landscapeArtworkKey: null,
                  deliveryFormat: deliveryMetadata.deliveryFormat,
                  deliveryNotes: deliveryMetadata.deliveryNotes,
                  trailerKey: storedSeriesTrailerKey,
                  promotionalStillKeys: [],
                  castCredits: normalizeCreditEntries(deliveryMetadata.castCredits),
                  crewCredits: normalizeCreditEntries(deliveryMetadata.crewCredits),
                  englishSubtitlesProvided: deliveryMetadata.englishSubtitlesProvided
                },
                episodes: episodePayload
              }
        )
      });

      const data = await create.json().catch(() => ({}));
      if (!create.ok || !data.videoId) {
        throw new Error(data.error || 'Unable to save series');
      }

       setMessage('Upload successful. Opening the next page...');
       setUploadLabel('Upload successful.');
       await wait(900);
       router.push(data.requiresContract && contractRedirectBasePath
         ? `${contractRedirectBasePath}${encodeURIComponent(data.videoId)}`
         : successRedirectPath);
    } catch (error) {
      setMessage(toStorageUploadError(error));
      setUploadLabel('Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="form-grid">
      <div className="form-section">
        <div>
          <h3 className="form-section-title">Release details</h3>
          <p className="muted form-section-copy">
            Upload your release details and assets.
          </p>
        </div>

        <div className="field-grid field-grid-3">
          <label className="field">
            <span className="field-label">Release type</span>
            <select
              className="input"
              value={form.videoType}
              onChange={(event) => {
                const nextType = event.target.value;
                updateField('videoType', nextType);
                if (nextType !== 'SERIES') {
                  setSeriesMode('new');
                }
              }}
            >
              <option value="FEATURE">Feature film</option>
              <option value="SERIES">Series</option>
              <option value="SHORT">Short film</option>
              <option value="SKIT">Skit</option>
              <option value="DOCUMENTARY">Documentary</option>
              <option value="ADVERT">Advert</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <select className="input" value={form.category} onChange={(event) => updateField('category', event.target.value)}>
              <option value="General">General</option>
              <option value="Love">Love</option>
              <option value="Action">Action</option>
              <option value="Thriller">Thriller</option>
              <option value="Comedy">Comedy</option>
              <option value="Drama">Drama</option>
              <option value="Romance">Romance</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Horror">Horror</option>
              <option value="Documentary">Documentary</option>
              <option value="Family">Family</option>
              <option value="Faith">Faith</option>
              <option value="Animation">Animation</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Age rating</span>
            <select className="input" value={form.ageRating} onChange={(event) => updateField('ageRating', event.target.value)}>
              <option value="ALL">All audiences</option>
              <option value="PG13">PG-13</option>
              <option value="PG16">16+</option>
              <option value="PG18">18+</option>
            </select>
          </label>
        </div>

        {isSeriesUpload ? (
          <div className="detail-card">
            <div className="field-grid field-grid-2">
              <button className={seriesMode === 'new' ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => setSeriesMode('new')}>
                Create new series
              </button>
              <button
                className={seriesMode === 'existing' ? 'btn btn-primary' : 'btn btn-ghost'}
                type="button"
                onClick={() => setSeriesMode('existing')}
                disabled={!seriesOptions.length}
              >
                Add episodes to existing series
              </button>
            </div>

            {seriesMode === 'existing' ? (
              <label className="field" style={{ marginTop: 16 }}>
                <span className="field-label">Choose series</span>
                <select className="input" value={selectedSeriesId} onChange={(event) => setSelectedSeriesId(event.target.value)}>
                  {seriesOptions.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.title} | {series.episodeCount} episodes | {series.status}
                    </option>
                  ))}
                </select>
                {selectedSeries ? (
                  <span className="field-hint">
                    New episodes will inherit {selectedSeries.category}, {selectedSeries.ageRating}, and the existing rights/pricing setup.
                  </span>
                ) : (
                  <span className="field-hint">Create your first series and it will appear here for future episode drops.</span>
                )}
              </label>
            ) : null}
          </div>
        ) : null}

        {!isAddingToExistingSeries ? (
          <>
            <label className="field">
              <span className="field-label">{isSeriesUpload ? 'Series title' : 'Movie title'}</span>
              <input className="input" value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
            </label>
            <label className="field">
              <span className="field-label">{isSeriesUpload ? 'Series synopsis' : 'Synopsis'}</span>
              <textarea className="input" value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={4} required />
            </label>
          </>
        ) : (
          <div className="detail-card">
            <span className="detail-label">Selected series</span>
            <strong>{selectedSeries?.title ?? 'Choose a series'}</strong>
            <p className="muted" style={{ marginBottom: 0 }}>
              Add fresh episodes under the same show page. Viewers will see them grouped by season and can unlock one episode at a time.
            </p>
          </div>
        )}

        {!isAddingToExistingSeries ? (
          <div className="field-grid field-grid-2">
            <label className="field">
              <span className="field-label">Genres</span>
              <input className="input" value={form.genres} onChange={(event) => updateField('genres', event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Tags</span>
              <input className="input" value={form.tags} onChange={(event) => updateField('tags', event.target.value)} />
            </label>
          </div>
        ) : null}
      </div>

      {!isAddingToExistingSeries ? (
        <div className="form-section">
          <div>
            <h3 className="form-section-title">Languages and viewer safety</h3>
            <p className="muted form-section-copy">
              Set the main language metadata and viewer advisories.
            </p>
          </div>

          <div className="field-grid field-grid-2">
            <label className="field">
              <span className="field-label">Original audio language</span>
              <select className="input" value={form.originalLanguage} onChange={(event) => updateOriginalLanguage(event.target.value)}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Production year</span>
              <input className="input" type="number" min={1900} max={new Date().getFullYear() + 2} value={form.releaseYear} onChange={(event) => updateField('releaseYear', parseInt(event.target.value || '0', 10))} />
            </label>
          </div>

          <div className="field">
            <span className="field-label">Available audio languages</span>
            <div className="action-list">
              {LANGUAGE_OPTIONS.map((option) => (
                <button key={option.code} className={form.audioLanguages.includes(option.code) ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => toggleAudioLanguage(option.code)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Content advisories</span>
            <div className="action-list">
              {CONTENT_WARNING_OPTIONS.map((option) => (
                <button key={option.value} className={form.contentWarnings.includes(option.value) ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => toggleContentWarning(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!isAddingToExistingSeries ? (
        <div className="form-section">
          <div>
            <h3 className="form-section-title">Delivery package metadata</h3>
            <p className="muted form-section-copy">
              Provide release metadata, including territory clearance, artwork references, cast, crew, and subtitle availability.
            </p>
          </div>

          <div className="field-grid field-grid-2">
            <label className="field">
              <span className="field-label">Licensor vendor ID</span>
              <input
                className="input"
                value={deliveryMetadata.vendorId}
                onChange={(event) => updateDeliveryField('vendorId', event.target.value)}
                placeholder="Example: LK_004261"
              />
              <span className="field-hint">Used in monthly royalty statements and licensor reconciliation.</span>
            </label>
            <label className="field">
              <span className="field-label">Studio release title</span>
              <input
                className="input"
                value={deliveryMetadata.studioReleaseTitle}
                onChange={(event) => updateDeliveryField('studioReleaseTitle', event.target.value)}
                placeholder="Original or local release title"
              />
            </label>
          </div>

            <div className="field-grid field-grid-2">
            <label className="field">
              <span className="field-label">Countries of origin</span>
              <input
                className="input"
                value={deliveryMetadata.countriesOfOrigin}
                onChange={(event) => updateDeliveryField('countriesOfOrigin', event.target.value)}
                placeholder="NO, NG, US"
              />
            </label>
            <label className="field">
              <span className="field-label">Licensed territories</span>
              <textarea
                className="input"
                rows={3}
                value={deliveryMetadata.licensedTerritories}
                onChange={(event) => updateDeliveryField('licensedTerritories', event.target.value)}
                placeholder="Africa, or ISO country codes such as NG, GH, KE, ZA"
              />
            </label>
          </div>

          <div className="field-grid field-grid-2">
            <label className="field">
              <span className="field-label">Production countries</span>
              <input
                className="input"
                value={deliveryMetadata.productionCountries}
                onChange={(event) => updateDeliveryField('productionCountries', event.target.value)}
                placeholder="Optional ISO country codes"
              />
            </label>
            <label className="field">
              <span className="field-label">Copyright line</span>
              <input
                className="input"
                value={deliveryMetadata.copyrightLine}
                onChange={(event) => updateDeliveryField('copyrightLine', event.target.value)}
                placeholder="2017 Woodworks Film Company"
              />
            </label>
          </div>

          <div className="field-grid field-grid-2">
            <label className="field">
              <span className="field-label">Localized titles and synopses</span>
              <textarea
                className="input"
                rows={4}
                value={deliveryMetadata.localizations}
                onChange={(event) => updateDeliveryField('localizations', event.target.value)}
                placeholder={'US | Haunted | Catherine inherits...\nGB | Haunted | Catherine inherits...'}
              />
            </label>
            <label className="field">
              <span className="field-label">Territory availability notes</span>
              <textarea
                className="input"
                rows={4}
                value={deliveryMetadata.productAvailability}
                onChange={(event) => updateDeliveryField('productAvailability', event.target.value)}
                placeholder={'NG | cleared | sales start date | TVOD/SVOD notes\nZA | cleared | sales start date | TVOD/SVOD notes'}
              />
            </label>
          </div>

          <div className="field-grid field-grid-2">
            <label className="field">
              <span className="field-label">Cast information</span>
              <textarea
                className="input"
                rows={3}
                value={deliveryMetadata.castCredits}
                onChange={(event) => updateDeliveryField('castCredits', event.target.value)}
                placeholder="Add cast names (comma or line-separated)."
              />
            </label>
            <label className="field">
              <span className="field-label">Crew information</span>
              <textarea
                className="input"
                rows={3}
                value={deliveryMetadata.crewCredits}
                onChange={(event) => updateDeliveryField('crewCredits', event.target.value)}
                placeholder="Add director, writer, producers, DOP, editor, and key crew."
              />
            </label>
          </div>

          <div className="detail-card">
            <span className="detail-label">English subtitles availability</span>
            <button
              className={deliveryMetadata.englishSubtitlesProvided ? 'btn btn-primary' : 'btn btn-ghost'}
              type="button"
              onClick={() => updateDeliveryField('englishSubtitlesProvided', !deliveryMetadata.englishSubtitlesProvided)}
            >
              {deliveryMetadata.englishSubtitlesProvided ? 'English subtitles provided' : 'Mark English subtitles where applicable'}
            </button>
          </div>
        </div>
      ) : null}

      {isSeriesUpload ? (
      <div className="form-section">
        <div>
          <h3 className="form-section-title">Episode structure and metadata</h3>
          <p className="muted form-section-copy">
            Arrange episodes.
          </p>
        </div>

        <div className="stack-list">
            <div className="stack-row">
              <div>
                <span className="field-label">Episodes</span>
              </div>
              <button className="btn btn-ghost" type="button" onClick={addEpisode}>Add episode</button>
            </div>

            <div className="series-upload-grid">
              {episodes.map((episode) => (
                <div key={episode.id} className="detail-card series-upload-card">
                  <div className="stack-row">
                    <div>
                      <span className="detail-label">Episode slot</span>
                      <strong>Season {episode.seasonNumber}, Episode {episode.episodeNumber}</strong>
                    </div>
                    {episodes.length > 1 ? (
                      <button className="btn btn-ghost" type="button" onClick={() => removeEpisode(episode.id)}>Remove</button>
                    ) : null}
                  </div>

                  <div className="field-grid field-grid-2">
                    <label className="field">
                      <span className="field-label">Season number</span>
                      <input className="input" type="number" min={1} value={episode.seasonNumber} onChange={(event) => updateEpisode(episode.id, { seasonNumber: parseInt(event.target.value || '1', 10) })} />
                    </label>
                    <label className="field">
                      <span className="field-label">Episode number</span>
                      <input className="input" type="number" min={1} value={episode.episodeNumber} onChange={(event) => updateEpisode(episode.id, { episodeNumber: parseInt(event.target.value || '1', 10) })} />
                    </label>
                  </div>

                  <label className="field">
                    <span className="field-label">Episode title</span>
                    <input className="input" value={episode.title} onChange={(event) => updateEpisode(episode.id, { title: event.target.value })} required />
                  </label>
                  <label className="field">
                    <span className="field-label">Episode synopsis</span>
                    <textarea className="input" rows={3} value={episode.description} onChange={(event) => updateEpisode(episode.id, { description: event.target.value })} required />
                  </label>

                  <div className="field-grid field-grid-2">
                    <label className="field">
                      <span className="field-label">Full runtime</span>
                      <input className="input" type="number" min={60} value={episode.durationSec} onChange={(event) => updateEpisode(episode.id, { durationSec: parseInt(event.target.value || '0', 10) })} />
                    </label>
                    <label className="field">
                      <span className="field-label">Highlight timestamps</span>
                      <input className="input" value={episode.highlightSeconds} onChange={(event) => updateEpisode(episode.id, { highlightSeconds: event.target.value })} />
                    </label>
                  </div>

                  <div className="field-grid field-grid-2">
                    <label className="field">
                      <span className="field-label">Episode playback MP4 (1080p)</span>
                      <input className="input" type="file" accept=".mp4,video/mp4" onChange={(event) => updateEpisode(episode.id, { primaryVideoFile: event.target.files?.[0] ?? null })} />
                    </label>
                    <label className="field">
                      <span className="field-label">Episode fallback MP4 (720p)</span>
                      <input className="input" type="file" accept=".mp4,video/mp4" onChange={(event) => updateEpisode(episode.id, { fallbackVideoFile: event.target.files?.[0] ?? null })} />
                    </label>
                  </div>
                  <p className="muted" style={{ fontSize: '0.875rem', marginTop: 8 }}>
                    Upload at least one video file (1080p or 720p MP4)
                  </p>
                  <div className="field-grid field-grid-2">
                    <label className="field">
                      <span className="field-label">Episode poster</span>
                      <input className="input" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => updateEpisode(episode.id, { posterFile: event.target.files?.[0] ?? null })} />
                    </label>
                  </div>

                  <div className="stack-list">
                    <div className="stack-row">
                      <div>
                        <span className="field-label">Episode subtitle tracks</span>
                      </div>
                      <button className="btn btn-ghost" type="button" onClick={() => addEpisodeSubtitleTrack(episode.id, form.originalLanguage)}>
                        Add subtitle track
                      </button>
                    </div>

                    {episode.subtitleTracks.map((track, index) => (
                      <div key={track.id} className="detail-card">
                        <div className="field-grid field-grid-3">
                          <label className="field">
                            <span className="field-label">Language</span>
                            <select className="input" value={track.languageCode} onChange={(event) => updateEpisodeSubtitleTrack(episode.id, track.id, { languageCode: event.target.value, label: track.label || getLanguageLabel(event.target.value) })}>
                              {LANGUAGE_OPTIONS.map((option) => (
                                <option key={option.code} value={option.code}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span className="field-label">Track label</span>
                            <input className="input" value={track.label} onChange={(event) => updateEpisodeSubtitleTrack(episode.id, track.id, { label: event.target.value })} />
                          </label>
                          <label className="field">
                            <span className="field-label">Kind</span>
                            <select className="input" value={track.kind} onChange={(event) => updateEpisodeSubtitleTrack(episode.id, track.id, { kind: event.target.value as SubtitleKindValue })}>
                              {SUBTITLE_KIND_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="field-grid field-grid-3">
                          <label className="field">
                            <span className="field-label">Subtitle file</span>
                            <input className="input" type="file" accept=".vtt,.srt,text/vtt,application/x-subrip,text/plain" onChange={(event) => updateEpisodeSubtitleTrack(episode.id, track.id, { file: event.target.files?.[0] ?? null })} />
                          </label>
                          <button className={track.isDefault ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => markEpisodeDefaultSubtitle(episode.id, track.id)}>
                            {track.isDefault ? 'Default subtitle' : `Make default ${index + 1}`}
                          </button>
                          <button className="btn btn-ghost" type="button" onClick={() => removeEpisodeSubtitleTrack(episode.id, track.id)}>Remove track</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
      ) : null}

      <div className="form-section">
        <div>
          <h3 className="form-section-title">Upload assets</h3>
           <p className="muted form-section-copy">
             Deliver the final approved playable MP4 master. H.264 video and AAC audio are preferred. No watermark, no burned-in timecode, no rough cuts.
           </p>
        </div>

        {!isSeriesUpload ? (
          <>
            <div className="field-grid field-grid-2">
              <label className="field">
                <span className="field-label">Final playable MP4 master</span>
                <input
                  className="input"
                  type="file"
                  accept=".mp4,video/mp4"
                  onChange={(event) => setMasterFile(event.target.files?.[0] ?? null)}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Poster artwork</span>
                <input className="input" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)} required />
              </label>
            </div>
            <div className="field-grid field-grid-2">
              <label className="field">
                <span className="field-label">Marketing trailer (MP4)</span>
                <input
                  className="input"
                  type="file"
                  accept=".mp4,video/mp4"
                  onChange={(event) => setTrailerFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="stack-list">
              <div className="stack-row">
                <div>
                  <span className="field-label">Subtitle tracks</span>
                </div>
                <button className="btn btn-ghost" type="button" onClick={() => setSubtitleTracks((current) => [...current, { ...createSubtitleDraft(form.originalLanguage), isDefault: current.length === 0 }])}>
                  Add subtitle track
                </button>
              </div>

              {subtitleTracks.map((track, index) => (
                <div key={track.id} className="detail-card">
                  <div className="field-grid field-grid-3">
                    <label className="field">
                      <span className="field-label">Language</span>
                      <select className="input" value={track.languageCode} onChange={(event) => updateSubtitleTrack(track.id, { languageCode: event.target.value, label: track.label || getLanguageLabel(event.target.value) })}>
                        {LANGUAGE_OPTIONS.map((option) => (
                          <option key={option.code} value={option.code}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Track label</span>
                      <input className="input" value={track.label} onChange={(event) => updateSubtitleTrack(track.id, { label: event.target.value })} />
                    </label>
                    <label className="field">
                      <span className="field-label">Kind</span>
                      <select className="input" value={track.kind} onChange={(event) => updateSubtitleTrack(track.id, { kind: event.target.value as SubtitleKindValue })}>
                        {SUBTITLE_KIND_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="field-grid field-grid-3">
                    <label className="field">
                      <span className="field-label">Subtitle file</span>
                      <input className="input" type="file" accept=".vtt,.srt,text/vtt,application/x-subrip,text/plain" onChange={(event) => updateSubtitleTrack(track.id, { file: event.target.files?.[0] ?? null })} />
                    </label>
                    <button className={track.isDefault ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => markDefaultSubtitle(track.id)}>
                      {track.isDefault ? 'Default subtitle' : `Make default ${index + 1}`}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => removeSubtitleTrack(track.id)}>Remove track</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : !isAddingToExistingSeries ? (
          <div className="stack-list">
            <label className="field">
              <span className="field-label">Series poster artwork</span>
              <input className="input" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)} required />
            </label>
            <div className="field-grid field-grid-2">
              <label className="field">
                <span className="field-label">Marketing trailer (MP4)</span>
                <input
                  className="input"
                  type="file"
                  accept=".mp4,video/mp4"
                  onChange={(event) => setTrailerFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {message ? <div className="card" style={{ color: '#f7c7c7' }}>{message}</div> : null}
      {uploadLabel ? (
        <div className="detail-card upload-progress">
          <div className="upload-progress-meta">
            <span className="detail-label">{uploadLabel}</span>
            <strong>{uploadProgress}%</strong>
          </div>
          <div className="upload-progress-track" aria-hidden="true">
            <span
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          {uploadSteps.length ? (
            <div className="stack-list" style={{ marginTop: 12 }}>
              {uploadSteps.map((step) => {
                const stepPercent = Math.round((step.loaded / Math.max(step.total, 1)) * 100);
                return (
                  <div key={step.id} className="detail-card">
                    <div className="stack-row">
                      <div>
                        <strong>{step.label}</strong>
                        <p className="muted">
                          {step.fileName} | {formatUploadBytes(step.loaded)} / {formatUploadBytes(step.total)}
                        </p>
                        {step.error ? <p className="muted" style={{ color: '#f7c7c7' }}>{step.error}</p> : null}
                      </div>
                      <span className={`status-chip ${step.status === 'done' ? 'status-live' : step.status === 'failed' ? 'status-rejected' : 'status-review'}`}>
                        {step.status === 'done' ? 'Uploaded' : step.status === 'failed' ? 'Failed' : step.status === 'uploading' ? `${stepPercent}%` : 'Waiting'}
                      </span>
                    </div>
                    <div className="upload-progress-track" aria-hidden="true">
                      <span
                        className="upload-progress-fill"
                        style={{ width: `${stepPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="stack-row" style={{ justifyContent: 'space-between' }}>
        <p className="muted" style={{ marginBottom: 0 }}>
          Upload your content.
        </p>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Uploading...' : isSeriesUpload ? (isAddingToExistingSeries ? 'Add episodes' : 'Create series') : 'Upload release'}
        </button>
      </div>
    </form>
  );
}
