import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString();
}

function getOwnerName(creator: { email: string; creator: { displayName: string | null } | null }) {
  return creator.creator?.displayName ?? creator.email;
}

export default async function AdminLiveMoviesPage() {
  await requireAdminUser('/admin/live');

  const liveVideos = await prisma.video.findMany({
    where: {
      seriesId: null,
      OR: [
        { status: { in: ['READY', 'PUBLISHED'] } },
        { technicalMetadata: { processingStatus: 'READY_TO_STREAM' } }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      videoType: true,
      releaseYear: true,
      createdAt: true,
      updatedAt: true,
      description: true,
      technicalMetadata: {
        select: {
          masterKey: true,
          masterSourceUrl: true,
          processingStatus: true,
          playbackUrl: true,
          hlsManifestKey: true,
          hlsReadyAt: true,
          masterUploadedAt: true
        }
      },
      creator: {
        select: {
          email: true,
          creator: {
            select: {
              displayName: true,
              displayImage: true
            }
          }
        }
      }
    }
  });

  const publishedCount = liveVideos.filter((v) => v.status === 'PUBLISHED').length;
  const readyCount = liveVideos.filter((v) => v.technicalMetadata?.processingStatus === 'READY_TO_STREAM').length;

  return (
    <DashboardShell
      title="Live movies"
      description="Published titles with live HLS delivery ready for streaming"
      sideNav={<SideNav active="/admin/live" items={getAdminNavItems()} />}
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Total live titles</span>
          <strong>{liveVideos.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Published</span>
          <strong>{publishedCount}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">HLS ready to stream</span>
          <strong>{readyCount}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Latest updated</span>
          <strong>{liveVideos.length ? formatDate(liveVideos[0]?.updatedAt.toISOString()) : 'N/A'}</strong>
        </div>
      </div>

      {liveVideos.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16, marginTop: 20 }}>
          {liveVideos.map((video) => {
            const sourceLabel = video.technicalMetadata?.masterSourceUrl
              ? 'Dropbox'
              : video.technicalMetadata?.masterKey
                ? 'Bunny CDN'
                : 'Unknown';

            const isPublished = video.status === 'PUBLISHED';
            const isHlsReady = video.technicalMetadata?.processingStatus === 'READY_TO_STREAM' || !!video.technicalMetadata?.hlsManifestKey;

            return (
              <div
                key={video.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {/* Header with status badges */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 4,
                      backgroundColor: isPublished ? '#dcfce7' : '#fef3c7',
                      color: isPublished ? '#166534' : '#92400e'
                    }}
                  >
                    {video.status}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 4,
                      backgroundColor: isHlsReady ? '#dbeafe' : '#e0e7ff',
                      color: isHlsReady ? '#0c4a6e' : '#3730a3'
                    }}
                  >
                    {isHlsReady ? '✓ HLS Ready' : 'HLS Pending'}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
                    {video.title}
                  </h3>
                  {video.description && (
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 14,
                        color: '#6b7280',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {video.description}
                    </p>
                  )}
                </div>

                {/* Producer info */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Producer</span>
                  <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600 }}>
                    {getOwnerName(video.creator)}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
                    {video.creator.email}
                  </p>
                </div>

                {/* Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  {video.category && (
                    <div>
                      <span style={{ color: '#6b7280', fontWeight: 500 }}>Category</span>
                      <p style={{ margin: '2px 0 0', color: '#111827', fontWeight: 600 }}>{video.category}</p>
                    </div>
                  )}
                  {video.videoType && (
                    <div>
                      <span style={{ color: '#6b7280', fontWeight: 500 }}>Type</span>
                      <p style={{ margin: '2px 0 0', color: '#111827', fontWeight: 600 }}>{video.videoType}</p>
                    </div>
                  )}
                  {video.releaseYear && (
                    <div>
                      <span style={{ color: '#6b7280', fontWeight: 500 }}>Release year</span>
                      <p style={{ margin: '2px 0 0', color: '#111827', fontWeight: 600 }}>{video.releaseYear}</p>
                    </div>
                  )}
                  <div>
                    <span style={{ color: '#6b7280', fontWeight: 500 }}>Source</span>
                    <p style={{ margin: '2px 0 0', color: '#111827', fontWeight: 600 }}>{sourceLabel}</p>
                  </div>
                </div>

                {/* Technical details */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Technical details</span>
                  <div style={{ fontSize: 12, margin: '6px 0 0', display: 'grid', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>HLS Manifest</span>
                      <span style={{ color: '#111827', fontWeight: 600 }}>
                        {video.technicalMetadata?.hlsManifestKey ? '✓ Generated' : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Playback URL</span>
                      <span style={{ color: '#111827', fontWeight: 600 }}>
                        {video.technicalMetadata?.playbackUrl ? '✓ Available' : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>HLS ready at</span>
                      <span style={{ color: '#111827', fontWeight: 600 }}>
                        {video.technicalMetadata?.hlsReadyAt ? formatDate(video.technicalMetadata.hlsReadyAt.toISOString()) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Timeline</span>
                  <div style={{ fontSize: 12, margin: '6px 0 0', display: 'grid', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Created</span>
                      <span style={{ color: '#111827', fontWeight: 600 }}>
                        {formatDate(video.createdAt.toISOString())}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Last updated</span>
                      <span style={{ color: '#111827', fontWeight: 600 }}>
                        {formatDateTime(video.updatedAt.toISOString())}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
                  <a
                    href={`/v/${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 4,
                      backgroundColor: '#1f2937',
                      color: '#ffffff',
                      textDecoration: 'none',
                      textAlign: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    View movie →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: 24, textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>No live titles yet</h3>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
            Publish movies from the pipeline to see them here
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
