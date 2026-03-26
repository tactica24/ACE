'use client';

import { useEffect, useRef, useState } from 'react';

const AUTO_UNLOCK_LEAD_SECONDS = 5;
const HISTORY_SYNC_SECONDS = 5;

function getProgressStorageKey(videoId: string) {
  return `ace-progress:${videoId}`;
}

function readSavedProgress(videoId: string) {
  if (typeof window === 'undefined') return 0;

  try {
    const raw = window.localStorage.getItem(getProgressStorageKey(videoId));
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  } catch {
    return 0;
  }
}

function saveProgressLocally(videoId: string, progressSec: number) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(getProgressStorageKey(videoId), String(Math.max(0, Math.floor(progressSec))));
  } catch {
    // Ignore local persistence failures.
  }
}

function clearSavedProgress(videoId: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(getProgressStorageKey(videoId));
  } catch {
    // Ignore local persistence failures.
  }
}

function getDeviceSessionId() {
  if (typeof window === 'undefined') return '';

  const storageKey = 'ace-device-session-id';
  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const created = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `ace-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

  window.localStorage.setItem(storageKey, created);
  return created;
}

type UnlockState = 'idle' | 'unlocking' | 'needs_topup' | 'verification_required' | 'error';

export default function AcePlayer({
  videoId,
  teaserSec,
  priceLabel,
  initialUnlocked,
  initialProgress = 0,
  watermarkText,
  highlightSeconds = [],
  isAuthenticated,
  loginHref = '/auth/login'
}: {
  videoId: string;
  teaserSec: number;
  priceLabel: string;
  initialUnlocked: boolean;
  initialProgress?: number;
  watermarkText: string;
  highlightSeconds?: number[];
  isAuthenticated: boolean;
  loginHref?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const unlockAttemptedRef = useRef(initialUnlocked);
  const pendingResumeRef = useRef<number | null>(null);
  const pendingAutoplayRef = useRef(false);
  const lastSyncedRef = useRef(0);
  const historyInFlightRef = useRef(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [unlockState, setUnlockState] = useState<UnlockState>('idle');
  const [watchMode, setWatchMode] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resumePrompt, setResumePrompt] = useState<number | null>(null);

  const loadStream = async ({ resumeAt, autoplay }: { resumeAt?: number; autoplay?: boolean } = {}) => {
    const deviceSessionId = isAuthenticated ? getDeviceSessionId() : '';
    const tokenUrl = isAuthenticated
      ? `/api/stream/token?videoId=${videoId}&deviceSessionId=${encodeURIComponent(deviceSessionId)}`
      : `/api/stream/token?videoId=${videoId}&teaser=1`;

    const res = await fetch(tokenUrl);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? 'Unable to load this video right now.');
    }

    const canPlayHls = typeof document !== 'undefined'
      ? document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== ''
      : false;

    pendingResumeRef.current = typeof resumeAt === 'number' ? resumeAt : null;
    pendingAutoplayRef.current = Boolean(autoplay);

    setStreamUrl(
      canPlayHls
        ? `/api/hls/${videoId}/master.m3u8?token=${data.token}`
        : `/api/stream/${videoId}?token=${data.token}`
    );
  };

  const syncHistory = async ({
    progressSec,
    completed = false,
    keepalive = false
  }: {
    progressSec: number;
    completed?: boolean;
    keepalive?: boolean;
  }) => {
    const roundedProgress = Math.max(0, Math.floor(progressSec));

    saveProgressLocally(videoId, completed ? 0 : roundedProgress);

    if (!isAuthenticated || historyInFlightRef.current) {
      return;
    }

    historyInFlightRef.current = true;
    try {
      await fetch('/api/watch-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive,
        body: JSON.stringify({
          videoId,
          progressSec: roundedProgress,
          durationSec: Math.floor(videoRef.current?.duration ?? 0),
          completed
        })
      });
      lastSyncedRef.current = roundedProgress;
      if (completed) {
        clearSavedProgress(videoId);
      }
    } catch {
      // Keep local progress even if server sync fails.
    } finally {
      historyInFlightRef.current = false;
    }
  };

  const unlockVideo = async ({
    resumeAt,
    immediatePrompt = false
  }: {
    resumeAt: number;
    immediatePrompt?: boolean;
  }) => {
    if (!isAuthenticated) {
      window.location.href = loginHref;
      return false;
    }

    setUnlockState('unlocking');
    setFeedback(immediatePrompt ? 'Unlocking your full video...' : null);

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 402) {
          setUnlockState('needs_topup');
          setFeedback('You need more credits or wallet balance to keep watching.');
          if (immediatePrompt) {
            setShowPaywall(true);
          }
          return false;
        }

        if (res.status === 403) {
          setUnlockState('verification_required');
          setFeedback(data.error ?? 'Please verify your email before continuing.');
          if (immediatePrompt) {
            setShowPaywall(true);
          }
          return false;
        }

        setUnlockState('error');
        setFeedback(data.error ?? 'We could not unlock this title right now.');
        if (immediatePrompt) {
          setShowPaywall(true);
        }
        return false;
      }

      setUnlocked(true);
      setUnlockState('idle');
      setFeedback(null);
      setShowPaywall(false);
      unlockAttemptedRef.current = true;
      await loadStream({ resumeAt, autoplay: true });
      return true;
    } catch {
      setUnlockState('error');
      setFeedback('We could not unlock this title right now.');
      if (immediatePrompt) {
        setShowPaywall(true);
      }
      return false;
    }
  };

  useEffect(() => {
    loadStream({
      resumeAt: Math.max(initialProgress, readSavedProgress(videoId)),
      autoplay: false
    }).catch(() => setFeedback('Unable to load the stream right now.'));
  }, [initialProgress, isAuthenticated, videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const fallbackResume = Math.max(initialProgress, readSavedProgress(videoId));
      const nextResume = pendingResumeRef.current ?? fallbackResume;
      const safeResume =
        video.duration > 20
          ? Math.min(nextResume, Math.max(video.duration - 10, 0))
          : nextResume;

      if (safeResume > 3) {
        if (pendingAutoplayRef.current) {
          video.currentTime = safeResume;
        } else {
          setResumePrompt(safeResume);
        }
      }

      if (pendingAutoplayRef.current) {
        video.play().catch(() => null);
      }

      pendingResumeRef.current = null;
      pendingAutoplayRef.current = false;
    };

    const handlePlay = () => {
      setResumePrompt(null);
      setWatchMode(true);
    };

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const unlockTriggerTime = Math.max(teaserSec - AUTO_UNLOCK_LEAD_SECONDS, 0);

      if (
        isAuthenticated &&
        !unlocked &&
        unlockState !== 'unlocking' &&
        !unlockAttemptedRef.current &&
        currentTime >= unlockTriggerTime
      ) {
        unlockAttemptedRef.current = true;
        void unlockVideo({ resumeAt: currentTime });
      }

      if (!unlocked && currentTime >= teaserSec) {
        video.pause();
        if (!isAuthenticated) {
          setFeedback('Sign in to continue watching the full title.');
          setShowPaywall(true);
          return;
        }

        if (unlockState === 'unlocking') {
          setFeedback('Unlocking your full video...');
          setShowPaywall(true);
          return;
        }

        if (unlockState === 'needs_topup' || unlockState === 'verification_required' || unlockState === 'error') {
          setShowPaywall(true);
          return;
        }

        unlockAttemptedRef.current = true;
        void unlockVideo({ resumeAt: currentTime, immediatePrompt: true });
      }

      if (currentTime - lastSyncedRef.current >= HISTORY_SYNC_SECONDS) {
        void syncHistory({ progressSec: currentTime });
      }
    };

    const handlePause = () => {
      if (video.currentTime > 0 && !video.ended) {
        void syncHistory({ progressSec: video.currentTime, keepalive: true });
      }
    };

    const handleEnded = () => {
      setWatchMode(false);
      setShowPaywall(false);
      void syncHistory({ progressSec: 0, completed: true, keepalive: true });
    };

    const handlePageHide = () => {
      if (video.currentTime > 0 && !video.ended) {
        void syncHistory({ progressSec: video.currentTime, keepalive: true });
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [initialProgress, isAuthenticated, loginHref, teaserSec, unlockState, unlocked, videoId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.body.classList.toggle('watch-mode-active', watchMode);

    return () => {
      document.body.classList.remove('watch-mode-active');
    };
  }, [watchMode]);

  const previewSeconds = highlightSeconds.filter((sec) => sec >= 0);
  const maxPreview = unlocked ? Number.POSITIVE_INFINITY : Math.max(teaserSec - 2, 0);

  const formatTime = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className={`player${watchMode ? ' player-watch-mode' : ''}`}>
      {streamUrl ? (
        <video ref={videoRef} src={streamUrl} controls playsInline />
      ) : (
        <div style={{ color: 'white', padding: '24px' }}>{feedback ?? 'Loading stream...'}</div>
      )}

      <div className="watermark">{watermarkText}</div>

      <button
        className="player-ghost-control"
        type="button"
        onClick={() => setWatchMode((current) => !current)}
      >
        {watchMode ? 'Exit watch mode' : 'Watch mode'}
      </button>

      {resumePrompt ? (
        <div className="paywall">
          <div>
            <h3 style={{ fontFamily: 'var(--font-space), system-ui, sans-serif' }}>Continue watching?</h3>
            <p className="muted" style={{ color: '#f7efe0' }}>
              We saved your place at {formatTime(resumePrompt)}. Choose whether to continue from there or start this title again.
            </p>
            <div className="player-overlay-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.currentTime = resumePrompt;
                  setResumePrompt(null);
                  video.play().catch(() => null);
                }}
              >
                Continue from {formatTime(resumePrompt)}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  const video = videoRef.current;
                  clearSavedProgress(videoId);
                  setResumePrompt(null);
                  if (video) {
                    video.currentTime = 0;
                    video.play().catch(() => null);
                  }
                  void syncHistory({ progressSec: 0, keepalive: true });
                }}
              >
                Start over
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPaywall && !unlocked ? (
        <div className="paywall">
          <div>
            <h3 style={{ fontFamily: 'var(--font-space), system-ui, sans-serif' }}>
              {isAuthenticated ? 'Keep watching' : 'Sign in to continue'}
            </h3>
            <p className="muted" style={{ color: '#f7efe0' }}>
              {feedback
                ? feedback
                : isAuthenticated
                  ? `We automatically use your pass, credits, or wallet balance first. Add funds if you need more to continue this title for ${priceLabel}.`
                  : 'Sign in and we will keep your progress and continue from where you stopped.'}
            </p>
            <div className="player-overlay-actions">
              {!isAuthenticated ? (
                <button className="btn btn-primary" type="button" onClick={() => { window.location.href = loginHref; }}>
                  Sign in
                </button>
              ) : unlockState === 'needs_topup' ? (
                <a className="btn btn-primary" href="/wallet">
                  Top up wallet
                </a>
              ) : unlockState === 'verification_required' ? (
                <a className="btn btn-primary" href="/account">
                  Verify account
                </a>
              ) : (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    const currentTime = videoRef.current?.currentTime ?? teaserSec;
                    void unlockVideo({ resumeAt: currentTime, immediatePrompt: true });
                  }}
                  disabled={unlockState === 'unlocking'}
                >
                  {unlockState === 'unlocking' ? 'Unlocking...' : 'Try again'}
                </button>
              )}
              {isAuthenticated && unlockState !== 'needs_topup' ? (
                <a className="btn btn-ghost" href="/wallet">
                  Wallet
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {previewSeconds.length > 0 && !watchMode ? (
        <div className="player-highlight-row">
          {previewSeconds.map((sec) => {
            const locked = sec > maxPreview;
            return (
              <button
                key={sec}
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '6px 12px', opacity: locked ? 0.6 : 1 }}
                type="button"
                onClick={() => {
                  if (locked) return;
                  const video = videoRef.current;
                  if (!video) return;
                  video.currentTime = sec;
                  video.play().catch(() => null);
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
