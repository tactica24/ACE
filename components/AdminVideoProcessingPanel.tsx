'use client';

import { useEffect, useMemo, useState } from 'react';

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
  transcodeError?: string | null;
  hlsManifestKey?: string | null;
  hlsReadyAt?: string | null;
  masterDeletionEligible?: boolean;
  masterDeletedAt?: string | null;
  bunnyStreamLibraryId?: string | null;
  bunnyStreamVideoId?: string | null;
  bunnyStreamStatus?: string | null;
  bunnyStreamReadyAt?: string | null;
  bunnyStreamError?: string | null;
  trailerStreamLibraryId?: string | null;
  trailerStreamVideoId?: string | null;
  trailerStreamStatus?: string | null;
  trailerStreamReadyAt?: string | null;
  trailerStreamError?: string | null;
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

type ModerationCounts = {
  pending: number;
  approved: number;
  orphanApproved: number;
};

type PipelineHealth = {
  bunnyReady: boolean;
  libraryId: string | null;
  pullZone: string | null;
  webhookUrl: string | null;
  missingConfig: string[];
};

type OperationState = {
  tone: 'working' | 'success' | 'error';
  text: string;
  videoId: string | null;
};

type PipelineStepState = 'done' | 'active' | 'pending' | 'failed';
type StreamStage = 'needs-upload' | 'uploading' | 'processing' | 'ready' | 'failed' | 'published';

function formatBytes(value: number | null) {
  if (!value) return 'No file recorded';
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : 'Not recorded';
}

function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : 'Not yet';
}

function normalizeStreamStatus(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'created';
  if (normalized.includes('upload')) return normalized.includes('fail') ? 'failed' : normalized;
  if (normalized.includes('queue')) return 'queued';
  if (normalized.includes('process')) return 'processing';
  if (normalized.includes('encod')) return 'encoding';
  if (normalized.includes('finish') || normalized.includes('ready')) return 'ready';
  if (normalized.includes('fail') || normalized.includes('error')) return 'failed';
  return normalized;
}

function getStreamStage(video: ProcessingVideo): StreamStage {
  if (video.status === 'PUBLISHED') return 'published';
  if (video.bunnyStreamReadyAt || video.processingStatus === 'READY_TO_STREAM' || video.status === 'READY') return 'ready';

  const streamStatus = normalizeStreamStatus(video.bunnyStreamStatus);
  if (video.bunnyStreamError || video.transcodeError || streamStatus === 'failed' || video.processingStatus === 'TRANSCODE_FAILED') {
    return 'failed';
  }
  if (!video.bunnyStreamVideoId) return 'needs-upload';
  if (['created', 'uploading', 'uploaded'].includes(streamStatus)) return 'uploading';
  return 'processing';
}

function getProgressPercent(video: ProcessingVideo) {
  const stage = getStreamStage(video);
  if (stage === 'published') return 100;
  if (stage === 'ready') return 88;
  if (stage === 'processing') return 64;
  if (stage === 'uploading') return 35;
  if (stage === 'failed') return 35;
  return 10;
}

function getPipelineSummary(video: ProcessingVideo) {
  const stage = getStreamStage(video);
  if (stage === 'published') return 'Published and available to viewers.';
  if (stage === 'ready') return 'Bunny Stream finished encoding and playback is ready.';
  if (stage === 'failed') return video.bunnyStreamError ?? video.transcodeError ?? 'Bunny Stream reported a processing failure.';
  if (stage === 'processing') {
    return `Bunny Stream is processing the movie${video.bunnyStreamStatus ? ` (${normalizeStreamStatus(video.bunnyStreamStatus)})` : ''}.`;
  }
  if (stage === 'uploading') {
    return 'Movie upload was created in Bunny Stream and is waiting for upload or encode callbacks.';
  }
  return 'This title has not been sent through the Bunny upload desk yet.';
}

function getNextStep(video: ProcessingVideo, pipelineHealth: PipelineHealth) {
  const stage = getStreamStage(video);
  if (!pipelineHealth.bunnyReady) {
    return 'Finish Bunny Stream and storage configuration first.';
  }
  if (stage === 'needs-upload') {
    return 'Upload poster, trailer, movie, and subtitles from the admin upload page.';
  }
  if (stage === 'failed') {
    return 'Refresh Bunny status and re-upload the movie if Bunny reports a permanent failure.';
  }
  if (stage === 'ready') {
    return video.status === 'PUBLISHED' ? 'Movie is already live.' : 'Publish when release checks are complete.';
  }
  return 'Wait for Bunny webhook updates or refresh Bunny status.';
}

