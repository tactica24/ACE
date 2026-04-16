'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Globe, 
  Bell, 
  Shield, 
  Zap, 
  Eye, 
  Moon, 
  Sun, 
  Volume2,
  Wifi,
  Download,
  Play,
  Users,
  MessageSquare,
  Heart,
  Share2,
  Clock,
  Star,
  TrendingUp,
  Award,
  Gift,
  Crown,
  Sparkles,
  Brain,
  Languages,
  Palette,
  Monitor,
  Smartphone,
  Tv,
  Headphones,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  RotateCw,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Check,
  X,
  Info,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  subscriptionTier?: 'free' | 'premium' | 'enterprise';
  preferences: UserPreferences;
  stats: UserStats;
}

interface UserPreferences {
  // Basic Preferences
  language: string;
  timezone: string;
  currency: string;
  theme: 'light' | 'dark' | 'auto';
  autoplay: boolean;
  defaultQuality: 'auto' | '1080p' | '720p' | '480p';
  
  // Optional Premium Features
  aiRecommendations?: boolean;
  socialFeatures?: boolean;
  multiLanguageSupport?: boolean;
  enterpriseApiAccess?: boolean;
  fourKStreaming?: boolean;
  voiceControl?: boolean;
  watchParty?: boolean;
  
  // Advanced Preferences
  notifications: {
    email: boolean;
    push: boolean;
    newReleases: boolean;
    recommendations: boolean;
    social: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    watchHistory: boolean;
    activityStatus: boolean;
    dataCollection: boolean;
  };
  accessibility: {
    subtitles: boolean;
    audioDescriptions: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  playback: {
    skipIntro: boolean;
    skipCredits: boolean;
    continueWatching: boolean;
    playNextEpisode: boolean;
    loop: boolean;
  };
}

interface UserStats {
  totalWatchTime: number;
  moviesWatched: number;
  averageRating: number;
  favoriteGenres: string[];
  lastActive: Date;
  joinDate: Date;
}

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'ai' | 'social' | 'content' | 'technical';
  enabled: boolean;
  available: boolean;
  price?: string;
  benefits: string[];
}

const premiumFeatures: PremiumFeature[] = [
  {
    id: 'ai-recommendations',
    name: 'AI-Powered Recommendations',
    description: 'Personalized content suggestions based on your viewing habits and preferences',
    icon: <Brain className="w-5 h-5" />,
    category: 'ai',
    enabled: false,
    available: true,
    benefits: [
      'Machine learning algorithms',
      'Behavioral analysis',
      'Predictive recommendations',
      'Smart content discovery'
    ]
  },
  {
    id: 'social-features',
    name: 'Social Features',
    description: 'Connect with friends, share recommendations, and join watch parties',
    icon: <Users className="w-5 h-5" />,
    category: 'social',
    enabled: false,
    available: true,
    benefits: [
      'Friend connections',
      'Watch parties',
      'Activity sharing',
      'Community features'
    ]
  },
  {
    id: 'multi-language',
    name: 'Multi-Language Support',
    description: 'Automatic translation and multi-language content support',
    icon: <Languages className="w-5 h-5" />,
    category: 'content',
    enabled: false,
    available: true,
    benefits: [
      'Auto-translation',
      'Multi-language subtitles',
      'Regional content',
      'Cultural adaptations'
    ]
  },
  {
    id: '4k-streaming',
    name: '4K Streaming with HDR',
    description: 'Ultra-high definition video quality with HDR support',
    icon: <Monitor className="w-5 h-5" />,
    category: 'technical',
    enabled: false,
    available: true,
    benefits: [
      '4K resolution',
      'HDR support',
      'Enhanced color',
      'Theater quality'
    ]
  },
  {
    id: 'voice-control',
    name: 'Voice Control',
    description: 'Control playback with voice commands and smart assistant integration',
    icon: <Mic className="w-5 h-5" />,
    category: 'technical',
    enabled: false,
    available: true,
    benefits: [
      'Voice commands',
      'Smart assistant',
      'Hands-free control',
      'Multi-language support'
    ]
  },
  {
    id: 'watch-party',
    name: 'Watch Parties',
    description: 'Synchronized viewing with friends and family members',
    icon: <Users className="w-5 h-5" />,
    category: 'social',
    enabled: false,
    available: true,
    benefits: [
      'Real-time sync',
      'Chat functionality',
      'Shared controls',
      'Group viewing'
    ]
  }
];

