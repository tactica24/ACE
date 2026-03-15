import { prisma } from '@/lib/db';
import { VideoStatus } from '@prisma/client';
import Link from 'next/link';

export default async function HighlightsPage() {
  const videos = await prisma.video.findMany({
    where: { status: VideoStatus.APPROVED },
    orderBy: { createdAt: 'desc' },
    take: 12
  });

  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <div className="pill">ACE Highlights</div>
          <h1 className="hero-title" style={{ marginTop: 12 }}>Preview the moments that matter</h1>
          <p className="muted">Curated highlight scenes and teaser moments to entice viewers.</p>
        </div>
        <div className="grid">
          {videos.map((video) => (
            <div key={video.id} className="card">
              <strong>{video.title}</strong>
              <p className="muted" style={{ marginTop: 6 }}>{video.description}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {video.highlightSeconds.length ? (
                  video.highlightSeconds.map((sec) => (
                    <span key={sec} className="badge">{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</span>
                  ))
                ) : (
                  <span className="badge">No highlights yet</span>
                )}
              </div>
              <div style={{ marginTop: 12 }}>
                <Link className="btn btn-ghost" href={`/v/${video.id}`}>Watch teaser</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
