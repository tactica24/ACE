'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Clock, 
  ChevronRight,
  X,
  Trash2,
  Eye,
  Calendar,
  BarChart3
} from 'lucide-react';

interface WatchProgress {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  currentTime: number;
  progressPercentage: number;
  lastWatched: Date;
  videoUrl: string;
  quality: string;
  ageRating: string;
  genres: string[];
}

interface DeviceType {
  type: 'tv' | 'desktop' | 'tablet' | 'mobile';
}

export default function ContinueWatching({
  items,
  onPlay,
  onRemove,
  onClearAll
}: {
  items: WatchProgress[];
  onPlay?: (item: WatchProgress) => void;
  onRemove?: (id: string) => void;
  onClearAll?: () => void;
}) {
  const [device, setDevice] = useState<DeviceType>({ type: 'desktop' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      let type: DeviceType['type'] = 'desktop';
      
      if (width >= 1920) type = 'tv';
      else if (width >= 1024) type = 'desktop';
      else if (width >= 768) type = 'tablet';
      else type = 'mobile';

      setDevice({ type });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatLastWatched = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return date.toLocaleDateString();
  };

  const getLayoutClasses = () => {
    const baseClasses = "continue-watching";
    const deviceClasses = {
      tv: "tv-continue",
      desktop: "desktop-continue", 
      tablet: "tablet-continue",
      mobile: "mobile-continue"
    };
    
    return `${baseClasses} ${deviceClasses[device.type]}`;
  };

  const ProgressRing = ({ percentage }: { percentage: number }) => {
    const circumference = 2 * Math.PI * 20;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <svg className="progress-ring" width="48" height="48">
        <circle
          className="progress-ring-background"
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="3"
        />
        <circle
          className="progress-ring-progress"
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="#f2bf6e"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 24 24)"
        />
        <text
          x="24"
          y="24"
          textAnchor="middle"
          dominantBaseline="middle"
          className="progress-text"
          fill="white"
          fontSize="10"
          fontWeight="bold"
        >
          {Math.round(percentage)}%
        </text>
      </svg>
    );
  };

  if (items.length === 0) {
    return (
      <div className="continue-watching-empty">
        <div className="empty-state">
          <Clock className="w-12 h-12 text-gray-400" />
          <h3>No continue watching items</h3>
          <p>Start watching videos to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={getLayoutClasses()}>
      <div className="continue-watching-header">
        <div className="header-content">
          <h2 className="section-title">Continue Watching</h2>
          <p className="section-subtitle">Pick up where you left off</p>
        </div>
        
        <div className="header-actions">
          {items.length > 0 && (
            <button 
              className="clear-all-button"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              <span className="action-text">Clear All</span>
            </button>
          )}
        </div>
      </div>

      <div className="continue-watching-grid">
        {items.map((item) => (
          <div key={item.id} className="continue-watching-item">
            {/* Thumbnail with Progress Overlay */}
            <div className="item-thumbnail">
              <img src={item.thumbnail} alt={item.title} />
              
              {/* Progress Ring */}
              <div className="progress-overlay">
                <ProgressRing percentage={item.progressPercentage} />
              </div>

              {/* Play Button Overlay */}
              <div className="play-overlay">
                <button 
                  className="play-button"
                  onClick={() => onPlay?.(item)}
                >
                  <Play className="w-6 h-6" />
                </button>
              </div>

              {/* Remove Button */}
              <button 
                className="remove-button"
                onClick={() => onRemove?.(item.id)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Item Information */}
            <div className="item-info">
              <h3 className="item-title">{item.title}</h3>
              
              <div className="item-meta">
                <span className="item-duration">{formatTime(item.duration)}</span>
                <span className="item-quality">{item.quality}</span>
                <span className="item-age-rating">{item.ageRating}</span>
              </div>

              <div className="item-progress-details">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${item.progressPercentage}%` }}
                  />
                </div>
                <div className="progress-text">
                  <span>{formatTime(item.currentTime)}</span>
                  <span>{formatTime(item.duration)}</span>
                </div>
              </div>

              <div className="item-footer">
                <div className="last-watched">
                  <Clock className="w-3 h-3" />
                  <span>{formatLastWatched(item.lastWatched)}</span>
                </div>
                
                <div className="item-stats">
                  <span className="stat-item">
                    <Eye className="w-3 h-3" />
                    {Math.round(item.progressPercentage)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="clear-confirm-overlay">
          <div className="clear-confirm-modal">
            <div className="modal-header">
              <h3>Clear All Continue Watching?</h3>
              <button onClick={() => setShowClearConfirm(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-content">
              <p>This will remove all {items.length} items from your continue watching list. This action cannot be undone.</p>
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-button cancel"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-button confirm"
                onClick={() => {
                  onClearAll?.();
                  setShowClearConfirm(false);
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Bar */}
      <div className="continue-watching-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <BarChart3 className="w-4 h-4" />
            <span>{items.length} items</span>
          </div>
          <div className="stat-item">
            <Clock className="w-4 h-4" />
            <span>
              {formatTime(
                items.reduce((total, item) => total + (item.duration - item.currentTime), 0)
              )} remaining
            </span>
          </div>
          <div className="stat-item">
            <Eye className="w-4 h-4" />
            <span>
              {Math.round(
                items.reduce((total, item) => total + item.progressPercentage, 0) / items.length
              )}% avg progress
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
