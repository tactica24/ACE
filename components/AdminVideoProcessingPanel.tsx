'use client';

import { useEffect, useMemo, useState } from 'react';
import { uploadPreparedStorageAsset } from '@/lib/client-storage-upload';
import type { PreparedStorageUpload } from '@/lib/storage-upload';
import { buildFfmpegCommand } from '@/lib/video-processing';
import { MAX_MASTER_BYTES, formatUploadLimit } from '@/lib/upload-limits';

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
  masterSourceUrl: string | null;
  masterFileName: string | null;
  masterFileSize: number | null;
  masterUploadedAt: string | null;
  processingStatus: string;
  playbackUrl: string | null;
  orchestrationProvider?: string | null;
  orchestrationJobId?: string | null;
  transcodeProvider?: string | null;
  transcodeTaskId?: string | null;
  transcodeError?: string | null;
  hlsOutputPath?: string | null;
  hlsManifestKey?: string | null;
  hlsReadyAt?: string | null;
  masterDeletionEligible?: boolean;
  masterDeletedAt?: string | null;
  bunnyFolderPrefix?: string | null;
  latestPipelineEvent?: string | null;
  latestPipelineEventAt?: string | null;
  latestPipelineMessage?: string | null;
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
  { id: 'uploaded', label: 'Uploaded / processing', description: 'Assets are stored in Bunny. Admin starts Contabo HLS when ready.' },
  { id: 'processed', label: 'Ready / published', description: 'Titles with verified HLS playback.' },
  { id: 'needs-master', label: 'Needs MP4', description: 'Movie record exists, but the master file is still missing.' }
];

const ACTIVE_PIPELINE_STATUSES = new Set(['CONTABO_QUEUED', 'ENCODING_STARTED']);

function formatBytes(value: number | null) {
  if (!value) return 'No file';
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : 'Not uploaded';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'No callback yet';
  return new Date(value).toLocaleString();
}

function isSupportedMasterFile(file: File) {
  return /\.mp4$/i.test(file.name) && (!file.type || ['video/mp4', 'application/octet-stream'].includes(file.type));
}

function toStorageUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to upload MP4.';
  if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('network')) {
    return (
      'Storage upload failed before Bunny accepted the file. Check the Bunny S3 endpoint, credentials, and browser CORS settings, then try again.'
    );
  }
  return message;
}

async function uploadMasterToStorage(file: File, videoId: string) {
  if (!isSupportedMasterFile(file)) {
    throw new Error('Upload a playable MP4 master file.');
  }

  if (file.size > MAX_MASTER_BYTES) {
    throw new Error(`MP4 file is too large. Keep it under ${formatUploadLimit(MAX_MASTER_BYTES)}.`);
  }

  const presign = await fetch('/api/uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      purpose: 'master',
      folderId: videoId
    })
  });
  const presignPayload = await presign.json().catch(() => ({}));
  if (!presign.ok || !presignPayload.strategy || !presignPayload.key) {
    throw new Error(presignPayload.error ?? 'Unable to prepare MP4 upload.');
  }

  let upload: Response;
  try {
    await uploadPreparedStorageAsset(presignPayload as PreparedStorageUpload, file, () => {});
    upload = new Response(null, { status: 200 });
  } catch (error) {
    throw new Error(toStorageUploadError(error));
  }
  if (!upload.ok) {
    const responseText = await upload.text().catch(() => '');
    throw new Error(responseText ? `MP4 upload failed with status ${upload.status}: ${responseText}` : `MP4 upload failed with status ${upload.status}.`);
  }

  return presignPayload.key as string;
}

function getBucket(video: ProcessingVideo): ProducerBucket {
  if (video.processingStatus === 'READY_TO_STREAM' || ['READY', 'PUBLISHED'].includes(video.status)) {
    return 'processed';
  }
  if (video.masterKey || video.masterSourceUrl) {
    return 'uploaded';
  }
  return 'needs-master';
}

function getBucketTone(bucket: ProducerBucket) {
  if (bucket === 'processed') return 'status-live';
  if (bucket === 'uploaded') return 'status-warn';
  return 'status-review';
}

function isPipelineWorking(video: ProcessingVideo) {
  return ACTIVE_PIPELINE_STATUSES.has(video.processingStatus);
}

function getPipelineSummary(video: ProcessingVideo) {
  if (video.processingStatus === 'READY_TO_STREAM') {
    return 'HLS uploaded to Bunny and verified.';
  }
  if (video.processingStatus === 'CONTABO_QUEUED') {
    return 'Contabo job queued. Waiting for worker pickup.';
  }
  if (video.processingStatus === 'ENCODING_STARTED') {
    return 'Contabo is transcoding and preparing Bunny HLS output.';
  }
  if (video.processingStatus === 'TRANSCODE_FAILED') {
    return video.transcodeError ?? 'Transcode failed.';
  }
  if (video.masterSourceUrl) {
    return 'Dropbox source is attached and ready for Contabo processing.';
  }
  if (video.masterKey) {
    return 'Master is stored in Bunny and ready for admin processing.';
  }
  return 'Waiting for a master upload.';
}

