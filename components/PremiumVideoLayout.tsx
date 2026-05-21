'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  Settings,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Wifi,
  WifiOff,
  Download,
  Share2,
  Heart,
  Plus,
  Check,
  AlertTriangle,
  Shield,
  Eye
} from 'lucide-react';

interface VideoMetadata {
  id: string;
  title: string;
  synopsis: string;
  year: number;
  director: string;
  duration: number;
  ageRating: string;
  genres: string[];
  contentWarnings: string[];
  thumbnail: string;
  videoUrl: string;
  quality: 'SD' | 'HD' | '4K';
  subtitles: Array<{ language: string; url: string }>;
  cast: Array<{ name: string; role: string }>;
}

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  quality: string;
  playbackSpeed: number;
  isBuffering: boolean;
  networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

interface DeviceType {
  type: 'tv' | 'desktop' | 'tablet' | 'mobile';
  orientation: 'landscape' | 'portrait';
  screenSize: { width: number; height: number };
}

export default function PremiumVideoLayout({
  video,
  initialProgress = 0,
  onProgressUpdate,
  onQualityChange
}: {
  video: VideoMetadata;
  initialProgress?: number;
  onProgressUpdate?: (progress: number) => void;
  onQualityChange?: (quality: string) => void;
}) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: initialProgress,
    duration: video.duration,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    quality: 'HD',
    playbackSpeed: 1,
    isBuffering: false,
    networkQuality: 'excellent'
  });

  const [device, setDevice] = useState<DeviceType>({
    type: 'desktop',
    orientation: 'landscape',
    screenSize: { width: 1920, height: 1080 }
  });

  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let type: DeviceType['type'] = 'desktop';
      if (width >= 1920) type = 'tv';
      else if (width >= 1024) type = 'desktop';
      else if (width >= 768) type = 'tablet';
      else type = 'mobile';

      setDevice({
        type,
        orientation: width > height ? 'landscape' : 'portrait',
        screenSize: { width, height }
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        onProgressUpdate?.(progress);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onProgressUpdate]);

  const hideControls = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    hideControls();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getLayoutClasses = () => {
    const baseClasses = "premium-video-layout";
    const deviceClasses = {
      tv: "tv-layout",
      desktop: "desktop-layout", 
      tablet: "tablet-layout",
      mobile: "mobile-layout"
    };
    
    return `${baseClasses} ${deviceClasses[device.type]} ${device.orientation}`;
  };

  const ContentWarningBadge = ({ warning }: { warning: string }) => {
    const warningIcons = {
      'Violence': <AlertTriangle className="w-3 h-3" />,
      'Sexual Content': <Shield className="w-3 h-3" />,
      'Drug Use': <AlertTriangle className="w-3 h-3" />,
      'Strong Language': <AlertTriangle className="w-3 h-3" />
    };

    return (
      <span className="content-warning-badge">
        {warningIcons[warning as keyof typeof warningIcons] || <AlertTriangle className="w-3 h-3" />}
        <span>{warning}</span>
      </span>
    );
  };

  return (
    <div className={getLayoutClasses()}>
      {/* Main Video Container */}
      <div 
        className="video-container"
        onMouseMove={showControlsTemporarily}
        onMouseLeave={hideControls}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className="video-player"
          src={video.videoUrl}
          poster={video.thumbnail}
          onPlay={() => setPlaybackState(prev => ({ ...prev, isPlaying: true }))}
          onPause={() => setPlaybackState(prev => ({ ...prev, isPlaying: false }))}
          onTimeUpdate={(e) => {
            const video = e.target as HTMLVideoElement;
            setPlaybackState(prev => ({
              ...prev,
              currentTime: video.currentTime,
              duration: video.duration
            }));
          }}
        />

        {/* Video Overlay Controls */}
        {showControls && (
          <div className="video-controls-overlay">
            {/* Top Controls */}
            <div className="video-controls-top">
              <button className="control-button back-button">
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="video-title-section">
                <h3 className="video-title">{video.title}</h3>
                <div className="video-meta">
                  <span className="video-year">{video.year}</span>
                  <span className="video-duration">{formatTime(video.duration)}</span>
                  <span className="video-quality">{video.quality}</span>
                </div>
              </div>

              <div className="video-actions">
                <button 
                  className={`control-button ${isInWatchlist ? 'active' : ''}`}
                  onClick={() => setIsInWatchlist(!isInWatchlist)}
                >
                  {isInWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
                <button 
                  className={`control-button ${isLiked ? 'active' : ''}`}
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart className="w-5 h-5" />
                </button>
                <button className="control-button">
                  <Share2 className="w-5 h-5" />
                </button>
                <button className="control-button">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Center Play/Pause */}
            <div className="video-controls-center">
              <button className="control-button center-control">
                {playbackState.isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="video-controls-bottom">
              <div className="progress-section">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(playbackState.currentTime / playbackState.duration) * 100}%` }}
                  />
                  <div 
                    className="progress-handle"
                    style={{ left: `${(playbackState.currentTime / playbackState.duration) * 100}%` }}
                  />
                </div>
                <div className="time-display">
                  <span>{formatTime(playbackState.currentTime)}</span>
                  <span>{formatTime(playbackState.duration)}</span>
                </div>
              </div>

              <div className="control-buttons-right">
                <button className="control-button">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button className="control-button">
                  <SkipForward className="w-5 h-5" />
                </button>
                
                <div className="volume-control">
                  <button 
                    className="control-button"
                    onClick={() => setPlaybackState(prev => ({ ...prev, isMuted: !prev.isMuted }))}
                  >
                    {playbackState.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    value={playbackState.volume}
                    onChange={(e) => setPlaybackState(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                    className="volume-slider"
                  />
                </div>

                <button 
                  className="control-button"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-5 h-5" />
                </button>

                <button 
                  className="control-button"
                  onClick={() => setPlaybackState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }))}
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Network Quality Indicator */}
        <div className="network-indicator">
          {playbackState.networkQuality === 'excellent' && <Wifi className="w-4 h-4 text-green-500" />}
          {playbackState.networkQuality === 'good' && <Wifi className="w-4 h-4 text-yellow-500" />}
          {playbackState.networkQuality === 'poor' && <WifiOff className="w-4 h-4 text-red-500" />}
        </div>

        {/* Buffering Indicator */}
        {playbackState.isBuffering && (
          <div className="buffering-indicator">
            <div className="buffering-spinner" />
            <span>Buffering...</span>
          </div>
        )}
      </div>

      {/* Video Info Sidebar */}
      {showInfo && (
        <div className="video-info-sidebar">
          <div className="info-header">
            <h3>Video Information</h3>
            <button onClick={() => setShowInfo(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="info-content">
            <div className="info-section">
              <h4>Synopsis</h4>
              <p>{video.synopsis}</p>
            </div>

            <div className="info-section">
              <h4>Details</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Year</span>
                  <span className="detail-value">{video.year}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Director</span>
                  <span className="detail-value">{video.director}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">{formatTime(video.duration)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Age Rating</span>
                  <span className="detail-value">{video.ageRating}</span>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h4>Genres</h4>
              <div className="genre-tags">
                {video.genres.map((genre, index) => (
                  <span key={index} className="genre-tag">{genre}</span>
                ))}
              </div>
            </div>

            {video.contentWarnings.length > 0 && (
              <div className="info-section">
                <h4>Content Warnings</h4>
                <div className="content-warnings">
                  {video.contentWarnings.map((warning, index) => (
                    <ContentWarningBadge key={index} warning={warning} />
                  ))}
                </div>
              </div>
            )}

            <div className="info-section">
              <h4>Cast</h4>
              <div className="cast-list">
                {video.cast.map((member, index) => (
                  <div key={index} className="cast-member">
                    <span className="cast-name">{member.name}</span>
                    <span className="cast-role">{member.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="video-settings-panel">
          <div className="settings-header">
            <h3>Playback Settings</h3>
            <button onClick={() => setShowSettings(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="settings-content">
            <div className="setting-group">
              <h4>Video Quality</h4>
              <div className="quality-options">
                {['SD', 'HD', '4K'].map((quality) => (
                  <button
                    key={quality}
                    className={`quality-option ${playbackState.quality === quality ? 'active' : ''}`}
                    onClick={() => {
                      setPlaybackState(prev => ({ ...prev, quality }));
                      onQualityChange?.(quality);
                    }}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <h4>Playback Speed</h4>
              <div className="speed-options">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    className={`speed-option ${playbackState.playbackSpeed === speed ? 'active' : ''}`}
                    onClick={() => setPlaybackState(prev => ({ ...prev, playbackSpeed: speed }))}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <h4>Subtitles</h4>
              <div className="subtitle-options">
                <button className="subtitle-option active">Off</button>
                {video.subtitles.map((subtitle, index) => (
                  <button key={index} className="subtitle-option">
                    {subtitle.language}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