function getPipelineSteps(video: ProcessingVideo): Array<{ label: string; state: PipelineStepState; note: string }> {
  const stage = getStreamStage(video);
  const streamStatus = normalizeStreamStatus(video.bunnyStreamStatus);
  const isFailed = stage === 'failed';
  const isReady = stage === 'ready' || stage === 'published';
  const isPublished = stage === 'published';
  const hasTrailer = Boolean(video.trailerStreamVideoId);
  const trailerReady = Boolean(video.trailerStreamReadyAt);

  return [
    {
      label: 'Title created',
      state: 'done',
      note: `Record created for ${video.creatorName}.`
    },
    {
      label: 'Movie sent to Bunny Stream',
      state: video.bunnyStreamVideoId ? 'done' : 'pending',
      note: video.bunnyStreamVideoId ? `Video ID ${video.bunnyStreamVideoId}` : 'Use the Bunny upload desk to attach the movie file.'
    },
    {
      label: 'Bunny processing',
      state: isFailed ? 'failed' : isReady ? 'done' : video.bunnyStreamVideoId ? 'active' : 'pending',
      note: isFailed
        ? video.bunnyStreamError ?? video.transcodeError ?? 'Bunny Stream processing failed.'
        : isReady
          ? 'Encoding finished and playback files are available.'
          : video.bunnyStreamVideoId
            ? `Current state: ${streamStatus}.`
            : 'Waiting for movie upload to start.'
    },
    {
      label: 'Trailer ready',
      state: trailerReady ? 'done' : hasTrailer ? 'active' : 'pending',
      note: trailerReady
        ? 'Trailer playback is available.'
        : hasTrailer
          ? `Trailer state: ${normalizeStreamStatus(video.trailerStreamStatus)}.`
          : 'Optional trailer not uploaded yet.'
    },
    {
      label: 'Published',
      state: isPublished ? 'done' : isReady ? 'active' : 'pending',
      note: isPublished ? 'Movie is live for viewers.' : 'Publish after moderation and release checks are complete.'
    }
  ];
}

function getPipelineStepTone(step: PipelineStepState) {
  if (step === 'done') return { color: '#166534', backgroundColor: '#dcfce7', borderColor: '#86efac', label: 'Done' };
  if (step === 'active') return { color: '#1d4ed8', backgroundColor: '#dbeafe', borderColor: '#93c5fd', label: 'In progress' };
  if (step === 'failed') return { color: '#b91c1c', backgroundColor: '#fee2e2', borderColor: '#fca5a5', label: 'Needs fix' };
  return { color: '#6b7280', backgroundColor: '#f3f4f6', borderColor: '#d1d5db', label: 'Pending' };
}

function getOperationStyles(tone: OperationState['tone']) {
  if (tone === 'error') {
    return {
      cardClassName: 'status-error',
      backgroundColor: '#fef2f2',
      borderColor: '#dc2626'
    };
  }

  if (tone === 'working') {
    return {
      cardClassName: 'status-warn',
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b'
    };
  }

  return {
    cardClassName: 'status-live',
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e'
  };
}

