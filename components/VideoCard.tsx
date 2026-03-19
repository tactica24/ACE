import Link from 'next/link';
import { formatNaira } from '@/lib/format';
import { type PriceTierValue } from '@/lib/media-types';
import { getPrice } from '@/lib/wallet';

const tierLabel: Record<PriceTierValue, string> = {
  SNACK: 'Snack',
  STANDARD: 'Standard',
  PREMIERE: 'Premiere'
};

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

export type VideoCardData = {
  id: string;
  title: string;
  description: string;
  videoType: string;
  ageRating: string;
  category: string;
  priceTier: PriceTierValue;
  posterKey?: string | null;
  price?: { currency: string; amountMinor: number };
};

export default function VideoCard({ video }: { video: VideoCardData }) {
  const priceMinor = video.price?.amountMinor ?? getPrice(video.priceTier) * 100;
  const currency = video.price?.currency ?? 'NGN';
  const priceLabel =
    currency === 'NGN'
      ? formatNaira(Math.round(priceMinor / 100))
      : `${currency} ${(priceMinor / 100).toFixed(2)}`;

  return (
    <Link href={`/v/${video.id}`} className="video-card">
      <div className="video-thumb">
        <span>{video.posterKey ? 'Poster Ready' : 'Ace Studio'} </span>
      </div>
      <div className="video-meta">
        <strong>{video.title}</strong>
        <span className="muted" style={{ fontSize: '0.9rem' }}>{video.description}</span>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {video.category} · {labelize(video.videoType)} · {ageLabel[video.ageRating] ?? labelize(video.ageRating)}
        </span>
        <div className="badge">
          {tierLabel[video.priceTier]} · {priceLabel}
        </div>
      </div>
    </Link>
  );
}
