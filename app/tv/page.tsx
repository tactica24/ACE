import { prisma } from '@/lib/db';
import { VideoStatus } from '@prisma/client';
import Link from 'next/link';

export default async function TvPage() {
  const videos = await prisma.video.findMany({
    where: { status: VideoStatus.APPROVED },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const labelize = (value: string) =>
    value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  const ageLabel: Record<string, string> = {
    ALL: 'All',
    PG13: '13+',
    PG16: '16+',
    PG18: '18+'
  };

  return (
    <div style={{ padding: '60px 0' }}>
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <div className="pill">ACE TV</div>
          <h1 className="hero-title" style={{ fontSize: '3rem', marginTop: 12 }}>Lean-back cinema for the big screen</h1>
          <p className="muted" style={{ fontSize: '1.1rem' }}>Remote-friendly tiles, quick unlocks, zero buffering.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {videos.map((video) => (
            <Link key={video.id} href={`/v/${video.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'white', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(15, 14, 13, 0.08)' }}>
                <div style={{ height: 180, background: 'linear-gradient(135deg, #f7c89c, #f2e3cf)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                  {video.title}
                </div>
                <div style={{ padding: 16 }}>
                  <strong style={{ display: 'block', fontSize: '1.1rem' }}>{video.title}</strong>
                  <span className="muted" style={{ display: 'block', marginTop: 6 }}>
                    {video.category} · {labelize(video.videoType)} · {ageLabel[video.ageRating] ?? labelize(video.ageRating)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