export default function PreferencesPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: 'en',
    timezone: 'UTC',
    currency: 'USD',
    theme: 'dark',
    autoplay: true,
    defaultQuality: 'auto',
    notifications: {
      email: true,
      push: true,
      newReleases: true,
      recommendations: true,
      social: false
    },
    privacy: {
      profileVisibility: 'public',
      watchHistory: true,
      activityStatus: true,
      dataCollection: true
    },
    accessibility: {
      subtitles: true,
      audioDescriptions: false,
      highContrast: false,
      reducedMotion: false,
      fontSize: 'medium'
    },
    playback: {
      skipIntro: false,
      skipCredits: false,
      continueWatching: true,
      playNextEpisode: true,
      loop: false
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    // Load user profile and preferences
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      // Mock data - replace with actual API call
      const mockProfile: UserProfile = {
        id: 'user_123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: '/api/placeholder/user/123',
        createdAt: new Date('2024-01-15'),
        subscriptionTier: 'premium',
        preferences: preferences,
        stats: {
          totalWatchTime: 1250, // hours
          moviesWatched: 342,
          averageRating: 4.2,
          favoriteGenres: ['Action', 'Drama', 'Sci-Fi'],
          lastActive: new Date(),
          joinDate: new Date('2024-01-15')
        }
      };
      setProfile(mockProfile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update profile with new preferences
      if (profile) {
        setProfile({
          ...profile,
          preferences
        });
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    setPreferences(prev => ({
      ...prev,
      [featureId]: !prev[featureId as keyof UserPreferences]
    }));
  };

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const getFeatureIcon = (category: string) => {
    switch (category) {
      case 'ai': return <Brain className="w-5 h-5" />;
      case 'social': return <Users className="w-5 h-5" />;
      case 'content': return <Video className="w-5 h-5" />;
      case 'technical': return <Monitor className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'saved': return 'text-green-600 bg-green-100';
      case 'saving': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'saved': return <Check className="w-4 h-4" />;
      case 'saving': return <Clock className="w-4 h-4 animate-spin" />;
      case 'error': return <X className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  if (!profile) {
    return (
      <div className="preferences-loading">
        <div className="loading-spinner">
          <Clock className="w-8 h-8 animate-spin" />
        </div>
        <p>Loading your preferences...</p>
      </div>
    );
  }

  return (
    <div className="preferences-page">
      {/* Header */}
      <div className="preferences-header">
        <div className="header-content">
          <h1 className="header-title">Premium Preferences</h1>
          <p className="header-subtitle">Customize your ACE Studio experience with optional premium features</p>
        </div>
        
        <div className="header-actions">
          <div className={`save-status ${getStatusColor(saveStatus)}`}>
            {getStatusIcon(saveStatus)}
            <span>{saveStatus === 'idle' ? 'Ready to save' : saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Error'}</span>
          </div>
          
          <button
            className={`save-button ${isLoading ? 'loading' : ''}`}
            onClick={handleSavePreferences}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Clock className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="preferences-content">
        {/* Basic Preferences */}
        <div className="preferences-section">
          <h2 className="section-title">
            <Settings className="w-5 h-5" />
            Basic Preferences
          </h2>
          
          <div className="preferences-grid">
            <div className="preference-item">
              <label className="preference-label">
                <Globe className="w-4 h-4" />
                Language
              </label>
              <select
                value={preferences.language}
                onChange={(e) => updatePreferences({ language: e.target.value })}
                className="preference-input"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                <Clock className="w-4 h-4" />
                Timezone
              </label>
              <select
                value={preferences.timezone}
                onChange={(e) => updatePreferences({ timezone: e.target.value })}
                className="preference-input"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="Europe/London">London</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                <DollarSign className="w-4 h-4" />
                Currency
              </label>
              <select
                value={preferences.currency}
                onChange={(e) => updatePreferences({ currency: e.target.value })}
                className="preference-input"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="NGN">NGN (₦)</option>
              </select>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                <Palette className="w-4 h-4" />
                Theme
              </label>
              <select
                value={preferences.theme}
                onChange={(e) => updatePreferences({ theme: e.target.value as any })}
                className="preference-input"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                <Play className="w-4 h-4" />
                Default Quality
              </label>
              <select
                value={preferences.defaultQuality}
                onChange={(e) => updatePreferences({ defaultQuality: e.target.value as any })}
                className="preference-input"
              >
                <option value="auto">Auto</option>
                <option value="1080p">1080p (HD)</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
              </select>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.autoplay}
                  onChange={(e) => updatePreferences({ autoplay: e.target.checked })}
                />
                <span className="checkbox-text">Autoplay next episode</span>
              </label>
            </div>
          </div>
        </div>

        {/* Optional Premium Features */}
        <div className="preferences-section">
          <h2 className="section-title">
            <Crown className="w-5 h-5" />
            Optional Premium Features
          </h2>
          <p className="section-description">
            Enable these premium features to enhance your ACE Studio experience. Features can be toggled on/off at any time.
          </p>
          
          <div className="premium-features-grid">
            {premiumFeatures.map((feature) => (
              <div
                key={feature.id}
                className={`premium-feature-card ${feature.enabled ? 'enabled' : ''} ${!feature.available ? 'unavailable' : ''}`}
              >
                <div className="feature-header">
                  <div className="feature-icon">
                    {feature.icon}
                  </div>
                  <div className="feature-info">
                    <h3 className="feature-name">{feature.name}</h3>
                    <p className="feature-description">{feature.description}</p>
                  </div>
                  <div className="feature-toggle">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={feature.enabled}
                        onChange={() => toggleFeature(feature.id)}
                        disabled={!feature.available}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="feature-benefits">
                  <h4 className="benefits-title">Benefits:</h4>
                  <ul className="benefits-list">
                    {feature.benefits.map((benefit, index) => (
                      <li key={index} className="benefit-item">
                        <Check className="w-3 h-3" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {!feature.available && (
                  <div className="feature-coming-soon">
                    <Clock className="w-4 h-4" />
                    <span>Coming Soon</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="preferences-section">
          <h2 className="section-title">
            <Bell className="w-5 h-5" />
            Notifications
          </h2>
          
          <div className="preferences-grid">
            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.notifications.email}
                  onChange={(e) => updatePreferences({ 
                    notifications: { ...preferences.notifications, email: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Email notifications</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.notifications.push}
                  onChange={(e) => updatePreferences({ 
                    notifications: { ...preferences.notifications, push: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Push notifications</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.notifications.newReleases}
                  onChange={(e) => updatePreferences({ 
                    notifications: { ...preferences.notifications, newReleases: e.target.checked }
                  })}
                />
                <span className="checkbox-text">New releases</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.notifications.recommendations}
                  onChange={(e) => updatePreferences({ 
                    notifications: { ...preferences.notifications, recommendations: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Recommendations</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.notifications.social}
                  onChange={(e) => updatePreferences({ 
                    notifications: { ...preferences.notifications, social: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Social updates</span>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="preferences-section">
          <h2 className="section-title">
            <Shield className="w-5 h-5" />
            Privacy
          </h2>
          
          <div className="preferences-grid">
            <div className="preference-item">
              <label className="preference-label">
                <Eye className="w-4 h-4" />
                Profile Visibility
              </label>
              <select
                value={preferences.privacy.profileVisibility}
                onChange={(e) => updatePreferences({ 
                  privacy: { ...preferences.privacy, profileVisibility: e.target.value as any }
                })}
                className="preference-input"
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.privacy.watchHistory}
                  onChange={(e) => updatePreferences({ 
                    privacy: { ...preferences.privacy, watchHistory: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Show watch history</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.privacy.activityStatus}
                  onChange={(e) => updatePreferences({ 
                    privacy: { ...preferences.privacy, activityStatus: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Show activity status</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.privacy.dataCollection}
                  onChange={(e) => updatePreferences({ 
                    privacy: { ...preferences.privacy, dataCollection: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Allow data collection</span>
              </label>
            </div>
          </div>
        </div>

        {/* Accessibility Settings */}
        <div className="preferences-section">
          <h2 className="section-title">
            <HelpCircle className="w-5 h-5" />
            Accessibility
          </h2>
          
          <div className="preferences-grid">
            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.accessibility.subtitles}
                  onChange={(e) => updatePreferences({ 
                    accessibility: { ...preferences.accessibility, subtitles: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Enable subtitles</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.accessibility.audioDescriptions}
                  onChange={(e) => updatePreferences({ 
                    accessibility: { ...preferences.accessibility, audioDescriptions: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Audio descriptions</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.accessibility.highContrast}
                  onChange={(e) => updatePreferences({ 
                    accessibility: { ...preferences.accessibility, highContrast: e.target.checked }
                  })}
                />
                <span className="checkbox-text">High contrast</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.accessibility.reducedMotion}
                  onChange={(e) => updatePreferences({ 
                    accessibility: { ...preferences.accessibility, reducedMotion: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Reduced motion</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                <Monitor className="w-4 h-4" />
                Font Size
              </label>
              <select
                value={preferences.accessibility.fontSize}
                onChange={(e) => updatePreferences({ 
                  accessibility: { ...preferences.accessibility, fontSize: e.target.value as any }
                })}
                className="preference-input"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </div>

        {/* Playback Settings */}
        <div className="preferences-section">
          <h2 className="section-title">
            <Play className="w-5 h-5" />
            Playback
          </h2>
          
          <div className="preferences-grid">
            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.playback.skipIntro}
                  onChange={(e) => updatePreferences({ 
                    playback: { ...preferences.playback, skipIntro: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Skip intro sequences</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.playback.skipCredits}
                  onChange={(e) => updatePreferences({ 
                    playback: { ...preferences.playback, skipCredits: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Skip credits</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.playback.continueWatching}
                  onChange={(e) => updatePreferences({ 
                    playback: { ...preferences.playback, continueWatching: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Continue watching</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.playback.playNextEpisode}
                  onChange={(e) => updatePreferences({ 
                    playback: { ...preferences.playback, playNextEpisode: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Auto-play next episode</span>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preferences.playback.loop}
                  onChange={(e) => updatePreferences({ 
                    playback: { ...preferences.playback, loop: e.target.checked }
                  })}
                />
                <span className="checkbox-text">Loop videos</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
