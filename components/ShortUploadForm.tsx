'use client';

import { useState, type FormEvent } from 'react';
import { MAX_MASTER_BYTES, MAX_POSTER_BYTES, MAX_SUBTITLE_BYTES, MAX_TRAILER_BYTES, formatUploadLimit } from '@/lib/upload-limits';

type ShortUploadFormProps = {
  requestHeaders?: Record<string, string>;
};

type ShortUploadRow = {
  id: string;
  title: string;
  masterFile: File | null;
  trailerFile: File | null;
  trailerSubtitleFile: File | null;
  posterFile: File | null;
  subtitleFile: File | null;
  status: 'pending' | 'uploading' | 'done' | 'failed';
  progress: number;
  error: string | null;
};

const MAX_ROWS = 5;
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const SUPPORTED_SUBTITLE_EXTENSIONS = ['.vtt', '.srt'];

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getFileExtension(filename: string) {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

function validateFile(file: File | null, purpose: 'master' | 'trailer' | 'poster' | 'subtitle'): string | null {
  if (!file) {
    return null;
  }

  const ext = getFileExtension(file.name);
  if (purpose === 'master' || purpose === 'trailer') {
    if (!SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) {
      return 'Use MP4 video files.';
    }
    if (purpose === 'master' && file.size > MAX_MASTER_BYTES) {
      return `Master file is too large. Keep it under ${formatUploadLimit(MAX_MASTER_BYTES)}.`;
    }
    if (purpose === 'trailer' && file.size > MAX_TRAILER_BYTES) {
      return `Trailer file is too large. Keep it under ${formatUploadLimit(MAX_TRAILER_BYTES)}.`;
    }
  }

  if (purpose === 'poster') {
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
      return 'Use JPG, PNG, or WEBP images. HEIC photos from phones must be exported as JPG, PNG, or WEBP first.';
    }
    if (file.size > MAX_POSTER_BYTES) {
      return `Poster file is too large. Keep it under ${formatUploadLimit(MAX_POSTER_BYTES)}.`;
    }
  }

  if (purpose === 'subtitle') {
    if (!SUPPORTED_SUBTITLE_EXTENSIONS.includes(ext)) {
      return 'Use VTT or SRT subtitle files.';
    }
    if (file.size > MAX_SUBTITLE_BYTES) {
      return `Subtitle file is too large. Keep it under ${formatUploadLimit(MAX_SUBTITLE_BYTES)}.`;
    }
  }

  return null;
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
    xhr.ontimeout = () => reject(new Error('Storage upload timed out before storage accepted the file.'));
    xhr.onabort = () => reject(new Error('Storage upload was cancelled before it completed.'));
    xhr.send(file);
  });
}

function toStorageUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Upload failed.';
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes('status 413') || normalizedMessage.includes('payload_too_large')) {
    return (
      'Storage upload was rejected because the app host is still handling the file body. Set ACE_UPLOAD_PROXY_BASE_URL to your Bunny upload gateway and retry the upload.'
    );
  }
  if (normalizedMessage.includes('network error') || normalizedMessage.includes('failed to fetch')) {
    return (
      'Storage upload failed before Bunny Storage accepted the file. Check Bunny Storage credentials and try again.'
    );
  }
  return message;
}