export default function AdminVideoProcessingPanel({
  initialProducers,
  pipelineHealth,
  initialPendingIntakeCount,
  initialModerationCounts
}: {
  initialProducers: ProcessingProducer[];
  pipelineHealth: PipelineHealth;
  initialPendingIntakeCount: number;
  initialModerationCounts: ModerationCounts;
}) {
  const [producers, setProducers] = useState(initialProducers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [operation, setOperation] = useState<OperationState | null>(null);
  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null);

  const sortedProducers = useMemo(
    () => [...producers].sort((a, b) => b.videos.length - a.videos.length || a.name.localeCompare(b.name)),
    [producers]
  );

  const allVideos = useMemo(
    () =>
      producers.flatMap((producer) =>
        producer.videos.map((video) => ({
          ...video,
          creatorName: producer.name,
          creatorEmail: producer.email
        }))
      ),
    [producers]
  );

  const selectedProducer = useMemo(
    () => sortedProducers.find((producer) => producer.id === selectedProducerId) ?? null,
    [selectedProducerId, sortedProducers]
  );

  const visibleVideos = useMemo(() => {
    const source = selectedProducer
      ? selectedProducer.videos.map((video) => ({ ...video, creatorName: selectedProducer.name, creatorEmail: selectedProducer.email }))
      : allVideos;

    return [...source].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [allVideos, selectedProducer]);

  const counts = useMemo(() => {
    const stages = allVideos.map(getStreamStage);
    return {
      needsUpload: stages.filter((stage) => stage === 'needs-upload').length,
      uploading: stages.filter((stage) => stage === 'uploading').length,
      processing: stages.filter((stage) => stage === 'processing').length,
      ready: stages.filter((stage) => stage === 'ready').length,
      failed: stages.filter((stage) => stage === 'failed').length,
      published: stages.filter((stage) => stage === 'published').length
    };
  }, [allVideos]);

  useEffect(() => {
    const activeVideoIds = allVideos.filter((video) => {
      const stage = getStreamStage(video);
      return stage === 'uploading' || stage === 'processing';
    });

    if (!activeVideoIds.length) return;

    let cancelled = false;
    const run = async () => {
      const results = await Promise.allSettled(
        activeVideoIds.map((video) =>
          fetch(`/api/admin/videos/${video.id}/processing`, { method: 'GET' }).then((response) =>
            response.json().catch(() => ({})).then((payload) => ({ ok: response.ok, payload }))
          )
        )
      );

      if (cancelled) return;

      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value.ok || !result.value.payload?.video) continue;
        const refreshedVideo = result.value.payload.video as Record<string, unknown>;
        const videoId = typeof refreshedVideo.id === 'string' ? refreshedVideo.id : '';
        if (!videoId) continue;

        setProducers((current) =>
          current.map((producer) => ({
            ...producer,
            videos: producer.videos.map((video) => (video.id === videoId ? ({ ...video, ...refreshedVideo } as ProcessingVideo) : video))
          }))
        );
      }
    };

    void run();
    const interval = window.setInterval(run, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [allVideos]);

  async function refreshVideo(videoId: string, payload: Record<string, unknown>) {
    setProducers((current) =>
      current.map((producer) => ({
        ...producer,
        videos: producer.videos.map((video) => (video.id === videoId ? ({ ...video, ...payload } as ProcessingVideo) : video))
      }))
    );
  }

  function startOperation(videoId: string, text: string) {
    setPendingId(videoId);
    setOperation({ tone: 'working', text, videoId });
  }

  function finishOperation(videoId: string, text: string) {
    setOperation({ tone: 'success', text, videoId });
  }

  function failOperation(videoId: string | null, error: unknown, fallback: string) {
    setOperation({
      tone: 'error',
      text: error instanceof Error ? error.message : fallback,
      videoId
    });
  }

  async function syncStream(videoId: string) {
    startOperation(videoId, 'Refreshing Bunny Stream status...');
    try {
      const response = await fetch('/api/admin/videos/processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'SYNC_STREAM' })
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.video) {
        await refreshVideo(videoId, payload.video);
      }
      if (!response.ok) throw new Error(payload.error ?? 'Unable to refresh Bunny Stream status.');
      finishOperation(videoId, payload.message ?? 'Bunny Stream status refreshed.');
    } catch (error) {
      failOperation(videoId, error, 'Unable to refresh Bunny Stream status.');
    } finally {
      setPendingId(null);
    }
  }

  async function publish(videoId: string) {
    startOperation(videoId, 'Publishing title...');
    try {
      const response = await fetch('/api/admin/videos/processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'PUBLISH' })
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.video) {
        await refreshVideo(videoId, payload.video);
      }
      if (!response.ok) throw new Error(payload.error ?? 'Unable to publish this title.');
      finishOperation(videoId, payload.message ?? 'Title published.');
    } catch (error) {
      failOperation(videoId, error, 'Unable to publish this title.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="stack-list">
      <div className={`card ${pipelineHealth.bunnyReady ? 'status-live' : 'status-warn'}`}>
        <div className="stack-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <span className="pill">Bunny-only flow</span>
            <h2 style={{ margin: '10px 0 4px' }}>Admin delivery is now Bunny Stream plus Bunny Storage</h2>
            <p className="muted" style={{ margin: 0 }}>
              Posters and subtitle files live in Bunny Storage. Trailers and movies encode in Bunny Stream. Legacy delivery controls are retired.
            </p>
          </div>
          <div className="action-list" style={{ margin: 0 }}>
            <a className="btn btn-primary" href="/admin/upload">Open upload desk</a>
            <a className="btn btn-ghost" href="/admin/moderation">Open moderation</a>
          </div>
        </div>

        <div className="detail-grid" style={{ marginTop: 18 }}>
          <div className="detail-card">
            <span className="detail-label">Bunny library</span>
            <strong>{pipelineHealth.libraryId ?? 'Missing'}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Pull zone</span>
            <strong>{pipelineHealth.pullZone ?? 'Missing'}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Webhook</span>
            <strong>{pipelineHealth.webhookUrl ?? 'Missing'}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Config health</span>
            <strong>{pipelineHealth.bunnyReady ? 'Ready' : 'Needs env updates'}</strong>
          </div>
        </div>

        {!pipelineHealth.bunnyReady ? (
          <p className="muted" style={{ marginTop: 12 }}>
            Missing configuration: {pipelineHealth.missingConfig.join(', ')}
          </p>
        ) : null}
      </div>

      <div className="detail-grid">
        <div className="detail-card"><span className="detail-label">Active producers</span><strong>{producers.length}</strong></div>
        <div className="detail-card"><span className="detail-label">Pending intake</span><strong>{initialPendingIntakeCount}</strong></div>
        <div className="detail-card"><span className="detail-label">Moderation pending</span><strong>{initialModerationCounts.pending}</strong></div>
        <div className="detail-card"><span className="detail-label">Needs upload</span><strong>{counts.needsUpload}</strong></div>
        <div className="detail-card"><span className="detail-label">Encoding now</span><strong>{counts.uploading + counts.processing}</strong></div>
        <div className="detail-card"><span className="detail-label">Ready to publish</span><strong>{counts.ready}</strong></div>
        <div className="detail-card"><span className="detail-label">Needs fix</span><strong>{counts.failed}</strong></div>
        <div className="detail-card"><span className="detail-label">Live titles</span><strong>{counts.published}</strong></div>
      </div>

      <div className="card">
        <div className="stack-row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>Pipeline monitor</h3>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Review each title's Bunny Stream state, refresh status from Bunny, and publish once playback is ready.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="muted">Producer</span>
            <select
              value={selectedProducerId ?? ''}
              onChange={(event) => setSelectedProducerId(event.target.value || null)}
              className="input"
            >
              <option value="">All producers</option>
              {sortedProducers.map((producer) => (
                <option key={producer.id} value={producer.id}>{producer.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {visibleVideos.map((video) => {
        const busy = pendingId === video.id;
        const stage = getStreamStage(video);
        const canPublish = stage === 'ready' && video.status !== 'PUBLISHED';
        const operationForVideo = operation?.videoId === video.id ? operation : null;
        const operationStyles = operationForVideo ? getOperationStyles(operationForVideo.tone) : null;
        const pipelineSteps = getPipelineSteps(video);
        const currentIssue = video.bunnyStreamError ?? video.transcodeError ?? video.trailerStreamError ?? null;

        return (
          <div key={video.id} className="card">
            <div className="stack-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <span className={`status-chip ${stage === 'failed' ? 'status-error' : stage === 'published' || stage === 'ready' ? 'status-live' : 'status-warn'}`}>
                  {stage.replace('-', ' ')}
                </span>
                <h3 style={{ margin: '10px 0 4px' }}>{video.title}</h3>
                <p className="muted">{video.creatorName} | {video.creatorEmail}</p>
                <p className="muted">Status: {video.status} | Processing: {video.processingStatus}</p>
                <p className="muted" style={{ marginTop: 6 }}>{getPipelineSummary(video)}</p>
              </div>
              <div className="action-list" style={{ margin: 0, justifyContent: 'flex-end' }}>
                {video.posterDownloadHref ? <a className="btn btn-ghost" href={video.posterDownloadHref}>Poster</a> : null}
                {video.trailerDownloadHref ? <a className="btn btn-ghost" href={video.trailerDownloadHref}>Trailer</a> : null}
              </div>
            </div>

            <div className="detail-grid" style={{ margin: '16px 0' }}>
              <div className="detail-card"><span className="detail-label">Movie video ID</span><strong>{video.bunnyStreamVideoId ?? 'Not uploaded yet'}</strong></div>
              <div className="detail-card"><span className="detail-label">Trailer video ID</span><strong>{video.trailerStreamVideoId ?? 'Optional / not uploaded'}</strong></div>
              <div className="detail-card"><span className="detail-label">Movie state</span><strong>{normalizeStreamStatus(video.bunnyStreamStatus)}</strong></div>
              <div className="detail-card"><span className="detail-label">Trailer state</span><strong>{video.trailerStreamVideoId ? normalizeStreamStatus(video.trailerStreamStatus) : 'Not added'}</strong></div>
              <div className="detail-card"><span className="detail-label">Playback</span><strong>{video.hlsReadyAt || video.bunnyStreamReadyAt ? 'Ready from Bunny Stream' : 'Waiting for Bunny Stream'}</strong></div>
              <div className="detail-card"><span className="detail-label">Next step</span><strong>{getNextStep(video, pipelineHealth)}</strong></div>
              <div className="detail-card"><span className="detail-label">File name</span><strong>{video.masterFileName ?? 'Not recorded'}</strong></div>
              <div className="detail-card"><span className="detail-label">File size</span><strong>{formatBytes(video.masterFileSize)}</strong></div>
              <div className="detail-card"><span className="detail-label">Uploaded</span><strong>{formatDate(video.masterUploadedAt)}</strong></div>
              <div className="detail-card"><span className="detail-label">Playback URL</span><strong>{video.playbackUrl ?? 'Not ready yet'}</strong></div>
              <div className="detail-card"><span className="detail-label">Qualities</span><strong>{video.qualities.join(', ') || 'Not reported yet'}</strong></div>
              <div className="detail-card"><span className="detail-label">Ready at</span><strong>{formatDateTime(video.bunnyStreamReadyAt ?? video.hlsReadyAt)}</strong></div>
            </div>

            <div className="detail-card" style={{ marginBottom: 16 }}>
              <div className="stack-row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span className="detail-label">Pipeline progression</span>
                <strong>{getProgressPercent(video)}%</strong>
              </div>
              <div style={{ marginTop: 10, height: 8, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${getProgressPercent(video)}%`,
                    height: '100%',
                    backgroundColor: currentIssue ? '#dc2626' : '#2563eb',
                    transition: 'width 160ms ease'
                  }}
                />
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {pipelineSteps.map((step) => {
                  const tone = getPipelineStepTone(step.state);
                  return (
                    <div
                      key={step.label}
                      style={{
                        border: `1px solid ${tone.borderColor}`,
                        backgroundColor: tone.backgroundColor,
                        borderRadius: 8,
                        padding: '10px 12px'
                      }}
                    >
                      <div className="stack-row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <strong style={{ color: tone.color }}>{step.label}</strong>
                        <span style={{ color: tone.color, fontSize: 12, fontWeight: 700 }}>{tone.label}</span>
                      </div>
                      <p style={{ margin: '6px 0 0', color: tone.color, fontSize: 13 }}>{step.note}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {operationForVideo && operationStyles ? (
              <div
                className={`detail-card ${operationStyles.cardClassName}`}
                style={{
                  marginBottom: 16,
                  backgroundColor: operationStyles.backgroundColor,
                  borderLeft: `4px solid ${operationStyles.borderColor}`
                }}
              >
                <span className="detail-label">Latest action</span>
                <strong>{operationForVideo.text}</strong>
              </div>
            ) : null}

            {currentIssue ? (
              <div className="detail-card status-error" style={{ marginBottom: 16, backgroundColor: '#fef2f2', borderLeft: '4px solid #dc2626' }}>
                <span className="detail-label">Current issue</span>
                <strong>{currentIssue}</strong>
              </div>
            ) : null}

            <div className="action-list">
              <button className="btn btn-ghost" type="button" disabled={busy || !video.bunnyStreamVideoId} onClick={() => void syncStream(video.id)}>
                {busy ? 'Refreshing...' : 'Refresh Bunny status'}
              </button>
              {canPublish ? (
                <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void publish(video.id)}>
                  {busy ? 'Publishing...' : 'Publish'}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {!visibleVideos.length ? <div className="card">No titles match the current producer filter yet.</div> : null}
    </div>
  );
}
