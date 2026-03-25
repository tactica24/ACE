import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import AcePlayer from '@/components/AcePlayer';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatNaira } from '@/lib/format';
import { getMediaAssetUrl } from '@/lib/media';
import { getContentWarningLabel, getLanguageLabel } from '@/lib/media-types';
import { getRegionalPrice } from '@/lib/pricing';
import { getUiCopy } from '@/lib/ui-language';
import { getPreferredUiLanguage } from '@/lib/ui-language-server';

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

export default async function VideoPage({ params }: { params: { id: string } }) {
  const language = await getPreferredUiLanguage();
  const copy = getUiCopy(language);
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: { creator: { include: { creator: true } }, subtitleTracks: true }
  });

  if (!video) return notFound();

  const user = await getCurrentUser();

  if (video.status !== 'APPROVED' && (!user || (user.role !== 'ADMIN' && user.sub !== video.creatorId))) {
    return notFound();
  }

  const regionalPrice = getRegionalPrice(headers(), video.priceTier);
  const posterUrl = getMediaAssetUrl(video.posterKey);
  const priceLabel =
    regionalPrice.currency === 'NGN'
      ? formatNaira(Math.round(regionalPrice.amountMinor / 100))
      : `${regionalPrice.currency} ${(regionalPrice.amountMinor / 100).toFixed(2)}`;

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
    watermarkText = `${user.phone} / ${user.email}`;
  }

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
            <div className="pill">{video.rightsTier === 'EXCLUSIVE' ? copy.exclusiveRelease : copy.sharedRightsRelease}</div>
            <h1 className="hero-title" style={{ marginTop: 12 }}>{video.title}</h1>
            <p className="muted">{video.description}</p>
            <div className="detail-badges">
              <span className="badge">{priceLabel}</span>
              <span className="badge">{copy.teaser} {Math.floor(video.teaserSec / 60)} {copy.mins}</span>
              <span className="badge">{video.durationSec ? `${Math.round(video.durationSec / 60)} ${copy.mins}` : 'Full length'}</span>
              <span className="badge">{video.category}</span>
              <span className="badge">{labelize(video.videoType)}</span>
              <span className="badge">{ageLabel[video.ageRating] ?? labelize(video.ageRating)}</span>
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

        <div className="detail-grid video-page-secondary">
          <div className="card">
            <h3>{copy.creator}</h3>
            <p className="muted">{video.creator.creator?.displayName ?? video.creator.email}</p>
            <p className="muted">{copy.rightsTier}: {labelize(video.rightsTier)}</p>
          </div>
          <div className="card">
            <h3>{copy.languages}</h3>
            <p className="muted">{copy.originalAudio}: {getLanguageLabel(video.originalLanguage ?? 'en')}</p>
            {video.audioLanguages.length > 1 ? (
              <p className="muted">{copy.audioOptions}: {video.audioLanguages.map((audioLanguage) => getLanguageLabel(audioLanguage)).join(', ')}</p>
            ) : null}
            {video.subtitleTracks.length ? (
              <p className="muted">{copy.subtitleOptions}: {video.subtitleTracks.map((track) => track.label).join(', ')}</p>
            ) : (
              <p className="muted">{copy.noSubtitles}</p>
            )}
          </div>
          {video.contentWarnings.length ? (
            <div className="card">
              <h3>{copy.contentAdvisories}</h3>
              <div className="detail-badges">
                {video.contentWarnings.map((warning) => (
                  <span key={warning} className="badge">{getContentWarningLabel(warning)}</span>
                ))}
              </div>
              <p className="muted">{copy.contentAdvisorySummary}</p>
            </div>
          ) : null}
          <div className="card">
            <h3>{copy.offlineShare}</h3>
            <p className="muted">{copy.offlineShareSummary}</p>
            <Link className="btn btn-ghost" href="/wallet">{copy.manageWallet}</Link>
          </div>
          <div className="card">
            <h3>{copy.genresAndHighlights}</h3>
            <p className="muted">{video.genres.length ? video.genres.join(', ') : copy.generalAudience}</p>
            <p className="muted">
              {copy.highlights}:{' '}
              {video.highlightSeconds.length
                ? video.highlightSeconds.map((sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`).join(', ')
                : copy.none}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
