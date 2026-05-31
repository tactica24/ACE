'use client';

import { type FocusEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getMoviePosterUrl } from '@/lib/movie-assets';

const PREVIEW_DELAY_MS = 320;

export type HomeSpotlightVideo = {
  id: string;
  title: string;
  description: string;
  category: string;
  durationSec: number;
  videoType: string;
  posterKey: string | null;
};

function formatRuntime(_durationSec?: number | null) {
  return '90m';
}

export default function HomeSpotlightPreview({
  featured,
  spotlightVideos
}: {
  featured: HomeSpotlightVideo | null;
  spotlightVideos: HomeSpotlightVideo[];
}) {
  const lineup = useMemo(() => {
    const byId = new Map<string, HomeSpotlightVideo>();
    if (featured) byId.set(featured.id, featured);
    for (const video of spotlightVideos) byId.set(video.id, video);
    return [...byId.values()];
  }, [featured, spotlightVideos]);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(featured?.id ?? lineup[0]?.id ?? null);
  const [canHoverPreview, setCanHoverPreview] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [previewSources, setPreviewSources] = useState<Record<string, string>>({});
  const previewSourcesRef = useRef<Record<string, string>>({});
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const pendingRequestsRef = useRef<Map<string, Promise<string | null>>>(new Map());

  useEffect(() => {
    if (!activeVideoId && lineup[0]?.id) {
      setActiveVideoId(lineup[0].id);
    }
  }, [activeVideoId, lineup]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncCapability = () => {
      setCanHoverPreview(hoverQuery.matches && !reducedMotionQuery.matches);
    };

    syncCapability();
    hoverQuery.addEventListener('change', syncCapability);
    reducedMotionQuery.addEventListener('change', syncCapability);

    return () => {
      hoverQuery.removeEventListener('change', syncCapability);
      reducedMotionQuery.removeEventListener('change', syncCapability);
    };
  }, []);

  const cachePreviewSource = useCallback((videoId: string, source: string) => {
    previewSourcesRef.current = { ...previewSourcesRef.current, [videoId]: source };
    setPreviewSources(previewSourcesRef.current);
  }, []);

  const loadPreviewSource = useCallback(
    async (videoId: string) => {
      const cached = previewSourcesRef.current[videoId];
      if (cached) {
        return cached;
      }

      const pending = pendingRequestsRef.current.get(videoId);
      if (pending) {
        return pending;
      }

      const request = (async () => {
        try {
          const tokenResponse = await fetch(`/api/movies/${encodeURIComponent(videoId)}/playback?teaser=1`, {
            method: 'GET',
            cache: 'no-store'
          });

          if (!tokenResponse.ok) {
            return null;
          }

          const tokenPayload = (await tokenResponse.json()) as {
            token?: string;
            playback?: {
              previewUrl?: string;
              preferred?: string;
              progressiveUrl?: string;
            };
          };

          const previewUrl =
            typeof tokenPayload.playback?.previewUrl === 'string'
              ? tokenPayload.playback.previewUrl
              : null;
          if (previewUrl) {
            cachePreviewSource(videoId, previewUrl);
            return previewUrl;
          }

          if (!tokenPayload.token) {
            return null;
          }

          const progressiveUrl =
            typeof tokenPayload.playback?.progressiveUrl === 'string'
              ? tokenPayload.playback.progressiveUrl
              : `/api/movies/${encodeURIComponent(videoId)}/stream?token=${encodeURIComponent(tokenPayload.token)}`;
          const source = progressiveUrl;
          if (!source) {
            return null;
          }
          cachePreviewSource(videoId, source);
          return source;
        } catch {
          return null;
        } finally {
          pendingRequestsRef.current.delete(videoId);
        }
      })();

      pendingRequestsRef.current.set(videoId, request);
      return request;
    },
    [cachePreviewSource]
  );

  useEffect(() => {
    if (!canHoverPreview || !isInteractive || !activeVideoId) {
      setPreviewVideoId(null);
      const videoElement = previewRef.current;
      if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = 0;
      }
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(() => {
      void (async () => {
        const source = await loadPreviewSource(activeVideoId);
        if (!cancelled && source) {
          setPreviewVideoId(activeVideoId);
        }
      })();
    }, PREVIEW_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [activeVideoId, canHoverPreview, isInteractive, loadPreviewSource]);

  const previewSource = previewVideoId ? previewSources[previewVideoId] ?? null : null;
  const activeVideo = lineup.find((video) => video.id === activeVideoId) ?? featured ?? lineup[0] ?? null;

  useEffect(() => {
    const videoElement = previewRef.current;
    if (!videoElement) {
      return;
    }

    if (!canHoverPreview || !isInteractive || !previewSource) {
      videoElement.pause();
      videoElement.currentTime = 0;
      return;
    }

    const playPromise = videoElement.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Keep poster fallback when autoplay is blocked.
      });
    }
  }, [canHoverPreview, isInteractive, previewSource]);

  const handleFocusOut = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setIsInteractive(false);
    setPreviewVideoId(null);
  };

  const activePoster = activeVideo ? getMoviePosterUrl(activeVideo) : null;

  return (
    <div
      className="home-spotlight-shell"
      onPointerEnter={() => setIsInteractive(true)}
      onPointerLeave={() => {
        setIsInteractive(false);
        setPreviewVideoId(null);
      }}
      onFocusCapture={() => setIsInteractive(true)}
      onBlurCapture={handleFocusOut}
    >
      <div className="home-spotlight-card">
        <div
          className={`home-spotlight-preview ${previewSource ? 'is-active' : ''}`}
          style={
            activePoster
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(8, 10, 17, 0.24), rgba(8, 10, 17, 0.82)), url(${activePoster})`
                }
              : undefined
          }
        >
          {previewSource ? (
            <video
              ref={previewRef}
              key={previewSource}
              src={previewSource}
              className="home-spotlight-preview-video"
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
          ) : null}
          <span className="home-spotlight-preview-label">{previewSource ? 'Preview clip' : 'Featured presentation'}</span>
        </div>

        <span className="home-spotlight-label">Premiere</span>
        <h2>{activeVideo?.title ?? 'Premium Original'}</h2>
        <p>
          {activeVideo?.description ??
            'Premium films and series crafted for discerning viewers.'}
        </p>
        <div className="home-spotlight-list">
          {spotlightVideos.slice(0, 3).map((video, index) => (
            <Link
              key={video.id}
              className={`home-spotlight-item ${activeVideoId === video.id ? 'is-active' : ''}`}
              href={`/v/${video.id}`}
              onPointerEnter={() => setActiveVideoId(video.id)}
              onFocus={() => setActiveVideoId(video.id)}
            >
              <span className="home-spotlight-rank">0{index + 1}</span>
              <div>
                <strong>{video.title}</strong>
                <span>{video.category} / {formatRuntime(video.durationSec) ?? video.videoType}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
