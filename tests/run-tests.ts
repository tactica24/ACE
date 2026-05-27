import assert from 'node:assert/strict';

import {
  resolvePayoutTransition,
  type PayoutStatus,
} from '../lib/payout-lifecycle';
import {
  getSubtitlePackageStatus,
  getViewerPackageLabel,
  getViewerPackageStatus,
} from '../lib/delivery-package';
import {
  normalizePlaybackQualityPreference,
  selectProgressiveVariant,
} from '../lib/playback-quality';
import {
  getPlayableAssetWhere,
  getViewerReadyAnyVideoWhere,
  getViewerReadyCatalogWhere,
} from '../lib/video-visibility';
import { calculateUnlockSplit } from '../lib/finance';
import { alignNairaToCreditValue, getCreditsForNaira } from '../lib/credits';
import { getUnlockAmountNairaForVideo } from '../lib/video-pricing';
import { canAccessVideoFromCountry } from '../lib/video-availability';
import { getMultipartUploadRateLimit } from '../lib/upload-rate-limit';
import { MAX_MASTER_BYTES } from '../lib/upload-limits';
import { validateUploadRequest } from '../lib/upload-security';
import { getPlayableHlsUrl, getPlayableProgressiveKey, getPlayableProgressiveUrl } from '../lib/playback-delivery';
import { getSignedStoredHlsUrl, getSignedStoredMediaUrl } from '../lib/hls-delivery';
import { getMediaAssetUrl, normalizeMediaKey } from '../lib/media';
import { type PricingConfigValues } from '../lib/pricing';
import {
  canAccessVideo,
  canPreviewVideo,
  isEpisodeVideo,
  isPlayableVideo,
  isSeriesContainer,
} from '../lib/video-access';
import { PASS_CREDITS } from '../lib/commerce';

type Case = {
  name: string;
  run: () => void;
};

const creatorVideo = {
  creatorId: 'creator-1',
  status: 'APPROVED',
  videoType: 'MOVIE',
  seriesId: null,
  r2Key: 'video/movie.mp4',
  fallbackR2Key: 'video/movie-720.mp4',
};

const payoutCases: Case[] = [
  {
    name: 'approve moves pending payout to approved without restoring balance',
    run: () => {
      const result = resolvePayoutTransition('PENDING', 'approve');
      assert.deepEqual(result, {
        nextStatus: 'APPROVED',
        shouldRestoreReservedBalance: false,
        shouldSetPaidAt: false,
        shouldSetReviewedAt: true,
      });
    },
  },
  {
    name: 'reject restores balance for pending and approved payouts',
    run: () => {
      const pending = resolvePayoutTransition('PENDING', 'reject');
      const approved = resolvePayoutTransition('APPROVED', 'reject');
      assert.equal(pending.nextStatus, 'REJECTED');
      assert.equal(pending.shouldRestoreReservedBalance, true);
      assert.equal(approved.nextStatus, 'REJECTED');
      assert.equal(approved.shouldRestoreReservedBalance, true);
    },
  },
  {
    name: 'mark_paid only succeeds from approved state',
    run: () => {
      const result = resolvePayoutTransition('APPROVED', 'mark_paid');
      assert.deepEqual(result, {
        nextStatus: 'PAID',
        shouldRestoreReservedBalance: false,
        shouldSetPaidAt: true,
        shouldSetReviewedAt: true,
      });
    },
  },
  {
    name: 'invalid payout transitions throw clear errors',
    run: () => {
      const invalidTransitions: Array<
        [PayoutStatus, 'approve' | 'reject' | 'mark_paid']
      > = [
        ['APPROVED', 'approve'],
        ['PAID', 'approve'],
        ['REJECTED', 'approve'],
        ['PAID', 'reject'],
        ['REJECTED', 'reject'],
        ['PENDING', 'mark_paid'],
      ];

      for (const [status, action] of invalidTransitions) {
        assert.throws(() => resolvePayoutTransition(status, action));
      }
    },
  },
];

