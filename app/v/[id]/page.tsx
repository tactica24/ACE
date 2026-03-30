import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AcePlayer from '@/components/AcePlayer';
import LaunchPage from '@/components/LaunchPage';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { getDefaultTierPriceNaira } from '@/lib/commerce';
import { formatCredits, getCreditsForNaira } from '@/lib/credits';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { formatCurrencyMinor } from '@/lib/format';
import { getMediaAssetUrl } from '@/lib/media';
import { getContentWarningLabel, getLanguageLabel } from '@/lib/media-types';
import { getRegionalPriceFromConfig } from '@/lib/pricing';
import { getUiCopy } from '@/lib/ui-language';
import { getPreferredUiLanguage } from '@/lib/ui-language-server';
import { getSiteSettings } from '@/lib/site-settings';

const ageLabel: Record<string, string> = {
  ALL: 'All',
  PG13: '13+',
  PG16: '16+',
  PG18: '18+'
};

const labelize = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

function formatRuntime(durationSec: number) {
  const totalMinutes = Math.max(1, Math.round(durationSec / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${totalMinutes}m`;
  }

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default async function VideoPage({ params }: { params: { id: string } }) {
  const language = await getPreferredUiLanguage();
  const copy = getUiCopy(language);
  const siteSettings = await getSiteSettings();
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: { creator: { include: { creator: true } }, subtitleTracks: true }
  });

  if (!video) return notFound();

  const user = await getCurrentUser();

  if (siteSettings.homePageMode === 'LAUNCH' && (!user || user.role === 'USER')) {
    return (
      <LaunchPage
        title={siteSettings.launchTitle}
        message={siteSettings.launchMessage}
        countdownAt={siteSettings.launchCountdownAt?.toISOString() ?? null}
        ctaLabel={siteSettings.launchCtaLabel}
        ctaHref={siteSettings.launchCtaHref}
      />
    );
  }

  if (video.status !== 'APPROVED' && (!user || (user.role !== 'ADMIN' && user.sub !== video.creatorId))) {
    return notFound();
  }

  if (user && user.role !== 'USER' && video.status === 'APPROVED') {
    const primaryAppPath = getPrimaryAppPath(user);
    if (primaryAppPath !== '/browse') {
      redirect(primaryAppPath);
    }
  }

  const pricingConfig = await getFinanceConfig();
  const regionalPrice = getRegionalPriceFromConfig(headers(), video.priceTier, pricingConfig);
  const posterUrl = getMediaAssetUrl(video.posterKey);
  const priceLabel = `${formatCredits(getCreditsForNaira(regionalPrice.amountNaira ?? getDefaultTierPriceNaira(video.priceTier)))} / ${formatCurrencyMinor(regionalPrice.amountMinor, regionalPrice.currency)}`;

  let unlocked = false;
  let initialProgress = 0;
  let watermarkText = 'Ace Studio Preview';

  if (user) {
    const unlock = await prisma.unlock.findFirst({
      where: { userId: user.sub, videoId: video.id }
    });
    const watchHistory = await prisma.watchHistory.findUnique({
      where: {
        userId_videoId: {
          userId: user.sub,
          videoId: video.id
        }
      }
    });
    unlocked = Boolean(unlock);
    initialProgress = watchHistory?.completedAt ? 0 : watchHistory?.progressSec ?? 0;
    watermarkText = user.name?.trim() || user.email.split('@')[0] || user.email;
  }

  const primaryMeta = [
    `Producer: ${video.creator.creator?.displayName ?? video.creator.email}`,
    video.releaseYear ? `${video.releaseYear}` : null,
    formatRuntime(video.durationSec),
    labelize(video.videoType),
    ageLabel[video.ageRating] ?? labelize(video.ageRating),
    ...video.genres
  ].filter(Boolean);

  const secondaryMeta = [
    video.originalLanguage ? `Audio: ${getLanguageLabel(video.originalLanguage)}` : null,
    video.subtitleTracks.length ? `Subtitles: ${video.subtitleTracks.map((track) => track.label).join(', ')}` : null,
    video.contentWarnings.length ? `Advisories: ${video.contentWarnings.map((warning) => getContentWarningLabel(warning)).join(', ')}` : null
  ].filter(Boolean);

  return (
    <div className="section video-page-section">
      <div className="container detail-page video-page-shell">
        <div className="detail-hero video-page-header">
          <div className="detail-poster card-soft">
            <div
              className="detail-poster-image"
              style={posterUrl ? { backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!posterUrl ? <span>Ace Studio</span> : null}
            </div>
          </div>

          <div className="detail-copy">
            <div className="pill">{video.category}</div>
            <h1 className="hero-title video-page-title">{video.title}</h1>
            <p className="muted">{video.description}</p>
            <div className="video-page-meta-stack">
              <p className="muted video-page-meta-line">{primaryMeta.join(' / ')}</p>
              {secondaryMeta.length ? (
                <p className="muted video-page-meta-line">{secondaryMeta.join(' / ')}</p>
              ) : null}
            </div>
            <div className="detail-badges detail-badges-compact">
              <span className="badge">{priceLabel}</span>
              <span className="badge">{video.category}</span>
            </div>
          </div>
        </div>

        <div className="video-page-player">
          <AcePlayer
            videoId={video.id}
            teaserSec={video.teaserSec}
            priceLabel={priceLabel}
            initialUnlocked={unlocked}
            initialProgress={initialProgress}
            watermarkText={watermarkText}
            posterSrc={posterUrl ?? undefined}
            highlightSeconds={video.highlightSeconds}
            audioLanguages={video.audioLanguages}
            subtitles={video.subtitleTracks.map((track) => ({
              id: track.id,
              label: track.label,
              languageCode: track.languageCode,
              kind: track.kind,
              src: getMediaAssetUrl(track.fileKey) ?? '',
              isDefault: track.isDefault
            }))}
            uiLanguage={language}
            isAuthenticated={Boolean(user)}
            loginHref={`/auth/login?next=/v/${video.id}`}
          />
        </div>

        {!user ? (
          <div className="card video-page-secondary">
            <h3>{copy.continueWithAccount}</h3>
            <p className="muted">{copy.continueWithAccountSummary}</p>
            <Link className="btn btn-primary" href={`/auth/login?next=/v/${video.id}`}>{copy.signIn}</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
