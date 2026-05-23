'use client';

import { useMemo, useState } from 'react';
import { buildFfmpegCommand } from '@/lib/video-processing';
import { getHlsContentType } from '@/lib/hls';
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
  hlsUrl: string | null;
  hlsVersion: string | null;
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

type ProducerBucket = 'needs-master' | 'uploaded' | 'hls-uploaded' | 'processed';
type UploadStatus = {
  phase: 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  message: string;
};

const BUCKETS: Array<{ id: ProducerBucket; label: string; description: string }> = [
  { id: 'uploaded', label: 'Uploaded masters', description: 'Download, encode, and upload HLS.' },
  { id: 'hls-uploaded', label: 'HLS uploaded', description: 'Validate and complete processing.' },
  { id: 'processed', label: 'Processed', description: 'Ready or already published.' },
  { id: 'needs-master', label: 'Needs master', description: 'Movie record exists, master is missing.' }
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
  return /\.(mp4|mov)$/i.test(file.name) && (!file.type || ['video/mp4', 'video/quicktime', 'application/octet-stream'].includes(file.type));
}

async function uploadBlobToSignedUrl(url: string, blob: Blob): Promise<string> {
  const response = await fetch(url, { method: 'PUT', body: blob });
  if (!response.ok) {
    throw new Error(`Master upload failed with status ${response.status}.`);
  }

  const etag = response.headers.get('ETag');
  if (!etag) {
    throw new Error('Master upload completed but R2 did not return a part ETag.');
  }

  return etag;
}

async function uploadMasterToStorage(file: File) {
  if (!isSupportedMasterFile(file)) {
    throw new Error('Upload a valid MP4 or MOV master file.');
  }

  if (file.size > MAX_MASTER_BYTES) {
    throw new Error(`Master file is too large. Keep it under ${formatUploadLimit(MAX_MASTER_BYTES)}.`);
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
      throw new Error(presignPayload.error ?? 'Unable to prepare master upload.');
    }

    const upload = await fetch(presignPayload.url as string, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!upload.ok) throw new Error(`Master upload failed with status ${upload.status}.`);

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
    throw new Error(session.error ?? 'Unable to start large master upload.');
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
      throw new Error(completePayload.error ?? 'Unable to finalize large master upload.');
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
  if (video.hlsUrl || video.processingStatus === 'HLS_UPLOADED' || video.status === 'HLS_UPLOADED') {
    return 'hls-uploaded';
  }
  if (video.masterKey) {
    return 'uploaded';
  }
  return 'needs-master';
}

function getBucketTone(bucket: ProducerBucket) {
  if (bucket === 'processed') return 'status-live';
  if (bucket === 'hls-uploaded') return 'status-review';
  if (bucket === 'uploaded') return 'status-warn';
  return 'status-review';
}

function HlsFolderUploadButton({
  videoId,
  busy,
  hasHls,
  onUpload
}: {
  videoId: string;
  busy: boolean;
  hasHls: boolean;
  onUpload: (videoId: string, files: File[]) => void;
}) {
  return (
    <label className="btn btn-primary">
      {busy ? 'Uploading HLS...' : hasHls ? 'Replace HLS Folder' : 'Upload HLS Folder'}
      <input
        type="file"
        // @ts-expect-error - webkitdirectory is non-standard but widely supported
        webkitdirectory="true"
        multiple
        hidden
        disabled={busy}
        onChange={(event) => {
          const fileList = event.target.files;
          if (fileList && fileList.length > 0) {
            const files = Array.from(fileList);
            onUpload(videoId, files);
          }
          event.currentTarget.value = '';
        }}
      />
    </label>
  );
}