const videoCases: Case[] = [
  {
    name: 'approved videos are accessible to signed-out viewers',
    run: () => {
      assert.equal(canAccessVideo(creatorVideo, null), true);
      assert.equal(canAccessVideo({ ...creatorVideo, status: 'PUBLISHED' }, null), true);
      assert.equal(canPreviewVideo(creatorVideo, null), false);
    },
  },
  {
    name: 'creators and admins can preview unapproved videos',
    run: () => {
      const pendingVideo = {
        ...creatorVideo,
        status: 'PENDING_REVIEW',
      };

      assert.equal(
        canPreviewVideo(pendingVideo, { sub: 'creator-1', role: 'CREATOR' }),
        true,
      );
      assert.equal(
        canPreviewVideo(pendingVideo, { sub: 'admin-1', role: 'ADMIN' }),
        true,
      );
      assert.equal(
        canPreviewVideo(pendingVideo, { sub: 'viewer-1', role: 'USER' }),
        false,
      );
    },
  },
  {
    name: 'series containers are not treated as playable videos',
    run: () => {
      const seriesContainer = {
        creatorId: 'creator-1',
        status: 'APPROVED',
        videoType: 'SERIES',
        seriesId: null,
        r2Key: null,
        fallbackR2Key: null,
      };

      assert.equal(isSeriesContainer(seriesContainer), true);
      assert.equal(isPlayableVideo(seriesContainer), false);
    },
  },
  {
    name: 'episodes and standalone titles are treated as playable only when media exists',
    run: () => {
      const episode = {
        creatorId: 'creator-1',
        status: 'APPROVED',
        videoType: 'SERIES',
        seriesId: 'series-1',
        r2Key: 'video/episode-1.mp4',
        fallbackR2Key: 'video/episode-1-720.mp4',
      };
      const emptyAsset = {
        ...creatorVideo,
        r2Key: null,
        fallbackR2Key: null,
      };
      const fallbackOnlyAsset = {
        ...creatorVideo,
        r2Key: null,
        fallbackR2Key: 'video/movie-720.mp4',
      };

      assert.equal(isEpisodeVideo(episode), true);
      assert.equal(isPlayableVideo(episode), true);
      assert.equal(isPlayableVideo(emptyAsset), false);
      assert.equal(isPlayableVideo(fallbackOnlyAsset), true);
    },
  },
  {
    name: 'quality selection prefers 720p for data saver and 1080p otherwise',
    run: () => {
      const variants = {
        primaryKey: 'video/movie.mp4',
        primaryReady: true,
        fallbackKey: 'video/movie-720.mp4',
        fallbackReady: true,
      };

      assert.equal(normalizePlaybackQualityPreference('High quality'), '1080p');
      assert.equal(normalizePlaybackQualityPreference('Data saver'), '720p');
      assert.deepEqual(selectProgressiveVariant(variants, 'adaptive'), {
        key: 'video/movie.mp4',
        quality: '1080p',
      });
      assert.deepEqual(selectProgressiveVariant(variants, '720p'), {
        key: 'video/movie-720.mp4',
        quality: '720p',
      });
      assert.deepEqual(
        selectProgressiveVariant(
          {
            ...variants,
            primaryReady: false,
          },
          '1080p',
        ),
        {
          key: 'video/movie-720.mp4',
          quality: '720p',
        },
      );
    },
  },
  {
    name: 'delivery package summaries describe standalone and series readiness cleanly',
    run: () => {
      assert.equal(getViewerPackageLabel({ videoType: 'FEATURE', seriesId: null }), '1080p MP4 + 720p MP4');
      assert.equal(getViewerPackageLabel({ videoType: 'SERIES', seriesId: null }), 'Per-episode 1080p MP4 + 720p MP4');
      assert.equal(
        getViewerPackageStatus({
          videoType: 'FEATURE',
          seriesId: null,
          primaryReady: true,
          fallbackReady: true,
        }),
        '1080p and 720p ready',
      );
      assert.equal(
        getViewerPackageStatus({
          videoType: 'SERIES',
          seriesId: null,
          episodeCount: 4,
          readyEpisodeCount: 3,
        }),
        '3 episodes ready out of 4',
      );
      assert.equal(
        getSubtitlePackageStatus({
          subtitleTrackCount: 2,
          englishSubtitlesProvided: true,
        }),
        '2 subtitle tracks',
      );
    },
  },
  {
    name: 'viewer-ready visibility filters distinguish catalog titles from playable episodes',
    run: () => {
      const catalogWhere = getViewerReadyCatalogWhere();
      const anyVideoWhere = getViewerReadyAnyVideoWhere();

      assert.deepEqual(catalogWhere, {
        AND: [{ seriesId: null }, anyVideoWhere],
      });
      assert.deepEqual(anyVideoWhere.status, { in: ['APPROVED', 'PUBLISHED'] });
      assert.equal(Array.isArray(anyVideoWhere.OR), true);
      assert.equal(anyVideoWhere.OR?.length, 3);
      assert.deepEqual(getPlayableAssetWhere().OR, [
        { r2Key: { not: null } },
        { fallbackR2Key: { not: null } },
        { technicalMetadata: { playbackUrl: { not: null } } },
        { technicalMetadata: { masterKey: { not: null } } },
        { technicalMetadata: { processingStatus: 'MASTER_UPLOADED' } },
      ]);
    },
  },
  {
    name: 'playback delivery prefers HLS when available and falls back to MP4 master keys',
    run: () => {
      assert.equal(
        getPlayableHlsUrl({
          hlsUrl: 'https://stream.acestudio.ng/movies/movie-1/master.m3u8',
          technicalMetadata: {
            playbackUrl: 'https://stream.acestudio.ng/movies/movie-1/master.mp4',
          },
        }),
        'https://stream.acestudio.ng/movies/movie-1/master.m3u8',
      );
      assert.equal(
        getPlayableHlsUrl({
          technicalMetadata: {
            playbackUrl: 'https://stream.acestudio.ng/movies/movie-1/master.mp4',
          },
        }),
        null,
      );
      assert.equal(
        getPlayableProgressiveKey({
          technicalMetadata: {
            masterKey: 'uploads/admin/master/movie.mp4',
          },
        }),
        'uploads/admin/master/movie.mp4',
      );
      assert.equal(
        getPlayableProgressiveUrl({
          technicalMetadata: {
            playbackUrl: 'https://stream.acestudio.ng/movies/movie-1/master.mp4',
          },
        }),
        'https://stream.acestudio.ng/movies/movie-1/master.mp4',
      );
      assert.equal(
        getSignedStoredHlsUrl(
          'movie-1',
          'signed-token',
          'https://stream.acestudio.ng/movies/movie-1/master.m3u8',
        ),
        'https://stream.acestudio.ng/movies/movie-1/master.m3u8?token=signed-token',
      );
      assert.equal(
        getSignedStoredMediaUrl('signed-token', 'https://stream.acestudio.ng/movies/movie-1/master.mp4'),
        'https://stream.acestudio.ng/movies/movie-1/master.mp4?token=signed-token',
      );
      assert.equal(
        getMediaAssetUrl(' posters\\movie one.jpg '),
        '/api/media/posters/movie%20one.jpg',
      );
      assert.equal(normalizeMediaKey(' /posters\\\\movie one.jpg '), 'posters/movie one.jpg');
      assert.equal(
        normalizeMediaKey('https://9509c1f9654bf983a2d806d29210f6ad.r2.cloudflarestorage.com/acestudio/uploads/admin/poster/movie%20one.webp?X-Amz-Signature=expired'),
        'uploads/admin/poster/movie one.webp',
      );
      assert.equal(
        getMediaAssetUrl('https://ace.example.com/api/media/uploads/admin/poster/movie%20one.webp'),
        '/api/media/uploads/admin/poster/movie%20one.webp',
      );
    },
  },
  {
    name: 'movie-level pricing and splits override global defaults cleanly',
    run: () => {
      const config: PricingConfigValues = {
        id: 'default',
        updatedAt: new Date(0),
        creatorSharePercent: 60,
        platformSharePercent: 29.5,
        gatewayFeePercent: 3,
        taxPercent: 7.5,
        snackNaira: 50,
        standardNaira: 50,
        premiereNaira: 50,
        snackUsdMinor: 149,
        standardUsdMinor: 199,
        premiereUsdMinor: 249,
        snackEurMinor: 129,
        standardEurMinor: 179,
        premiereEurMinor: 229,
        snackGbpMinor: 99,
        standardGbpMinor: 149,
        premiereGbpMinor: 199,
        snackCadMinor: 199,
        standardCadMinor: 249,
        premiereCadMinor: 299,
        familyPassUsdMinor: 1000,
        familyPassEurMinor: 900,
        familyPassGbpMinor: 800,
        familyPassCadMinor: 1300,
      };

      assert.equal(
        getUnlockAmountNairaForVideo({ priceTier: 'STANDARD', videoType: 'FEATURE', unlockPrice: 350 }, config),
        50,
      );
      assert.deepEqual(
        calculateUnlockSplit(1000, config, {
          creatorSharePercent: 70,
          platformSharePercent: 20,
          taxPercent: 10,
        }),
        {
          creatorNaira: 700,
          platformNaira: 200,
          gatewayFeeNaira: 0,
          taxNaira: 100,
        },
      );
    },
  },
  {
    name: 'pricing supports NGN 50 half-credit snack watches',
    run: () => {
      assert.equal(alignNairaToCreditValue(50), 50);
      assert.equal(getCreditsForNaira(50), 0.5);
      assert.equal(PASS_CREDITS / getCreditsForNaira(50), 60);
    },
  },
  {
    name: 'Africa-only availability blocks known non-African countries',
    run: () => {
      assert.equal(canAccessVideoFromCountry('GLOBAL', 'US'), true);
      assert.equal(canAccessVideoFromCountry('AFRICA', 'NG'), true);
      assert.equal(canAccessVideoFromCountry('AFRICA', 'ZA'), true);
      assert.equal(canAccessVideoFromCountry('AFRICA', 'US'), false);
    },
  },
  {
    name: 'multipart upload rate limits do not make completion inherit part counts',
    run: () => {
      const identity = 'user:creator-1';
      const partPolicy = getMultipartUploadRateLimit('part', identity);
      const completePolicy = getMultipartUploadRateLimit('complete', identity);

      assert.notEqual(partPolicy.key, completePolicy.key);
      assert.equal(partPolicy.limit >= 5000, true);
      assert.equal(completePolicy.limit >= 500, true);
    },
  },
  {
    name: 'master upload policy accepts 50 GB delivery files',
    run: () => {
      assert.equal(MAX_MASTER_BYTES >= 50 * 1024 * 1024 * 1024, true);
      assert.deepEqual(
        validateUploadRequest({
          purpose: 'master',
          filename: 'feature-master.mov',
          contentType: 'video/quicktime',
          fileSize: 50 * 1024 * 1024 * 1024,
        }),
        { ok: true },
      );
    },
  },
];

const cases = [...payoutCases, ...videoCases];

let passed = 0;
for (const testCase of cases) {
  testCase.run();
  passed += 1;
  console.log(`PASS ${testCase.name}`);
}

console.log(`\n${passed} tests passed.`);
