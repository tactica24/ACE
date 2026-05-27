'use client';

import { useMemo, useState } from 'react';
import { buildFfmpegCommand } from '@/lib/video-processing';
import { MAX_MASTER_BYTES, MULTIPART_CHUNK_BYTES, SINGLE_PUT_SAFE_BYTES, formatUploadLimit } from '@/lib/upload-limits';

type ProcessingVideo = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  masterKey: string | null;
  masterFileName: string | null;
  masterFileSize: number | null;
  masterUploadedAt: string | null;
  processingStatus: string;
  playbackUrl: string | null;
  qualities: string[];
  trailerDownloadHref: string | null;
  posterDownloadHref: string | null;
};

type ProcessingProducer = {
  id: string;
  profileId: string;
  name: string;
  email: string;
  creatorNumber: string;
  videos: ProcessingVideo[];
};

type ProducerBucket = 'needs-master' | 'uploaded' | 'processed';
type UploadStatus = {
  phase: 'uploading' | 'done' | 'error';
  progress: number;
  message: string;
};

const BUCKETS: Array<{ id: ProducerBucket; label: string; description: string }> = [
  { id: 'uploaded', label: 'Uploaded MP4s', description: 'Validate the MP4 and mark it ready for playback.' },
  { id: 'processed', label: 'Ready / published', description: 'Titles with validated MP4 playback.' },
  { id: 'needs-master', label: 'Needs MP4', description: 'Movie record exists, but the playable MP4 is missing.' }
];

function formatBytes(value: number | null) {
  if (!value) return 'No file';
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : 'Not uploaded';
}

function isSupportedMasterFile(file: File) {
  return /\.mp4$/i.test(file.name) && (!file.type || ['video/mp4', 'application/octet-stream'].includes(file.type));
}

function toStorageUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to upload MP4.';
  if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('network')) {
    return (
      'Storage upload failed before R2 accepted the file. This usually means the R2 bucket CORS does not allow this website origin. ' +
      'Allow both https://www.acestudio.ng and https://acestudio.ng on the upload bucket, then try again.'
    );
  }
  return message;
}

async function uploadBlobToSignedUrl(url: string, blob: Blob): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { method: 'PUT', body: blob });
  } catch (error) {
    throw new Error(toStorageUploadError(error));
  }
  if (!response.ok) {
    throw new Error(`MP4 upload failed with status ${response.status}.`);
  }

  const etag = response.headers.get('ETag');
  if (!etag) {
    throw new Error('MP4 upload completed but R2 did not return a part ETag.');
  }

  return etag;
}

async function uploadMasterToStorage(file: File) {
  if (!isSupportedMasterFile(file)) {
    throw new Error('Upload a playable MP4 master file.');
  }

  if (file.size > MAX_MASTER_BYTES) {
    throw new Error(`MP4 file is too large. Keep it under ${formatUploadLimit(MAX_MASTER_BYTES)}.`);
  }

  if (file.size <= SINGLE_PUT_SAFE_BYTES) {
    const presign = await fetch('/api/studio/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        purpose: 'master'
      })
    });
    const presignPayload = await presign.json().catch(() => ({}));
    if (!presign.ok || !presignPayload.url || !presignPayload.key) {
      throw new Error(presignPayload.error ?? 'Unable to prepare MP4 upload.');
    }

    let upload: Response;
    try {
      upload = await fetch(presignPayload.url as string, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
    } catch (error) {
      throw new Error(toStorageUploadError(error));
    }
    if (!upload.ok) throw new Error(`MP4 upload failed with status ${upload.status}.`);

    return presignPayload.key as string;
  }

  const headers = { 'Content-Type': 'application/json' };
  const initiate = await fetch('/api/studio/multipart-upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'initiate',
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      purpose: 'master'
    })
  });
  const session = await initiate.json().catch(() => ({}));
  if (!initiate.ok || !session.key || !session.uploadId) {
    throw new Error(session.error ?? 'Unable to start large MP4 upload.');
  }

  const key = session.key as string;
  const uploadId = session.uploadId as string;
  const parts: Array<{ ETag: string; PartNumber: number }> = [];

  try {
    const totalParts = Math.ceil(file.size / MULTIPART_CHUNK_BYTES);
    for (let index = 0; index < totalParts; index += 1) {
      const partNumber = index + 1;
      const start = index * MULTIPART_CHUNK_BYTES;
      const blob = file.slice(start, Math.min(file.size, start + MULTIPART_CHUNK_BYTES));
      const partResponse = await fetch('/api/studio/multipart-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'part', key, uploadId, purpose: 'master', partNumber })
      });
      const partPayload = await partResponse.json().catch(() => ({}));
      if (!partResponse.ok || !partPayload.url) {
        throw new Error(partPayload.error ?? `Unable to prepare upload part ${partNumber}.`);
      }

      const ETag = await uploadBlobToSignedUrl(partPayload.url as string, blob);
      parts.push({ ETag, PartNumber: partNumber });
    }

    const complete = await fetch('/api/studio/multipart-upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'complete', key, uploadId, purpose: 'master', parts })
    });
    const completePayload = await complete.json().catch(() => ({}));
    if (!complete.ok) {
      throw new Error(completePayload.error ?? 'Unable to finalize large MP4 upload.');
    }

    return key;
  } catch (error) {
    await fetch('/api/studio/multipart-upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'abort', key, uploadId, purpose: 'master' })
    }).catch(() => null);
    throw error;
  }
}