export default function AdminVideoProcessingPanel({ initialProducers }: { initialProducers: ProcessingProducer[] }) {
  const [producers, setProducers] = useState(initialProducers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [previewConfirmed, setPreviewConfirmed] = useState<Record<string, boolean>>({});
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
    try {
      const key = await uploadMasterToStorage(file);

      const save = await fetch('/api/admin/videos/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, key, fileName: file.name, fileSize: file.size })
      });
      const savePayload = await save.json().catch(() => ({}));
      if (!save.ok) throw new Error(savePayload.error ?? 'Unable to save master details.');
      await refreshVideo(videoId, savePayload.video);
      setMessage('Master uploaded and attached.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload master.');
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
      if (!response.ok) throw new Error(payload.error ?? 'Unable to delete master.');
      await refreshVideo(videoId, payload.video);
      setMessage('Private master deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete master.');
    } finally {
      setPendingId(null);
    }
  }


    // Upload HLS directly as individual files with the real folder structure.
    async function uploadHlsFolder(videoId: string, files: File[]) {
      setPendingId(videoId);
      setMessage(null);

      const total = files.length;
      let uploaded = 0;

      setUploadStatuses((current) => ({
        ...current,
        [videoId]: {
          phase: 'uploading',
          progress: 0,
          message: `Uploading ${total} HLS files...`
        }
      }));

      try {
        const headers = { 'Content-Type': 'application/json' };
        const relativePaths: string[] = [];

        for (const file of files) {
          const relativePath = (file as any).webkitRelativePath || file.name;
          relativePaths.push(relativePath);

          // Get presigned URL for final location
          const presignRes = await fetch(`/api/admin/videos/${videoId}/hls/presign`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ relativePath })
          });
          const presign = await presignRes.json().catch(() => ({}));

          if (!presignRes.ok || !presign.url) {
            throw new Error(presign.error ?? `Failed to prepare upload for ${relativePath}`);
          }

          // Upload the file directly to final HLS location
          const uploadRes = await fetch(presign.url, {
            method: 'PUT',
            headers: { 'Content-Type': getHlsContentType(relativePath) },
            body: file
          });

          if (!uploadRes.ok) {
            throw new Error(`Failed to upload ${relativePath}: ${uploadRes.status}`);
          }

          uploaded += 1;
          const progress = Math.round((uploaded / total) * 100);

          setUploadStatuses((current) => ({
            ...current,
            [videoId]: {
              phase: progress >= 100 ? 'processing' : 'uploading',
              progress,
              message: `Uploaded ${uploaded}/${total} files...`
            }
          }));
        }

        // All files uploaded directly — now finalize with full validation
        setUploadStatuses((current) => ({
          ...current,
          [videoId]: {
            phase: 'processing',
            progress: 100,
            message: 'Finalizing and validating HLS folder...'
          }
        }));

        const finalizeRes = await fetch(`/api/admin/videos/${videoId}/hls/folder`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ relativePaths })
        });

        const finalizePayload = await finalizeRes.json().catch(() => ({}));

        if (!finalizeRes.ok) {
          throw new Error(finalizePayload.error ?? 'Failed to finalize HLS folder.');
        }

        await refreshVideo(videoId, finalizePayload.video ?? {});

        setUploadStatuses((current) => ({
          ...current,
          [videoId]: {
            phase: 'done',
            progress: 100,
            message: 'HLS folder uploaded and verified.'
          }
        }));

        setMessage('HLS folder uploaded and verified.');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unable to upload HLS folder.';
        setUploadStatuses((current) => ({
          ...current,
          [videoId]: {
            phase: 'error',
            progress: current[videoId]?.progress ?? 0,
            message: errorMessage
          }
        }));
        setMessage(errorMessage);
      } finally {
        setPendingId(null);
      }
    }


   async function completeProcessing(videoId: string) {
     setPendingId(videoId);
     setMessage('Validating HLS folder...');
     try {
       const response = await fetch('/api/admin/videos/validate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ movieId: videoId })
       });
       const payload = await response.json().catch(() => ({}));
       if (!response.ok) throw new Error(payload.error ?? 'Unable to validate HLS.');
       await refreshVideo(videoId, payload.video);
       setMessage(payload.passed ? 'Processing complete. Movie moved to Processed.' : `Validation failed: ${payload.errors.join(', ')}`);
     } catch (error) {
       setMessage(error instanceof Error ? error.message : 'Unable to complete processing.');
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
              ? 'Encoding'
              : counts['hls-uploaded'] > 0
                ? 'Validate'
                : counts.processed > 0
                  ? 'Processed'
                  : producer.videos.length > 0
                    ? 'Needs master'
                    : 'Awaiting uploads';

            return (
              <button key={producer.id} className="admin-producer-row" type="button" onClick={() => setSelectedProducerId(producer.id)}>
                <span className="admin-producer-identity">
                  <strong>{producer.name}</strong>
                  <span>{producer.creatorNumber} · {producer.email}</span>
                </span>
                <span className="admin-producer-metrics">
                  <span><strong>{producer.videos.length}</strong> titles</span>
                  <span><strong>{counts.uploaded}</strong> masters</span>
                  <span><strong>{counts['hls-uploaded']}</strong> HLS</span>
                  <span><strong>{counts.processed}</strong> processed</span>
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
        const canPublish = video.status === 'READY' && Boolean(video.hlsUrl) && previewConfirmed[video.id];

        return (
          <div key={video.id} className="card">
            <div className="stack-row" style={{ alignItems: 'flex-start' }}>
              <div>
                <span className={`status-chip ${getBucketTone(getBucket(video))}`}>{getBucket(video).replace('-', ' ')}</span>
                <h3 style={{ margin: '10px 0 4px' }}>{video.title}</h3>
                <p className="muted">Status: {video.status} | Processing: {video.processingStatus} | HLS: {video.hlsUrl ? 'Uploaded' : 'Not uploaded'}</p>
              </div>
              <div className="action-list" style={{ justifyContent: 'flex-end', margin: 0 }}>
                {video.trailerDownloadHref ? <a className="btn btn-ghost" href={video.trailerDownloadHref}>Download trailer</a> : null}
                {video.posterDownloadHref ? <a className="btn btn-ghost" href={video.posterDownloadHref}>Download trailer</a> : null}
                <label className="btn btn-ghost">
                  Upload/replace master
                  <input
                    type="file"
                    accept=".mp4,.mov,video/mp4,video/quicktime"
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
              <div className="detail-card"><span className="detail-label">Master upload</span><strong>{video.masterKey ? 'Uploaded' : 'Missing'}</strong></div>
              <div className="detail-card"><span className="detail-label">File name</span><strong>{video.masterFileName ?? 'No master'}</strong></div>
              <div className="detail-card"><span className="detail-label">File size</span><strong>{formatBytes(video.masterFileSize)}</strong></div>
              <div className="detail-card"><span className="detail-label">Uploaded date</span><strong>{formatDate(video.masterUploadedAt)}</strong></div>
            </div>

            <div className="action-list">
              {video.masterKey ? <a className="btn btn-primary" href={`/api/admin/videos/${video.id}/master`}>Download master</a> : null}
              <button className="btn btn-ghost" type="button" disabled={!video.masterKey} onClick={() => void navigator.clipboard.writeText(command)}>Copy FFmpeg command</button>
               <HlsFolderUploadButton
                 videoId={video.id}
                 busy={busy}
                 hasHls={Boolean(video.hlsUrl)}
                 onUpload={(targetVideoId, files) => void uploadHlsFolder(targetVideoId, files)}
               />

              <button className="btn btn-primary" type="button" disabled={!video.hlsUrl || busy} onClick={() => void completeProcessing(video.id)}>
                Complete processing
              </button>
              <button className="btn btn-ghost" type="button" disabled={!video.masterKey || busy} onClick={() => void deleteMaster(video.id)}>Delete master</button>
            </div>

            {uploadStatus ? (
              <div className="detail-card" style={{ marginTop: 14 }}>
                <div className="stack-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="detail-label">
                    {uploadStatus.phase === 'error'
                      ? 'HLS upload error'
                      : uploadStatus.phase === 'done'
                        ? 'HLS upload complete'
                        : uploadStatus.phase === 'processing'
                          ? 'HLS folder processing'
                          : 'HLS upload progress'}
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
              <span className="detail-label">Local FFmpeg command</span>
              <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{command}</code>
            </div>

            <div className="detail-grid" style={{ marginTop: 14 }}>
              <div className="detail-card"><span className="detail-label">HLS URL</span><strong>{video.hlsUrl ?? 'Not uploaded'}</strong></div>
              <div className="detail-card"><span className="detail-label">HLS version</span><strong>{video.hlsVersion ?? 'N/A'}</strong></div>
              <div className="detail-card"><span className="detail-label">Qualities</span><strong>{video.qualities.join(', ') || 'N/A'}</strong></div>
            </div>

            {video.hlsUrl ? (
              <div style={{ marginTop: 14 }}>
                <video className="admin-video-preview" src={video.hlsUrl} controls playsInline style={{ width: '100%', maxHeight: 420, background: '#050505' }} />
                <div className="action-list" style={{ marginTop: 10 }}>
                  {video.status === 'READY' && (
                    <>
                      <button className={previewConfirmed[video.id] ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => setPreviewConfirmed((current) => ({ ...current, [video.id]: true }))}>
                        Preview looks good
                      </button>
                      <button className="btn btn-primary" type="button" disabled={!canPublish || busy} onClick={() => void publish(video.id)}>
                        Publish
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {!visibleVideos.length ? <div className="card">No movies in this section yet.</div> : null}
    </div>
  );
}
