import TvPairingPanel from '@/components/TvPairingPanel';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getRegionalPrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function TvPage() {
  const user = await getCurrentUser();
  if (user) {
    const primaryAppPath = getPrimaryAppPath(user);
    if (primaryAppPath !== '/browse') {
      redirect(primaryAppPath);
    }
  }

  let videos: Awaited<ReturnType<typeof prisma.video.findMany>> = [];
  try {
    videos = await prisma.video.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  } catch {
    videos = [];
  }

  const requestHeaders = headers();

  return (
    <div className="section">
      <div className="container">
        <div className="tv-layout">
          <div className="hero-card">
            <div className="pill">Ace Studio TV</div>
            <h1 className="hero-title" style={{ marginTop: 14 }}>Big-screen browsing that matches the main catalog</h1>
            <p className="hero-sub">Approved titles, artwork, pricing, and metadata are carried here without layout drift.</p>
            <div className="detail-grid" style={{ marginTop: 22 }}>
              <div className="detail-card">
                <span className="detail-label">Titles on screen</span>
                <strong>{videos.length}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Layout</span>
                <strong>Poster-first</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Pairing</span>
                <strong>Phone to TV</strong>
              </div>
            </div>
          </div>

          <TvPairingPanel />
        </div>

        {videos.length ? (
          <div className="video-grid tv-grid">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={{ ...video, price: getRegionalPrice(requestHeaders, video.priceTier) }}
              />
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <h3>No approved titles are ready for TV yet</h3>
            <p className="muted">Once moderation approves a release, it will appear here with its poster and title details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
