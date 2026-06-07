'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildFfmpegCommand } from '@/lib/video-processing';

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

type ModerationCounts = {
  pending: number;
  approved: number;
  orphanApproved: number;
};

type PipelineHealth = {
  contaboReady: boolean;
  contaboApiUrl: string | null;
  callbackBaseUrl: string | null;
  missingConfig: string[];
};

type OperationState = {
  tone: 'working' | 'success' | 'error';
  text: string;
  videoId: string | null;
};

type PipelineStage =
  | 'overview'
  | 'intake'
  | 'moderation'
  | 'needs-source'
  | 'ready'
  | 'in-progress'
  | 'live';

const STAGES: Array<{ id: PipelineStage; label: string; description: string }> = [
  {
    id: 'overview',
    label: 'Pipeline overview',
    description: 'Start-to-finish workflow across intake, moderation, source attachment and HLS processing.'
  },
  {
    id: 'intake',
    label: 'Intake',
    description: 'Producer intake and title creation tasks that feed the pipe.'
  },
  {
    id: 'moderation',
    label: 'Moderation',
    description: 'Review metadata, poster details and release readiness.'
  },
  {
    id: 'needs-source',
    label: 'Needs source',
    description: 'Titles waiting for Dropbox or Bunny masters.'
  },
  {
    id: 'ready',
    label: 'Ready for processing',
    description: 'Source attached and ready to queue Contabo.'
  },
  {
    id: 'in-progress',
    label: 'HLS processing',
    description: 'Contabo jobs queued and encoding in progress.'
  }
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

function isPipelineWorking(video: ProcessingVideo) {
  return ACTIVE_PIPELINE_STATUSES.has(video.processingStatus);
}

function isLive(video: ProcessingVideo) {
  return video.processingStatus === 'READY_TO_STREAM' || ['READY', 'PUBLISHED'].includes(video.status);
}

function getBucket(video: ProcessingVideo) {
  if (video.processingStatus === 'READY_TO_STREAM' || ['READY', 'PUBLISHED'].includes(video.status)) {
    return 'processed';
  }
  if (video.masterKey || video.masterSourceUrl) {
    return 'uploaded';
  }
  return 'needs-master';
}

function getBucketTone(bucket: 'needs-master' | 'uploaded' | 'processed') {
  if (bucket === 'processed') return 'status-live';
  if (bucket === 'uploaded') return 'status-warn';
  return 'status-review';
}

function getVideoStage(video: ProcessingVideo): PipelineStage {
  if (video.processingStatus === 'READY_TO_STREAM' || ['READY', 'PUBLISHED'].includes(video.status)) {
    return 'live';
  }
  if (isPipelineWorking(video)) {
    return 'in-progress';
  }
  if (video.masterKey || video.masterSourceUrl) {
    return 'ready';
  }
  return 'needs-source';
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
    return 'Master is stored in Bunny and ready for Contabo processing.';
  }
  return 'Waiting for a Dropbox or Bunny master source.';
}

function getSourceLabel(video: ProcessingVideo) {
  if (video.masterSourceUrl) return 'Dropbox master attached';
  if (video.masterKey) return 'Bunny master uploaded';
  return 'No source attached';
}

function getDeliveryLabel(video: ProcessingVideo) {
  if (video.hlsManifestKey && video.hlsReadyAt) return 'Bunny HLS ready';
  if (video.hlsManifestKey) return 'HLS manifest created';
  if (video.masterSourceUrl || video.masterKey) return 'Waiting for Contabo HLS';
  return 'Viewer delivery missing';
}

