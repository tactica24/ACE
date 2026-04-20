'use client';

import { useState, type FormEvent } from 'react';
import {
  CONTENT_WARNING_OPTIONS,
  LANGUAGE_OPTIONS,
  SUBTITLE_KIND_OPTIONS,
  getLanguageLabel,
  type SubtitleKindValue
} from '@/lib/media-types';

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
  successRedirectPath?: string;
  contractRedirectBasePath?: string | null;
};

type UploadState = {
  title: string;
  description: string;
  priceTier: string;
  rightsTier: string;
  releaseYear: number;
  teaserSec: number;
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
  teaserSec: number;
  durationSec: number;
  highlightSeconds: string;
  videoFile: File | null;
  posterFile: File | null;
};

type DeliveryMetadataState = {
  deliveryResolution: 'HD' | '4K';
  has4kMaster: boolean;
  deliveryFormat: string;
  deliveryNotes: string;
  castCredits: string;
  crewCredits: string;
  englishSubtitlesProvided: boolean;
};

const initialState: UploadState = {
  title: '',
  description: '',
  priceTier: 'STANDARD',
  rightsTier: 'SHARED',
  releaseYear: new Date().getFullYear(),
  teaserSec: 300,
  durationSec: 1800,
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

const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm'];
const SUPPORTED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'];

const initialDeliveryMetadataState: DeliveryMetadataState = {
  deliveryResolution: 'HD',
  has4kMaster: false,
  deliveryFormat: 'ProRes',
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
    teaserSec: 120,
    durationSec: 1500,
    highlightSeconds: '',
    videoFile: null,
    posterFile: null
  };
}

