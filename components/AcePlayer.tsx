'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export default function AcePlayer({
  videoId,
  teaserSec,
  priceLabel,
  initialUnlocked,
  watermarkText,
  highlightSeconds = [],
  isAuthenticated,
  loginHref = '/auth/login'
}: {
  videoId: string;
  teaserSec: number;
  priceLabel: string;
  initialUnlocked: boolean;
  watermarkText: string;
  highlightSeconds?: number[];
  isAuthenticated: boolean;
  loginHref?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [loading, setLoading] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    const tokenUrl = isAuthenticated
      ? `/api/stream/token?videoId=${videoId}`
      : `/api/stream/token?videoId=${videoId}&teaser=1`;

    fetch(tokenUrl)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const canPlayHls = typeof document !== 'undefined'
          ? document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== ''
          : false;
        const nextUrl = canPlayHls
          ? `/api/hls/${videoId}/master.m3u8?token=${data.token}`
          : `/api/stream/${videoId}?token=${data.token}`;
        setStreamUrl(nextUrl);
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, [isAuthenticated, videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTime = () => {
      if (!unlocked && video.currentTime >= teaserSec) {
        video.pause();
        setShowPaywall(true);
      }
    };

    video.addEventListener('timeupdate', handleTime);
    return () => video.removeEventListener('timeupdate', handleTime);
  }, [teaserSec, unlocked]);

  const handleUnlock = async () => {
    if (!isAuthenticated) {
      window.location.href = loginHref;
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      if (!res.ok) throw new Error('Unlock failed');
      setUnlocked(true);
      setShowPaywall(false);
      videoRef.current?.play();
    } catch {
      alert('Payment failed or insufficient wallet balance.');
    } finally {
      setLoading(false);
    }
  };

  const watermarkNodes = useMemo(
    () => [<div key="wm" className="watermark">{watermarkText}</div>],
    [watermarkText]
  );

  const maxPreview = unlocked ? Number.POSITIVE_INFINITY : Math.max(teaserSec - 2, 0);
  const previewSeconds = highlightSeconds.filter((sec) => sec >= 0);

  const formatTime = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="player">
      {streamUrl ? (
        <video ref={videoRef} src={streamUrl} controls playsInline />
      ) : (
        <div style={{ color: 'white', padding: '24px' }}>Loading stream...</div>
      )}
      {watermarkNodes}
      {showPaywall && !unlocked ? (
        <div className="paywall">
          <div>
            <h3 style={{ fontFamily: 'var(--font-space), system-ui, sans-serif' }}>
              {isAuthenticated ? 'Unlock Full Video' : 'Sign in to unlock'}
            </h3>
            <p className="muted" style={{ color: '#f7efe0' }}>
              {isAuthenticated
                ? `You have reached the teaser limit. Pay ${priceLabel} to continue.`
                : 'You have reached the teaser limit. Sign in to continue with wallet or pass unlocks.'}
            </p>
            <button className="btn btn-primary" onClick={handleUnlock} disabled={loading}>
              {loading ? 'Processing...' : isAuthenticated ? `Pay ${priceLabel}` : 'Sign in'}
            </button>
          </div>
        </div>
      ) : null}
      {previewSeconds.length > 0 ? (
        <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {previewSeconds.map((sec) => {
            const locked = sec > maxPreview;
            return (
              <button
                key={sec}
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '6px 12px', opacity: locked ? 0.6 : 1 }}
                onClick={() => {
                  if (locked) return;
                  const video = videoRef.current;
                  if (!video) return;
                  video.currentTime = sec;
                  video.play();
                }}
                disabled={locked}
              >
                {locked ? `Locked ${formatTime(sec)}` : `Preview ${formatTime(sec)}`}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
