'use client';

import { type FocusEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getDefaultTierPriceNaira } from '@/lib/commerce';
import { formatCurrencyMinor } from '@/lib/format';
import { getMoviePosterUrl } from '@/lib/movie-assets';
import { type PriceTierValue } from '@/lib/media-types';

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
  genres?: string[];
  priceTier: PriceTierValue;
  posterKey?: string | null;
  price?: { currency: string; amountMinor: number; amountNaira?: number };
  progressPercent?: number;
};

const PREVIEW_DELAY_MS = 320;

function formatRuntime(_durationSec?: number) {
  return '90m';
}

export default function VideoCard({ video }: { video: VideoCardData }) {
  const priceMinor = video.price?.amountMinor ?? getDefaultTierPriceNaira(video.priceTier) * 100;
  const currencyCode = video.price?.currency ?? 'USD';
  const posterUrl = getMoviePosterUrl(video);
  const runtimeLabel = formatRuntime(video.durationSec);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [canHoverPreview, setCanHoverPreview] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [previewSource, setPreviewSource] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const hasPoster = Boolean(posterUrl && !posterFailed);
  const priceLabel = formatCurrencyMinor(priceMinor, currencyCode);
  const genreLabel = video.genres?.filter(Boolean).slice(0, 2).join(' / ') || labelize(video.videoType);
  const releaseLabel = video.releaseYear ? String(video.releaseYear) : null;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateHoverCapability = () => {
      setCanHoverPreview(hoverQuery.matches && !reducedMotionQuery.matches);
    };

    updateHoverCapability();
    hoverQuery.addEventListener('change', updateHoverCapability);
    reducedMotionQuery.addEventListener('change', updateHoverCapability);

    return () => {
      hoverQuery.removeEventListener('change', updateHoverCapability);
      reducedMotionQuery.removeEventListener('change', updateHoverCapability);
    };
  }, []);

  const loadPreviewSource = useCallback(async () => {
    if (previewSource) {
      setPreviewReady(true);
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const tokenResponse = await fetch(`/api/movies/${encodeURIComponent(video.id)}/playback?teaser=1`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });

      if (!tokenResponse.ok) {
        return;
      }

      const tokenPayload = (await tokenResponse.json()) as {
        token?: string;
        playback?: { progressiveUrl?: string | null };
      };
      const source = tokenPayload.playback?.progressiveUrl ?? null;
      if (!source) {
        return;
      }

      setPreviewSource(source);
      setPreviewReady(true);
    } catch {
      // Keep poster-only card when preview token or stream is unavailable.
    }
  }, [previewSource, video.id]);

  useEffect(() => {
    if (!canHoverPreview || !isInteractive) {
      setPreviewReady(false);
      const videoElement = previewRef.current;
      if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = 0;
      }
      return;
    }

    const timerId = window.setTimeout(() => {
      void loadPreviewSource();
    }, PREVIEW_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [canHoverPreview, isInteractive, loadPreviewSource]);

  useEffect(() => {
    const videoElement = previewRef.current;
    if (!videoElement) {
      return;
    }

    if (!canHoverPreview || !isInteractive || !previewReady || !previewSource) {
      videoElement.pause();
      videoElement.currentTime = 0;
      return;
    }

    const playPromise = videoElement.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Silent fallback to poster only.
      });
    }
  }, [canHoverPreview, isInteractive, previewReady, previewSource]);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  const handleFocusOut = (event: FocusEvent<HTMLAnchorElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setIsInteractive(false);
  };

  return (
    <Link
      href={`/v/${video.id}`}
      className={`video-card ${previewReady && isInteractive ? 'video-card-preview-active' : ''}`}
      onPointerEnter={() => setIsInteractive(true)}
      onPointerLeave={() => setIsInteractive(false)}
      onFocus={() => setIsInteractive(true)}
      onBlur={handleFocusOut}
    >
      <div className={`video-thumb${hasPoster ? ' video-thumb-has-poster' : ''}`}>
        {posterUrl && !posterFailed ? (
          <Image
            className="video-thumb-poster"
            src={posterUrl}
            alt=""
            width={640}
            height={960}
            sizes="(max-width: 768px) 50vw, 220px"
            unoptimized
            loading="lazy"
            aria-hidden="true"
            onError={() => setPosterFailed(true)}
          />
        ) : (
          <span className="video-thumb-placeholder" aria-hidden="true">
            {video.title.charAt(0).toUpperCase()}
          </span>
        )}
        {previewSource ? (
          <video
            ref={previewRef}
            className="video-thumb-preview"
            src={previewSource}
            muted
            playsInline
            preload="metadata"
            loop
            aria-hidden="true"
          />
        ) : null}
        <div className="video-thumb-overlay">
          <span className="video-thumb-kicker">{ageLabel[video.ageRating] ?? labelize(video.ageRating)}</span>
          <span className="video-thumb-runtime">{runtimeLabel ?? labelize(video.videoType)}</span>
        </div>
        {typeof video.progressPercent === 'number' && video.progressPercent > 0 ? (
          <div className="video-progress" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.max(0, video.progressPercent))}%` }} />
          </div>
        ) : null}
      </div>
      <div className="video-meta">
        <div className="video-meta-top">
          <strong className="video-card-title">{video.title}</strong>
        </div>
        <div className="video-card-line">
          <span>{releaseLabel ?? labelize(video.videoType)}</span>
          <span>{ageLabel[video.ageRating] ?? labelize(video.ageRating)}</span>
          <strong className="video-card-price">Unlock {priceLabel}</strong>
        </div>
        <div className="video-card-reveal">
          <span className="video-card-meta">{genreLabel}</span>
          <p className="video-card-summary">{video.description}</p>
          <div className="video-card-details">
            {video.videoType === 'SERIES' && !video.seriesId && video.episodeCount ? (
              <span>{video.episodeCount} episodes</span>
            ) : null}
            <span>{runtimeLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
