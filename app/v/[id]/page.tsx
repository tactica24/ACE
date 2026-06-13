import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AcePlayer from '@/components/AcePlayer';
import LaunchPage from '@/components/LaunchPage';
import MovieAccessDetails from '@/components/MovieAccessDetails';
import PosterAsset from '@/components/PosterAsset';
import VideoCard from '@/components/VideoCard';
import { getCurrentUser } from '@/lib/auth';
import { getBunnyTrailerPlaybackUrl } from '@/lib/bunny-stream';
import { getPrimaryAppPath } from '@/lib/account-routing';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { formatCurrencyMinor } from '@/lib/format';
import { getMediaAssetUrl } from '@/lib/media';
import { getLanguageLabel } from '@/lib/media-types';
import { getViewerMoviePosterUrl, hasReadyMoviePlayback } from '@/lib/movie-assets';
import { getUiCopy } from '@/lib/ui-language';
import { getPreferredUiLanguage } from '@/lib/ui-language-server';
import { getSiteSettings } from '@/lib/site-settings';
import { isViewerVisibleStatus } from '@/lib/release-status';
import { canPreviewVideo, isEpisodeVideo, isSeriesContainer } from '@/lib/video-access';
import { getViewerReadyCatalogWhere } from '@/lib/video-visibility';
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

function formatRuntime(_durationSec: number) {
  return '90m';
}

function formatEpisodeLabel(seasonNumber?: number | null, episodeNumber?: number | null) {
  if (!seasonNumber || !episodeNumber) {
    return 'Episode';
  }

  return `S${seasonNumber} E${episodeNumber}`;
}

function formatUnlockPriceLabel(amountMinor: number, currency: string, unit: 'movie' | 'episode') {
  return `${formatPriceAmountLabel(amountMinor, currency)} to unlock this ${unit}`;
}

function formatPriceAmountLabel(amountMinor: number, currency: string) {
  return currency === 'NGN'
    ? `₦${Math.round(amountMinor / 100).toLocaleString('en-NG')}`
    : formatCurrencyMinor(amountMinor, currency);
}

