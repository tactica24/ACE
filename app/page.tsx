import VideoCard from '@/components/VideoCard';
import { prisma } from '@/lib/db';
import { VideoStatus, PriceTier } from '@prisma/client';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getRegionalPrice } from '@/lib/pricing';

export default async function HomePage() {
  let videos = [] as {
    id: string;
    title: string;
    description: string;
    priceTier: PriceTier;
    posterKey: string | null;
    videoType: string;
    ageRating: string;
    category: string;
  }[];
  try {
    videos = await prisma.video.findMany({
      where: { status: VideoStatus.APPROVED },
      take: 6,
      orderBy: { createdAt: 'desc' }
    });
  } catch {
    videos = [];
  }

  const requestHeaders = headers();

  return (
    <div>
      <section className="section">
        <div className="container hero">
          <div className="hero-card">
            <div className="pill">MASTER PRD · Lagos Relay Ready</div>
            <h1 className="hero-title">ACE Studio powers Africa-first video monetization.</h1>
            <p className="hero-sub">
              Replace low-yield ad models with micro-transactions, edge-cached streaming, and creator-led licensing.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/browse">Explore Catalog</Link>
              <Link className="btn btn-ghost" href="/studio">Creator Dashboard</Link>
            </div>
          </div>
          <div className="grid">
            <div className="card">
              <div className="badge">Latency Target</div>
              <h3 className="section-title" style={{ marginTop: 12 }}>Under 20ms in Nigeria</h3>
              <p className="muted">Lagos Relay caches once and serves locally for ultra-low latency.</p>
            </div>
            <div className="card">
              <div className="badge">Revenue Split</div>
              <h3 className="section-title" style={{ marginTop: 12 }}>60% creator share</h3>
              <p className="muted">Net split after gateway fees. Platform keeps 40% to sustain relays.</p>
            </div>
            <div className="card">
              <div className="badge">Hybrid Pass</div>
              <h3 className="section-title" style={{ marginTop: 12 }}>NGN 2,500 / month</h3>
              <p className="muted">30 credits to keep margins healthy without killing volume.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 10 }}>
        <div className="container">
          <h2 className="section-title">Featured Releases</h2>
          {videos.length ? (
            <div className="video-grid">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={{ ...video, price: getRegionalPrice(requestHeaders, video.priceTier) }}
                />
              ))}
            </div>
          ) : (
            <div className="card">No approved titles yet. Upload your first release in ACE Studio.</div>
          )}
        </div>
      </section>
    </div>
  );
}




