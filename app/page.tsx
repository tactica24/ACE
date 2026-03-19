import Image from 'next/image';
import Link from 'next/link';
import { PriceTier, VideoStatus } from '@prisma/client';
import { headers } from 'next/headers';
import VideoCard from '@/components/VideoCard';
import { prisma } from '@/lib/db';
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
            <div className="pill">Streaming for Africa | Living room ready</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '22px 0 14px' }}>
              <Image src="/ace-studio-mark.svg" alt="Ace Studio" width={88} height={88} priority />
              <div>
                <h1 className="hero-title">Ace Studio</h1>
                <p className="hero-sub" style={{ marginTop: 8 }}>
                  Premium pay-per-view cinema, creator payouts, and TV-first streaming with neon polish.
                </p>
              </div>
            </div>
            <p className="hero-sub">
              Replace low-yield ad models with micro-transactions, edge-cached playback, creator licensing, and living-room discovery.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/browse">Explore Catalog</Link>
              <Link className="btn btn-ghost" href="/tv">Open TV Experience</Link>
              <Link className="btn btn-ghost" href="/studio">Creator Dashboard</Link>
            </div>
          </div>
          <div className="grid">
            <div className="card">
              <div className="badge">Latency Target</div>
              <h3 className="section-title" style={{ marginTop: 12 }}>Under 20ms in Nigeria</h3>
              <p className="muted">Regional relays in Lagos and Abuja keep HLS playback close to viewers.</p>
            </div>
            <div className="card">
              <div className="badge">Revenue Split</div>
              <h3 className="section-title" style={{ marginTop: 12 }}>60% creator share</h3>
              <p className="muted">Creator revenue stays protected while referrals are paid from the platform share.</p>
            </div>
            <div className="card">
              <div className="badge">Trust and Safety</div>
              <h3 className="section-title" style={{ marginTop: 12 }}>Watermarked, moderated, verified</h3>
              <p className="muted">Signed HLS URLs, creator onboarding, admin moderation, and removal from production when needed.</p>
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
            <div className="card">No approved titles yet. Upload your first release in Ace Studio.</div>
          )}
        </div>
      </section>
    </div>
  );
}