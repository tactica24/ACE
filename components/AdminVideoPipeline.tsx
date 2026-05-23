'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type AdminVideoItem = {
  id: string;
  title: string | null;
  status: string;
  videoType: string;
  creatorEmail: string | null;
  releaseYear: number | null;
  r2Key: string | null;
  fallbackR2Key: string | null;
  masterUploadKey: string | null;
  masterFileName: string | null;
  masterFileSize: number | null;
  masterUploadedAt: string | null;
  masterProcessingStatus: string | null;
  hlsPlaybackUrl: string | null;
  hlsUploadedAt: string | null;
  createdAt: string;
};

type AdminVideoPipelineProps = {
  initialVideos: AdminVideoItem[];
};

const workflowActions = [
  { id: 'encodingStarted', label: 'Mark encoding started' },
  { id: 'encodingCompleted', label: 'Mark encoding completed' },
  { id: 'hlsUploaded', label: 'Mark HLS uploaded' },
  { id: 'readyToStream', label: 'Mark ready to stream' }
] as const;

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) {
    return 'n/a';
  }
  if (bytes > 1024 * 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
  }
  if (bytes > 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function buildFfmpegCommand(video: AdminVideoItem) {
  const inputName = video.masterFileName ? video.masterFileName : 'input-master.mp4';
  return [
    `ffmpeg -i "${inputName}" \\`,
    `  -c:a aac -b:a 192k \\`,
    `  -filter_complex "[0:v]split=3[v1080][v720][v480];[v1080]scale=w=1920:h=1080:force_original_aspect_ratio=decrease[v1080out];[v720]scale=w=1280:h=720:force_original_aspect_ratio=decrease[v720out];[v480]scale=w=854:h=480:force_original_aspect_ratio=decrease[v480out]" \\`,
    `  -map "[v1080out]" -map 0:a -c:v:0 libx264 -b:v:0 5000k -preset slow -profile:v:0 high -maxrate:v:0 5350k -bufsize:v:0 7500k \\`,
    `  -map "[v720out]" -map 0:a -c:v:1 libx264 -b:v:1 3000k -preset slow -profile:v:1 high -maxrate:v:1 3210k -bufsize:v:1 4500k \\`,
    `  -map "[v480out]" -map 0:a -c:v:2 libx264 -b:v:2 1500k -preset slow -profile:v:2 main -maxrate:v:2 1600k -bufsize:v:2 2400k \\`,
    `  -f hls \\`,
    `  -hls_time 6 \\`,
    `  -hls_segment_type fmp4 \\`,
    `  -hls_playlist_type vod \\`,
    `  -master_pl_name master.m3u8 \\`,
    `  -var_stream_map "v:0,a:0 v:1,a:0 v:2,a:0" \\`,
    `  -hls_segment_filename "movies/%v/segment_%05d.m4s" \\`,
    `  movies/master.m3u8`
  ].join('\n');
}

export default function AdminVideoPipeline({ initialVideos }: AdminVideoPipelineProps) {
  const [videos, setVideos] = useState<AdminVideoItem[]>(initialVideos);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  const sortedVideos = useMemo(() => [...videos].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [videos]);

  const updateVideo = (id: string, updates: Partial<AdminVideoItem>) => {
    setVideos((current) => current.map((video) => (video.id === id ? { ...video, ...updates } : video)));
  };

  const setActionLoading = (id: string, value: boolean) => {
    setLoading((current) => ({ ...current, [id]: value }));
  };

  const runAction = async (id: string, endpoint: string, init: RequestInit) => {
    setMessage(null);
    setActionLoading(id, true);
    try {
      const response = await fetch(endpoint, init);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        throw new Error(data?.error || 'Server error');
      }
      return data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to complete the action.');
      return null;
    } finally {
      setActionLoading(id, false);
    }
  };

  const handleWorkflowAction = async (id: string, action: string) => {
    const data = await runAction(id, `/api/admin/videos/${id}/processing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    if (data?.ok) {
      updateVideo(id, { masterProcessingStatus: data.status });
    }
  };

  const handlePublish = async (id: string) => {
    const data = await runAction(id, '/api/admin/videos/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: id, status: 'APPROVED' })
    });

    if (data?.ok) {
      updateVideo(id, { status: 'APPROVED' });
    }
  };

  const handleCopyCommand = async (item: AdminVideoItem) => {
    const command = buildFfmpegCommand(item);
    await navigator.clipboard.writeText(command);
    setMessage('FFmpeg command copied to clipboard.');
  };

  return (
    <div className="stack-list">
      <div className="stack-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Admin video workflow</h1>
          <p className="muted">Manage private master uploads, HLS ingestion, preview status, and publish gating for studio releases.</p>
        </div>
        <Link className="btn btn-ghost" href="/admin">Back to admin</Link>
      </div>

      {message ? <div className="card" style={{ color: '#f7c7c7' }}>{message}</div> : null}

      {sortedVideos.map((video) => (
        <div key={video.id} className="detail-card">
          <div className="stack-row" style={{ justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h2>{video.title || 'Untitled video'}</h2>
              <p className="muted">
                {video.videoType} • {video.status} • {video.creatorEmail ?? 'Unknown creator'} • {video.releaseYear ?? 'TBD'}
              </p>
            </div>
            <div className="detail-card">
              <span className="detail-label">Creator</span>
              <strong>{video.creatorEmail ?? 'Unknown creator'}</strong>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-label">Master file</span>
              <strong>{video.masterFileName || 'No master uploaded'}</strong>
              <span>{video.masterFileSize ? formatBytes(video.masterFileSize) : '—'}</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Master status</span>
              <strong>{video.masterProcessingStatus || 'NOT STARTED'}</strong>
              <span>{video.masterUploadedAt ? new Date(video.masterUploadedAt).toLocaleString() : 'No upload timestamp'}</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">HLS preview</span>
              <strong>{video.hlsPlaybackUrl ? 'Available' : 'Pending'}</strong>
              <span>{video.hlsUploadedAt ? new Date(video.hlsUploadedAt).toLocaleString() : 'Waiting for HLS folder'}</span>
            </div>
          </div>

          <div className="field-grid field-grid-3">
            <div className="field">
              <span className="field-label">HLS folder</span>
              <Link className="btn btn-primary" href="/admin/videos">Open folder upload</Link>
            </div>
            <div className="field">
              <span className="field-label">Actions</span>
              <div className="action-list" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" type="button" onClick={() => handleCopyCommand(video)}>Copy FFmpeg command</button>
                <button className="btn btn-ghost" type="button" onClick={() => handlePublish(video.id)} disabled={loading[video.id] || !video.hlsPlaybackUrl}>Publish</button>
              </div>
            </div>
          </div>

          <div className="field-grid field-grid-3">
            {workflowActions.map((action) => (
              <button
                key={action.id}
                className="btn btn-secondary"
                type="button"
                onClick={() => handleWorkflowAction(video.id, action.id)}
                disabled={loading[video.id]}
              >
                {action.label}
              </button>
            ))}
          </div>

          {video.hlsPlaybackUrl ? (
            <div className="detail-card">
              <span className="detail-label">HLS preview player</span>
              <video controls style={{ width: '100%', maxWidth: '100%' }}>
                <source src={video.hlsPlaybackUrl} type="application/vnd.apple.mpegurl" />
                Your browser does not support HLS playback.
              </video>
              {video.masterUploadKey ? (
                <div className="action-list" style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost" type="button" onClick={async () => {
                      const data = await runAction(video.id, `/api/admin/videos/${video.id}/master`, { method: 'DELETE' });
                      if (data?.ok) updateVideo(video.id, { masterUploadKey: null, masterFileName: null, masterFileSize: null, masterUploadedAt: null, masterProcessingStatus: null });
                    }}
                  >
                    Delete master
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-label">Master download</span>
              <div className="action-list">
                <Link className="btn btn-ghost" href={`/api/admin/videos/${video.id}/master`}>Download master</Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