function uploadFileToSignedUrl(url: string, file: File, onProgress: (loaded: number, total: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    };
    xhr.onerror = () => reject(new Error('Upload could not reach storage. Check your network and R2 CORS settings.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size, file.size);
        resolve();
        return;
      }
      reject(new Error(`Storage upload failed with status ${xhr.status}.`));
    };
    xhr.send(file);
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

export default function UploadForm({
  initialSeriesId = null,
  seriesOptions,
  uploadEndpoint = '/api/studio/upload-url',
  submissionEndpoint = '/api/studio/video',
  extraPayload,
  successRedirectPath = '/studio/library',
  contractRedirectBasePath = '/studio/upload?contractVideoId='
}: UploadFormProps) {
  const [form, setForm] = useState<UploadState>({
    ...initialState,
    videoType: initialSeriesId ? 'SERIES' : initialState.videoType
  });
  const [seriesMode, setSeriesMode] = useState<'new' | 'existing'>(initialSeriesId ? 'existing' : 'new');
  const [selectedSeriesId, setSelectedSeriesId] = useState(initialSeriesId ?? seriesOptions[0]?.id ?? '');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [promotionalStillFiles, setPromotionalStillFiles] = useState<File[]>([]);
  const [masterDeliveryFile, setMasterDeliveryFile] = useState<File | null>(null);
  const [cleanAudioMasterFile, setCleanAudioMasterFile] = useState<File | null>(null);
  const [deliveryMetadata, setDeliveryMetadata] = useState<DeliveryMetadataState>(initialDeliveryMetadataState);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleDraft[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeDraft[]>([createEpisodeDraft()]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);

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

  const removeEpisode = (id: string) => {
    setEpisodes((current) => current.filter((episode) => episode.id !== id));
  };

  const addEpisode = () => {
    const lastEpisode = episodes[episodes.length - 1];
    setEpisodes((current) => [...current, createEpisodeDraft(lastEpisode?.seasonNumber ?? 1, (lastEpisode?.episodeNumber ?? 0) + 1)]);
  };

  const uploadAsset = async (
    file: File,
    purpose: 'video' | 'poster' | 'subtitle' | 'master' | 'audio_master',
    onProgress: (loaded: number, total: number) => void
  ) => {
    const presign = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    await uploadFileToSignedUrl(presignData.url as string, file, onProgress);
    return presignData.key as string;
  };

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!isSeriesUpload) {
      if (!isSupportedVideoFile(videoFile)) {
        setMessage('Upload MP4 or WebM video files for reliable preview and viewer playback.');
        return;
      }
      if (subtitleTracks.some((track) => !track.file)) {
        setMessage('Each subtitle row needs a subtitle file before submission.');
        return;
      }
      if (
        deliveryMetadata.englishSubtitlesProvided &&
        !subtitleTracks.some((track) => track.languageCode === 'en' && track.file)
      ) {
        setMessage('English subtitles were marked as available. Add an English subtitle track or turn that toggle off.');
        return;
      }
    } else {
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
      if (episodes.some((episode) => !isSupportedVideoFile(episode.videoFile))) {
        setMessage('Each episode needs an MP4 or WebM video file.');
        return;
      }
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadLabel('Preparing upload...');

    try {
      if (!isSeriesUpload) {
        type UploadQueueItem = {
          id: string;
          label: string;
          file: File;
          purpose: 'video' | 'poster' | 'subtitle' | 'master' | 'audio_master';
          posterRole?: 'primary' | 'promotional';
          subtitleMeta?: {
            label: string;
            languageCode: string;
            kind: SubtitleKindValue;
            isDefault: boolean;
          };
        };

        const uploadQueue: UploadQueueItem[] = [
          {
            id: 'video',
            label: `Uploading video: ${videoFile?.name}`,
            file: videoFile as File,
            purpose: 'video' as const
          },
          ...(posterFile
            ? [{
                id: 'poster',
                label: `Uploading poster: ${posterFile.name}`,
                file: posterFile,
                purpose: 'poster' as const,
                posterRole: 'primary' as const
              }]
            : []),
          ...promotionalStillFiles.map((file, index) => ({
            id: `promo-${index}`,
            label: `Uploading promotional still ${index + 1}: ${file.name}`,
            file,
            purpose: 'poster' as const,
            posterRole: 'promotional' as const
          })),
          ...(cleanAudioMasterFile
            ? [{
                id: 'audio-master',
                label: `Uploading clean audio master: ${cleanAudioMasterFile.name}`,
                file: cleanAudioMasterFile,
                purpose: 'audio_master' as const
              }]
            : []),
          ...(masterDeliveryFile
            ? [{
                id: 'master-delivery',
                label: `Uploading delivery master: ${masterDeliveryFile.name}`,
                file: masterDeliveryFile,
                purpose: 'master' as const
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
        let completedBytes = 0;
        let storedVideoKey = '';
        let storedPosterKey: string | null = null;
        let storedMasterDeliveryKey: string | null = null;
        let storedCleanAudioMasterKey: string | null = null;
        const promotionalStillKeys: string[] = [];
        const subtitlePayload: Array<{
          label: string;
          languageCode: string;
          kind: SubtitleKindValue;
          isDefault: boolean;
          fileKey: string;
        }> = [];

        for (const item of uploadQueue) {
          setUploadLabel(item.label);
          const fileKey = await uploadAsset(item.file, item.purpose, (loaded, total) => {
            const safeTotal = total || item.file.size || 1;
            const overallLoaded = completedBytes + Math.min(loaded, safeTotal);
            setUploadProgress(Math.min(99, Math.round((overallLoaded / Math.max(totalBytes, 1)) * 100)));
          });

          completedBytes += item.file.size;

          if (item.purpose === 'video') {
            storedVideoKey = fileKey;
          } else if (item.purpose === 'poster') {
            if (item.posterRole === 'promotional') {
              promotionalStillKeys.push(fileKey);
            } else {
              storedPosterKey = fileKey;
            }
          } else if (item.purpose === 'audio_master') {
            storedCleanAudioMasterKey = fileKey;
          } else if (item.purpose === 'master') {
            storedMasterDeliveryKey = fileKey;
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
          headers: { 'Content-Type': 'application/json' },
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
            teaserSec: form.teaserSec,
            durationSec: form.durationSec,
            tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
            releaseYear: form.releaseYear,
            highlightSeconds: form.highlightSeconds
              .split(',')
              .map((value) => parseInt(value.trim(), 10))
              .filter((value) => Number.isFinite(value)),
            subtitleTracks: subtitlePayload,
            r2Key: storedVideoKey,
            posterKey: storedPosterKey,
            deliveryMetadata: {
              deliveryResolution: deliveryMetadata.deliveryResolution,
              has4kMaster: deliveryMetadata.has4kMaster,
              deliveryFormat: deliveryMetadata.deliveryFormat,
              deliveryNotes: deliveryMetadata.deliveryNotes,
              promotionalStillKeys,
              castCredits: normalizeCreditEntries(deliveryMetadata.castCredits),
              crewCredits: normalizeCreditEntries(deliveryMetadata.crewCredits),
              englishSubtitlesProvided: deliveryMetadata.englishSubtitlesProvided,
              cleanAudioMasterKey: storedCleanAudioMasterKey,
              masterDeliveryKey: storedMasterDeliveryKey
            }
          })
        });

        const data = await create.json().catch(() => ({}));
        if (!create.ok || !data.videoId) {
          throw new Error(data.error || 'Unable to save release');
        }

        window.location.href = contractRedirectBasePath
          ? `${contractRedirectBasePath}${encodeURIComponent(data.videoId)}`
          : successRedirectPath;
        return;
      }

      const metadataAssetBytes = isAddingToExistingSeries
        ? 0
        : (posterFile?.size ?? 0)
          + promotionalStillFiles.reduce((sum, file) => sum + file.size, 0)
          + (masterDeliveryFile?.size ?? 0)
          + (cleanAudioMasterFile?.size ?? 0);
      const totalBytes =
        episodes.reduce((sum, episode) => sum + (episode.videoFile?.size ?? 0) + (episode.posterFile?.size ?? 0), 0)
        + metadataAssetBytes;
      let completedBytes = 0;
      let storedSeriesPosterKey: string | null = null;
      let storedSeriesMasterDeliveryKey: string | null = null;
      let storedSeriesCleanAudioMasterKey: string | null = null;
      const storedSeriesPromotionalStillKeys: string[] = [];

      if (!isAddingToExistingSeries && posterFile) {
        setUploadLabel(`Uploading series poster: ${posterFile.name}`);
        storedSeriesPosterKey = await uploadAsset(posterFile, 'poster', (loaded, total) => {
          const safeTotal = total || posterFile.size || 1;
          setUploadProgress(Math.min(40, Math.round((Math.min(loaded, safeTotal) / Math.max(totalBytes, 1)) * 100)));
        });
        completedBytes += posterFile.size;
      }

      if (!isAddingToExistingSeries) {
        for (const [index, stillFile] of promotionalStillFiles.entries()) {
          setUploadLabel(`Uploading promotional still ${index + 1}: ${stillFile.name}`);
          const stillKey = await uploadAsset(stillFile, 'poster', (loaded, total) => {
            const safeTotal = total || stillFile.size || 1;
            const overallLoaded = completedBytes + Math.min(loaded, safeTotal);
            setUploadProgress(Math.min(70, Math.round((overallLoaded / Math.max(totalBytes, 1)) * 100)));
          });
          storedSeriesPromotionalStillKeys.push(stillKey);
          completedBytes += stillFile.size;
        }

        if (cleanAudioMasterFile) {
          setUploadLabel(`Uploading clean audio master: ${cleanAudioMasterFile.name}`);
          storedSeriesCleanAudioMasterKey = await uploadAsset(cleanAudioMasterFile, 'audio_master', (loaded, total) => {
            const safeTotal = total || cleanAudioMasterFile.size || 1;
            const overallLoaded = completedBytes + Math.min(loaded, safeTotal);
            setUploadProgress(Math.min(75, Math.round((overallLoaded / Math.max(totalBytes, 1)) * 100)));
          });
          completedBytes += cleanAudioMasterFile.size;
        }

        if (masterDeliveryFile) {
          setUploadLabel(`Uploading delivery master: ${masterDeliveryFile.name}`);
          storedSeriesMasterDeliveryKey = await uploadAsset(masterDeliveryFile, 'master', (loaded, total) => {
            const safeTotal = total || masterDeliveryFile.size || 1;
            const overallLoaded = completedBytes + Math.min(loaded, safeTotal);
            setUploadProgress(Math.min(80, Math.round((overallLoaded / Math.max(totalBytes, 1)) * 100)));
          });
          completedBytes += masterDeliveryFile.size;
        }
      }

      const episodePayload = [];
      for (const episode of episodes) {
        setUploadLabel(`Uploading ${episode.title || `Season ${episode.seasonNumber} Episode ${episode.episodeNumber}`}`);
        const videoKey = await uploadAsset(episode.videoFile as File, 'video', (loaded, total) => {
          const safeTotal = total || (episode.videoFile?.size ?? 1);
          const overallLoaded = completedBytes + Math.min(loaded, safeTotal);
          setUploadProgress(Math.min(95, Math.round((overallLoaded / Math.max(totalBytes, 1)) * 100)));
        });
        completedBytes += episode.videoFile?.size ?? 0;

        let episodePosterKey: string | null = null;
        if (episode.posterFile) {
          episodePosterKey = await uploadAsset(episode.posterFile, 'poster', (loaded, total) => {
            const safeTotal = total || episode.posterFile?.size || 1;
            const overallLoaded = completedBytes + Math.min(loaded, safeTotal);
            setUploadProgress(Math.min(95, Math.round((overallLoaded / Math.max(totalBytes, 1)) * 100)));
          });
          completedBytes += episode.posterFile.size;
        }

        episodePayload.push({
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          description: episode.description,
          teaserSec: episode.teaserSec,
          durationSec: episode.durationSec,
          highlightSeconds: episode.highlightSeconds
            .split(',')
            .map((value) => parseInt(value.trim(), 10))
            .filter((value) => Number.isFinite(value)),
          r2Key: videoKey,
          posterKey: episodePosterKey
        });
      }

      setUploadLabel(isAddingToExistingSeries ? 'Adding episodes...' : 'Creating series...');
      setUploadProgress(100);

      const create = await fetch(submissionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                  deliveryResolution: deliveryMetadata.deliveryResolution,
                  has4kMaster: deliveryMetadata.has4kMaster,
                  deliveryFormat: deliveryMetadata.deliveryFormat,
                  deliveryNotes: deliveryMetadata.deliveryNotes,
                  promotionalStillKeys: storedSeriesPromotionalStillKeys,
                  castCredits: normalizeCreditEntries(deliveryMetadata.castCredits),
                  crewCredits: normalizeCreditEntries(deliveryMetadata.crewCredits),
                  englishSubtitlesProvided: deliveryMetadata.englishSubtitlesProvided,
                  cleanAudioMasterKey: storedSeriesCleanAudioMasterKey,
                  masterDeliveryKey: storedSeriesMasterDeliveryKey
                },
                episodes: episodePayload
              }
        )
      });

      const data = await create.json().catch(() => ({}));
      if (!create.ok || !data.videoId) {
        throw new Error(data.error || 'Unable to save series');
      }

      window.location.href = data.requiresContract && contractRedirectBasePath
        ? `${contractRedirectBasePath}${encodeURIComponent(data.videoId)}`
        : successRedirectPath;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed');
      setUploadLabel(null);
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
            Submit a single movie as usual, or switch to a series flow that lets you add episodes season by season.
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
              Set the main language metadata and viewer advisories once so the storefront and TV layout stay consistent.
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
              Capture the technical and editorial package that accompanies this title so operations, promotion, and device delivery stay aligned.
            </p>
          </div>

          <div className="field-grid field-grid-3">
            <label className="field">
              <span className="field-label">Master resolution</span>
              <select
                className="input"
                value={deliveryMetadata.deliveryResolution}
                onChange={(event) => {
                  const nextResolution = event.target.value === '4K' ? '4K' : 'HD';
                  setDeliveryMetadata((current) => ({
                    ...current,
                    deliveryResolution: nextResolution,
                    has4kMaster: nextResolution === '4K' ? true : current.has4kMaster
                  }));
                }}
              >
                <option value="HD">HD minimum</option>
                <option value="4K">4K available</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Delivery format</span>
              <select className="input" value={deliveryMetadata.deliveryFormat} onChange={(event) => updateDeliveryField('deliveryFormat', event.target.value)}>
                <option value="ProRes">ProRes (preferred)</option>
                <option value="High-quality mezzanine">High-quality mezzanine</option>
                <option value="Broadcast mezzanine">Broadcast mezzanine</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="field" style={{ justifyContent: 'center' }}>
              <span className="field-label">4K deliverable</span>
              <button
                className={deliveryMetadata.has4kMaster ? 'btn btn-primary' : 'btn btn-ghost'}
                type="button"
                onClick={() => updateDeliveryField('has4kMaster', !deliveryMetadata.has4kMaster)}
              >
                {deliveryMetadata.has4kMaster ? '4K ready' : 'Mark 4K as available'}
              </button>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Delivery notes</span>
            <textarea
              className="input"
              rows={3}
              value={deliveryMetadata.deliveryNotes}
              onChange={(event) => updateDeliveryField('deliveryNotes', event.target.value)}
              placeholder="Codec profile, frame rate, aspect ratio, mix notes, and any handoff context."
            />
          </label>

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

      <div className="form-section">
        <div>
          <h3 className="form-section-title">{isSeriesUpload ? 'Pricing and episode structure' : 'Pricing and playback'}</h3>
          <p className="muted form-section-copy">
            {isSeriesUpload
              ? 'Series episodes unlock at 0.5 credit each. Arrange every upload by season and episode number so viewers can browse them cleanly.'
              : 'Set teaser length, runtime, and pricing so viewers see the right unlock value before playback continues.'}
          </p>
        </div>

        {!isAddingToExistingSeries ? (
          <div className="field-grid field-grid-2">
            <label className="field">
              <span className="field-label">Price tier</span>
              <select className="input" value={form.priceTier} onChange={(event) => updateField('priceTier', event.target.value)}>
                <option value="SNACK">Snack</option>
                <option value="STANDARD">Standard</option>
                <option value="PREMIERE">Premiere</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Rights tier</span>
              <select className="input" value={form.rightsTier} onChange={(event) => updateField('rightsTier', event.target.value)}>
                <option value="SHARED">Shared</option>
                <option value="EXCLUSIVE">Exclusive</option>
              </select>
            </label>
          </div>
        ) : null}

        {!isSeriesUpload ? (
          <div className="field-grid field-grid-3">
            <label className="field">
              <span className="field-label">Teaser seconds</span>
              <input className="input" type="number" min={30} value={form.teaserSec} onChange={(event) => updateField('teaserSec', parseInt(event.target.value || '0', 10))} />
            </label>
            <label className="field">
              <span className="field-label">Full runtime</span>
              <input className="input" type="number" min={60} value={form.durationSec} onChange={(event) => updateField('durationSec', parseInt(event.target.value || '0', 10))} />
            </label>
            <label className="field">
              <span className="field-label">Highlight timestamps</span>
              <input className="input" value={form.highlightSeconds} onChange={(event) => updateField('highlightSeconds', event.target.value)} />
            </label>
          </div>
        ) : (
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <span className="field-label">Episodes</span>
                <p className="muted form-section-copy">Arrange episode uploads exactly how you want them shown on web and TV.</p>
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

                  <div className="field-grid field-grid-3">
                    <label className="field">
                      <span className="field-label">Teaser seconds</span>
                      <input className="input" type="number" min={30} value={episode.teaserSec} onChange={(event) => updateEpisode(episode.id, { teaserSec: parseInt(event.target.value || '0', 10) })} />
                    </label>
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
                      <span className="field-label">Episode video</span>
                      <input className="input" type="file" accept=".mp4,.webm,video/mp4,video/webm" onChange={(event) => updateEpisode(episode.id, { videoFile: event.target.files?.[0] ?? null })} required />
                    </label>
                    <label className="field">
                      <span className="field-label">Episode poster</span>
                      <input className="input" type="file" accept="image/*" onChange={(event) => updateEpisode(episode.id, { posterFile: event.target.files?.[0] ?? null })} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <div>
          <h3 className="form-section-title">Upload assets</h3>
          <p className="muted form-section-copy">
            {isSeriesUpload
              ? 'Add a show poster once, then upload episode video files. Include promotional stills and optional delivery masters for operational readiness.'
              : 'Upload the playable movie file, poster/key art, promotional stills, subtitles, and optional master package files.'}
          </p>
        </div>

        {!isSeriesUpload ? (
          <>
            <div className="field-grid field-grid-2">
              <label className="field">
                <span className="field-label">Movie file</span>
                <input className="input" type="file" accept=".mp4,.webm,video/mp4,video/webm" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} required />
              </label>
              <label className="field">
                <span className="field-label">Poster artwork</span>
                <input className="input" type="file" accept="image/*" onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="field-grid field-grid-2">
              <label className="field">
                <span className="field-label">Promotional stills</span>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setPromotionalStillFiles(Array.from(event.target.files ?? []))}
                />
                <span className="field-hint">
                  {promotionalStillFiles.length
                    ? `${promotionalStillFiles.length} still${promotionalStillFiles.length === 1 ? '' : 's'} ready for upload.`
                    : 'Upload multiple stills for homepage and promotional placement.'}
                </span>
              </label>
              <label className="field">
                <span className="field-label">Clean audio master</span>
                <input
                  className="input"
                  type="file"
                  accept=".wav,.aiff,.aif,.flac,.m4a,.mp3,audio/*"
                  onChange={(event) => setCleanAudioMasterFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Master delivery file</span>
              <input
                className="input"
                type="file"
                accept=".mov,.mxf,.mp4,.webm,.mkv,video/*"
                onChange={(event) => setMasterDeliveryFile(event.target.files?.[0] ?? null)}
              />
              <span className="field-hint">ProRes is preferred. High-quality delivery masters are also accepted.</span>
            </label>

            <div className="stack-list">
              <div className="stack-row">
                <div>
                  <span className="field-label">Subtitle tracks</span>
                  <p className="muted form-section-copy">Upload WebVTT subtitles for the viewer player.</p>
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
                      <input className="input" type="file" accept=".vtt,text/vtt" onChange={(event) => updateSubtitleTrack(track.id, { file: event.target.files?.[0] ?? null })} />
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
              <input className="input" type="file" accept="image/*" onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)} />
            </label>
            <div className="field-grid field-grid-2">
              <label className="field">
                <span className="field-label">Promotional stills</span>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setPromotionalStillFiles(Array.from(event.target.files ?? []))}
                />
                <span className="field-hint">
                  {promotionalStillFiles.length
                    ? `${promotionalStillFiles.length} still${promotionalStillFiles.length === 1 ? '' : 's'} ready for upload.`
                    : 'Upload stills that can be featured on home and show detail areas.'}
                </span>
              </label>
              <label className="field">
                <span className="field-label">Clean audio master</span>
                <input
                  className="input"
                  type="file"
                  accept=".wav,.aiff,.aif,.flac,.m4a,.mp3,audio/*"
                  onChange={(event) => setCleanAudioMasterFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Master delivery file</span>
              <input
                className="input"
                type="file"
                accept=".mov,.mxf,.mp4,.webm,.mkv,video/*"
                onChange={(event) => setMasterDeliveryFile(event.target.files?.[0] ?? null)}
              />
              <span className="field-hint">Upload ProRes where available, or another high-quality mezzanine file.</span>
            </label>
          </div>
        ) : null}
      </div>

      {message ? <div className="card" style={{ color: '#f7c7c7' }}>{message}</div> : null}
      {uploadLabel ? (
        <div className="detail-card">
          <span className="detail-label">{uploadLabel}</span>
          <strong>{uploadProgress}%</strong>
        </div>
      ) : null}

      <div className="stack-row" style={{ justifyContent: 'space-between' }}>
        <p className="muted" style={{ marginBottom: 0 }}>
          {isSeriesUpload
            ? isAddingToExistingSeries
              ? 'New episodes will appear inside the same show page after upload.'
              : 'After the series upload saves, you will review and sign the producer agreement once for the show.'
            : 'After the upload saves, you will review and sign the producer agreement before the release is complete.'}
        </p>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Uploading...' : isSeriesUpload ? (isAddingToExistingSeries ? 'Add episodes' : 'Create series') : 'Upload release'}
        </button>
      </div>
    </form>
  );
}
