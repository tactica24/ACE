'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLanguageLabel } from '@/lib/media-types';
import { getMediaAssetUrl } from '@/lib/media';
import { getUiCopy, type UILanguage } from '@/lib/ui-language';

const HISTORY_SYNC_SECONDS = 5;

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

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

function getPreferredPlaybackQuality() {
  if (typeof navigator === 'undefined') {
    return 'high';
  }

  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!connection) {
    return 'adaptive';
  }

  if (connection.saveData) {
    return 'data-saver';
  }

  if (connection.effectiveType && ['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
    return 'data-saver';
  }

  return 'high';
}

type UnlockState = 'idle' | 'unlocking' | 'needs_topup' | 'verification_required' | 'error';

type SubtitleTrackOption = {
  id: string;
  label: string;
  languageCode: string;
  kind: string;
  src: string;
  isDefault?: boolean;
};

type AudioTrackLike = {
  enabled: boolean;
  label?: string;
  language?: string;
};

export default function AcePlayer({
  videoId,
  teaserSec,
  priceLabel,
  initialUnlocked,
  initialStreamUrl,
  initialProgress = 0,
  posterSrc,
  highlightSeconds = [],
  subtitles = [],
  audioLanguages = [],
  uiLanguage = 'en',
  isAuthenticated,
  loginHref = '/auth/login',
  trailerKey = null
}: {
  videoId: string;
  teaserSec: number;
  priceLabel: string;
  initialUnlocked: boolean;
  initialStreamUrl?: string;
  initialProgress?: number;
  posterSrc?: string;
  highlightSeconds?: number[];
  subtitles?: SubtitleTrackOption[];
  audioLanguages?: string[];
  uiLanguage?: UILanguage;
  isAuthenticated: boolean;
  loginHref?: string;
  trailerKey?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const unlockAttemptedRef = useRef(initialUnlocked);
  const pendingResumeRef = useRef<number | null>(null);
  const pendingAutoplayRef = useRef(false);
  const lastSyncedRef = useRef(0);
  const historyInFlightRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const copy = getUiCopy(uiLanguage);
  const subtitleTracks = useMemo(() => subtitles.filter((track) => track.src), [subtitles]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [unlockState, setUnlockState] = useState<UnlockState>('idle');
  const [watchMode, setWatchMode] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(Boolean(trailerKey));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resumePrompt, setResumePrompt] = useState<number | null>(null);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string>(subtitleTracks.find((track) => track.isDefault)?.id ?? subtitleTracks[0]?.id ?? 'off');
  const [audioTrackOptions, setAudioTrackOptions] = useState<Array<{ index: number; label: string }>>([]);
  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(Math.max(0, initialProgress));
  const [durationSec, setDurationSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSessionId, setPlaybackSessionId] = useState<string | null>(null);
  const router = useRouter();
  const defaultSubtitleId = useMemo(
    () => subtitleTracks.find((track) => track.isDefault)?.id ?? subtitleTracks[0]?.id ?? 'off',
    [subtitleTracks]
  );
  const subtitleSignature = useMemo(
    () => subtitleTracks.map((track) => `${track.id}:${track.src}:${track.isDefault ? '1' : '0'}`).join('|'),
    [subtitleTracks]
  );

  const trailerSrc = trailerKey ? getMediaAssetUrl(trailerKey) : null;
  const activeVideoSrc = isPlayingTrailer && trailerSrc ? trailerSrc : streamUrl;
  const isMovieMode = !isPlayingTrailer;
  const hasLockedMoviePreview = teaserSec > 0;

  const seekToTime = useCallback((targetSec: number, shouldPlay = true) => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    const safeTarget = Math.max(0, targetSec);
    const startPlayback = () => {
      if (shouldPlay) {
        videoElement.play().catch(() => null);
      }
    };

    if (Math.abs(videoElement.currentTime - safeTarget) < 0.5) {
      startPlayback();
      return;
    }

    const handleSeeked = () => {
      videoElement.removeEventListener('seeked', handleSeeked);
      startPlayback();
    };

    videoElement.addEventListener('seeked', handleSeeked);
    videoElement.currentTime = safeTarget;
  }, []);

  const applySubtitleSelection = useCallback((videoElement = videoRef.current) => {
    if (!videoElement || !videoElement.textTracks) {
      return;
    }

    for (let index = 0; index < videoElement.textTracks.length; index += 1) {
      const track = videoElement.textTracks[index];
      const option = subtitleTracks[index];
      track.mode = option && selectedSubtitleId !== 'off' && option.id === selectedSubtitleId ? 'showing' : 'disabled';
    }
  }, [selectedSubtitleId, subtitleTracks]);

  const syncAudioTrackState = useCallback((videoElement = videoRef.current) => {
    if (!videoElement) {
      return;
    }

    const audioTracks = (videoElement as HTMLVideoElement & { audioTracks?: ArrayLike<AudioTrackLike> }).audioTracks;
    if (!audioTracks || audioTracks.length <= 1) {
      setAudioTrackOptions([]);
      setSelectedAudioTrackIndex(0);
      return;
    }

    const options = Array.from({ length: audioTracks.length }, (_, index) => {
      const track = audioTracks[index];
      const fallbackCode = audioLanguages[index] ?? track?.language ?? '';
      const label = track?.label?.trim() || (fallbackCode ? getLanguageLabel(fallbackCode) : `${copy.audio} ${index + 1}`);
      return { index, label };
    });

    let enabledIndex = 0;
    for (let index = 0; index < audioTracks.length; index += 1) {
      if (audioTracks[index]?.enabled) {
        enabledIndex = index;
        break;
      }
    }

    setAudioTrackOptions(options);
    setSelectedAudioTrackIndex(enabledIndex);
  }, [audioLanguages, copy.audio]);

  const setAudioTrack = (index: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    const audioTracks = (videoElement as HTMLVideoElement & { audioTracks?: ArrayLike<AudioTrackLike> }).audioTracks;
    if (!audioTracks || audioTracks.length <= index) {
      return;
    }

    for (let currentIndex = 0; currentIndex < audioTracks.length; currentIndex += 1) {
      const track = audioTracks[currentIndex];
      if (track) {
        track.enabled = currentIndex === index;
      }
    }

    setSelectedAudioTrackIndex(index);
  };

  const getPlayableLimit = useCallback(() => {
    const videoElement = videoRef.current;
    const videoDuration = videoElement?.duration ?? 0;

    if (isPlayingTrailer) {
      return Number.isFinite(videoDuration) && videoDuration > 0 ? videoDuration : Number.POSITIVE_INFINITY;
    }

    if (unlocked) {
      return Number.isFinite(videoDuration) && videoDuration > 0 ? videoDuration : Number.POSITIVE_INFINITY;
    }

    return Math.max(teaserSec - 0.35, 0);
  }, [teaserSec, unlocked, isPlayingTrailer]);

  const constrainedSeek = useCallback((targetSec: number, shouldPlay = true) => {
    const limit = getPlayableLimit();
    const safeTarget = Math.max(0, Number.isFinite(limit) ? Math.min(targetSec, limit) : targetSec);

    if (!unlocked && targetSec > safeTarget + 0.1) {
      setShowPaywall(true);
      setFeedback(isAuthenticated ? `Unlock the movie for ${priceLabel}.` : copy.signInToUnlockSummary);
    }

    seekToTime(safeTarget, shouldPlay);
  }, [copy.signInToUnlockSummary, getPlayableLimit, isAuthenticated, priceLabel, seekToTime, unlocked]);

  const jumpPlayback = useCallback((deltaSec: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    constrainedSeek(videoElement.currentTime + deltaSec);
  }, [constrainedSeek]);

  const togglePlayback = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    if (videoElement.paused) {
      videoElement.play().catch(() => null);
      return;
    }

    videoElement.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    videoElement.muted = !videoElement.muted;
  }, []);

  const updateVolume = (nextVolume: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    const clampedVolume = Math.max(0, Math.min(nextVolume, 1));
    videoElement.volume = clampedVolume;
    videoElement.muted = clampedVolume === 0;
    setVolume(clampedVolume);
    setIsMuted(clampedVolume === 0);
  };

  const loadPreviewStream = useCallback(async ({ resumeAt, autoplay }: { resumeAt?: number; autoplay?: boolean } = {}) => {
    const params = new URLSearchParams({
      videoId,
      teaser: '1'
    });

    if (isAuthenticated) {
      params.set('deviceSessionId', getDeviceSessionId());
    }

    const res = await fetch(`/api/stream/token?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setFeedback(data.error ?? 'Preview is not available for this title yet.');
      return false;
    }

    const previewUrl =
      typeof data.playback?.progressiveUrl === 'string'
        ? data.playback.progressiveUrl
        : '';

    if (!previewUrl) {
      setFeedback('Preview is not available for this title yet.');
      return false;
    }

    pendingResumeRef.current = typeof resumeAt === 'number' ? resumeAt : null;
    pendingAutoplayRef.current = Boolean(autoplay);
    setStreamUrl(previewUrl);
    return true;
  }, [isAuthenticated, videoId]);

  const loadStream = useCallback(async ({ resumeAt, autoplay }: { resumeAt?: number; autoplay?: boolean } = {}) => {
    if (!isAuthenticated) {
      if (initialStreamUrl) {
        pendingResumeRef.current = typeof resumeAt === 'number' ? resumeAt : null;
        pendingAutoplayRef.current = Boolean(autoplay);
        setStreamUrl(initialStreamUrl);
        return;
      }
      await loadPreviewStream({ resumeAt, autoplay });
      return;
    }

    // For authenticated users, call playback start API
    const res = await fetch('/api/playback/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId: videoId, deviceSessionId: getDeviceSessionId() })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.reason === 'NOT_UNLOCKED') {
        const previewLoaded = await loadPreviewStream({ resumeAt, autoplay });
        if (!previewLoaded) {
          setShowPaywall(true);
        }
        return;
      }
      throw new Error(data.error ?? 'Unable to start playback.');
    }

    if (!data.allowed || !data.playbackUrl) {
      setShowPaywall(true);
      return;
    }

    pendingResumeRef.current = typeof resumeAt === 'number' ? resumeAt : null;
    pendingAutoplayRef.current = Boolean(autoplay);
    setPlaybackSessionId(data.sessionId);
    setStreamUrl(data.playbackUrl);
  }, [isAuthenticated, initialStreamUrl, loadPreviewStream, videoId]);

  const handleMovieModeRequest = useCallback(() => {
    if (!unlocked && !hasLockedMoviePreview) {
      setShowPaywall(true);
      setFeedback(isAuthenticated ? `Unlock the movie for ${priceLabel}.` : copy.signInToUnlockSummary);
      return;
    }

    setIsPlayingTrailer(false);
    setShowPaywall(false);
    setFeedback(null);

    void loadStream({
      resumeAt: Math.max(initialProgress, readSavedProgress(videoId)),
      autoplay: false
    }).catch((error) => {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Unable to load the movie stream right now.';

      setFeedback(message);
      if (!unlocked) {
        setShowPaywall(true);
      }
    });
  }, [
    copy.signInToUnlockSummary,
    hasLockedMoviePreview,
    initialProgress,
    isAuthenticated,
    loadStream,
    priceLabel,
    unlocked,
    videoId
  ]);

  const syncHistory = useCallback(async ({
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

    if (!isAuthenticated || !playbackSessionId || historyInFlightRef.current) {
      return;
    }

    historyInFlightRef.current = true;
    try {
      await fetch('/api/playback/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive,
        body: JSON.stringify({
          sessionId: playbackSessionId,
          movieId: videoId,
          progressSeconds: roundedProgress,
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
  }, [isAuthenticated, playbackSessionId, videoId]);

  const restartPlayback = useCallback(() => {
    clearSavedProgress(videoId);
    setResumePrompt(null);
    constrainedSeek(0);
    void syncHistory({ progressSec: 0, keepalive: true });
  }, [constrainedSeek, syncHistory, videoId]);

  const exitWatchMode = useCallback(() => {
    setWatchMode(false);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('watch-mode-active');
    }
  }, []);

  const prepareForNavigation = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      exitWatchMode();
      return;
    }

    exitWatchMode();
    videoElement.pause();

    if (videoElement.currentTime > 0 && !videoElement.ended) {
      void syncHistory({ progressSec: videoElement.currentTime, keepalive: true });
    }
  }, [exitWatchMode, syncHistory]);

  const unlockVideo = useCallback(async ({
    resumeAt,
    immediatePrompt = false
  }: {
    resumeAt: number;
    immediatePrompt?: boolean;
  }) => {
     if (!isAuthenticated) {
       router.push(loginHref);
       return false;
     }

    setUnlockState('unlocking');
    setFeedback(immediatePrompt ? 'Unlocking the movie...' : null);

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
      setIsPlayingTrailer(false);
      setUnlockState('idle');
      setFeedback(null);
      setShowPaywall(false);
      unlockAttemptedRef.current = true;
      await loadStream({ resumeAt, autoplay: true });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ace:video-unlocked', { detail: { videoId } }));
      }
      return true;
    } catch {
      setUnlockState('error');
      setFeedback('We could not unlock this title right now.');
      if (immediatePrompt) {
        setShowPaywall(true);
      }
      return false;
    }
  }, [isAuthenticated, loadStream, loginHref, router, videoId]);

  useEffect(() => {
    if (trailerKey) {
      setIsPlayingTrailer(true);
      setFeedback(null);
      setShowPaywall(false);
      pendingResumeRef.current = null;
      pendingAutoplayRef.current = false;
      return;
    }

    setIsPlayingTrailer(false);
    loadStream({
      resumeAt: Math.max(initialProgress, readSavedProgress(videoId)),
      autoplay: false
    }).catch(() => setFeedback('Unable to load the movie stream right now.'));
  }, [initialProgress, loadStream, trailerKey, videoId]);

  useEffect(() => {
    setSelectedSubtitleId(defaultSubtitleId);
    setAudioTrackOptions((current) => (current.length ? [] : current));
    setSelectedAudioTrackIndex(0);
  }, [defaultSubtitleId, subtitleSignature, videoId]);

  useEffect(() => {
    applySubtitleSelection();
  }, [applySubtitleSelection]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const fallbackResume = isPlayingTrailer ? 0 : Math.max(initialProgress, readSavedProgress(videoId));
      const nextResume = isPlayingTrailer ? 0 : (pendingResumeRef.current ?? fallbackResume);
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
      } else {
        video.currentTime = 0;
      }

      applySubtitleSelection(video);
      syncAudioTrackState(video);
      setDurationSec(Math.max(0, Math.floor(video.duration || 0)));
      setCurrentTime(Math.max(0, Math.floor(video.currentTime || 0)));
      setVolume(video.volume);
      setIsMuted(video.muted);

      if (pendingAutoplayRef.current || isPlayingTrailer) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {
            setFeedback(unlocked ? 'Unlocked. Press Watch Now to start playback.' : null);
          });
        });
      }

      pendingResumeRef.current = null;
      pendingAutoplayRef.current = false;
    };

    const lockAtBoundary = (message?: string) => {
      const lockPoint = Math.max(teaserSec - 0.35, 0);
      video.pause();
      if (video.currentTime > lockPoint) {
        video.currentTime = lockPoint;
      }
      if (message) {
        setFeedback(message);
      }
    };

    const promptUnlock = () => {
      if (!isAuthenticated) {
        lockAtBoundary('Sign in to continue watching the full title.');
        setShowPaywall(true);
        return;
      }

      if (unlockState === 'unlocking') {
        lockAtBoundary('Unlocking the movie...');
        setShowPaywall(true);
        return;
      }

      if (unlockState === 'needs_topup' || unlockState === 'verification_required' || unlockState === 'error') {
        lockAtBoundary();
        setShowPaywall(true);
        return;
      }

      unlockAttemptedRef.current = true;
      lockAtBoundary('Unlocking the movie...');
      void unlockVideo({ resumeAt: video.currentTime, immediatePrompt: true });
    };

    const handlePlay = () => {
      setResumePrompt(null);
      // Activate watch mode only via explicit UI control, not automatically on play.
      // setWatchMode(true); // removed automatic activation
      setIsPlaying(true);
    };

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      setCurrentTime(Math.max(0, Math.floor(currentTime)));

      if (!isMovieMode) {
        return;
      }

      if (!unlocked && currentTime >= teaserSec) {
        promptUnlock();
        return;
      }

      if (currentTime - lastSyncedRef.current >= HISTORY_SYNC_SECONDS) {
        void syncHistory({ progressSec: currentTime });
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (isMovieMode && video.currentTime > 0 && !video.ended) {
        void syncHistory({ progressSec: video.currentTime, keepalive: true });
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setWatchMode(false);
      setShowPaywall(false);
      if (isMovieMode) {
        void syncHistory({ progressSec: 0, completed: true, keepalive: true });
      }
    };

    const handleError = () => {
      setFeedback('This video could not be played right now. Use MP4 or WebM uploads for the most reliable playback.');
    };

    const handleSeeking = () => {
      if (isMovieMode && !unlocked && video.currentTime >= teaserSec) {
        promptUnlock();
      }
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    const handlePageHide = () => {
      if (isMovieMode && video.currentTime > 0 && !video.ended) {
        void syncHistory({ progressSec: video.currentTime, keepalive: true });
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('volumechange', handleVolumeChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('volumechange', handleVolumeChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [
    applySubtitleSelection,
    initialProgress,
    isAuthenticated,
    seekToTime,
    syncAudioTrackState,
    syncHistory,
    teaserSec,
    unlockState,
    unlockVideo,
    unlocked,
    videoId,
    isMovieMode,
    isPlayingTrailer
  ]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.body.classList.toggle('watch-mode-active', watchMode);

    return () => {
      document.body.classList.remove('watch-mode-active');
    };
  }, [watchMode]);

  useEffect(() => {
    const video = videoRef.current;

    return () => {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      document.body.classList.remove('watch-mode-active');
    };
  }, []);
    
    // Reset watch mode when the video ID changes (e.g., navigating to a new title)
    useEffect(() => {
      setWatchMode(false);
    }, [videoId]);
    
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? '';

      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target?.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === ' ' || key === 'k') {
        event.preventDefault();
        togglePlayback();
        return;
      }

      if (key === 'arrowleft' || key === 'j') {
        event.preventDefault();
        jumpPlayback(-10);
        return;
      }

      if (key === 'arrowright' || key === 'l') {
        event.preventDefault();
        jumpPlayback(10);
        return;
      }

      if (key === 'm') {
        event.preventDefault();
        toggleMute();
        return;
      }

      if (key === '0') {
        event.preventDefault();
        restartPlayback();
        return;
      }

      if (key === 'escape' && watchMode) {
        event.preventDefault();
        exitWatchMode();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [exitWatchMode, jumpPlayback, restartPlayback, toggleMute, togglePlayback, watchMode]);

  const previewSeconds = highlightSeconds.filter((sec) => sec >= 0);
  const maxPreview = unlocked ? Number.POSITIVE_INFINITY : Math.max(teaserSec - 2, 0);

  const formatTime = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div ref={playerContainerRef} className={`player${watchMode ? ' player-watch-mode' : ''}`}>
      {trailerKey && (
        <div className="player-mode-selector">
          <button
            type="button"
            className={`mode-btn${isPlayingTrailer ? ' active' : ''}`}
            onClick={() => {
              setIsPlayingTrailer(true);
              setShowPaywall(false);
              setFeedback(null);
            }}
          >
            Trailer
          </button>
          <button
            type="button"
            className={`mode-btn${!isPlayingTrailer ? ' active' : ''}`}
            onClick={handleMovieModeRequest}
          >
            Movie
          </button>
        </div>
      )}

      {activeVideoSrc ? (
        <video
          key={activeVideoSrc}
          ref={videoRef}
          src={activeVideoSrc}
          controls
          playsInline
          preload="metadata"
          poster={posterSrc}
          autoPlay={isPlayingTrailer}
          muted={isPlayingTrailer}
        >
          {subtitleTracks.map((track) => (
            <track
              key={track.id}
              kind={track.kind === 'sdh' ? 'captions' : track.kind}
              src={track.src}
              srcLang={track.languageCode}
              label={track.label}
              default={track.isDefault}
            />
          ))}
        </video>
      ) : (
        <div style={{ color: 'white', padding: '24px' }}>{feedback ?? copy.loadingStream}</div>
      )}

      {/* Top navigation and watch mode removed per requirements (wallet is in profile) */}

      {activeVideoSrc ? (
        <div className="player-control-dock">
          <div className="player-control-row">
            <div className="player-control-cluster player-control-cluster-primary">
              <button className="player-action-button player-action-button-subtle" type="button" onClick={restartPlayback}>
                Restart
              </button>
              <button className="player-action-button player-action-button-subtle" type="button" onClick={() => jumpPlayback(-10)}>
                Back 10s
              </button>
              <button className="player-action-button player-action-button-primary" type="button" onClick={togglePlayback}>
                {isPlaying ? 'Pause' : copy.watchNow}
              </button>
              <button className="player-action-button player-action-button-subtle" type="button" onClick={() => jumpPlayback(10)}>
                Forward 10s
              </button>
            </div>
            <div className="player-readout">
              <span>{formatTime(currentTime)} / {formatTime(durationSec)}</span>
              {!unlocked && isMovieMode ? <span>Free movie preview: {formatTime(teaserSec)}</span> : null}
            </div>
          </div>
        </div>
      ) : null}

      {audioTrackOptions.length > 1 ? (
        <div className="player-settings-panel">
          <div className="player-settings-group">
            <span className="player-settings-label">{copy.audio}</span>
            <div className="player-settings-options">
              {audioTrackOptions.map((track) => (
                <button
                  key={track.index}
                  className={`player-settings-chip${selectedAudioTrackIndex === track.index ? ' active' : ''}`}
                  type="button"
                  onClick={() => setAudioTrack(track.index)}
                >
                  {track.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {resumePrompt ? (
        <div className="paywall">
          <div>
            <h3 style={{ fontFamily: 'var(--font-space), system-ui, sans-serif' }}>{copy.continueWatchingPrompt}</h3>
            <p className="muted" style={{ color: '#f7efe0' }}>
              {copy.resumeAt} {formatTime(resumePrompt)}. Choose whether to continue from there or start this title again.
            </p>
            <div className="player-overlay-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  setResumePrompt(null);
                  constrainedSeek(resumePrompt);
                }}
              >
                {copy.continueFrom} {formatTime(resumePrompt)}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  const video = videoRef.current;
                  clearSavedProgress(videoId);
                  setResumePrompt(null);
                  if (video) constrainedSeek(0);
                  void syncHistory({ progressSec: 0, keepalive: true });
                }}
              >
                {copy.startOver}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPaywall && !unlocked ? (
        <div className="paywall">
          <div>
            <h3 style={{ fontFamily: 'var(--font-space), system-ui, sans-serif' }}>
              {isAuthenticated ? copy.keepWatching : copy.signInToContinue}
            </h3>
            <p className="muted" style={{ color: '#f7efe0' }}>
              {feedback
                ? feedback
                : isAuthenticated
                  ? `Unlock the movie for ${priceLabel}.`
                  : copy.signInToUnlockSummary}
            </p>
            <div className="player-overlay-actions">
              {!isAuthenticated ? (
                <button className="btn btn-primary" type="button" onClick={() => { router.push(loginHref); }}>
                  {copy.signIn}
                </button>
               ) : unlockState === 'needs_topup' ? (
                <button className="btn btn-primary" type="button" onClick={() => router.push('/account')}>
                  {copy.topUpWallet || 'Top up in profile'}
                </button>
              ) : unlockState === 'verification_required' ? (
                <a className="btn btn-primary" href="/account">
                  {copy.verifyAccount}
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
                  {unlockState === 'unlocking' ? 'Unlocking...' : `Unlock movie for ${priceLabel}`}
                </button>
              )}
              {/* Wallet link removed - available in user profile */}
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
                  constrainedSeek(sec);
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