function getLanguageSummary(languages: string[]) {
  const labels = languages
    .map((language) => getLanguageLabel(language))
    .filter(Boolean)
    .slice(0, 3);

  return labels.length ? `Language: ${labels.join(', ')}` : null;
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
      subtitleTracks: true,
      technicalMetadata: true
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

  if (!isViewerVisibleStatus(requestedVideo.status) && !canPreviewRequested) {
    return notFound();
  }

  if (
    !canPreviewRequested &&
    isViewerVisibleStatus(requestedVideo.status) &&
    requestedVideo.seriesId &&
    !hasReadyMoviePlayback(requestedVideo)
  ) {
    return notFound();
  }

  if (
    !canPreviewRequested &&
    isViewerVisibleStatus(requestedVideo.status) &&
    !isSeriesContainer(requestedVideo) &&
    !hasReadyMoviePlayback(requestedVideo)
  ) {
    return notFound();
  }

  const trailerKey =
    getBunnyTrailerPlaybackUrl(requestedVideo) ??
    requestedVideo.technicalMetadata?.trailerKey?.trim() ??
    null;

  if (user && user.role !== 'USER' && isViewerVisibleStatus(requestedVideo.status)) {
    const primaryAppPath = getPrimaryAppPath(user);
    if (primaryAppPath !== '/browse') {
      redirect(primaryAppPath);
    }
  }

  const pricingConfig = await getFinanceConfig();
  const requestHeaders = headers();

  if (requestedVideo.videoType !== 'SERIES' && !requestedVideo.seriesId) {
    const regionalPrice = getRegionalPriceForVideo(requestHeaders, requestedVideo, pricingConfig);
    const posterUrl = getViewerMoviePosterUrl(requestedVideo);
    const backdropUrl = posterUrl;
    const priceLabel = formatUnlockPriceLabel(regionalPrice.amountMinor, regionalPrice.currency, 'movie');
    const priceAmountLabel = formatPriceAmountLabel(regionalPrice.amountMinor, regionalPrice.currency);
    const relatedTitleCandidates = await prisma.video.findMany({
      where: {
        AND: [
          getViewerReadyCatalogWhere(),
          {
            id: { not: requestedVideo.id },
            OR: requestedVideo.genres.length
              ? [
                  { category: requestedVideo.category },
                  { genres: { hasSome: requestedVideo.genres.slice(0, 4) } }
                ]
              : [{ category: requestedVideo.category }]
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 6
    });

    let unlocked = false;
    let initialProgress = 0;
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
    }

    const primaryMeta = [
      requestedVideo.releaseYear ? String(requestedVideo.releaseYear) : null,
      `Age: ${ageLabel[requestedVideo.ageRating] ?? labelize(requestedVideo.ageRating)}`,
      requestedVideo.genres[0] ? labelize(requestedVideo.genres[0]) : null,
      getLanguageSummary(requestedVideo.audioLanguages),
      trailerKey ? 'Trailer available' : null
    ].filter(Boolean);
    const relatedTitles = relatedTitleCandidates.length
      ? relatedTitleCandidates
      : await prisma.video.findMany({
          where: {
            AND: [getViewerReadyCatalogWhere(), { id: { not: requestedVideo.id } }]
          },
          orderBy: { createdAt: 'desc' },
          take: 6
        });

    return (
      <div className="section video-page-section">
        <div className="container detail-page video-page-shell">
          <div
            className="video-page-backdrop"
            style={backdropUrl ? { backgroundImage: `linear-gradient(180deg, rgba(5, 7, 14, 0.18), rgba(5, 7, 14, 0.92)), url(${backdropUrl})` } : undefined}
          />
          
          <div className="movie-split-top">
            <div className="movie-info-panel">
              <div className="detail-copy movie-info-copy">
                <MovieAccessDetails
                  videoId={requestedVideo.id}
                  title={requestedVideo.title}
                  details={primaryMeta as string[]}
                  priceLabel={priceLabel}
                  initiallyUnlocked={unlocked}
                  unitLabel="movie"
                />
                <p className="movie-synopsis">{requestedVideo.description || 'No synopsis available.'}</p>
                <div className="video-page-actions">
                  <Link className="btn btn-ghost" href="/browse">Browse more titles</Link>
                  {!user ? (
                    <Link className="btn btn-ghost" href={`/auth/login?next=${encodeURIComponent(`/v/${requestedVideo.id}`)}`}>Sign in</Link>
                  ) : (
                    <Link className="btn btn-ghost" href="/account">My account</Link>
                  )}
                </div>
              </div>
            </div>

            <div className="watch-player-wrapper">
              <AcePlayer
                videoId={requestedVideo.id}
                teaserSec={requestedVideo.teaserSec}
                priceLabel={priceAmountLabel}
                 initialUnlocked={unlocked}
                 initialStreamUrl={initialStreamUrl ?? undefined}
                 initialProgress={initialProgress}
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
                trailerKey={trailerKey}
              />
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
      technicalMetadata: true,
      episodes: {
        include: {
          subtitleTracks: true,
          technicalMetadata: true
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
  if (!isViewerVisibleStatus(series.status) && !canPreviewSeries) {
    return notFound();
  }

  const visibleEpisodes = series.episodes.filter((episode) => isViewerVisibleStatus(episode.status) || canPreviewSeries);
  const viewerReadyEpisodes = canPreviewSeries
    ? visibleEpisodes
    : visibleEpisodes.filter(hasReadyMoviePlayback);
  const requestedEpisodeId = typeof searchParams?.episode === 'string'
    ? searchParams.episode.trim()
    : isEpisodeVideo(requestedVideo)
      ? requestedVideo.id
      : '';
  const selectedEpisode =
    viewerReadyEpisodes.find((episode) => episode.id === requestedEpisodeId) ??
    viewerReadyEpisodes.find((episode) => episode.id === requestedVideo.id) ??
    viewerReadyEpisodes[0] ??
    null;

  if (!selectedEpisode && !canPreviewSeries) {
    return notFound();
  }

  const regionalPrice = getRegionalPriceForVideo(requestHeaders, selectedEpisode ?? series, pricingConfig);
  const priceLabel = formatUnlockPriceLabel(regionalPrice.amountMinor, regionalPrice.currency, 'episode');
  const priceAmountLabel = formatPriceAmountLabel(regionalPrice.amountMinor, regionalPrice.currency);
  const seriesPosterUrl = getViewerMoviePosterUrl(series);
  const seriesBackdropUrl = seriesPosterUrl;
  const selectedPosterUrl = selectedEpisode
    ? getViewerMoviePosterUrl(selectedEpisode)
    : seriesPosterUrl;
  const totalSeasons = new Set(viewerReadyEpisodes.map((episode) => episode.seasonNumber).filter(Boolean)).size;
  const relatedSeries = await prisma.video.findMany({
    where: {
      AND: [
        getViewerReadyCatalogWhere(),
        {
          id: { not: series.id },
          OR: series.genres.length
            ? [
                { category: series.category },
                { genres: { hasSome: series.genres.slice(0, 4) } }
              ]
            : [{ category: series.category }]
        }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 6
  });

  let unlocked = false;
  let initialProgress = 0;
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
  }

  const seriesMeta = [
    series.releaseYear ? String(series.releaseYear) : null,
    `Age: ${ageLabel[series.ageRating] ?? labelize(series.ageRating)}`,
    totalSeasons ? `${totalSeasons} season${totalSeasons === 1 ? '' : 's'}` : null,
    getLanguageSummary(series.audioLanguages)
  ].filter(Boolean);

  const currentEpisodeMeta = selectedEpisode
    ? [
        formatEpisodeLabel(selectedEpisode.seasonNumber, selectedEpisode.episodeNumber),
        formatRuntime(selectedEpisode.durationSec),
        `Age: ${ageLabel[selectedEpisode.ageRating] ?? labelize(selectedEpisode.ageRating)}`,
        getLanguageSummary(selectedEpisode.audioLanguages)
      ].filter(Boolean)
    : [];

  const seriesTrailerKey =
    getBunnyTrailerPlaybackUrl(series) ??
    series.technicalMetadata?.trailerKey?.trim() ??
    null;
  const episodeTrailerKey =
    getBunnyTrailerPlaybackUrl(selectedEpisode ?? null) ??
    selectedEpisode?.technicalMetadata?.trailerKey?.trim() ??
    null;
  const activeTrailerKey = episodeTrailerKey || seriesTrailerKey;

  const loginHref = `/auth/login?next=${encodeURIComponent(`/v/${series.id}`)}`;

  return (
    <div className="section video-page-section">
      <div className="container detail-page video-page-shell">
        <div
          className="video-page-backdrop"
          style={seriesBackdropUrl ? { backgroundImage: `linear-gradient(180deg, rgba(5, 7, 14, 0.18), rgba(5, 7, 14, 0.92)), url(${seriesBackdropUrl})` } : undefined}
        />
        
        <div className="movie-split-top">
          <div className="movie-info-panel">
            <div className="detail-copy movie-info-copy">
              <MovieAccessDetails
                videoId={selectedEpisode?.id ?? series.id}
                title={series.title}
                details={seriesMeta as string[]}
                priceLabel={priceLabel}
                initiallyUnlocked={unlocked}
                unitLabel="episode"
              />
              <p className="movie-synopsis">{series.description || 'No synopsis available.'}</p>
              <div className="video-page-meta-stack">
                {selectedEpisode ? (
                  <p className="muted video-page-meta-line">
                    Now selected: {formatEpisodeLabel(selectedEpisode.seasonNumber, selectedEpisode.episodeNumber)} / {selectedEpisode.title}
                  </p>
                ) : null}
                {currentEpisodeMeta.length ? (
                  <p className="muted video-page-meta-line">{currentEpisodeMeta.join(' / ')}</p>
                ) : null}
              </div>
              {selectedEpisode && (
                <div className="series-player-header">
                  <div>
                    <span className="pill series-episode-pill">{formatEpisodeLabel(selectedEpisode.seasonNumber, selectedEpisode.episodeNumber)}</span>
                    <h2 className="series-player-title">{selectedEpisode.title}</h2>
                    <p className="muted series-player-summary">{selectedEpisode.description || 'No synopsis available.'}</p>
                  </div>
                </div>
              )}
              <div className="video-page-actions">
                <Link className="btn btn-ghost" href="/browse?type=SERIES">Browse series</Link>
                {!user ? (
                  <Link className="btn btn-ghost" href={loginHref}>Sign in</Link>
                ) : (
                  <Link className="btn btn-ghost" href="/account">My account</Link>
                )}
              </div>
            </div>
          </div>

          <div className="watch-player-wrapper">
            {selectedEpisode ? (
              <AcePlayer
                videoId={selectedEpisode.id}
                teaserSec={selectedEpisode.teaserSec}
                priceLabel={priceAmountLabel}
                 initialUnlocked={unlocked}
                 initialStreamUrl={initialStreamUrl ?? undefined}
                 initialProgress={initialProgress}
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
                trailerKey={activeTrailerKey}
              />
            ) : (
              <div style={{ color: 'white', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                <h3>No episodes are ready yet</h3>
                <p className="muted">This series page is live, but the first approved episode has not been published yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card series-browser">
          <div className="series-browser-header">
            <div>
              <h3>Episodes</h3>
              <p className="muted">Choose a season and jump straight into any available episode, with unlock handled one episode at a time.</p>
            </div>
            <div className="detail-badges detail-badges-compact">
              <span className="badge">{totalSeasons || 0} seasons</span>
              <span className="badge">{viewerReadyEpisodes.length} episodes</span>
            </div>
          </div>

          {viewerReadyEpisodes.length ? (
            <div className="series-season-stack">
              {Array.from(new Set(viewerReadyEpisodes.map((episode) => episode.seasonNumber))).map((seasonNumber) => {
                const seasonEpisodes = viewerReadyEpisodes.filter((episode) => episode.seasonNumber === seasonNumber);

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
                        const episodePoster = getViewerMoviePosterUrl(episode);
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
                              <PosterAsset src={episodePoster} />
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
