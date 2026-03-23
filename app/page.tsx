import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import VideoCard from '@/components/VideoCard';
import { prisma } from '@/lib/db';
import { getMediaAssetUrl } from '@/lib/media';
import { type PriceTierValue } from '@/lib/media-types';
import { getRegionalPrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

type HomeVideo = {
  id: string;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  posterKey: string | null;
  videoType: string;
  ageRating: string;
  category: string;
};

export default async function HomePage() {
  let videos: HomeVideo[] = [];

  try {
    videos = await prisma.video.findMany({
      where: { status: 'APPROVED' },
      take: 8,
      orderBy: { createdAt: 'desc' }
    });
  } catch {
    videos = [];
  }

  const requestHeaders = headers();
  const featured = videos.slice(0, 4);

  return (
    <div>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container hero">
          <div className="hero-card">
            <div className="pill">ACE Marketplace</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '22px 0 18px', flexWrap: 'wrap' }}>
              <Image src="/ace-studio-mark.svg" alt="Ace Studio" width={88} height={88} priority />
              <div>
                <h1 className="hero-title">Ace Studio</h1>
                <p className="hero-sub">A clean release flow for creators, moderators, and TV-ready viewers.</p>
              </div>
            </div>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/browse">Browse titles</Link>
              <Link className="btn btn-ghost" href="/tv">Open TV mode</Link>
              <Link className="btn btn-ghost" href="/studio/upload">Submit a release</Link>
            </div>
            <div className="detail-grid" style={{ marginTop: 20 }}>
              <div className="detail-card">
                <span className="detail-label">Latest titles</span>
                <strong>{videos.length}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">TV pairing</span>
                <strong>Ready</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Creator flow</span>
                <strong>Submission to review</strong>
              </div>
            </div>
          </div>

          <div className="hero-showcase">
            {featured.length ? (
              featured.map((slide) => {
                const posterUrl = getMediaAssetUrl(slide.posterKey);
                return (
                  <Link
                    key={slide.id}
                    href={`/v/${slide.id}`}
                    className="hero-poster"
                    style={posterUrl ? { backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  >
                    <span>{slide.title}</span>
                  </Link>
                );
              })
            ) : (
              <>
                <div className="hero-panel">
                  <strong>Homepage</strong>
                  <p className="muted">Approved releases appear here automatically.</p>
                </div>
                <div className="hero-panel">
                  <strong>Creator upload</strong>
                  <p className="muted">Pricing, artwork, and runtime stay aligned through review.</p>
                </div>
                <div className="hero-panel">
                  <strong>Admin review</strong>
                  <p className="muted">Moderators get the same metadata the creator submits.</p>
                </div>
                <div className="hero-panel">
                  <strong>TV shelf</strong>
                  <p className="muted">Approved posters and titles are ready for big-screen browsing.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Now streaming</h2>
              <p className="muted">Approved releases are shown here exactly as they will appear to viewers.</p>
            </div>
          </div>

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
            <div className="card empty-state">
              <h3>No approved titles are live yet</h3>
              <p className="muted">Once a creator submission is approved, it will appear here, on browse, and on the TV page.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