export default function AdminVideoProcessingPanel({ initialProducers }: { initialProducers: ProcessingProducer[] }) {
  const [producers, setProducers] = useState(initialProducers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<ProducerBucket | null>(null);
  const [sourceDrafts, setSourceDrafts] = useState<Record<string, string>>({});

  const sortedProducers = useMemo(
    () => [...producers].sort((a, b) => b.videos.length - a.videos.length || a.name.localeCompare(b.name)),
    [producers]
  );

  const selectedProducer = sortedProducers.find((producer) => producer.id === selectedProducerId) ?? null;
  const producerVideos = selectedProducer?.videos ?? [];
  const visibleVideos = selectedBucket ? producerVideos.filter((video) => getBucket(video) === selectedBucket) : [];

  useEffect(() => {
    const activeVideos = visibleVideos.filter((video) => isPipelineWorking(video));
    if (!activeVideos.length) return;

    let cancelled = false;
    const run = async () => {
      const results = await Promise.allSettled(
        activeVideos.map((video) =>
          fetch(`/api/admin/videos/${video.id}/processing`, { method: 'GET' })
            .then((response) => response.json().catch(() => ({})).then((payload) => ({ ok: response.ok, payload })))
        )
      );

      if (cancelled) return;

      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value.ok || !result.value.payload?.video) continue;
        const refreshedVideo = result.value.payload.video as Record<string, unknown>;
        const videoId = typeof refreshedVideo.id === 'string' ? refreshedVideo.id : '';
        if (videoId) {
          void refreshVideo(videoId, refreshedVideo);
        }
      }
    };

    void run();
    const interval = window.setInterval(run, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [visibleVideos]);

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
      [videoId]: { phase: 'uploading', progress: 0, message: 'Uploading MP4 master...' }
    }));
    try {
      const key = await uploadMasterToStorage(file, videoId);

      const save = await fetch('/api/admin/videos/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, key, fileName: file.name, fileSize: file.size })
      });
      const savePayload = await save.json().catch(() => ({}));
      if (!save.ok) throw new Error(savePayload.error ?? 'Unable to save MP4 details.');
      await refreshVideo(videoId, savePayload.video);
      const successMessage = typeof savePayload.message === 'string' ? savePayload.message : 'MP4 uploaded and attached.';
      setUploadStatuses((current) => ({
        ...current,
        [videoId]: { phase: 'done', progress: 100, message: successMessage }
      }));
      setMessage(successMessage);
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
      setMessage('Master deleted. HLS remains as the viewer playback source.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete MP4.');
    } finally {
      setPendingId(null);
    }
  }

  async function completeProcessing(videoId: string) {
    setPendingId(videoId);
    setMessage('Syncing HLS pipeline status...');
    try {
      const response = await fetch('/api/admin/videos/processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'SYNC_PIPELINE' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to sync HLS pipeline.');
      await refreshVideo(videoId, payload.video);
      setMessage(payload.message ?? 'HLS pipeline synced.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sync HLS pipeline.');
    } finally {
      setPendingId(null);
    }
  }

  async function attachDropboxSource(videoId: string) {
    const sourceUrl = sourceDrafts[videoId]?.trim() ?? '';
    if (!sourceUrl) {
      setMessage('Paste a Dropbox share link before attaching the master source.');
      return;
    }

    setPendingId(videoId);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/videos/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, sourceUrl })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to attach Dropbox source.');
      await refreshVideo(videoId, payload.video);
      setSourceDrafts((current) => ({ ...current, [videoId]: '' }));
      setMessage(payload.message ?? 'Dropbox source attached.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to attach Dropbox source.');
    } finally {
      setPendingId(null);
    }
  }

  async function startPipeline(videoId: string) {
    setPendingId(videoId);
    setMessage('Queueing Contabo worker...');
    try {
      const response = await fetch('/api/admin/videos/processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'START_PIPELINE' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to start HLS pipeline.');
      await refreshVideo(videoId, payload.video);
      setMessage(payload.message ?? 'Contabo HLS processing started. Waiting for worker callback...');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start HLS pipeline.');
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
              ? 'Pipeline active'
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
                  <span><strong>{counts.uploaded}</strong> pipeline</span>
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
                <p className="muted" style={{ marginTop: 6 }}>{getPipelineSummary(video)}</p>
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
              <div className="detail-card"><span className="detail-label">Master source</span><strong>{video.masterSourceUrl ? 'Dropbox attached' : video.masterKey ? 'Bunny uploaded' : 'Missing'}</strong></div>
              <div className="detail-card"><span className="detail-label">File name</span><strong>{video.masterFileName ?? 'No master source yet'}</strong></div>
              <div className="detail-card"><span className="detail-label">File size</span><strong>{formatBytes(video.masterFileSize)}</strong></div>
              <div className="detail-card"><span className="detail-label">Uploaded date</span><strong>{formatDate(video.masterUploadedAt)}</strong></div>
            </div>

            <div className="detail-card" style={{ marginBottom: 16 }}>
              <span className="detail-label">Dropbox master source</span>
              <div className="stack-row" style={{ alignItems: 'center' }}>
                <input
                  type="url"
                  value={sourceDrafts[video.id] ?? ''}
                  onChange={(event) => setSourceDrafts((current) => ({ ...current, [video.id]: event.target.value }))}
                  placeholder="Paste Dropbox share link"
                  disabled={busy}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void attachDropboxSource(video.id)}>
                  Attach Dropbox URL
                </button>
                {video.masterSourceUrl ? (
                  <a className="btn btn-ghost" href={video.masterSourceUrl} target="_blank" rel="noreferrer">
                    Open source
                  </a>
                ) : null}
              </div>
            </div>

            <div className="action-list">
              {video.masterKey ? <a className="btn btn-primary" href={`/api/admin/videos/${video.id}/master`}>Download MP4</a> : null}
              <button className="btn btn-ghost" type="button" disabled={!video.masterKey && !video.masterSourceUrl} onClick={() => void navigator.clipboard.writeText(command)}>Copy master normalize command</button>
              <button className="btn btn-primary" type="button" disabled={(!video.masterKey && !video.masterSourceUrl) || busy} onClick={() => void startPipeline(video.id)}>
                Start Contabo HLS
              </button>
              <button className="btn btn-ghost" type="button" disabled={(!video.masterKey && !video.masterSourceUrl) || busy} onClick={() => void completeProcessing(video.id)}>
                Sync Contabo status
              </button>
              <button className="btn btn-ghost" type="button" disabled={(!video.masterKey && !video.masterSourceUrl) || !video.masterDeletionEligible || busy} onClick={() => void deleteMaster(video.id)}>Delete master</button>
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
                      ? 'Master upload error'
                      : uploadStatus.phase === 'done'
                        ? 'Master upload complete'
                        : 'Master upload progress'}
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
              <span className="detail-label">Master normalize command</span>
              <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{command}</code>
            </div>

            <div className="detail-grid" style={{ marginTop: 14 }}>
              <div className="detail-card"><span className="detail-label">Playback</span><strong>{video.hlsManifestKey ? 'HLS pipeline' : video.masterSourceUrl ? 'Dropbox source pending HLS' : 'MP4 via gateway'}</strong></div>
              <div className="detail-card"><span className="detail-label">Playback URL</span><strong>{video.playbackUrl ?? (video.masterSourceUrl ?? 'Gateway stream token')}</strong></div>
              <div className="detail-card"><span className="detail-label">Qualities</span><strong>{video.qualities.join(', ') || 'MP4'}</strong></div>
            </div>

            <div className="detail-grid" style={{ marginTop: 14 }}>
              <div className="detail-card"><span className="detail-label">Bunny movie folder</span><strong>{video.bunnyFolderPrefix ?? 'Will be created on first upload'}</strong></div>
              <div className="detail-card"><span className="detail-label">Contabo</span><strong>{video.orchestrationJobId ? `${video.orchestrationProvider ?? 'CONTABO'} job linked` : 'Not queued yet'}</strong></div>
              <div className="detail-card"><span className="detail-label">Transcode</span><strong>{video.transcodeTaskId ? `${video.transcodeProvider ?? 'FFMPEG'} task linked` : 'Not started yet'}</strong></div>
              <div className="detail-card"><span className="detail-label">HLS output</span><strong>{video.hlsOutputPath ?? 'Not assigned yet'}</strong></div>
            </div>

            <div className="detail-grid" style={{ marginTop: 14 }}>
              <div className="detail-card"><span className="detail-label">HLS manifest</span><strong>{video.hlsManifestKey ?? 'Not generated yet'}</strong></div>
              <div className="detail-card"><span className="detail-label">HLS ready</span><strong>{video.hlsReadyAt ? formatDateTime(video.hlsReadyAt) : 'No'}</strong></div>
              <div className="detail-card"><span className="detail-label">Latest callback</span><strong>{video.latestPipelineEvent ? `${video.latestPipelineEvent} at ${formatDateTime(video.latestPipelineEventAt)}` : 'No callback yet'}</strong></div>
              <div className="detail-card"><span className="detail-label">Master deletion</span><strong>{video.masterDeletedAt ? 'Deleted' : video.masterDeletionEligible ? 'Eligible after review' : 'Not eligible yet'}</strong></div>
              <div className="detail-card"><span className="detail-label">Transcode error</span><strong>{video.transcodeError ?? 'None recorded'}</strong></div>
            </div>

            {video.latestPipelineMessage ? (
              <div className="detail-card" style={{ marginTop: 14 }}>
                <span className="detail-label">Callback note</span>
                <strong>{video.latestPipelineMessage}</strong>
              </div>
            ) : null}
          </div>
        );
      })}

      {!visibleVideos.length ? <div className="card">No movies in this section yet.</div> : null}
    </div>
  );
}
