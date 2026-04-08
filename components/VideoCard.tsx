import Link from 'next/link';
import { getDefaultTierPriceNaira } from '@/lib/commerce';
import { formatCredits, getCreditsForNaira } from '@/lib/credits';
import { formatCurrencyMinor } from '@/lib/format';
import { getMediaAssetUrl } from '@/lib/media';
import { type PriceTierValue } from '@/lib/media-types';

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
  seriesId?: string | null;
  title: string;
  description: string;
  videoType: string;
  ageRating: string;
  category: string;
  durationSec?: number;
  releaseYear?: number | null;
  episodeCount?: number | null;
  priceTier: PriceTierValue;
  posterKey?: string | null;
  price?: { currency: string; amountMinor: number; amountNaira?: number };
};

function formatRuntime(durationSec?: number) {
  if (!durationSec || durationSec <= 0) {
    return null;
  }

  const totalMinutes = Math.max(1, Math.round(durationSec / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${totalMinutes}m`;
  }

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default function VideoCard({ video }: { video: VideoCardData }) {
  const priceMinor = video.price?.amountMinor ?? getDefaultTierPriceNaira(video.priceTier) * 100;
  const priceNaira = video.price?.amountNaira ?? getDefaultTierPriceNaira(video.priceTier);
  const currency = video.price?.currency ?? 'NGN';
  const posterUrl = getMediaAssetUrl(video.posterKey);
  const runtimeLabel = formatRuntime(video.durationSec);
  const priceLabel = `${formatCredits(getCreditsForNaira(priceNaira))} / ${formatCurrencyMinor(priceMinor, currency)}`;

  return (
    <Link href={`/v/${video.id}`} className="video-card">
      <div
        className="video-thumb"
        style={posterUrl ? { backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {!posterUrl ? <span>Ace Studio</span> : null}
      </div>
      <div className="video-meta">
        <div className="video-meta-top">
          <strong className="video-card-title">{video.title}</strong>
          <div className="badge video-card-price">{priceLabel}</div>
        </div>
        <div className="video-card-reveal">
          <span className="video-card-meta">
            {[video.category, labelize(video.videoType)].filter(Boolean).join(' / ')}
          </span>
          <p className="video-card-summary">{video.description}</p>
          <div className="video-card-details">
            {video.releaseYear ? <span>{video.releaseYear}</span> : null}
            {runtimeLabel ? <span>{runtimeLabel}</span> : null}
            {video.videoType === 'SERIES' && !video.seriesId && video.episodeCount ? <span>{video.episodeCount} episodes</span> : null}
            <span>{ageLabel[video.ageRating] ?? labelize(video.ageRating)}</span>
            <span>{video.videoType === 'SERIES' ? 'Per episode' : tierLabel[video.priceTier]}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
