import Link from 'next/link';
import { formatCurrencyMinor } from '@/lib/format';
import { getMediaAssetUrl } from '@/lib/media';
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
  const posterUrl = getMediaAssetUrl(video.posterKey);
  const priceLabel = formatCurrencyMinor(priceMinor, currency);

  return (
    <Link href={`/v/${video.id}`} className="video-card">
      <div
        className="video-thumb"
        style={posterUrl ? { backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {!posterUrl ? <span>Ace Studio</span> : null}
      </div>
      <div className="video-meta">
        <strong className="video-card-title">{video.title}</strong>
        <span className="video-card-meta">
          {[video.category, labelize(video.videoType), ageLabel[video.ageRating] ?? labelize(video.ageRating)].filter(Boolean).join(' / ')}
        </span>
        <div className="badge video-card-price">
          {tierLabel[video.priceTier]} / {priceLabel}
        </div>
      </div>
    </Link>
  );
}
