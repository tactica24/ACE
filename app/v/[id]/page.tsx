import AcePlayer from '@/components/AcePlayer';
import { prisma } from '@/lib/db';
import { getAuthCookie, verifyAuthToken } from '@/lib/auth';
import { getRegionalPrice } from '@/lib/pricing';
import { headers } from 'next/headers';
import { formatNaira } from '@/lib/format';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function VideoPage({ params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: { creator: { include: { creator: true } } }
  });

  if (!video) return notFound();

  const token = getAuthCookie();
  const user = token ? (() => {
    try {
      return verifyAuthToken(token);
    } catch {
      return null;
    }
  })() : null;

  const regionalPrice = getRegionalPrice(headers(), video.priceTier);
  const priceLabel =
    regionalPrice.currency === 'NGN'
      ? formatNaira(Math.round(regionalPrice.amountMinor / 100))
      : `${regionalPrice.currency} ${(regionalPrice.amountMinor / 100).toFixed(2)}`;
  let unlocked = false;
  let watermarkText = 'ACE Preview';

  if (user) {
    const unlock = await prisma.unlock.findFirst({
      where: { userId: user.sub, videoId: video.id }
    });
    unlocked = Boolean(unlock);
    watermarkText = `${user.phone} · ${user.email}`;
  }

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
    <div className="section">
      <div className="container" style={{ display: 'grid', gap: 24 }}>
        <div>
          <div className="pill">{video.rightsTier === 'EXCLUSIVE' ? 'ACE Exclusive' : 'Shared Rights'}</div>
          <h1 className="hero-title" style={{ marginTop: 12 }}>{video.title}</h1>
          <p className="muted">{video.description}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <span className="badge">
              {regionalPrice.currency === 'NGN'
                ? formatNaira(Math.round(regionalPrice.amountMinor / 100))
                : `${regionalPrice.currency} ${(regionalPrice.amountMinor / 100).toFixed(2)}`}
            </span>
            <span className="badge">Teaser {Math.floor(video.teaserSec / 60)} mins</span>
            <span className="badge">{video.durationSec ? `${Math.round(video.durationSec / 60)} mins` : 'Full Length'}</span>
            <span className="badge">{video.category}</span>
            <span className="badge">{labelize(video.videoType)}</span>
            <span className="badge">{ageLabel[video.ageRating] ?? labelize(video.ageRating)}</span>
          </div>
        </div>

        {user ? (
          <AcePlayer
            videoId={video.id}
            teaserSec={video.teaserSec}
            priceLabel={priceLabel}
            initialUnlocked={unlocked}
            watermarkText={watermarkText}
            highlightSeconds={video.highlightSeconds}
          />
        ) : (
          <div className="card">
            <h3>Sign in to start watching</h3>
            <p className="muted">ACE uses wallet unlocks and dynamic watermarking. Sign in to stream.</p>
            <Link className="btn btn-primary" href="/auth/login">Sign in</Link>
          </div>
        )}

        <div className="grid">
          <div className="card">
            <h3>Creator</h3>
            <p className="muted">{video.creator.creator?.displayName ?? video.creator.email}</p>
            <p className="muted">Rights tier: {video.rightsTier}</p>
          </div>
          <div className="card">
            <h3>Offline Share (.ace)</h3>
            <p className="muted">Send an encrypted .ace file over Wi-Fi Direct. Recipient unlocks with ACE wallet.</p>
            <Link className="btn btn-ghost" href="/wallet">Manage wallet</Link>
          </div>
          <div className="card">
            <h3>Genres</h3>
            <p className="muted">{video.genres.length ? video.genres.join(', ') : 'General audience'}</p>
            <p className="muted">Highlight scenes: {video.highlightSeconds.length ? video.highlightSeconds.map((sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`).join(', ') : 'None'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}




