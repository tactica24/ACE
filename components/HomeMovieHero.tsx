'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getMediaAssetUrl } from '@/lib/media';

type HeroCarouselVideo = {
  id: string;
  title: string;
  description: string;
  posterKey: string | null;
  category: string;
  durationSec: number;
  videoType: string;
  releaseYear: number | null;
};

const AUTOPLAY_MS = 4500;
const MAX_VISIBLE = 5;

function secondsToRuntime(_seconds: number): string {
  return '90 min';
}

function getPosterUrl(posterKey?: string | null): string | null {
  const key = posterKey?.trim();
  return key ? getMediaAssetUrl(key) : null;
}

function cardStyleFor(
  index: number,
  baseBackgroundImage: string,
  variant: 'front' | 'back-front' | 'back-mid' | 'back-last',
  entering: number | null,
  layerOffset: number,
): React.CSSProperties {
  const animDelay = (-1 + layerOffset * 0.22).toFixed(2);
  const animValue = `movieFloat 3s ease-in-out ${animDelay}s infinite alternate`;

  let base: Record<string, unknown> = {};

  if (variant === 'front') {
    base = {
      width: '53.5%',
      minWidth: '280px',
      right: '2.5%',
      bottom: '6.4%',
      zIndex: 8,
      opacity: entering === index ? 0 : 1,
      transition: 'opacity 280ms ease',
    };
  } else if (variant === 'back-front') {
    base = {
      width: '35.5%',
      minWidth: '190px',
      right: '44.5%',
      bottom: '4.5%',
      zIndex: 4,
      opacity: entering === index ? 1 : 0.38,
      transition: 'opacity 380ms ease',
    };
  } else if (variant === 'back-mid') {
    base = {
      width: '26.5%',
      minWidth: '136px',
      right: '70%',
      bottom: '8%',
      zIndex: 2,
      opacity: entering === index ? 1 : 0,
      transition: 'opacity 480ms ease',
    };
  } else {
    base = {
      width: '28%',
      minWidth: '152px',
      right: '70%',
      bottom: '1%',
      zIndex: 1,
      opacity: entering === index ? 1 : 0,
      transition: 'opacity 520ms ease',
    };
  }

  return {
    ...base,
    backgroundImage: baseBackgroundImage,
    animation: animValue,
  } as React.CSSProperties;
}

function posterFor(idx: number, videos: HeroCarouselVideo[]): string | null {
  return getPosterUrl(videos[idx]?.posterKey ?? null);
}

function relativeIndex(activeIndex: number, offset: number, count: number) {
  return count > 0 ? (activeIndex + offset) % count : 0;
}

function buildCardBackground(p: string | null): string {
  if (p) {
    return `linear-gradient(180deg,rgba(7,8,16,.14) 0%,rgba(7,8,16,.68) 100%),url("${p}")`;
  }
  return `linear-gradient(135deg,rgba(7,8,16,.98) 0%,rgba(12,15,28,.98) 100%)`;
}

function buildHeroMeta(video: HeroCarouselVideo | null) {
  if (!video) return 'Now Showing';
  return [
    video.releaseYear ? String(video.releaseYear) : null,
    video.durationSec ? secondsToRuntime(video.durationSec) : null,
    video.videoType || null
  ].filter(Boolean).join(' / ') || 'Now Showing';
}

