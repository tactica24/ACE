'use client';

import { useMemo, useState } from 'react';
import { uploadFileToBunnyTus } from '@/lib/client-bunny-stream-upload';
import { uploadPreparedStorageAsset } from '@/lib/client-storage-upload';
import {
  PRIMARY_CATEGORY_OPTIONS,
  SECONDARY_GENRE_OPTIONS,
  normalizeSelectedGenres,
  toggleGenreSelection
} from '@/lib/video-taxonomy';

type ProducerOption = {
  id: string;
  email: string;
  displayName: string;
  creatorNumber?: string | null;
  verified?: boolean;
};

type SubtitleDraft = {
  id: string;
  label: string;
  languageCode: string;
  kind: string;
  file: File | null;
  isDefault: boolean;
};

type UploadRetryState = {
  videoId: string;
  producerId: string;
  title: string;
  posterKey: string | null;
  posterSignature: string | null;
};

function createSubtitleDraft() {
  return {
    id: crypto.randomUUID(),
    label: 'English',
    languageCode: 'en',
    kind: 'subtitles',
    file: null,
    isDefault: false
  } satisfies SubtitleDraft;
}

async function prepareStorageUpload(file: File, purpose: 'poster' | 'subtitle', folderId: string) {
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

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Unable to prepare ${purpose} upload.`);
  }

  return payload;
}

async function prepareStreamUpload(
  videoId: string,
  assetType: 'movie' | 'trailer',
  input: { file?: File | null }
) {
  const file = input.file ?? null;
  const response = await fetch('/api/admin/bunny-intake/stream-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId,
      assetType,
      filename: file?.name ?? null,
      fileSize: file?.size ?? null
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Unable to prepare ${assetType} upload.`);
  }

  return payload;
}

function normalizeTitleKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getFileSignature(file: File | null) {
  if (!file) return null;
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function AdminUploadWorkspace({
  producers,
  initialProducerId
}: {
  producers: ProducerOption[];
  initialProducerId?: string | null;
}) {
  const safeInitialProducerId =
    initialProducerId && producers.some((producer) => producer.id === initialProducerId)
      ? initialProducerId
      : producers[0]?.id ?? '';

  const [selectedProducerId, setSelectedProducerId] = useState(safeInitialProducerId);
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [category, setCategory] = useState('General');
  const [genres, setGenres] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [movieFile, setMovieFile] = useState<File | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleDraft[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [createdVideoId, setCreatedVideoId] = useState<string | null>(null);
  const [uploadRetryState, setUploadRetryState] = useState<UploadRetryState | null>(null);

  const selectedProducer = useMemo(
    () => producers.find((producer) => producer.id === selectedProducerId) ?? null,
    [producers, selectedProducerId]
  );
  const currentTitleKey = normalizeTitleKey(title);
  const canReuseCreatedVideo =
    Boolean(uploadRetryState) &&
    uploadRetryState?.producerId === selectedProducerId &&
    uploadRetryState?.title === currentTitleKey;

  if (!producers.length) {
    return (
      <div className="card">
        <h3>No producer account is ready for admin upload</h3>
        <p className="muted">
          Create or complete a producer account first so uploaded movies can be attached to the correct rights holder and show up properly in reports.
        </p>
        <div className="action-list">
          <a className="btn btn-primary" href="#create-producer">Create approved producer</a>
        </div>
      </div>
    );
  }

  const setAssetProgress = (asset: string, loaded: number, total: number) => {
    setProgress((current) => ({
      ...current,
      [asset]: total > 0 ? Math.round((loaded / total) * 100) : 0
    }));
  };

  const addSubtitleTrack = () => {
    setSubtitleTracks((current) => [
      ...current,
      {
        ...createSubtitleDraft(),
        isDefault: current.length === 0
      }
    ]);
  };

  const resetForm = () => {
    setTitle('');
    setReleaseYear('');
    setSynopsis('');
    setCategory('General');
    setGenres([]);
    setTags('');
    setPosterFile(null);
    setTrailerFile(null);
    setMovieFile(null);
    setSubtitleTracks([]);
    setProgress({});
  };

  const handleSubmit = async () => {
    if (!selectedProducerId || !title.trim() || !synopsis.trim() || !movieFile) {
      setError('Producer, title, synopsis, and a movie file are required.');
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(canReuseCreatedVideo ? 'Retrying upload for the existing movie record...' : 'Creating movie record...');

    try {
      let videoId = uploadRetryState?.videoId ?? '';

      if (!canReuseCreatedVideo) {
        const createResponse = await fetch('/api/admin/bunny-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            producerId: selectedProducerId,
            existingVideoId: uploadRetryState?.producerId === selectedProducerId ? uploadRetryState?.videoId ?? null : null,
            title: title.trim(),
            description: synopsis.trim(),
            releaseYear: releaseYear ? Number(releaseYear) : null,
            category: category.trim() || 'General',
            genres: normalizeSelectedGenres(genres),
            tags: tags.split(',').map((value) => value.trim()).filter(Boolean)
          })
        });

        const createdPayload = await createResponse.json().catch(() => ({}));
        if (!createResponse.ok || !createdPayload.video?.id) {
          throw new Error(createdPayload.error ?? 'Unable to create the movie record.');
        }

        videoId = createdPayload.video.id as string;
      }

      setCreatedVideoId(videoId);
      setUploadRetryState((current) => ({
        videoId,
        producerId: selectedProducerId,
        title: currentTitleKey,
        posterKey: current?.videoId === videoId ? current.posterKey : null,
        posterSignature: current?.videoId === videoId ? current.posterSignature : null
      }));

      let storedPosterKey: string | null =
        canReuseCreatedVideo && uploadRetryState?.posterSignature === getFileSignature(posterFile)
          ? uploadRetryState.posterKey
          : null;

      if (posterFile) {
        if (storedPosterKey) {
          setAssetProgress('poster', 100, 100);
        } else {
          setStatus('Uploading poster to Bunny Storage...');
          const upload = await prepareStorageUpload(posterFile, 'poster', videoId);
          storedPosterKey = await uploadPreparedStorageAsset(upload, posterFile, (loaded, total) => {
            setAssetProgress('poster', loaded, total);
          });
          setUploadRetryState((current) =>
            current && current.videoId === videoId
              ? {
                  ...current,
                  posterKey: storedPosterKey,
                  posterSignature: getFileSignature(posterFile)
                }
              : current
          );
        }
      }

      const uploadedSubtitleTracks: Array<{
        label: string;
        languageCode: string;
        kind: string;
        fileKey: string;
        isDefault: boolean;
      }> = [];

      for (const track of subtitleTracks) {
        if (!track.file) continue;
        setStatus(`Uploading subtitle: ${track.label}...`);
        const upload = await prepareStorageUpload(track.file, 'subtitle', videoId);
        const fileKey = await uploadPreparedStorageAsset(upload, track.file, (loaded, total) => {
          setAssetProgress(`subtitle:${track.id}`, loaded, total);
        });
        uploadedSubtitleTracks.push({
          label: track.label.trim() || 'Subtitle',
          languageCode: track.languageCode.trim() || 'und',
          kind: track.kind.trim() || 'subtitles',
          fileKey,
          isDefault: track.isDefault
        });
      }

      if (trailerFile) {
        setStatus('Uploading trailer to Bunny Stream...');
        const prepared = await prepareStreamUpload(videoId, 'trailer', { file: trailerFile });
        await uploadFileToBunnyTus(prepared.upload, trailerFile, (loaded, total) => {
          setAssetProgress('trailer', loaded, total);
        });
      }

      setStatus('Uploading full movie to Bunny Stream...');
      const preparedMovie = await prepareStreamUpload(videoId, 'movie', { file: movieFile });
      await uploadFileToBunnyTus(preparedMovie.upload, movieFile, (loaded, total) => {
        setAssetProgress('movie', loaded, total);
      });

      setStatus('Saving poster and subtitle details...');
      const assetsResponse = await fetch('/api/admin/bunny-intake/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          posterKey: storedPosterKey,
          subtitleTracks: uploadedSubtitleTracks
        })
      });
      const assetsPayload = await assetsResponse.json().catch(() => ({}));
      if (!assetsResponse.ok) {
        throw new Error(assetsPayload.error ?? 'Uploaded files saved, but asset details could not be attached.');
      }

      setStatus('Upload complete. Bunny Stream is now processing the movie and trailer.');
      resetForm();
      setUploadRetryState(null);
      setCreatedVideoId(videoId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Upload failed.');
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack-list">
      <div className="card">
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Producer account</span>
            <select
              className="input"
              value={selectedProducerId}
              onChange={(event) => setSelectedProducerId(event.target.value)}
              disabled={busy}
            >
              {producers.map((producer) => (
                <option key={producer.id} value={producer.id}>
                  {producer.displayName} | {producer.email}
                </option>
              ))}
            </select>
          </label>
          <div className="detail-card">
            <span className="detail-label">Selected producer</span>
            <strong>{selectedProducer?.displayName ?? 'Not selected'}</strong>
            <span className="muted">
              {selectedProducer?.creatorNumber ?? 'No producer number yet'}
              {selectedProducer?.verified ? ' | verified' : ''}
            </span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Delivery path</span>
            <strong>Bunny-first intake</strong>
            <span className="muted">Poster and SRT files go to Bunny Storage. Trailer and movie go directly to Bunny Stream.</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Latest created title</span>
            <strong>{createdVideoId ?? 'Nothing created yet'}</strong>
            <span className="muted">
              {canReuseCreatedVideo
                ? 'Retry will continue using this draft title instead of creating a duplicate.'
                : 'A failed upload can retry against the same draft title.'}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Title</span>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} />
          </label>
          <label className="field">
            <span className="field-label">Year of production</span>
            <input className="input" value={releaseYear} onChange={(event) => setReleaseYear(event.target.value)} disabled={busy} inputMode="numeric" />
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span className="field-label">Synopsis</span>
            <textarea className="input" rows={5} value={synopsis} onChange={(event) => setSynopsis(event.target.value)} disabled={busy} />
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <select className="input" value={category} onChange={(event) => setCategory(event.target.value)} disabled={busy}>
              {PRIMARY_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span className="field-label">Tags</span>
            <input className="input" value={tags} onChange={(event) => setTags(event.target.value)} disabled={busy} placeholder="festival, exclusive, 2026" />
          </label>
        </div>
        <div style={{ marginTop: 16 }}>
          <span className="field-label">Genres</span>
          <p className="muted" style={{ margin: '6px 0 10px' }}>
            Choose up to 3 genres so the title can sit naturally across discovery rails.
          </p>
          <div className="action-list" style={{ gap: 8, flexWrap: 'wrap' }}>
            {SECONDARY_GENRE_OPTIONS.map((option) => {
              const selected = genres.includes(option);
              const disabled = busy || (!selected && genres.length >= 3);
              return (
                <button
                  key={option}
                  className="btn btn-ghost"
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setGenres((current) => normalizeSelectedGenres(toggleGenreSelection(current, option)))
                  }
                  style={{
                    borderColor: selected ? '#2563eb' : undefined,
                    backgroundColor: selected ? '#dbeafe' : undefined,
                    color: selected ? '#1d4ed8' : undefined
                  }}
                >
                  {selected ? `Selected: ${option}` : option}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Poster artwork</span>
            <input className="input" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)} />
          </label>
          <label className="field">
            <span className="field-label">Trailer video</span>
            <input className="input" type="file" accept="video/*,.mp4,.mov,.m4v" disabled={busy} onChange={(event) => setTrailerFile(event.target.files?.[0] ?? null)} />
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span className="field-label">Full movie file</span>
            <input className="input" type="file" accept="video/*,.mp4,.mov,.m4v" disabled={busy} onChange={(event) => setMovieFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>

      <div className="card">
        <div className="stack-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="field-label">Subtitles (.srt / .vtt)</span>
            <p className="muted" style={{ margin: '6px 0 0' }}>Upload subtitles to Bunny Storage and mark one as the default track.</p>
          </div>
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={addSubtitleTrack}>
            Add subtitle
          </button>
        </div>

        <div className="stack-list" style={{ marginTop: 16 }}>
          {subtitleTracks.map((track) => (
            <div key={track.id} className="detail-card">
              <div className="field-grid field-grid-2">
                <label className="field">
                  <span className="field-label">Label</span>
                  <input
                    className="input"
                    value={track.label}
                    disabled={busy}
                    onChange={(event) =>
                      setSubtitleTracks((current) =>
                        current.map((item) => (item.id === track.id ? { ...item, label: event.target.value } : item))
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span className="field-label">Language code</span>
                  <input
                    className="input"
                    value={track.languageCode}
                    disabled={busy}
                    onChange={(event) =>
                      setSubtitleTracks((current) =>
                        current.map((item) => (item.id === track.id ? { ...item, languageCode: event.target.value } : item))
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span className="field-label">Kind</span>
                  <input
                    className="input"
                    value={track.kind}
                    disabled={busy}
                    onChange={(event) =>
                      setSubtitleTracks((current) =>
                        current.map((item) => (item.id === track.id ? { ...item, kind: event.target.value } : item))
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span className="field-label">Subtitle file</span>
                  <input
                    className="input"
                    type="file"
                    accept=".srt,.vtt,text/plain,text/vtt,application/x-subrip"
                    disabled={busy}
                    onChange={(event) =>
                      setSubtitleTracks((current) =>
                        current.map((item) => (item.id === track.id ? { ...item, file: event.target.files?.[0] ?? null } : item))
                      )
                    }
                  />
                </label>
              </div>

              <div className="action-list" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setSubtitleTracks((current) =>
                      current.map((item) => ({ ...item, isDefault: item.id === track.id }))
                    )
                  }
                >
                  {track.isDefault ? 'Default track' : 'Make default'}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => setSubtitleTracks((current) => current.filter((item) => item.id !== track.id))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!subtitleTracks.length ? <p className="muted" style={{ margin: 0 }}>No subtitle tracks added yet.</p> : null}
        </div>
      </div>

      <div className="card">
        <div className="action-list">
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? 'Uploading...' : 'Create title and upload assets'}
          </button>
        </div>

        {status ? <p className="muted" style={{ marginTop: 12 }}>{status}</p> : null}
        {error ? <p style={{ marginTop: 12, color: '#dc2626' }}>{error}</p> : null}

        {Object.keys(progress).length ? (
          <div className="detail-grid" style={{ marginTop: 16 }}>
            {Object.entries(progress).map(([asset, value]) => (
              <div key={asset} className="detail-card">
                <span className="detail-label">{asset}</span>
                <strong>{value}%</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