export default function ShortUploadForm({ requestHeaders }: ShortUploadFormProps) {
  const [rows, setRows] = useState<ShortUploadRow[]>([
    { id: createId(), title: '', masterFile: null, trailerFile: null, trailerSubtitleFile: null, posterFile: null, subtitleFile: null, status: 'pending', progress: 0, error: null }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  function updateRow(id: string, update: Partial<ShortUploadRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...update } : row)));
  }

  function addRow() {
    setRows((current) => {
      if (current.length >= MAX_ROWS) return current;
      return [
        ...current,
        { id: createId(), title: '', masterFile: null, trailerFile: null, trailerSubtitleFile: null, posterFile: null, subtitleFile: null, status: 'pending', progress: 0, error: null }
      ];
    });
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function prepareUpload(
    file: File,
    purpose: 'master' | 'trailer' | 'poster' | 'subtitle',
    folderId: string,
    onProgress: (loaded: number, total: number) => void
  ) {
    const response = await fetch('/api/uploads/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestHeaders ?? {})
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        purpose,
        folderId,
        fileSize: file.size
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url || !payload.key) {
      throw new Error(payload.error || 'Could not prepare upload.');
    }

    await uploadFileToSignedUrl(payload.url, file, file.type || 'application/octet-stream', onProgress);
    return payload.key as string;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setOverallProgress(0);
    setSubmitting(true);

    const validRows = rows.filter((row) => row.title.trim() || row.masterFile || row.trailerFile || row.posterFile || row.subtitleFile || row.trailerSubtitleFile);
    if (!validRows.length) {
      setMessage('Add at least one item with a title and a master or trailer file.');
      setSubmitting(false);
      return;
    }

    const rowTotals = new Map<string, number>();
    const rowUploadedBytes = new Map<string, number>();
    const totalBytes = validRows.reduce((sum, row) => {
      const rowBytes = [row.masterFile, row.trailerFile, row.posterFile, row.subtitleFile, row.trailerSubtitleFile]
        .filter(Boolean)
        .reduce((acc, file) => acc + (file?.size ?? 0), 0);
      rowTotals.set(row.id, rowBytes);
      rowUploadedBytes.set(row.id, 0);
      return sum + rowBytes;
    }, 0);

    const preparedItems = [] as Array<{
      title: string;
      masterUploadKey?: string;
      trailerKey?: string;
      posterKey?: string;
      subtitleTracks?: Array<{ fileKey: string; label: string; languageCode: string; kind: string; isDefault: boolean }>;
    }>;

    try {
      let overallUploadedBytes = 0;

      function createProgressCallback(rowId: string) {
        let previousLoaded = 0;
        return (loaded: number, total: number) => {
          const delta = loaded - previousLoaded;
          previousLoaded = loaded;
          overallUploadedBytes += delta;
          const rowPrevious = rowUploadedBytes.get(rowId) ?? 0;
          const rowCurrent = rowPrevious + delta;
          rowUploadedBytes.set(rowId, rowCurrent);

          const rowTotal = rowTotals.get(rowId) ?? 0;
          const rowPercent = rowTotal > 0 ? Math.round((rowCurrent / rowTotal) * 100) : 100;
          const overallPercent = totalBytes > 0 ? Math.min(100, Math.round((overallUploadedBytes / totalBytes) * 100)) : 100;

          setRows((current) => current.map((item) => (item.id === rowId ? { ...item, progress: rowPercent } : item)));
          setOverallProgress(overallPercent);
        };
      }

      for (const row of validRows) {
        const title = row.title.trim() || 'Untitled';

        if (!row.masterFile && !row.trailerFile) {
          throw new Error('Each item requires a master or trailer file.');
        }

        const rowErrors = [
          validateFile(row.masterFile, 'master'),
          validateFile(row.trailerFile, 'trailer'),
          validateFile(row.posterFile, 'poster'),
          validateFile(row.subtitleFile, 'subtitle'),
          validateFile(row.trailerSubtitleFile, 'subtitle')
        ].filter(Boolean) as string[];

        if (rowErrors.length) {
          throw new Error(rowErrors[0]);
        }

        setRows((current) =>
          current.map((item) => (item.id === row.id ? { ...item, status: 'uploading', progress: 0, error: null } : item))
        );

        const subtitleTracks: Array<{ fileKey: string; label: string; languageCode: string; kind: string; isDefault: boolean }> = [];
        let masterUploadKey: string | undefined;
        let trailerKey: string | undefined;
        let posterKey: string | undefined;

        if (row.masterFile) {
          masterUploadKey = await prepareUpload(row.masterFile, 'master', row.id, createProgressCallback(row.id));
        }

        if (row.trailerFile) {
          trailerKey = await prepareUpload(row.trailerFile, 'trailer', row.id, createProgressCallback(row.id));
        }

        if (row.posterFile) {
          posterKey = await prepareUpload(row.posterFile, 'poster', row.id, createProgressCallback(row.id));
        }

        if (row.subtitleFile) {
          const key = await prepareUpload(row.subtitleFile, 'subtitle', row.id, createProgressCallback(row.id));
          subtitleTracks.push({
            fileKey: key,
            label: row.subtitleFile.name || 'Subtitles',
            languageCode: 'en',
            kind: 'subtitles',
            isDefault: true
          });
        }

        if (row.trailerSubtitleFile) {
          const key = await prepareUpload(row.trailerSubtitleFile, 'subtitle', row.id, createProgressCallback(row.id));
          subtitleTracks.push({
            fileKey: key,
            label: 'Trailer subtitles',
            languageCode: 'en',
            kind: 'subtitles',
            isDefault: subtitleTracks.length === 0
          });
        }

        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? { ...item, status: 'done', progress: 100, error: null } : item
          )
        );

        preparedItems.push({
          title,
          ...(masterUploadKey ? { masterUploadKey } : {}),
          ...(trailerKey ? { trailerKey } : {}),
          ...(posterKey ? { posterKey } : {}),
          ...(subtitleTracks.length ? { subtitleTracks } : {})
        });
      }

      const saveResponse = await fetch('/api/studio/short-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requestHeaders ?? {})
        },
        body: JSON.stringify({ items: preparedItems })
      });

      const savePayload = await saveResponse.json().catch(() => ({}));
      if (!saveResponse.ok) {
        throw new Error(savePayload.error || 'Unable to complete upload.');
      }

      setMessage('Upload completed successfully.');
      setRows([
        { id: createId(), title: '', masterFile: null, trailerFile: null, trailerSubtitleFile: null, posterFile: null, subtitleFile: null, status: 'pending', progress: 0, error: null }
      ]);
    } catch (error) {
      setMessage(toStorageUploadError(error));
      if (error instanceof Error && error.message) {
        setRows((current) => current.map((row) => (row.status === 'uploading' ? { ...row, status: 'failed' } : row)));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack-list">
      <div className="detail-card">
        <h2>Upload</h2>
        <p className="muted">
          Upload up to {MAX_ROWS} titles with only a title, video and optional poster/subtitle files.
        </p>
      </div>

      {submitting ? (
        <div className="upload-progress">
          <div className="upload-progress-meta">
            <div>Upload progress</div>
            <strong>{overallProgress}%</strong>
          </div>
          <div className="upload-progress-track" aria-hidden="true">
            <span className="upload-progress-fill" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
      ) : null}

      {rows.map((row, index) => (
        <div key={row.id} className="card">
          <div className="stack-list">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={row.title}
                onChange={(event) => updateRow(row.id, { title: event.target.value })}
                placeholder="Title"
              />
            </div>

            <div>
              <label className="label">Final playable MP4 master</label>
              <input
                type="file"
                accept=".mp4,video/mp4"
                className="input"
                onChange={(event) => updateRow(row.id, { masterFile: event.target.files?.[0] ?? null })}
              />
            </div>

            <div>
              <label className="label">Subtitle file</label>
              <input
                type="file"
                accept=".vtt,.srt"
                className="input"
                onChange={(event) => updateRow(row.id, { subtitleFile: event.target.files?.[0] ?? null })}
              />
            </div>

            <div>
              <label className="label">Poster image</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="input"
                onChange={(event) => updateRow(row.id, { posterFile: event.target.files?.[0] ?? null })}
              />
            </div>

            <div>
              <label className="label">Trailer</label>
              <input
                type="file"
                accept=".mp4"
                className="input"
                onChange={(event) => updateRow(row.id, { trailerFile: event.target.files?.[0] ?? null })}
              />
            </div>

            <div>
              <label className="label">Trailer subtitle file (optional)</label>
              <input
                type="file"
                accept=".vtt,.srt"
                className="input"
                onChange={(event) => updateRow(row.id, { trailerSubtitleFile: event.target.files?.[0] ?? null })}
              />
            </div>

            {submitting ? (
              <div className="upload-progress">
                <div className="upload-progress-meta">
                  <div>
                    {row.status === 'uploading'
                      ? 'Uploading item…'
                      : row.status === 'done'
                      ? 'Uploaded'
                      : row.status === 'failed'
                      ? 'Failed'
                      : 'Ready'}
                  </div>
                  <strong>{row.progress}%</strong>
                </div>
                <div className="upload-progress-track" aria-hidden="true">
                  <span className="upload-progress-fill" style={{ width: `${row.progress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="action-list">
              {rows.length > 1 ? (
                <button type="button" className="btn btn-ghost" onClick={() => removeRow(row.id)}>
                  Remove item
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ))}

      <div className="action-list">
        <button type="button" className="btn btn-secondary" onClick={addRow} disabled={rows.length >= MAX_ROWS || submitting}>
          Add another item
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Uploading…' : 'Submit upload'}
        </button>
      </div>

      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
