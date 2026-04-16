'use client';

import Image from 'next/image';

import { useState, useEffect } from 'react';
import { 
  Play, 
  Info, 
  Volume2, 
  Plus, 
  ThumbsUp,
  AlertTriangle,
  Shield,
  Star,
  Calendar,
  Clock,
  ChevronRight,
  X,
  Share2,
  Download,
  Heart
} from 'lucide-react';

interface HeroContent {
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
  backdrop: string;
  videoUrl: string;
  quality: 'SD' | 'HD' | '4K';
  rating: number;
  cast: Array<{ name: string; role: string; image?: string }>;
  matchPercentage: number;
  isNew: boolean;
  isTrending: boolean;
}

interface DeviceType {
  type: 'tv' | 'desktop' | 'tablet' | 'mobile';
  orientation: 'landscape' | 'portrait';
}

export default function PremiumHeroView({
  content,
  autoPlay = true,
  onPlay,
  onAddToList,
  onShare
}: {
  content: HeroContent;
  autoPlay?: boolean;
  onPlay?: () => void;
  onAddToList?: () => void;
  onShare?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showDetails, setShowDetails] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [device, setDevice] = useState<DeviceType>({
    type: 'desktop',
    orientation: 'landscape'
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      let type: DeviceType['type'] = 'desktop';
      
      if (width >= 1920) type = 'tv';
      else if (width >= 1024) type = 'desktop';
      else if (width >= 768) type = 'tablet';
      else type = 'mobile';

      setDevice({
        type,
        orientation: width > window.innerHeight ? 'landscape' : 'portrait'
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getLayoutClasses = () => {
    const baseClasses = "premium-hero-view";
    const deviceClasses = {
      tv: "tv-hero",
      desktop: "desktop-hero", 
      tablet: "tablet-hero",
      mobile: "mobile-hero"
    };
    
    return `${baseClasses} ${deviceClasses[device.type]} ${device.orientation}`;
  };

  const ContentWarningBadge = ({ warning }: { warning: string }) => {
    const warningColors = {
      'Violence': 'bg-red-100 text-red-800 border-red-200',
      'Sexual Content': 'bg-purple-100 text-purple-800 border-purple-200',
      'Drug Use': 'bg-orange-100 text-orange-800 border-orange-200',
      'Strong Language': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Scary Scenes': 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const warningIcons = {
      'Violence': <AlertTriangle className="w-3 h-3" />,
      'Sexual Content': <Shield className="w-3 h-3" />,
      'Drug Use': <AlertTriangle className="w-3 h-3" />,
      'Strong Language': <AlertTriangle className="w-3 h-3" />,
      'Scary Scenes': <AlertTriangle className="w-3 h-3" />
    };

    return (
      <span className={`content-warning-badge ${warningColors[warning as keyof typeof warningColors] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {warningIcons[warning as keyof typeof warningIcons] || <AlertTriangle className="w-3 h-3" />}
        <span>{warning}</span>
      </span>
    );
  };

  const MatchIndicator = ({ percentage }: { percentage: number }) => {
    const getColor = (match: number) => {
      if (match >= 90) return 'text-green-600';
      if (match >= 75) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className="match-indicator">
        <span className={`match-percentage ${getColor(percentage)}`}>
          {percentage}% Match
        </span>
      </div>
    );
  };

  return (
    <div className={getLayoutClasses()}>
      {/* Background with Parallax Effect */}
      <div className="hero-background">
        <div className="hero-backdrop" style={{ backgroundImage: `url(${content.backdrop})` }} />
        <div className="hero-gradient-overlay" />
        {isPlaying && (
          <video
            className="hero-video"
            src={content.videoUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        )}
      </div>

      {/* Hero Content */}
      <div className="hero-content">
        <div className="hero-main">
          {/* Badges and Meta */}
          <div className="hero-meta">
            {content.isNew && (
              <span className="hero-badge new-badge">NEW</span>
            )}
            {content.isTrending && (
              <span className="hero-badge trending-badge">TRENDING</span>
            )}
            <MatchIndicator percentage={content.matchPercentage} />
          </div>

          {/* Title and Basic Info */}
          <div className="hero-title-section">
            <h1 className="hero-title">{content.title}</h1>
            <div className="hero-basic-info">
              <span className="hero-year">{content.year}</span>
              <span className="hero-rating">{content.ageRating}</span>
              <span className="hero-duration">{formatDuration(content.duration)}</span>
              <span className="hero-quality">{content.quality}</span>
              <div className="hero-star-rating">
                <Star className="w-4 h-4 fill-current" />
                <span>{content.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Synopsis */}
          <div className="hero-synopsis">
            <p>{content.synopsis}</p>
          </div>

          {/* Content Warnings */}
          {content.contentWarnings.length > 0 && (
            <div className="hero-content-warnings">
              <span className="warnings-label">Content:</span>
              <div className="warnings-list">
                {content.contentWarnings.map((warning, index) => (
                  <ContentWarningBadge key={index} warning={warning} />
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="hero-actions">
            <button 
              className="hero-button primary"
              onClick={() => {
                setIsPlaying(true);
                onPlay?.();
              }}
            >
              <Play className="w-5 h-5" />
              <span>Play</span>
            </button>
            
            <button 
              className="hero-button secondary"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Info className="w-5 h-5" />
              <span>More Info</span>
            </button>

            <button 
              className={`hero-button icon-button ${isInWatchlist ? 'active' : ''}`}
              onClick={() => setIsInWatchlist(!isInWatchlist)}
            >
              <Plus className="w-5 h-5" />
            </button>

            <button 
              className={`hero-button icon-button ${isLiked ? 'active' : ''}`}
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className="w-5 h-5" />
            </button>

            <button 
              className="hero-button icon-button"
              onClick={() => onShare?.()}
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Cast Display */}
          <div className="hero-cast">
            <span className="cast-label">Starring:</span>
            <div className="cast-list">
              {content.cast.slice(0, 3).map((member, index) => (
                <span key={index} className="cast-member">
                  {member.name}
                  {index < Math.min(2, content.cast.length - 1) && ', '}
                </span>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div className="hero-genres">
            {content.genres.map((genre, index) => (
              <span key={index} className="genre-tag">{genre}</span>
            ))}
          </div>
        </div>

        {/* Detailed Information Panel */}
        {showDetails && (
          <div className="hero-details-panel">
            <div className="details-header">
              <h3>Details & Information</h3>
              <button onClick={() => setShowDetails(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="details-content">
              <div className="details-grid">
                <div className="detail-section">
                  <h4>Production</h4>
                  <div className="detail-item">
                    <span className="detail-label">Director</span>
                    <span className="detail-value">{content.director}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Year</span>
                    <span className="detail-value">{content.year}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Duration</span>
                    <span className="detail-value">{formatDuration(content.duration)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Quality</span>
                    <span className="detail-value">{content.quality}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Rating & Classification</h4>
                  <div className="detail-item">
                    <span className="detail-label">Age Rating</span>
                    <span className="detail-value">{content.ageRating}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">User Rating</span>
                    <div className="rating-display">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{content.rating.toFixed(1)}/5.0</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Match Score</span>
                    <span className="detail-value">{content.matchPercentage}%</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Content Warnings</h4>
                  <div className="content-warnings-detailed">
                    {content.contentWarnings.map((warning, index) => (
                      <ContentWarningBadge key={index} warning={warning} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="full-cast-section">
                <h4>Full Cast & Crew</h4>
                <div className="full-cast-grid">
                  {content.cast.map((member, index) => (
                    <div key={index} className="cast-card">
                      {member.image && (
                        <div className="cast-image">
                          <img src={member.image} alt={member.name} />
                        </div>
                      )}
                      <div className="cast-info">
                        <span className="cast-name">{member.name}</span>
                        <span className="cast-role">{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll Indicator */}
      <div className="scroll-indicator">
        <ChevronRight className="w-6 h-6 animate-bounce" />
        <span>Scroll for more</span>
      </div>
    </div>
  );
}
