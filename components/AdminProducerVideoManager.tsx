'use client';

import { useMemo, useState } from 'react';

type ProducerVideo = {
  id: string;
  title: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  category: string;
  videoType: string;
  releaseYear: number | null;
  createdAt: string;
  seriesTitle?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  trailerDownloadHref?: string | null;
  posterDownloadHref?: string | null;
  packageLabel?: string;
  packageStatus?: string;
  subtitleStatus?: string;
  deliveryFormat?: string;
};

function getStatusTone(status: string) {
  if (status === 'APPROVED') return 'status-live';
  if (status === 'REJECTED') return 'status-warn';
  return 'status-review';
}

function getAvailabilityLabel(status: string) {
  if (status === 'APPROVED') return 'Visible to viewers';
  if (status === 'DRAFT') return 'Hidden from viewers';
  if (status === 'PENDING') return 'Awaiting review';
  if (status === 'REJECTED') return 'Rejected from catalog';
  return status;
}

function formatCreatedAt(value: string) {
  return value.slice(0, 10);
}

export default function AdminProducerVideoManager({
  userId,
  initialVideos
}: {
  userId: string;
  initialVideos: ProducerVideo[];
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(
    () => ({
      total: videos.length,
      live: videos.filter((video) => video.status === 'APPROVED').length,
      hidden: videos.filter((video) => video.status === 'DRAFT').length,
      rejected: videos.filter((video) => video.status === 'REJECTED').length
    }),
    [videos]
  );

  const updateStatus = async (videoId: string, status: ProducerVideo['status']) => {
    setPendingVideoId(videoId);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/videos/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, videoId, status })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.video) {
        throw new Error(payload.error ?? 'Unable to update movie status right now.');
      }

      setVideos((current) =>
        current.map((video) =>
          video.id === videoId
            ? {
                ...video,
                status: payload.video.status
              }
            : video
        )
      );
      setMessage(payload.message ?? 'Movie status updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update movie status right now.');
    } finally {
      setPendingVideoId(null);
    }
  };

  return (
    <div className="card">
      <div className="detail-grid" style={{ marginBottom: 18 }}>
        <div className="detail-card">
          <span className="detail-label">Producer titles</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Live to viewers</span>
          <strong>{summary.live}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Hidden</span>
          <strong>{summary.hidden}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Rejected</span>
          <strong>{summary.rejected}</strong>
        </div>
      </div>

      {message ? <p className="muted form-message">{message}</p> : null}

      {videos.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Movie</th>
                <th>Type</th>
                <th>Status</th>
                <th>Viewer package</th>
                <th>Availability</th>
                <th>Added</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => {
                const busy = pendingVideoId === video.id;
                const nextStatus = video.status === 'APPROVED' ? 'DRAFT' : 'APPROVED';
                const actionLabel = video.status === 'APPROVED' ? 'Deactivate' : 'Activate';

                return (
                  <tr key={video.id}>
                    <td>
                      <div className="stack-list" style={{ gap: 4 }}>
                        <strong>{video.title}</strong>
                        <span className="muted">
                          {video.category}
                          {video.releaseYear ? ` | ${video.releaseYear}` : ''}
                          {video.seriesTitle ? ` | Series: ${video.seriesTitle}` : ''}
                          {video.seasonNumber ? ` | S${video.seasonNumber}` : ''}
                          {video.episodeNumber ? `E${video.episodeNumber}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>{video.videoType}</td>
                    <td>
                      <span className={`status-chip ${getStatusTone(video.status)}`}>{video.status}</span>
                    </td>
                    <td>
                      <div className="stack-list" style={{ gap: 4 }}>
                        <strong>{video.packageLabel ?? '1080p MP4 + 720p MP4'}</strong>
                        <span className="muted">{video.packageStatus ?? 'Pending package check'}</span>
                        <span className="muted">{video.subtitleStatus ?? video.deliveryFormat ?? 'MP4 viewer package'}</span>
                      </div>
                    </td>
                    <td>{getAvailabilityLabel(video.status)}</td>
                    <td>{formatCreatedAt(video.createdAt)}</td>
                    <td>
                      <div className="action-list">
                        {video.posterDownloadHref ? (
                          <a className="btn btn-ghost" href={video.posterDownloadHref}>
                            Artwork
                          </a>
                        ) : null}
                        {video.trailerDownloadHref ? (
                          <a className="btn btn-ghost" href={video.trailerDownloadHref}>
                            Trailer
                          </a>
                        ) : null}
                        <button
                          className={video.status === 'APPROVED' ? 'btn btn-ghost' : 'btn btn-primary'}
                          type="button"
                          disabled={busy}
                          onClick={() => void updateStatus(video.id, nextStatus)}
                        >
                          {busy ? 'Saving...' : actionLabel}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">This producer does not have any uploaded movies yet.</p>
      )}
    </div>
  );
}
