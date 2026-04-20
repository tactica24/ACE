import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AcePlayer from '@/components/AcePlayer';
import LaunchPage from '@/components/LaunchPage';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { formatCredits, getCreditsForNaira } from '@/lib/credits';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { formatCurrencyMinor } from '@/lib/format';
import { getMediaAssetUrl } from '@/lib/media';
import { getContentWarningLabel, getLanguageLabel } from '@/lib/media-types';
import { getUiCopy } from '@/lib/ui-language';
import { getPreferredUiLanguage } from '@/lib/ui-language-server';
import { getSiteSettings } from '@/lib/site-settings';
import { canPreviewVideo, isEpisodeVideo } from '@/lib/video-access';
import { getRegionalPriceForVideo, getUnlockAmountNairaForVideo } from '@/lib/video-pricing';

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

function formatEpisodeLabel(seasonNumber?: number | null, episodeNumber?: number | null) {
  if (!seasonNumber || !episodeNumber) {
    return 'Episode';
  }

  return `S${seasonNumber} E${episodeNumber}`;
}

export default async function VideoPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { episode?: string | string[] };
}) {
  const language = await getPreferredUiLanguage();
  const copy = getUiCopy(language);
  const siteSettings = await getSiteSettings();
  const requestedVideo = await prisma.video.findUnique({
    where: { id: params.id },
    include: {
      creator: { include: { creator: true } },
      subtitleTracks: true
    }
  });

  if (!requestedVideo) return notFound();

  const user = await getCurrentUser();
  const canPreviewRequested = canPreviewVideo(requestedVideo, user);

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

  if (requestedVideo.status !== 'APPROVED' && !canPreviewRequested) {
    return notFound();
  }

  if (user && user.role !== 'USER' && requestedVideo.status === 'APPROVED') {
    const primaryAppPath = getPrimaryAppPath(user);
    if (primaryAppPath !== '/browse') {
      redirect(primaryAppPath);
    }
  }

  const pricingConfig = await getFinanceConfig();
  const requestHeaders = headers();

  if (requestedVideo.videoType !== 'SERIES' && !requestedVideo.seriesId) {
    const regionalPrice = getRegionalPriceForVideo(requestHeaders, requestedVideo, pricingConfig);
    const posterUrl = getMediaAssetUrl(requestedVideo.posterKey);
    const priceLabel = `${formatCredits(getCreditsForNaira(regionalPrice.amountNaira))} / ${formatCurrencyMinor(regionalPrice.amountMinor, regionalPrice.currency)}`;
    const relatedTitleCandidates = await prisma.video.findMany({
      where: {
        status: 'APPROVED',
        seriesId: null,
        id: { not: requestedVideo.id },
        OR: requestedVideo.genres.length
          ? [
              { category: requestedVideo.category },
              { genres: { hasSome: requestedVideo.genres.slice(0, 4) } }
            ]
          : [{ category: requestedVideo.category }]
      },
      orderBy: { createdAt: 'desc' },
      take: 6
    });

    let unlocked = false;
    let initialProgress = 0;
    let watermarkText = 'Ace Studio Preview';
    const initialStreamUrl = null;

    if (user) {
      const [unlock, watchHistory] = await Promise.all([
        prisma.unlock.findFirst({
          where: { userId: user.sub, videoId: requestedVideo.id }
        }),
        prisma.watchHistory.findUnique({
          where: {
            userId_videoId: {
              userId: user.sub,
              videoId: requestedVideo.id
            }
          }
        })
      ]);

      unlocked = Boolean(unlock);
      initialProgress = watchHistory?.completedAt ? 0 : watchHistory?.progressSec ?? 0;
      watermarkText = user.name?.trim() || user.email.split('@')[0] || user.email;
    }

    const primaryMeta = [
      `Producer: ${requestedVideo.creator.creator?.displayName ?? requestedVideo.creator.email}`,
      requestedVideo.releaseYear ? `${requestedVideo.releaseYear}` : null,
      formatRuntime(requestedVideo.durationSec),
      labelize(requestedVideo.videoType),
      ageLabel[requestedVideo.ageRating] ?? labelize(requestedVideo.ageRating),
      ...requestedVideo.genres
    ].filter(Boolean);

    const secondaryMeta = [
      requestedVideo.originalLanguage ? `Audio: ${getLanguageLabel(requestedVideo.originalLanguage)}` : null,
      requestedVideo.subtitleTracks.length ? `Subtitles: ${requestedVideo.subtitleTracks.map((track) => track.label).join(', ')}` : null,
      requestedVideo.contentWarnings.length ? `Advisories: ${requestedVideo.contentWarnings.map((warning) => getContentWarningLabel(warning)).join(', ')}` : null
    ].filter(Boolean);
    const relatedTitles = relatedTitleCandidates.length
      ? relatedTitleCandidates
      : await prisma.video.findMany({
          where: {
            status: 'APPROVED',
            seriesId: null,
            id: { not: requestedVideo.id }
          },
          orderBy: { createdAt: 'desc' },
          take: 6
        });

    return (
      <div className="section video-page-section">
        <div className="container detail-page video-page-shell">
          <div
            className="video-page-backdrop"
            style={posterUrl ? { backgroundImage: `linear-gradient(180deg, rgba(5, 7, 14, 0.18), rgba(5, 7, 14, 0.92)), url(${posterUrl})` } : undefined}
          />
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
              <div className="pill">{requestedVideo.category}</div>
              <h1 className="hero-title video-page-title">{requestedVideo.title}</h1>
              <p className="muted">{requestedVideo.description}</p>
              <div className="video-page-meta-stack">
                <p className="muted video-page-meta-line">{primaryMeta.join(' / ')}</p>
                {secondaryMeta.length ? (
                  <p className="muted video-page-meta-line">{secondaryMeta.join(' / ')}</p>
                ) : null}
              </div>
              <div className="video-page-actions">
                <a className="btn btn-primary" href="#watch-player">Watch now</a>
                <Link className="btn btn-ghost" href="/browse">Browse more titles</Link>
                {!user ? (
                  <Link className="btn btn-ghost" href={`/auth/login?next=${encodeURIComponent(`/v/${requestedVideo.id}`)}`}>Sign in</Link>
                ) : (
                  <Link className="btn btn-ghost" href="/account">My account</Link>
                )}
              </div>
              <div className="detail-badges detail-badges-compact">
                <span className="badge">{priceLabel}</span>
                <span className="badge">{requestedVideo.category}</span>
              </div>
            </div>
          </div>

          <div id="watch-player" className="video-page-player">
            <AcePlayer
              videoId={requestedVideo.id}
              teaserSec={requestedVideo.teaserSec}
              priceLabel={priceLabel}
              initialUnlocked={unlocked}
              initialStreamUrl={initialStreamUrl ?? undefined}
              initialProgress={initialProgress}
              watermarkText={watermarkText}
              posterSrc={posterUrl ?? undefined}
              highlightSeconds={requestedVideo.highlightSeconds}
              audioLanguages={requestedVideo.audioLanguages}
              subtitles={requestedVideo.subtitleTracks.map((track) => ({
                id: track.id,
                label: track.label,
                languageCode: track.languageCode,
                kind: track.kind,
                src: getMediaAssetUrl(track.fileKey) ?? '',
                isDefault: track.isDefault
              }))}
              uiLanguage={language}
              isAuthenticated={Boolean(user)}
              loginHref={`/auth/login?next=${encodeURIComponent(`/v/${requestedVideo.id}`)}`}
            />
          </div>

          <div className="video-page-fact-grid video-page-secondary">
            <div className="detail-card">
              <span className="video-page-fact-label">Playback access</span>
              <strong>{unlocked ? 'Ready to watch' : 'Preview-first access'}</strong>
              <p className="muted" style={{ marginBottom: 0 }}>
                {unlocked
                  ? 'This title is available on your account and resumes with progress memory.'
                  : 'Guests can preview before signing in and continuing with an account.'}
              </p>
            </div>
            <div className="detail-card">
              <span className="video-page-fact-label">Languages</span>
              <strong>{requestedVideo.originalLanguage ? getLanguageLabel(requestedVideo.originalLanguage) : 'Standard audio'}</strong>
              <p className="muted" style={{ marginBottom: 0 }}>
                {requestedVideo.subtitleTracks.length
                  ? `Subtitle options: ${requestedVideo.subtitleTracks.map((track) => track.label).join(', ')}`
                  : 'Subtitle options will appear here whenever they are available.'}
              </p>
            </div>
            <div className="detail-card">
              <span className="video-page-fact-label">Content notes</span>
              <strong>{requestedVideo.contentWarnings.length ? 'Viewer advisories available' : 'General audience guidance'}</strong>
              <p className="muted" style={{ marginBottom: 0 }}>
                {requestedVideo.contentWarnings.length
                  ? requestedVideo.contentWarnings.map((warning) => getContentWarningLabel(warning)).join(', ')
                  : 'No additional advisories have been recorded for this title.'}
              </p>
            </div>
          </div>

          {!user ? (
            <div className="card video-page-secondary">
              <h3>{copy.continueWithAccount}</h3>
              <p className="muted">{copy.continueWithAccountSummary}</p>
              <Link className="btn btn-primary" href={`/auth/login?next=${encodeURIComponent(`/v/${requestedVideo.id}`)}`}>{copy.signIn}</Link>
            </div>
          ) : null}

          {relatedTitles.length ? (
            <div className="card video-page-collection">
              <div className="home-shelf-header" style={{ marginBottom: 8 }}>
                <div>
                  <span className="home-row-kicker">Related titles</span>
                  <h3 style={{ margin: '6px 0 4px' }}>Keep the cinematic mood going</h3>
                  <p className="muted" style={{ marginBottom: 0 }}>More titles connected by tone, genre, or category.</p>
                </div>
                <Link className="btn btn-ghost btn-compact" href="/browse">Explore all</Link>
              </div>
              <div className="home-carousel">
                {relatedTitles.map((video) => (
                  <div key={video.id} className="home-carousel-item">
                    <VideoCard
                      video={{
                        ...video,
                        price: {
                          currency: 'NGN',
                          amountNaira: getUnlockAmountNairaForVideo(video, pricingConfig),
                          amountMinor: getUnlockAmountNairaForVideo(video, pricingConfig) * 100
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const seriesId = isEpisodeVideo(requestedVideo) ? requestedVideo.seriesId : requestedVideo.id;
  const series = await prisma.video.findUnique({
    where: { id: seriesId ?? requestedVideo.id },
    include: {
      creator: { include: { creator: true } },
      episodes: {
        include: {
          subtitleTracks: true
        },
        orderBy: [
          { seasonNumber: 'asc' },
          { episodeNumber: 'asc' },
          { createdAt: 'asc' }
        ]
      }
    }
  });

  if (!series) {
    return notFound();
  }

  const canPreviewSeries = canPreviewVideo(series, user);
  if (series.status !== 'APPROVED' && !canPreviewSeries) {
    return notFound();
  }

  const visibleEpisodes = series.episodes.filter((episode) => episode.status === 'APPROVED' || canPreviewSeries);
  const requestedEpisodeId = typeof searchParams?.episode === 'string'
    ? searchParams.episode.trim()
    : isEpisodeVideo(requestedVideo)
      ? requestedVideo.id
      : '';
  const selectedEpisode =
    visibleEpisodes.find((episode) => episode.id === requestedEpisodeId) ??
    visibleEpisodes.find((episode) => episode.id === requestedVideo.id) ??
    visibleEpisodes[0] ??
    null;

  const regionalPrice = getRegionalPriceForVideo(requestHeaders, selectedEpisode ?? series, pricingConfig);
  const priceLabel = `${formatCredits(getCreditsForNaira(regionalPrice.amountNaira))} / ${formatCurrencyMinor(regionalPrice.amountMinor, regionalPrice.currency)}`;
  const seriesPosterUrl = getMediaAssetUrl(series.posterKey);
  const selectedPosterUrl = getMediaAssetUrl(selectedEpisode?.posterKey ?? series.posterKey);
  const totalSeasons = new Set(visibleEpisodes.map((episode) => episode.seasonNumber).filter(Boolean)).size;
  const relatedSeries = await prisma.video.findMany({
    where: {
      status: 'APPROVED',
      seriesId: null,
      id: { not: series.id },
      OR: series.genres.length
        ? [
            { category: series.category },
            { genres: { hasSome: series.genres.slice(0, 4) } }
          ]
        : [{ category: series.category }]
    },
    orderBy: { createdAt: 'desc' },
    take: 6
  });

  let unlocked = false;
  let initialProgress = 0;
  let watermarkText = 'Ace Studio Preview';
  const initialStreamUrl = null;

  if (user && selectedEpisode) {
    const [unlock, watchHistory] = await Promise.all([
      prisma.unlock.findFirst({
        where: { userId: user.sub, videoId: selectedEpisode.id }
      }),
      prisma.watchHistory.findUnique({
        where: {
          userId_videoId: {
            userId: user.sub,
            videoId: selectedEpisode.id
          }
        }
      })
    ]);

    unlocked = Boolean(unlock);
    initialProgress = watchHistory?.completedAt ? 0 : watchHistory?.progressSec ?? 0;
    watermarkText = user.name?.trim() || user.email.split('@')[0] || user.email;
  }

  const seriesMeta = [
    `Producer: ${series.creator.creator?.displayName ?? series.creator.email}`,
    series.releaseYear ? `${series.releaseYear}` : null,
    totalSeasons ? `${totalSeasons} season${totalSeasons === 1 ? '' : 's'}` : null,
    `${visibleEpisodes.length} episode${visibleEpisodes.length === 1 ? '' : 's'}`,
    ageLabel[series.ageRating] ?? labelize(series.ageRating),
    ...series.genres
  ].filter(Boolean);

  const currentEpisodeMeta = selectedEpisode
    ? [
        formatEpisodeLabel(selectedEpisode.seasonNumber, selectedEpisode.episodeNumber),
        formatRuntime(selectedEpisode.durationSec),
        selectedEpisode.originalLanguage ? `Audio: ${getLanguageLabel(selectedEpisode.originalLanguage)}` : null,
        selectedEpisode.subtitleTracks.length ? `Subtitles: ${selectedEpisode.subtitleTracks.map((track) => track.label).join(', ')}` : null
      ].filter(Boolean)
    : [];

  const loginHref = `/auth/login?next=${encodeURIComponent(`/v/${series.id}${selectedEpisode ? `?episode=${selectedEpisode.id}` : ''}`)}`;

  return (
    <div className="section video-page-section">
      <div className="container detail-page video-page-shell">
        <div
          className="video-page-backdrop"
          style={seriesPosterUrl ? { backgroundImage: `linear-gradient(180deg, rgba(5, 7, 14, 0.18), rgba(5, 7, 14, 0.92)), url(${seriesPosterUrl})` } : undefined}
        />
        <div className="detail-hero video-page-header">
          <div className="detail-poster card-soft">
            <div
              className="detail-poster-image"
              style={seriesPosterUrl ? { backgroundImage: `url(${seriesPosterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!seriesPosterUrl ? <span>Ace Studio</span> : null}
            </div>
          </div>

          <div className="detail-copy">
            <div className="pill">{series.category}</div>
            <h1 className="hero-title video-page-title">{series.title}</h1>
            <p className="muted">{series.description}</p>
            <div className="video-page-meta-stack">
              <p className="muted video-page-meta-line">{seriesMeta.join(' / ')}</p>
              {selectedEpisode ? (
                <p className="muted video-page-meta-line">
                  Now selected: {formatEpisodeLabel(selectedEpisode.seasonNumber, selectedEpisode.episodeNumber)} / {selectedEpisode.title}
                </p>
              ) : null}
              {currentEpisodeMeta.length ? (
                <p className="muted video-page-meta-line">{currentEpisodeMeta.join(' / ')}</p>
              ) : null}
            </div>
            <div className="video-page-actions">
              {selectedEpisode ? <a className="btn btn-primary" href="#watch-player">Watch episode</a> : null}
              <Link className="btn btn-ghost" href="/browse?type=SERIES">Browse series</Link>
              {!user ? (
                <Link className="btn btn-ghost" href={loginHref}>Sign in</Link>
              ) : (
                <Link className="btn btn-ghost" href="/account">My account</Link>
              )}
            </div>
            <div className="detail-badges detail-badges-compact">
              <span className="badge">{priceLabel} per episode</span>
              <span className="badge">{visibleEpisodes.length} episodes available</span>
            </div>
          </div>
        </div>

        {selectedEpisode ? (
          <div id="watch-player" className="video-page-player series-player-shell">
            <div className="series-player-header">
              <div>
                <span className="pill series-episode-pill">{formatEpisodeLabel(selectedEpisode.seasonNumber, selectedEpisode.episodeNumber)}</span>
                <h2 className="series-player-title">{selectedEpisode.title}</h2>
                <p className="muted series-player-summary">{selectedEpisode.description}</p>
              </div>
            </div>
            <AcePlayer
              videoId={selectedEpisode.id}
              teaserSec={selectedEpisode.teaserSec}
              priceLabel={priceLabel}
              initialUnlocked={unlocked}
              initialStreamUrl={initialStreamUrl ?? undefined}
              initialProgress={initialProgress}
              watermarkText={watermarkText}
              posterSrc={selectedPosterUrl ?? undefined}
              highlightSeconds={selectedEpisode.highlightSeconds}
              audioLanguages={selectedEpisode.audioLanguages}
              subtitles={selectedEpisode.subtitleTracks.map((track) => ({
                id: track.id,
                label: track.label,
                languageCode: track.languageCode,
                kind: track.kind,
                src: getMediaAssetUrl(track.fileKey) ?? '',
                isDefault: track.isDefault
              }))}
              uiLanguage={language}
              isAuthenticated={Boolean(user)}
              loginHref={loginHref}
            />
          </div>
        ) : (
          <div className="card video-page-secondary">
            <h3>No episodes are ready yet</h3>
            <p className="muted">This series page is live, but the first approved episode has not been published yet.</p>
          </div>
        )}

        <div className="card series-browser">
          <div className="series-browser-header">
            <div>
              <h3>Episodes</h3>
              <p className="muted">Choose a season and jump straight into any available episode, with unlock handled one episode at a time.</p>
            </div>
            <div className="detail-badges detail-badges-compact">
              <span className="badge">{totalSeasons || 0} seasons</span>
              <span className="badge">{visibleEpisodes.length} episodes</span>
            </div>
          </div>

          {visibleEpisodes.length ? (
            <div className="series-season-stack">
              {Array.from(new Set(visibleEpisodes.map((episode) => episode.seasonNumber))).map((seasonNumber) => {
                const seasonEpisodes = visibleEpisodes.filter((episode) => episode.seasonNumber === seasonNumber);

                return (
                  <section key={`season-${seasonNumber}`} className="series-season-block">
                    <div className="series-season-heading">
                      <h4>{seasonNumber ? `Season ${seasonNumber}` : 'Episodes'}</h4>
                      <span className="muted">{seasonEpisodes.length} episode{seasonEpisodes.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="series-episode-grid">
                      {seasonEpisodes.map((episode) => {
                        const episodeHref = `/v/${series.id}?episode=${episode.id}`;
                        const selected = selectedEpisode?.id === episode.id;
                        const episodePoster = getMediaAssetUrl(episode.posterKey ?? series.posterKey);
                        return (
                          <Link
                            key={episode.id}
                            href={episodeHref}
                            className={`series-episode-card${selected ? ' active' : ''}`}
                          >
                            <div
                              className="series-episode-thumb"
                              style={episodePoster ? { backgroundImage: `url(${episodePoster})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                            >
                              {!episodePoster ? <span>Ace Studio</span> : null}
                            </div>
                            <div className="series-episode-copy">
                              <div className="series-episode-topline">
                                <span className="series-episode-kicker">{formatEpisodeLabel(episode.seasonNumber, episode.episodeNumber)}</span>
                                <span className="series-episode-runtime">{formatRuntime(episode.durationSec)}</span>
                              </div>
                              <strong>{episode.title}</strong>
                              <p className="muted">{episode.description}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="muted">No episodes are available for viewers yet.</p>
          )}
        </div>

        {!user ? (
          <div className="card video-page-secondary">
            <h3>{copy.continueWithAccount}</h3>
            <p className="muted">{copy.continueWithAccountSummary}</p>
            <Link className="btn btn-primary" href={loginHref}>{copy.signIn}</Link>
          </div>
        ) : null}

        {relatedSeries.length ? (
          <div className="card video-page-collection">
            <div className="home-shelf-header" style={{ marginBottom: 8 }}>
              <div>
                <span className="home-row-kicker">More series</span>
                <h3 style={{ margin: '6px 0 4px' }}>Continue the same mood</h3>
                <p className="muted" style={{ marginBottom: 0 }}>Series and featured titles that sit close to this world.</p>
              </div>
              <Link className="btn btn-ghost btn-compact" href="/browse?type=SERIES">See more series</Link>
            </div>
            <div className="home-carousel">
              {relatedSeries.map((video) => (
                <div key={video.id} className="home-carousel-item">
                  <VideoCard
                    video={{
                      ...video,
                      price: {
                        currency: 'NGN',
                        amountNaira: getUnlockAmountNairaForVideo(video, pricingConfig),
                        amountMinor: getUnlockAmountNairaForVideo(video, pricingConfig) * 100
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