export default function HomeMovieHero(
  { videos }: { videos: HeroCarouselVideo[] },
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [entering, setEntering] = useState<number | null>(null);
  const [isHoveringButtons, setIsHoveringButtons] = useState(false);

  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inspect: HeroCarouselVideo[] = (() => {
    try {
      return videos && videos.length > 0 ? videos : [];
    } catch {
      return [];
    }
  })();

  const allVideos: HeroCarouselVideo[] = inspect.slice(0, MAX_VISIBLE);
  const count = allVideos.length;
  const safeActiveIndex = count > 0 ? activeIndex % count : 0;
  const featured: HeroCarouselVideo | null = allVideos[safeActiveIndex] ?? allVideos[0] ?? null;

  const scheduleAutoplay = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (count <= 1) return;

    if (autoplayRef.current !== null) {
      clearInterval(autoplayRef.current);
    }
    autoplayRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, AUTOPLAY_MS);
  }, [count]);

  const advanceTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      scheduleAutoplay();
    },
    [scheduleAutoplay],
  );

  const onPointerEnter = useCallback(() => {
    if (autoplayRef.current !== null) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setEntering(null);
  }, []);

  const onPointerLeave = useCallback(() => {
    if (isHoveringButtons) return;
    if (count <= 1) return;
    setEntering(activeIndex);
    timeoutRef.current = setTimeout(() => setEntering(null), 380);
    scheduleAutoplay();
  }, [isHoveringButtons, count, activeIndex, scheduleAutoplay]);

  const goPrev = useCallback(() => {
    advanceTo((activeIndex - 1 + count) % count);
  }, [activeIndex, count, advanceTo]);

  const goNext = useCallback(() => {
    advanceTo((activeIndex + 1) % count);
  }, [activeIndex, count, advanceTo]);

  const goTo = useCallback(
    (index: number) => advanceTo(index),
    [advanceTo],
  );

  // Auto-rotate
  useEffect(() => {
    if (count <= 1) return;
    scheduleAutoplay();

    return () => {
      if (autoplayRef.current !== null) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [count, scheduleAutoplay]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext]);

  // Touch swipe helpers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartXRef.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || dragStartXRef.current === null) return;
      const delta = e.changedTouches[0].clientX - dragStartXRef.current;
      setIsDragging(false);
      dragStartXRef.current = null;
      if (Math.abs(delta) < 48) return;
      delta > 0 ? goPrev() : goNext();
    },
    [isDragging, goPrev, goNext],
  );

  const backdropImage =
    featured
      ? `linear-gradient(99deg,rgba(4,6,12,.96) 0%,rgba(4,6,12,.54) 48%,rgba(4,6,12,.74) 100%),url("${
          getPosterUrl(featured.posterKey) ?? ''
        }")`
      : undefined;

  /* â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  // backdrop info for the first 3 poster slots
  const backCards: Array<{
    idx: number;
    videoIdx: number;
    variant: 'front' | 'back-front' | 'back-mid' | 'back-last';
    offset: number;
  }> = [];

  if (count >= 4) backCards.push({ idx: relativeIndex(safeActiveIndex, 3, count), videoIdx: relativeIndex(safeActiveIndex, 3, count), variant: 'back-last', offset: 3 });
  if (count >= 3) backCards.push({ idx: relativeIndex(safeActiveIndex, 2, count), videoIdx: relativeIndex(safeActiveIndex, 2, count), variant: 'back-mid', offset: 2 });
  if (count >= 2) backCards.push({ idx: relativeIndex(safeActiveIndex, 1, count), videoIdx: relativeIndex(safeActiveIndex, 1, count), variant: 'back-front', offset: 1 });

  return (
    <section
      className="home-movie-hero"
      aria-label="Featured film hero"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* â”€â”€ backdrop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="home-movie-hero-backdrop"
        style={backdropImage ? { backgroundImage: backdropImage } : undefined}
        aria-hidden="true"
      />


      {/* â”€â”€ hero copy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="home-movie-hero-inner">
        <span className="home-movie-hero-meta-kicker">
          {buildHeroMeta(featured)}
        </span>

        <h1 className="home-movie-hero-title">
          {featured?.title ??
            'ACE Studio brings premium cinematic discovery to every screen.'}
        </h1>

        <p className="home-movie-hero-summary">
          {featured?.description ??
            'Discover bold films, standout series, and a cinematic viewing journey built to feel premium from the first frame.'}
        </p>


        <div className="home-movie-hero-actions">
          <Link
            className="btn btn-primary"
            href={featured ? `/v/${featured.id}` : '/browse'}
          >
            Watch Now
          </Link>

          {count > 1 && (
            <button
              className="btn btn-nav-accent"
              onClick={goPrev}
              aria-label="Previous title"
              disabled={isDragging}
            >
              &#x25C0;
            </button>
          )}

          {count > 1 && (
            <button
              className="btn btn-nav-accent"
              onClick={goNext}
              aria-label="Next title"
              disabled={isDragging}
            >
              &#x25B6;
            </button>
          )}

          <Link
            className="btn btn-ghost"
            href="#categories"
            onMouseEnter={() => setIsHoveringButtons(true)}
            onMouseLeave={() => setIsHoveringButtons(false)}
          >
            Browse
          </Link>

          <Link
            className="btn btn-ghost"
            href="/download"
            onMouseEnter={() => setIsHoveringButtons(true)}
            onMouseLeave={() => setIsHoveringButtons(false)}
          >
            Get APK
          </Link>
        </div>
      </div>


      {/* â”€â”€ carousel controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="home-movie-carousel-controls"
        aria-label="Movie carousel"
        onMouseEnter={() => setIsHoveringButtons(true)}
        onMouseLeave={() => setIsHoveringButtons(false)}
      >
        <button
          className="home-movie-prev"
          aria-label="Previous"
          onClick={goPrev}
          disabled={isDragging}
        >
          <svg
            width="12"
            height="18"
            viewBox="0 0 12 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 1L2 9L10 17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="home-movie-indicators" role="tablist">
          {allVideos.map((v, idx) => (
            <button
              key={v.id}
              className={`home-movie-indicator${
                idx === activeIndex ? ' home-movie-indicator--active' : ''
              }`}
              role="tab"
              aria-selected={idx === activeIndex}
              aria-label={`Play ${v.title}`}
              onClick={() => goTo(idx)}
              title={v.title}
            />
          ))}
        </div>

        <button
          className="home-movie-next"
          aria-label="Next"
          onClick={goNext}
          disabled={isDragging}
        >
          <svg
            width="12"
            height="18"
            viewBox="0 0 12 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 1L10 9L2 17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}
