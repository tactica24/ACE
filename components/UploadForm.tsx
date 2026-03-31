'use client';

import { useState, type FormEvent } from 'react';
import {
  CONTENT_WARNING_OPTIONS,
  LANGUAGE_OPTIONS,
  SUBTITLE_KIND_OPTIONS,
  getLanguageLabel,
  type SubtitleKindValue
} from '@/lib/media-types';

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

type UploadJob = {
  id: string;
  label: string;
  file: File;
  kind: 'video' | 'poster' | 'subtitle';
  subtitleMeta?: {
    label: string;
    languageCode: string;
    kind: SubtitleKindValue;
    isDefault: boolean;
  };
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

function createSubtitleDraft(languageCode = 'en'): SubtitleDraft {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: getLanguageLabel(languageCode),
    languageCode,
    kind: 'subtitles',
    isDefault: false,
    file: null
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
    xhr.onerror = () => {
      reject(
        new Error(
          'Upload could not reach storage. Check your connection and allow PUT uploads from this app domain in Cloudflare R2 CORS.'
        )
      );
    };
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

export default function UploadForm() {
  const [form, setForm] = useState<UploadState>(initialState);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);

  const updateField = <K extends keyof UploadState>(key: K, value: UploadState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
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
    setSubtitleTracks((current) =>
      current.map((track) => (track.id === id ? { ...track, ...updates } : track))
    );
  };

  const markDefaultSubtitle = (id: string) => {
    setSubtitleTracks((current) =>
      current.map((track) => ({ ...track, isDefault: track.id === id }))
    );
  };

  const removeSubtitleTrack = (id: string) => {
    setSubtitleTracks((current) => {
      const next = current.filter((track) => track.id !== id);
      if (next.length === 1 && !next[0].isDefault) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const uploadAsset = async (
    file: File,
    onProgress: (loaded: number, total: number) => void
  ) => {
    const presign = await fetch('/api/studio/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream'
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
    if (!videoFile) {
      setMessage('Select a video file before you submit this release.');
      return;
    }

    const normalizedVideoName = videoFile.name.toLowerCase();
    const hasSupportedExtension = SUPPORTED_VIDEO_EXTENSIONS.some((extension) => normalizedVideoName.endsWith(extension));
    const hasSupportedMimeType = !videoFile.type || SUPPORTED_VIDEO_MIME_TYPES.includes(videoFile.type);

    if (!hasSupportedExtension || !hasSupportedMimeType) {
      setMessage('Upload MP4 or WebM video files for reliable preview and viewer playback.');
      return;
    }

    if (subtitleTracks.some((track) => !track.file)) {
      setMessage('Each subtitle row needs a subtitle file before submission.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setUploadProgress(0);
    setUploadLabel('Preparing upload...');

    try {
      const uploadQueue: UploadJob[] = [
        {
          id: 'video',
          label: `Uploading video: ${videoFile.name}`,
          file: videoFile,
          kind: 'video'
        }
      ];

      if (posterFile) {
        uploadQueue.push({
          id: 'poster',
          label: `Uploading poster: ${posterFile.name}`,
          file: posterFile,
          kind: 'poster'
        });
      }

      subtitleTracks.forEach((track, index) => {
        uploadQueue.push({
          id: track.id,
          label: `Uploading subtitle ${index + 1}: ${track.file?.name ?? track.label}`,
          file: track.file as File,
          kind: 'subtitle',
          subtitleMeta: {
            label: track.label.trim() || getLanguageLabel(track.languageCode),
            languageCode: track.languageCode,
            kind: track.kind,
            isDefault: track.isDefault || (index === 0 && !subtitleTracks.some((item) => item.isDefault))
          }
        });
      });

      const totalBytes = uploadQueue.reduce((sum, item) => sum + item.file.size, 0);
      let completedBytes = 0;
      let r2Key: string | null = null;
      let posterKey: string | null = null;
      const subtitlePayload: Array<{
        label: string;
        languageCode: string;
        kind: SubtitleKindValue;
        isDefault: boolean;
        fileKey: string;
      }> = [];

      for (const item of uploadQueue) {
        setUploadLabel(item.label);
        const fileKey = await uploadAsset(item.file, (loaded, total) => {
          const safeTotal = total || item.file.size || 1;
          const overallLoaded = completedBytes + Math.min(loaded, safeTotal);
          setUploadProgress(Math.min(99, Math.round((overallLoaded / Math.max(totalBytes, 1)) * 100)));
        });

        completedBytes += item.file.size;

        if (item.kind === 'video') {
          r2Key = fileKey;
        } else if (item.kind === 'poster') {
          posterKey = fileKey;
        } else if (item.subtitleMeta) {
          subtitlePayload.push({
            ...item.subtitleMeta,
            fileKey
          });
        }
      }

      setUploadLabel('Finalizing release...');
      setUploadProgress(100);

      const create = await fetch('/api/studio/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          r2Key,
          posterKey
        })
      });

      const data = await create.json().catch(() => ({}));
      if (!create.ok) {
        throw new Error(data.error || 'Unable to save release');
      }
      if (!data.videoId) {
        throw new Error('Release saved, but the contract page could not be opened. Please retry from your library.');
      }

      window.location.href = `/studio/upload?contractVideoId=${encodeURIComponent(data.videoId)}`;
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
          <p className="muted form-section-copy">Enter the details viewers and moderators will see across the catalog, TV page, and review queue.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Movie title</span>
            <input className="input" value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
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
        </div>
        <label className="field">
          <span className="field-label">Synopsis</span>
          <textarea className="input" value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={4} required />
        </label>
        <div className="field-grid field-grid-3">
          <label className="field">
            <span className="field-label">Movie type</span>
            <select className="input" value={form.videoType} onChange={(event) => updateField('videoType', event.target.value)}>
              <option value="FEATURE">Feature film</option>
              <option value="SERIES">Series</option>
              <option value="SHORT">Short film</option>
              <option value="SKIT">Skit</option>
              <option value="DOCUMENTARY">Documentary</option>
              <option value="ADVERT">Advert</option>
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
          <label className="field">
            <span className="field-label">Production year</span>
            <input className="input" type="number" min={1900} max={new Date().getFullYear() + 2} value={form.releaseYear} onChange={(event) => updateField('releaseYear', parseInt(event.target.value || '0', 10))} />
          </label>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Genres</span>
            <input className="input" value={form.genres} onChange={(event) => updateField('genres', event.target.value)} />
            <span className="field-hint">Separate multiple genres with commas.</span>
          </label>
          <label className="field">
            <span className="field-label">Tags</span>
            <input className="input" value={form.tags} onChange={(event) => updateField('tags', event.target.value)} />
            <span className="field-hint">Use short discovery tags like &quot;festival&quot;, &quot;romance&quot;, or &quot;family&quot;.</span>
          </label>
        </div>
      </div>

      <div className="form-section">
        <div>
          <h3 className="form-section-title">Languages and viewer safety</h3>
          <p className="muted form-section-copy">Set the original audio language, any additional spoken languages, subtitle files, and the content advisories viewers should see before they watch.</p>
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
          <div className="field">
            <span className="field-label">Available audio languages</span>
            <div className="action-list">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  className={form.audioLanguages.includes(option.code) ? 'btn btn-primary' : 'btn btn-ghost'}
                  type="button"
                  onClick={() => toggleAudioLanguage(option.code)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="field-hint">Choose every spoken audio language that exists in the uploaded release.</span>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Content advisories</span>
          <div className="action-list">
            {CONTENT_WARNING_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={form.contentWarnings.includes(option.value) ? 'btn btn-primary' : 'btn btn-ghost'}
                type="button"
                onClick={() => toggleContentWarning(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="field-hint">Use these to help households understand whether the title is safe for children or sensitive viewers.</span>
        </div>

        <div className="stack-list">
          <div className="stack-row">
            <div>
              <span className="field-label">Subtitle tracks</span>
              <p className="muted form-section-copy">Upload WebVTT subtitle files for the languages you want viewers to switch to while watching.</p>
            </div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setSubtitleTracks((current) => [
                ...current,
                { ...createSubtitleDraft(form.originalLanguage), isDefault: current.length === 0 }
              ])}
            >
              Add subtitle track
            </button>
          </div>

          {subtitleTracks.length ? (
            subtitleTracks.map((track, index) => (
              <div key={track.id} className="detail-card">
                <div className="field-grid field-grid-3">
                  <label className="field">
                    <span className="field-label">Language</span>
                    <select
                      className="input"
                      value={track.languageCode}
                      onChange={(event) => updateSubtitleTrack(track.id, {
                        languageCode: event.target.value,
                        label: track.label || getLanguageLabel(event.target.value)
                      })}
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Track label</span>
                    <input
                      className="input"
                      value={track.label}
                      onChange={(event) => updateSubtitleTrack(track.id, { label: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Type</span>
                    <select className="input" value={track.kind} onChange={(event) => updateSubtitleTrack(track.id, { kind: event.target.value as SubtitleKindValue })}>
                      {SUBTITLE_KIND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="field-grid field-grid-2">
                  <label className="field">
                    <span className="field-label">Subtitle file</span>
                    <input
                      className="input"
                      type="file"
                      accept=".vtt,text/vtt"
                      onChange={(event) => updateSubtitleTrack(track.id, { file: event.target.files?.[0] ?? null })}
                    />
                    <span className="field-hint">Upload a `.vtt` file for clean in-player subtitle switching.</span>
                  </label>
                  <div className="field">
                    <span className="field-label">Default behavior</span>
                    <div className="action-list">
                      <button className={track.isDefault ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => markDefaultSubtitle(track.id)}>
                        {track.isDefault ? 'Default subtitle' : 'Make default'}
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => removeSubtitleTrack(track.id)}>
                        Remove
                      </button>
                    </div>
                    <span className="field-hint">Track {index + 1} {track.file ? `ready: ${track.file.name}` : 'waiting for file'}.</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="muted form-message">No subtitle tracks added yet. Add them for cross-language accessibility and wider African audiences.</p>
          )}
        </div>
      </div>

      <div className="form-section">
        <div>
          <h3 className="form-section-title">Pricing and timing</h3>
          <p className="muted form-section-copy">These settings drive the purchase label, teaser gate, and runtime display everywhere the title appears.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Price tier</span>
            <select className="input" value={form.priceTier} onChange={(event) => updateField('priceTier', event.target.value)}>
              <option value="SNACK">Snack / NGN 100</option>
              <option value="STANDARD">Standard / NGN 200</option>
              <option value="PREMIERE">Premiere / NGN 500</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Rights tier</span>
            <select className="input" value={form.rightsTier} onChange={(event) => updateField('rightsTier', event.target.value)}>
              <option value="SHARED">Shared rights (60/40)</option>
              <option value="EXCLUSIVE">Exclusive (60/40)</option>
            </select>
          </label>
        </div>
        <div className="field-grid field-grid-3">
          <label className="field">
            <span className="field-label">Teaser seconds</span>
            <input className="input" type="number" min={0} value={form.teaserSec} onChange={(event) => updateField('teaserSec', parseInt(event.target.value || '0', 10))} />
          </label>
          <label className="field">
            <span className="field-label">Duration seconds</span>
            <input className="input" type="number" min={0} value={form.durationSec} onChange={(event) => updateField('durationSec', parseInt(event.target.value || '0', 10))} />
          </label>
          <label className="field">
            <span className="field-label">Highlight timestamps</span>
            <input className="input" value={form.highlightSeconds} onChange={(event) => updateField('highlightSeconds', event.target.value)} />
            <span className="field-hint">Example: 30, 90, 150</span>
          </label>
        </div>
      </div>

      <div className="form-section">
        <div>
          <h3 className="form-section-title">Artwork and media</h3>
          <p className="muted form-section-copy">Poster artwork is used on the homepage, browse grid, admin review, and TV shelf.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Video file</span>
            <input className="input" type="file" accept=".mp4,.webm,video/mp4,video/webm" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} required />
            <span className="field-hint">Upload MP4 or WebM for reliable preview and viewer playback.</span>
          </label>
          <label className="field">
            <span className="field-label">Poster image</span>
            <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)} />
            <span className="field-hint">Recommended aspect ratio: 16:9 or wider for the TV shelf.</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Submitting release...' : 'Upload and continue to contract'}
        </button>
        {message ? <p className="muted form-message">{message}</p> : null}
      </div>
      {(loading || uploadLabel) ? (
        <div className="upload-progress" aria-live="polite">
          <div className="upload-progress-meta">
            <strong>{uploadLabel ?? 'Uploading...'}</strong>
            <span>{uploadProgress}%</span>
          </div>
          <div className="upload-progress-track">
            <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      ) : null}
    </form>
  );
}