function getNextStep(video: ProcessingVideo, pipelineHealth: PipelineHealth) {
  if (!pipelineHealth.contaboReady) {
    return 'Complete pipeline configuration before queueing Contabo.';
  }
  if (!video.masterKey && !video.masterSourceUrl) {
    return 'Attach a Dropbox URL or Bunny master first.';
  }
  if (video.processingStatus === 'TRANSCODE_FAILED') {
    return 'Review the worker error, fix the source, then restart Contabo.';
  }
  if (isPipelineWorking(video)) {
    return 'Wait for the worker callback or sync the latest Contabo status.';
  }
  if (video.processingStatus === 'READY_TO_STREAM' || video.status === 'READY') {
    return 'Publish the title when release checks are complete.';
  }
  return 'Queue Contabo HLS processing.';
}

function getOperationStyles(tone: OperationState['tone']) {
  if (tone === 'error') {
    return {
      cardClassName: 'status-error',
      backgroundColor: '#fef2f2',
      borderColor: '#dc2626',
      icon: '!'
    };
  }

  if (tone === 'working') {
    return {
      cardClassName: 'status-warn',
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
      icon: '...'
    };
  }

  return {
    cardClassName: 'status-live',
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    icon: 'OK'
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
  const [selectedStage, setSelectedStage] = useState<PipelineStage>('overview');
  const [sourceDrafts, setSourceDrafts] = useState<Record<string, string>>({});

  const sortedProducers = useMemo(
    () => [...producers].sort((a, b) => b.videos.length - a.videos.length || a.name.localeCompare(b.name)),
    [producers]
  );

  const allVideos = useMemo(
    () => producers.flatMap((producer) =>
      producer.videos.map((video) => ({ ...video, creatorName: producer.name, creatorEmail: producer.email, creatorNumber: producer.creatorNumber }))
    ),
    [producers]
  );

  const selectedProducer = useMemo(
    () => sortedProducers.find((producer) => producer.id === selectedProducerId) ?? null,
    [sortedProducers, selectedProducerId]
  );

  const filteredVideos = useMemo(() => {
    const source = selectedProducer ? selectedProducer.videos : allVideos;

    if (selectedStage === 'needs-source') {
      return source.filter((video) => !video.masterKey && !video.masterSourceUrl && !isLive(video));
    }

    if (selectedStage === 'ready') {
      return source.filter(
        (video) =>
          (video.masterKey || video.masterSourceUrl) &&
          !isPipelineWorking(video) &&
          !isLive(video)
      );
    }

    if (selectedStage === 'in-progress') {
      return source.filter((video) => isPipelineWorking(video) && !isLive(video));
    }

    return source.filter((video) => !isLive(video));
  }, [allVideos, selectedProducer, selectedStage]);

  const activeVideos = useMemo(() => allVideos.filter(isPipelineWorking), [allVideos]);

  const stageCounts = useMemo(
    () => ({
      needsSource: allVideos.filter((video) => !video.masterKey && !video.masterSourceUrl && !isLive(video)).length,
      ready: allVideos.filter(
        (video) =>
          (video.masterKey || video.masterSourceUrl) &&
          !isPipelineWorking(video) &&
          !isLive(video)
      ).length,
      inProgress: allVideos.filter((video) => isPipelineWorking(video) && !isLive(video)).length,
      live: allVideos.filter(isLive).length,
      total: allVideos.filter((video) => !isLive(video)).length
    }),
    [allVideos]
  );

  useEffect(() => {
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
  }, [activeVideos]);

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

  async function updateStatus(videoId: string, action: string) {
    startOperation(videoId, 'Updating processing status...');
    try {
      const response = await fetch('/api/admin/videos/processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to update processing status.');
      await refreshVideo(videoId, payload.video);
      finishOperation(videoId, payload.message ?? 'Processing status updated.');
    } catch (error) {
      failOperation(videoId, error, 'Unable to update processing status.');
    } finally {
      setPendingId(null);
    }
  }

  async function deleteMaster(videoId: string) {
    startOperation(videoId, 'Removing source master...');
    try {
      const response = await fetch(`/api/admin/videos/${videoId}/master`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to delete source.');
      if (!payload.video) throw new Error(payload.error ?? 'Source deleted, but the updated movie data was not returned.');
      await refreshVideo(videoId, payload.video);
      finishOperation(videoId, 'Source deleted. HLS remains as the viewer playback source.');
    } catch (error) {
      failOperation(videoId, error, 'Unable to delete source.');
    } finally {
      setPendingId(null);
    }
  }

  async function completeProcessing(videoId: string) {
    startOperation(videoId, 'Syncing HLS pipeline status...');
    try {
      const response = await fetch('/api/admin/videos/processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'SYNC_PIPELINE' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to sync HLS pipeline.');
      if (!payload.video) throw new Error(payload.error ?? 'Pipeline sync completed, but the updated movie data was not returned.');
      await refreshVideo(videoId, payload.video);
      finishOperation(videoId, payload.message ?? 'HLS pipeline synced.');
    } catch (error) {
      failOperation(videoId, error, 'Unable to sync HLS pipeline.');
    } finally {
      setPendingId(null);
    }
  }

  async function attachDropboxSource(videoId: string) {
    const sourceUrl = sourceDrafts[videoId]?.trim() ?? '';
    if (!sourceUrl) {
      failOperation(videoId, new Error('Paste a Dropbox share link before attaching the master source.'), 'Paste a Dropbox share link before attaching the master source.');
      return;
    }

    startOperation(videoId, 'Attaching Dropbox source...');
    try {
      const response = await fetch('/api/admin/videos/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, sourceUrl })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to attach Dropbox source.');
      if (!payload.video) throw new Error(payload.error ?? 'Dropbox source attached, but the updated movie data was not returned.');
      await refreshVideo(videoId, payload.video);
      setSourceDrafts((current) => ({ ...current, [videoId]: '' }));
      finishOperation(videoId, payload.message ?? 'Dropbox source attached.');
    } catch (error) {
      failOperation(videoId, error, 'Unable to attach Dropbox source.');
    } finally {
      setPendingId(null);
    }
  }

  async function startPipeline(videoId: string) {
    if (!pipelineHealth.contaboReady) {
      failOperation(
        videoId,
        new Error(`Contabo pipeline is not fully configured. Missing: ${pipelineHealth.missingConfig.join(', ')}`),
        'Contabo pipeline is not fully configured.'
      );
      return;
    }

    startOperation(videoId, 'Queueing Contabo worker...');
    try {
      const response = await fetch('/api/admin/videos/processing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'START_PIPELINE' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to start HLS pipeline.');
      if (!payload.video) throw new Error(payload.error ?? 'Contabo HLS pipeline started, but the updated movie data was not returned.');
      await refreshVideo(videoId, payload.video);
      finishOperation(videoId, payload.message ?? 'Contabo HLS processing started. Waiting for worker callback...');
    } catch (error) {
      failOperation(videoId, error, 'Unable to start HLS pipeline.');
    } finally {
      setPendingId(null);
    }
  }

  async function publish(videoId: string) {
    await updateStatus(videoId, 'PUBLISH');
  }

  const selectedStageLabel = STAGES.find((stage) => stage.id === selectedStage)?.label ?? 'Pipeline';
  const selectedStageDescription = STAGES.find((stage) => stage.id === selectedStage)?.description ?? '';
  const message = operation?.text ?? null;
  const bannerTone = operation?.tone ?? 'success';
  const bannerStyles = getOperationStyles(bannerTone);

  return (
    <div className="stack-list">
      {message ? (
        <div className={`card ${bannerStyles.cardClassName}`} style={{ padding: 12, borderRadius: 4, backgroundColor: bannerStyles.backgroundColor, borderLeft: `4px solid ${bannerStyles.borderColor}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pendingId ? (
              <span style={{ fontSize: 12, display: 'inline-block' }} className="spinner">⏳</span>
            ) : (
              <span style={{ fontSize: 12 }}>✓</span>
            )}
            <strong>{message}</strong>
          </div>
        </div>
      ) : null}

      <div className={`card ${pipelineHealth.contaboReady ? 'status-live' : 'status-warn'}`}>
        <div className="stack-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <span className="pill">Pipeline health</span>
            <h3 style={{ margin: '8px 0 0' }}>
              {pipelineHealth.contaboReady ? 'Contabo and Bunny are configured for admin pipeline work.' : 'Pipeline setup needs attention before Contabo can run cleanly.'}
            </h3>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Contabo endpoint: {pipelineHealth.contaboApiUrl ?? 'Missing'} | Callback base URL: {pipelineHealth.callbackBaseUrl ?? 'Missing'}
            </p>
          </div>
          {!pipelineHealth.contaboReady ? (
            <div className="detail-card" style={{ minWidth: 280 }}>
              <span className="detail-label">Missing config</span>
              <strong>{pipelineHealth.missingConfig.join(', ')}</strong>
            </div>
          ) : null}
        </div>
      </div>

      <div className="stack-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <span className="pill">Content pipeline</span>
          <h2 style={{ margin: '8px 0 0' }}>One dashboard for intake, moderation, processing and delivery.</h2>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Manage the producer intake feed, moderation signals, batch masters and Contabo HLS progress from a unified pipeline view.
          </p>
        </div>
        <div className="action-list" style={{ margin: 0 }}>
          <a className="btn btn-primary" href="/admin/upload">Create title</a>
          <a className="btn btn-ghost" href="/admin/moderation">Moderation</a>
          <a className="btn btn-ghost" href="/admin/intake">Producer intake</a>
          <a className="btn btn-ghost" href="/admin/live">Live movies</a>
        </div>
      </div>

      <div className="detail-grid" style={{ margin: '20px 0' }}>
        <div className="detail-card">
          <span className="detail-label">Active producers</span>
          <strong>{producers.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Total titles in pipeline</span>
          <strong>{stageCounts.total}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Pending intake</span>
          <strong>{initialPendingIntakeCount}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Moderation pending</span>
          <strong>{initialModerationCounts.pending}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Live titles</span>
          <strong>{stageCounts.live}</strong>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Live work is moved out of the workflow into the dedicated live movies desk.
          </p>
        </div>
      </div>

      <div className="stack-row" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {STAGES.map((stage) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => setSelectedStage(stage.id)}
            className={`btn btn-ghost${selectedStage === stage.id ? ' status-live' : ''}`}
            style={{ minWidth: 160, textAlign: 'left' }}
          >
            <strong>{stage.label}</strong>
            <p className="muted" style={{ margin: '6px 0 0' }}>{stage.description}</p>
          </button>
        ))}
      </div>

      {selectedStage === 'overview' ? (
        <div className="detail-grid">
          <div className="detail-card">
            <span className="detail-label">Need source</span>
            <strong>{stageCounts.needsSource}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Ready for processing</span>
            <strong>{stageCounts.ready}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">HLS processing</span>
            <strong>{stageCounts.inProgress}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Live / ready</span>
            <strong>{stageCounts.live}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Selected stage</span>
            <strong>{selectedStageLabel}</strong>
            <p className="muted" style={{ margin: '6px 0 0' }}>{selectedStageDescription}</p>
          </div>
        </div>
      ) : selectedStage === 'intake' ? (
        <div className="card">
          <h3>Intake and title creation</h3>
          <p className="muted" style={{ margin: '8px 0' }}>
            Use the create title desk to build new content for approved producers and keep the inventory moving into moderation.
          </p>
          <div className="action-list" style={{ margin: 0 }}>
            <a className="btn btn-primary" href="/admin/upload">Open create desk</a>
            <a className="btn btn-ghost" href="/admin/intake">Review producer intake</a>
          </div>
        </div>
      ) : selectedStage === 'moderation' ? (
        <div className="card">
          <h3>Moderation queue</h3>
          <div className="detail-grid" style={{ marginTop: 16 }}>
            <div className="detail-card"><span className="detail-label">Pending review</span><strong>{initialModerationCounts.pending}</strong></div>
            <div className="detail-card"><span className="detail-label">Approved</span><strong>{initialModerationCounts.approved}</strong></div>
            <div className="detail-card"><span className="detail-label">Orphan approved</span><strong>{initialModerationCounts.orphanApproved}</strong></div>
          </div>
          <div className="action-list" style={{ margin: '20px 0 0' }}>
            <a className="btn btn-primary" href="/admin/moderation">Open moderation queue</a>
            <a className="btn btn-ghost" href="/admin/settings">Pricing controls</a>
          </div>
        </div>
      ) : (
        <>
          <div className="stack-row" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span className="pill">{selectedStageLabel}</span>
              <h2 style={{ margin: '8px 0 0' }}>{selectedProducer ? `${selectedProducer.name} — ${selectedStageLabel}` : selectedStageLabel}</h2>
              <p className="muted" style={{ margin: '6px 0 0' }}>{selectedStageDescription}</p>
            </div>
            <div className="action-list" style={{ margin: 0 }}>
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
              {selectedProducer ? (
                <button className="btn btn-ghost" type="button" onClick={() => setSelectedProducerId(null)}>
                  Clear producer filter
                </button>
              ) : null}
            </div>
          </div>

          <div className="detail-grid" style={{ margin: '16px 0' }}>
            <div className="detail-card"><span className="detail-label">Titles in stage</span><strong>{filteredVideos.length}</strong></div>
            <div className="detail-card"><span className="detail-label">Active processing</span><strong>{activeVideos.length}</strong></div>
            <div className="detail-card"><span className="detail-label">Selected producer</span><strong>{selectedProducer ? selectedProducer.name : 'All'}</strong></div>
          </div>

          {filteredVideos.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((video) => {
            const busy = pendingId === video.id;
            const command = buildFfmpegCommand(video.id, video.masterFileName ?? 'downloaded-master.mp4');
            const canPublish = video.status === 'READY';
            const canStartPipeline = Boolean(
              pipelineHealth.contaboReady &&
              (video.masterKey || video.masterSourceUrl) &&
              !busy &&
              !isPipelineWorking(video) &&
              !(video.hlsManifestKey && video.hlsReadyAt)
            );
            const canSyncPipeline = Boolean((video.orchestrationJobId || isPipelineWorking(video)) && !busy);
            const canDeleteSource = Boolean((video.masterKey || video.masterSourceUrl) && video.masterDeletionEligible && !busy);
            const operationForVideo = operation?.videoId === video.id ? operation : null;
            const operationForVideoStyles = operationForVideo ? getOperationStyles(operationForVideo.tone) : null;

            return (
              <div key={video.id} className="card">
                <div className="stack-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <span className={`status-chip ${getBucketTone(getBucket(video))}`}>{getBucket(video).replace('-', ' ')}</span>
                    <h3 style={{ margin: '10px 0 4px' }}>{video.title}</h3>
                    <p className="muted">{video.creatorName} · {video.creatorEmail}</p>
                    <p className="muted">Status: {video.status} | Processing: {video.processingStatus}</p>
                    <p className="muted" style={{ marginTop: 6 }}>{getPipelineSummary(video)}</p>
                  </div>
                  <div className="action-list" style={{ justifyContent: 'flex-end', margin: 0 }}>
                    {video.trailerDownloadHref ? <a className="btn btn-ghost" href={video.trailerDownloadHref}>Trailer</a> : null}
                    {video.posterDownloadHref ? <a className="btn btn-ghost" href={video.posterDownloadHref}>Poster</a> : null}
                  </div>
                </div>

                <div className="detail-grid" style={{ margin: '16px 0' }}>
                  <div className="detail-card"><span className="detail-label">Master source</span><strong>{getSourceLabel(video)}</strong></div>
                  <div className="detail-card"><span className="detail-label">Viewer delivery</span><strong>{getDeliveryLabel(video)}</strong></div>
                  <div className="detail-card"><span className="detail-label">Next step</span><strong>{getNextStep(video, pipelineHealth)}</strong></div>
                  <div className="detail-card"><span className="detail-label">File name</span><strong>{video.masterFileName ?? 'No master source yet'}</strong></div>
                  <div className="detail-card"><span className="detail-label">File size</span><strong>{formatBytes(video.masterFileSize)}</strong></div>
                  <div className="detail-card"><span className="detail-label">Uploaded</span><strong>{formatDate(video.masterUploadedAt)}</strong></div>
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
                      {busy && pendingId === video.id ? '⏳ Attaching...' : 'Attach Dropbox URL'}
                    </button>
                    {video.masterSourceUrl ? (
                      <a className="btn btn-ghost" href={video.masterSourceUrl} target="_blank" rel="noreferrer">
                        Open source
                      </a>
                    ) : null}
                  </div>
                </div>

                {operationForVideo && operationForVideoStyles ? (
                  <div className={`detail-card ${operationForVideoStyles.cardClassName}`} style={{ marginBottom: 16, backgroundColor: operationForVideoStyles.backgroundColor, borderLeft: `4px solid ${operationForVideoStyles.borderColor}` }}>
                    <span className="detail-label">Latest action</span>
                    <strong>{operationForVideo.text}</strong>
                  </div>
                ) : null}

                <div className="action-list">
                  {video.masterKey ? <a className="btn btn-primary" href={`/api/admin/videos/${video.id}/master`}>Download MP4</a> : null}
                  <button className="btn btn-ghost" type="button" disabled={!video.masterKey || busy} onClick={() => void navigator.clipboard.writeText(command)}>
                    {busy && pendingId === video.id ? '⏳ Copying...' : 'Copy master normalize command'}
                  </button>
                  <button className="btn btn-primary" type="button" disabled={!canStartPipeline} onClick={() => void startPipeline(video.id)}>
                    {busy && pendingId === video.id ? '⏳ Starting Contabo...' : 'Start Contabo HLS'}
                  </button>
                  <button className="btn btn-ghost" type="button" disabled={!canSyncPipeline} onClick={() => void completeProcessing(video.id)}>
                    {busy && pendingId === video.id ? '⏳ Syncing...' : 'Sync Contabo status'}
                  </button>
                  <button className="btn btn-ghost" type="button" disabled={!canDeleteSource} onClick={() => void deleteMaster(video.id)}>
                    {busy && pendingId === video.id ? '⏳ Deleting...' : 'Delete source'}
                  </button>
                  {canPublish ? (
                    <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void publish(video.id)}>
                      {busy && pendingId === video.id ? '⏳ Publishing...' : 'Publish'}
                    </button>
                  ) : null}
                </div>

                {video.masterKey ? (
                  <div className="detail-card" style={{ marginTop: 14 }}>
                    <span className="detail-label">Master normalize command</span>
                    <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{command}</code>
                  </div>
                ) : null}

                <div className="detail-grid" style={{ marginTop: 14 }}>
                  <div className="detail-card"><span className="detail-label">Playback</span><strong>{video.hlsManifestKey ? 'HLS pipeline' : video.masterSourceUrl ? 'Dropbox source pending HLS' : video.masterKey ? 'Bunny source pending HLS' : 'No source yet'}</strong></div>
                  <div className="detail-card"><span className="detail-label">Playback URL</span><strong>{video.playbackUrl ?? (video.hlsManifestKey ? 'Signed HLS manifest generated on request' : 'Not ready yet')}</strong></div>
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

          {!filteredVideos.length ? <div className="card">No movies in this section yet.</div> : null}
        </>
      )}
    </div>
  );
}