function getBucket(video: ProcessingVideo): ProducerBucket {
  if (video.processingStatus === 'READY_TO_STREAM' || ['READY', 'PUBLISHED', 'APPROVED'].includes(video.status)) {
    return 'processed';
  }
  if (video.masterKey) {
    return 'uploaded';
  }
  return 'needs-master';
}

function getBucketTone(bucket: ProducerBucket) {
  if (bucket === 'processed') return 'status-live';
  if (bucket === 'uploaded') return 'status-warn';
  return 'status-review';
}

export default function AdminVideoProcessingPanel({ initialProducers }: { initialProducers: ProcessingProducer[] }) {
  const [producers, setProducers] = useState(initialProducers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<ProducerBucket | null>(null);

  const sortedProducers = useMemo(
    () => [...producers].sort((a, b) => b.videos.length - a.videos.length || a.name.localeCompare(b.name)),
    [producers]
  );

  const selectedProducer = sortedProducers.find((producer) => producer.id === selectedProducerId) ?? null;
  const producerVideos = selectedProducer?.videos ?? [];
  const visibleVideos = selectedBucket ? producerVideos.filter((video) => getBucket(video) === selectedBucket) : [];

  async function refreshVideo(videoId: string, payload: Record<string, unknown>) {
    setProducers((current) =>
      current.map((producer) => ({
        ...producer,
        videos: producer.videos.map((video) => (video.id === videoId ? ({ ...video, ...payload } as ProcessingVideo) : video))
      }))
    );
  }

  async function updateStatus(videoId: string, action: string) {
    setPendingId(videoId);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/videos/processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to update processing status.');
      await refreshVideo(videoId, payload.video);
      setMessage(payload.message ?? 'Processing status updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update processing status.');
    } finally {
      setPendingId(null);
    }
  }

  async function uploadMaster(videoId: string, file: File) {
    setPendingId(videoId);
    setMessage(null);
    setUploadStatuses((current) => ({
      ...current,
      [videoId]: { phase: 'uploading', progress: 0, message: 'Uploading MP4 to R2...' }
    }));
    try {
      const key = await uploadMasterToStorage(file);

      const save = await fetch('/api/admin/videos/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, key, fileName: file.name, fileSize: file.size })
      });
      const savePayload = await save.json().catch(() => ({}));
      if (!save.ok) throw new Error(savePayload.error ?? 'Unable to save MP4 details.');
      await refreshVideo(videoId, savePayload.video);
      setUploadStatuses((current) => ({
        ...current,
        [videoId]: { phase: 'done', progress: 100, message: 'MP4 uploaded and attached.' }
      }));
      setMessage('MP4 uploaded and attached.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to upload MP4.';
      setUploadStatuses((current) => ({
        ...current,
        [videoId]: { phase: 'error', progress: current[videoId]?.progress ?? 0, message: errorMessage }
      }));
      setMessage(errorMessage);
    } finally {
      setPendingId(null);
    }
  }

  async function deleteMaster(videoId: string) {
    setPendingId(videoId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/videos/${videoId}/master`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to delete MP4.');
      await refreshVideo(videoId, payload.video);
      setMessage('MP4 master deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete MP4.');
    } finally {
      setPendingId(null);
    }
  }

  async function completeProcessing(videoId: string) {
    setPendingId(videoId);
    setMessage('Validating MP4 playback...');
    try {
      const response = await fetch('/api/admin/videos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: videoId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to validate MP4.');
      await refreshVideo(videoId, payload.video);
      setMessage(payload.passed ? 'MP4 validated. Movie moved to ready.' : `Validation failed: ${payload.errors.join(', ')}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to validate MP4.');
    } finally {
      setPendingId(null);
    }
  }

  async function publish(videoId: string) {
    await updateStatus(videoId, 'PUBLISH');
  }

  if (!selectedProducer) {
    return (
      <div className="stack-list">
        {message ? <div className="card">{message}</div> : null}
        <div className="admin-producer-list">
          <div className="admin-producer-list-head">
            <span>Producer</span>
            <span>Pipeline</span>
            <span>Open</span>
          </div>
          {sortedProducers.map((producer) => {
            const counts = BUCKETS.reduce(
              (total, bucket) => ({ ...total, [bucket.id]: producer.videos.filter((video) => getBucket(video) === bucket.id).length }),
              {} as Record<ProducerBucket, number>
            );
            const nextAction = counts.uploaded > 0
              ? 'Validate MP4'
              : counts.processed > 0
                ? 'Processed'
                : producer.videos.length > 0
                  ? 'Needs MP4'
                  : 'Awaiting uploads';

            return (
              <button key={producer.id} className="admin-producer-row" type="button" onClick={() => setSelectedProducerId(producer.id)}>
                <span className="admin-producer-identity">
                  <strong>{producer.name}</strong>
                  <span>{producer.creatorNumber} - {producer.email}</span>
                </span>
                <span className="admin-producer-metrics">
                  <span><strong>{producer.videos.length}</strong> titles</span>
                  <span><strong>{counts.uploaded}</strong> MP4s</span>
                  <span><strong>{counts.processed}</strong> ready</span>
                </span>
                <div className="admin-producer-action">
                  <span className={`status-chip ${producer.videos.length ? 'status-review' : 'status-warn'}`}>{nextAction}</span>
                </div>
              </button>
            );
          })}
        </div>
        {!sortedProducers.length ? <div className="card">No producers with producer IDs yet.</div> : null}
      </div>
    );
  }

  if (!selectedBucket) {
    return (
      <div className="stack-list">
        <div className="stack-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="pill">{selectedProducer.creatorNumber}</span>
            <h2 style={{ margin: '8px 0 0' }}>{selectedProducer.name}</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>{selectedProducer.email}</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => setSelectedProducerId(null)}>All producers</button>
        </div>
        <div className="detail-grid">
          {BUCKETS.map((bucket) => {
            const count = producerVideos.filter((video) => getBucket(video) === bucket.id).length;
            return (
              <button key={bucket.id} className="detail-card" type="button" style={{ textAlign: 'left' }} onClick={() => setSelectedBucket(bucket.id)}>
                <span className={`status-chip ${getBucketTone(bucket.id)}`}>{bucket.label}</span>
                <strong style={{ display: 'block', marginTop: 12 }}>{count} title{count === 1 ? '' : 's'}</strong>
                <p className="muted" style={{ marginBottom: 0 }}>{bucket.description}</p>
              </button>
            );
          })}
        </div>
        {!producerVideos.length ? (
          <div className="card">This producer has an ID and can upload, but no movie has been submitted yet.</div>
        ) : null}
      </div>
    );
  }

  const selectedBucketLabel = BUCKETS.find((bucket) => bucket.id === selectedBucket)?.label ?? 'Movies';

  return (
    <div className="stack-list">
      {message ? <div className="card">{message}</div> : null}
      <div className="stack-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className="pill">{selectedProducer.name}</span>
          <h2 style={{ margin: '8px 0 0' }}>{selectedBucketLabel}</h2>
        </div>
        <div className="action-list" style={{ margin: 0 }}>
          <button className="btn btn-ghost" type="button" onClick={() => setSelectedBucket(null)}>Producer buckets</button>
          <button className="btn btn-ghost" type="button" onClick={() => { setSelectedBucket(null); setSelectedProducerId(null); }}>All producers</button>
        </div>
      </div>

      {visibleVideos.map((video) => {
        const busy = pendingId === video.id;
        const uploadStatus = uploadStatuses[video.id];
        const command = buildFfmpegCommand(video.id, video.masterFileName ?? 'downloaded-master.mp4');
        const canPublish = video.status === 'READY';

        return (
          <div key={video.id} className="card">
            <div className="stack-row" style={{ alignItems: 'flex-start' }}>
              <div>
                <span className={`status-chip ${getBucketTone(getBucket(video))}`}>{getBucket(video).replace('-', ' ')}</span>
                <h3 style={{ margin: '10px 0 4px' }}>{video.title}</h3>
                <p className="muted">Status: {video.status} | Processing: {video.processingStatus}</p>
              </div>
              <div className="action-list" style={{ justifyContent: 'flex-end', margin: 0 }}>
                {video.trailerDownloadHref ? <a className="btn btn-ghost" href={video.trailerDownloadHref}>Download trailer</a> : null}
                {video.posterDownloadHref ? <a className="btn btn-ghost" href={video.posterDownloadHref}>Download poster</a> : null}
                <label className="btn btn-ghost">
                  Upload/replace MP4
                  <input
                    type="file"
                    accept=".mp4,video/mp4"
                    hidden
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadMaster(video.id, file);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="detail-grid" style={{ margin: '16px 0' }}>
              <div className="detail-card"><span className="detail-label">MP4 upload</span><strong>{video.masterKey ? 'Uploaded' : 'Missing'}</strong></div>
              <div className="detail-card"><span className="detail-label">File name</span><strong>{video.masterFileName ?? 'No MP4'}</strong></div>
              <div className="detail-card"><span className="detail-label">File size</span><strong>{formatBytes(video.masterFileSize)}</strong></div>
              <div className="detail-card"><span className="detail-label">Uploaded date</span><strong>{formatDate(video.masterUploadedAt)}</strong></div>
            </div>

            <div className="action-list">
              {video.masterKey ? <a className="btn btn-primary" href={`/api/admin/videos/${video.id}/master`}>Download MP4</a> : null}
              <button className="btn btn-ghost" type="button" disabled={!video.masterKey} onClick={() => void navigator.clipboard.writeText(command)}>Copy MP4 normalize command</button>
              <button className="btn btn-primary" type="button" disabled={!video.masterKey || busy} onClick={() => void completeProcessing(video.id)}>
                Validate MP4
              </button>
              <button className="btn btn-ghost" type="button" disabled={!video.masterKey || busy} onClick={() => void deleteMaster(video.id)}>Delete MP4</button>
              {canPublish ? (
                <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void publish(video.id)}>
                  Publish
                </button>
              ) : null}
            </div>

            {uploadStatus ? (
              <div className="detail-card" style={{ marginTop: 14 }}>
                <div className="stack-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="detail-label">
                    {uploadStatus.phase === 'error'
                      ? 'MP4 upload error'
                      : uploadStatus.phase === 'done'
                        ? 'MP4 upload complete'
                        : 'MP4 upload progress'}
                  </span>
                  <strong>{uploadStatus.progress}%</strong>
                </div>
                <div className="upload-progress-track" aria-hidden="true">
                  <span
                    className="upload-progress-fill"
                    style={{
                      width: `${uploadStatus.progress}%`,
                      background: uploadStatus.phase === 'error'
                        ? 'linear-gradient(135deg, #ef4444, #991b1b)'
                        : 'linear-gradient(135deg, #22c55e, #0f766e)'
                    }}
                  />
                </div>
                <p className="muted" style={{ marginBottom: 0 }}>{uploadStatus.message}</p>
              </div>
            ) : null}

            <div className="detail-card" style={{ marginTop: 14 }}>
              <span className="detail-label">MP4 normalize command</span>
              <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{command}</code>
            </div>

            <div className="detail-grid" style={{ marginTop: 14 }}>
              <div className="detail-card"><span className="detail-label">Playback</span><strong>MP4 via gateway</strong></div>
              <div className="detail-card"><span className="detail-label">Playback URL</span><strong>{video.playbackUrl ?? 'Gateway stream token'}</strong></div>
              <div className="detail-card"><span className="detail-label">Qualities</span><strong>{video.qualities.join(', ') || 'MP4'}</strong></div>
            </div>
          </div>
        );
      })}

      {!visibleVideos.length ? <div className="card">No movies in this section yet.</div> : null}
    </div>
  );
}
