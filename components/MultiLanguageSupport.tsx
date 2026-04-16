'use client';

import { useState, useEffect } from 'react';
import { 
  Languages, 
  Globe, 
  Download, 
  Upload, 
  Check, 
  X, 
  Clock, 
  Star, 
  Users, 
  Settings, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Subtitles, 
  Mic, 
  MicOff, 
  Monitor, 
  Smartphone, 
  Tv, 
  Headphones, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Repeat, 
  RepeatOne, 
  Shuffle, 
  Heart, 
  Share2, 
  Bookmark, 
  Flag, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Zap, 
  Target, 
  Award, 
  Gift, 
  Crown, 
  Sparkles, 
  Brain, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Film, 
  Tv as TvIcon, 
  Gamepad2, 
  Coffee, 
  Pizza, 
  Popcorn, 
  MessageSquare, 
  Bell, 
  Shield, 
  Lock, 
  Unlock, 
  Key, 
  User, 
  UserPlus, 
  UserCheck, 
  UserX, 
  MoreVertical, 
  ExternalLink, 
  HelpCircle, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader
} from 'lucide-react';

interface Language {
  id: string;
  name: string;
  nativeName: string;
  code: string;
  flag: string;
  region: string;
  isRTL: boolean;
  completionRate: number;
  lastUpdated: Date;
  contributors: number;
  status: 'active' | 'beta' | 'coming-soon';
  features: {
    subtitles: boolean;
    dubbing: boolean;
    ui: boolean;
    audioDescriptions: boolean;
    closedCaptions: boolean;
  };
}

interface TranslationProgress {
  languageId: string;
  totalStrings: number;
  translatedStrings: number;
  reviewedStrings: number;
  approvedStrings: number;
  lastSync: Date;
  contributors: Translator[];
}

interface Translator {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  joinedDate: Date;
  contributions: number;
  languages: string[];
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  badges: string[];
}

interface TranslationMemory {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: string;
  usage: number;
  quality: 'high' | 'medium' | 'low';
  lastUsed: Date;
  contributor: string;
}

interface AutoTranslationSettings {
  enabled: boolean;
  provider: 'google' | 'deepl' | 'azure' | 'aws' | 'custom';
  apiKey?: string;
  confidence: number;
  fallbackLanguage: string;
  autoDetect: boolean;
  cacheTranslations: boolean;
  customEndpoints?: {
    [provider: string]: string;
  };
}

export default function MultiLanguageSupport() {
  const [isMultiLanguageEnabled, setIsMultiLanguageEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [translationProgress, setTranslationProgress] = useState<TranslationProgress[]>([]);
  const [translators, setTranslators] = useState<Translator[]>([]);
  const [autoTranslateSettings, setAutoTranslateSettings] = useState<AutoTranslationSettings>({
    enabled: false,
    provider: 'google',
    confidence: 0.8,
    fallbackLanguage: 'en',
    autoDetect: true,
    cacheTranslations: true
  });
  const [activeTab, setActiveTab] = useState<'languages' | 'translator' | 'settings' | 'progress'>('languages');
  const [isLoading, setIsLoading] = useState(false);
  const [showTranslationEditor, setShowTranslationEditor] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationMemory | null>(null);

  // Mock data - replace with actual API calls
  const mockLanguages: Language[] = [
    {
      id: 'en',
      name: 'English',
      nativeName: 'English',
      code: 'en',
      flag: '🇺🇸',
      region: 'Global',
      isRTL: false,
      completionRate: 100,
      lastUpdated: new Date('2024-01-15'),
      contributors: 45,
      status: 'active',
      features: {
        subtitles: true,
        dubbing: true,
        ui: true,
        audioDescriptions: true,
        closedCaptions: true
      }
    },
    {
      id: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      code: 'es',
      flag: '🇪🇸',
      region: 'Spain, Latin America',
      isRTL: false,
      completionRate: 95,
      lastUpdated: new Date('2024-01-14'),
      contributors: 32,
      status: 'active',
      features: {
        subtitles: true,
        dubbing: true,
        ui: true,
        audioDescriptions: true,
        closedCaptions: true
      }
    },
    {
      id: 'fr',
      name: 'French',
      nativeName: 'Français',
      code: 'fr',
      flag: '🇫🇷',
      region: 'France, Canada',
      isRTL: false,
      completionRate: 92,
      lastUpdated: new Date('2024-01-13'),
      contributors: 28,
      status: 'active',
      features: {
        subtitles: true,
        dubbing: true,
        ui: true,
        audioDescriptions: false,
        closedCaptions: true
      }
    },
    {
      id: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      code: 'de',
      flag: '🇩🇪',
      region: 'Germany, Austria',
      isRTL: false,
      completionRate: 88,
      lastUpdated: new Date('2024-01-12'),
      contributors: 22,
      status: 'active',
      features: {
        subtitles: true,
        dubbing: true,
        ui: true,
        audioDescriptions: true,
        closedCaptions: true
      }
    },
    {
      id: 'zh',
      name: 'Chinese (Simplified)',
      nativeName: '简体中文',
      code: 'zh-CN',
      flag: '🇨🇳',
      region: 'China, Singapore',
      isRTL: false,
      completionRate: 85,
      lastUpdated: new Date('2024-01-11'),
      contributors: 18,
      status: 'active',
      features: {
        subtitles: true,
        dubbing: true,
        ui: true,
        audioDescriptions: false,
        closedCaptions: true
      }
    },
    {
      id: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      code: 'ja',
      flag: '🇯🇵',
      region: 'Japan',
      isRTL: false,
      completionRate: 78,
      lastUpdated: new Date('2024-01-10'),
      contributors: 15,
      status: 'beta',
      features: {
        subtitles: true,
        dubbing: true,
        ui: true,
        audioDescriptions: false,
        closedCaptions: true
      }
    },
    {
      id: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      code: 'ar',
      flag: '🇸🇦',
      region: 'Middle East, North Africa',
      isRTL: true,
      completionRate: 65,
      lastUpdated: new Date('2024-01-09'),
      contributors: 12,
      status: 'beta',
      features: {
        subtitles: true,
        dubbing: true,
        ui: true,
        audioDescriptions: false,
        closedCaptions: true
      }
    }
  ];

  const mockTranslators: Translator[] = [
    {
      id: 'translator_1',
      name: 'Maria Rodriguez',
      username: 'mariarod',
      avatar: '/api/placeholder/user/maria',
      joinedDate: new Date('2024-01-15'),
      contributions: 1250,
      languages: ['es', 'en'],
      level: 'expert',
      badges: ['Top Contributor', 'Quality Reviewer', 'Mentor']
    },
    {
      id: 'translator_2',
      name: 'Pierre Dubois',
      username: 'pierredub',
      avatar: '/api/placeholder/user/pierre',
      joinedDate: new Date('2024-01-10'),
      contributions: 890,
      languages: ['fr', 'en'],
      level: 'advanced',
      badges: ['Active Contributor', 'Language Expert']
    }
  ];

  useEffect(() => {
    if (isMultiLanguageEnabled) {
      loadLanguageData();
    }
  }, [isMultiLanguageEnabled]);

  const loadLanguageData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAvailableLanguages(mockLanguages);
      setTranslators(mockTranslators);
      
      // Load user's preferred language
      const savedLanguage = localStorage.getItem('ace-language') || 'en';
      setSelectedLanguage(savedLanguage);
    } catch (error) {
      console.error('Failed to load language data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (languageId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSelectedLanguage(languageId);
      localStorage.setItem('ace-language', languageId);
      
      // Trigger language change event
      window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: languageId } }));
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleToggleMultiLanguage = () => {
    setIsMultiLanguageEnabled(!isMultiLanguageEnabled);
  };

  const handleAutoTranslateSettings = async (settings: Partial<AutoTranslationSettings>) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAutoTranslateSettings(prev => ({ ...prev, ...settings }));
    } catch (error) {
      console.error('Failed to update auto-translate settings:', error);
    }
  };

  const getLanguageStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'beta': return 'text-yellow-600 bg-yellow-100';
      case 'coming-soon': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLanguageStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'beta': return <AlertCircle className="w-4 h-4" />;
      case 'coming-soon': return <Info className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getTranslatorLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'text-purple-600 bg-purple-100';
      case 'advanced': return 'text-blue-600 bg-blue-100';
      case 'intermediate': return 'text-green-600 bg-green-100';
      case 'beginner': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTranslationQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google': return <Languages className="w-4 h-4" />;
      case 'deepl': return <Brain className="w-4 h-4" />;
      case 'azure': return <Shield className="w-4 h-4" />;
      case 'aws': return <Cloud className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <div className="multi-language-support">
      {/* Header */}
      <div className="language-header">
        <div className="header-content">
          <h1 className="header-title">Multi-Language Support</h1>
          <p className="header-subtitle">Experience ACE Studio in your preferred language with automatic translation</p>
        </div>
        
        <div className="header-actions">
          <div className="language-status">
            <div className={`status-indicator ${isMultiLanguageEnabled ? 'active' : ''}`}>
              <Languages className={`w-6 h-6 ${isMultiLanguageEnabled ? 'active' : ''}`} />
              <span className={`status-text ${isMultiLanguageEnabled ? 'active' : ''}`}>
                Multi-Language {isMultiLanguageEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            
            <button
              className={`language-toggle ${isMultiLanguageEnabled ? 'enabled' : ''}`}
              onClick={handleToggleMultiLanguage}
            >
              {isMultiLanguageEnabled ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Enable</span>
                </>
              )}
            </button>
          </div>
          
          <div className="current-language">
            <span className="current-flag">
              {availableLanguages.find(lang => lang.id === selectedLanguage)?.flag || '🌐'}
            </span>
            <span className="current-name">
              {availableLanguages.find(lang => lang.id === selectedLanguage)?.nativeName || 'English'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isMultiLanguageEnabled ? (
        <div className="language-content">
          {/* Navigation Tabs */}
          <div className="language-tabs">
            <button
              className={`tab-button ${activeTab === 'languages' ? 'active' : ''}`}
              onClick={() => setActiveTab('languages')}
            >
              <Languages className="w-5 h-5" />
              <span>Languages</span>
            </button>
            
            <button
              className={`tab-button ${activeTab === 'translator' ? 'active' : ''}`}
              onClick={() => setActiveTab('translator')}
            >
              <UserPlus className="w-5 h-5" />
              <span>Translator</span>
            </button>
            
            <button
              className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
            
            <button
              className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
              onClick={() => setActiveTab('progress')}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Progress</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner">
                  <Languages className="w-8 h-8 animate-pulse" />
                </div>
                <p>Loading language data...</p>
              </div>
            ) : (
              <>
                {/* Languages Tab */}
                {activeTab === 'languages' && (
                  <div className="languages-content">
                    <div className="languages-grid">
                      {availableLanguages.map((language) => (
                        <div
                          key={language.id}
                          className={`language-card ${selectedLanguage === language.id ? 'selected' : ''}`}
                          onClick={() => handleLanguageChange(language.id)}
                        >
                          <div className="language-header">
                            <div className="language-flag">
                              <span className="flag-emoji">{language.flag}</span>
                            </div>
                            
                            <div className="language-info">
                              <h3 className="language-name">{language.nativeName}</h3>
                              <p className="language-english">{language.name}</p>
                            </div>
                            
                            <div className={`language-status ${getLanguageStatusColor(language.status)}`}>
                              {getLanguageStatusIcon(language.status)}
                              <span>{language.status.replace('-', ' ').toUpperCase()}</span>
                            </div>
                          </div>
                          
                          <div className="language-details">
                            <div className="detail-item">
                              <span className="detail-label">Code:</span>
                              <span className="detail-value">{language.code}</span>
                            </div>
                            
                            <div className="detail-item">
                              <span className="detail-label">Region:</span>
                              <span className="detail-value">{language.region}</span>
                            </div>
                            
                            <div className="detail-item">
                              <span className="detail-label">Direction:</span>
                              <span className="detail-value">{language.isRTL ? 'RTL' : 'LTR'}</span>
                            </div>
                            
                            <div className="detail-item">
                              <span className="detail-label">Completion:</span>
                              <div className="completion-bar">
                                <div 
                                  className="completion-fill"
                                  style={{ width: `${language.completionRate}%` }}
                                ></div>
                                <span className="completion-text">{language.completionRate}%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="language-features">
                            <h4 className="features-title">Available Features:</h4>
                            <div className="features-grid">
                              <div className={`feature-item ${language.features.subtitles ? 'available' : ''}`}>
                                <Subtitles className="w-4 h-4" />
                                <span>Subtitles</span>
                              </div>
                              
                              <div className={`feature-item ${language.features.dubbing ? 'available' : ''}`}>
                                <Volume2 className="w-4 h-4" />
                                <span>Dubbing</span>
                              </div>
                              
                              <div className={`feature-item ${language.features.ui ? 'available' : ''}`}>
                                <Monitor className="w-4 h-4" />
                                <span>UI Translation</span>
                              </div>
                              
                              <div className={`feature-item ${language.features.audioDescriptions ? 'available' : ''}`}>
                                <Eye className="w-4 h-4" />
                                <span>Audio Descriptions</span>
                              </div>
                              
                              <div className={`feature-item ${language.features.closedCaptions ? 'available' : ''}`}>
                                <FileText className="w-4 h-4" />
                                <span>Closed Captions</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="language-meta">
                            <div className="meta-item">
                              <span className="meta-label">Contributors:</span>
                              <span className="meta-value">{language.contributors}</span>
                            </div>
                            
                            <div className="meta-item">
                              <span className="meta-label">Last Updated:</span>
                              <span className="meta-value">{language.lastUpdated.toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          {selectedLanguage === language.id && (
                            <div className="selected-indicator">
                              <CheckCircle className="w-6 h-6" />
                              <span>Current Language</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Translator Tab */}
                {activeTab === 'translator' && (
                  <div className="translator-content">
                    <div className="translator-header">
                      <h2 className="section-title">Become a Translator</h2>
                      <p className="section-description">Help translate ACE Studio to your language and earn rewards</p>
                      
                      <button className="join-button">
                        <UserPlus className="w-5 h-5" />
                        <span>Join Translation Team</span>
                      </button>
                    </div>
                    
                    <div className="translators-grid">
                      {translators.map((translator) => (
                        <div key={translator.id} className="translator-card">
                          <div className="translator-header">
                            <div className="translator-avatar">
                              <img
                                src={translator.avatar || '/api/placeholder/user/default'}
                                alt={translator.name}
                                className="avatar-image"
                              />
                            </div>
                            
                            <div className="translator-info">
                              <h3 className="translator-name">{translator.name}</h3>
                              <p className="translator-username">@{translator.username}</p>
                            </div>
                            
                            <div className={`translator-level ${getTranslatorLevelColor(translator.level)}`}>
                              <Award className="w-4 h-4" />
                              <span>{translator.level.toUpperCase()}</span>
                            </div>
                          </div>
                          
                          <div className="translator-stats">
                            <div className="stat-item">
                              <span className="stat-label">Contributions:</span>
                              <span className="stat-value">{translator.contributions.toLocaleString()}</span>
                            </div>
                            
                            <div className="stat-item">
                              <span className="stat-label">Languages:</span>
                              <div className="languages-list">
                                {translator.languages.map((lang, index) => (
                                  <span key={index} className="language-badge">{lang}</span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="stat-item">
                              <span className="stat-label">Joined:</span>
                              <span className="stat-value">{translator.joinedDate.toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="translator-badges">
                            <h4 className="badges-title">Achievements</h4>
                            <div className="badges-list">
                              {translator.badges.map((badge, index) => (
                                <span key={index} className="badge">
                                  <Crown className="w-3 h-3" />
                                  {badge}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="settings-content">
                    <div className="settings-section">
                      <h3 className="section-title">Auto-Translation Settings</h3>
                      <p className="section-description">Configure automatic translation for content and interface</p>
                      
                      <div className="settings-grid">
                        <div className="setting-item">
                          <label className="toggle-label">
                            <input
                              type="checkbox"
                              checked={autoTranslateSettings.enabled}
                              onChange={(e) => handleAutoTranslateSettings({ enabled: e.target.checked })}
                            />
                            <span className="toggle-text">Enable auto-translation</span>
                          </label>
                          <p className="setting-description">Automatically translate content to your preferred language</p>
                        </div>
                        
                        <div className="setting-item">
                          <label className="setting-label">Translation Provider</label>
                          <select
                            value={autoTranslateSettings.provider}
                            onChange={(e) => handleAutoTranslateSettings({ provider: e.target.value as any })}
                            className="setting-select"
                          >
                            <option value="google">Google Translate</option>
                            <option value="deepl">DeepL</option>
                            <option value="azure">Azure Translator</option>
                            <option value="aws">Amazon Translate</option>
                            <option value="custom">Custom Provider</option>
                          </select>
                          <p className="setting-description">Choose your preferred translation service</p>
                        </div>
                        
                        <div className="setting-item">
                          <label className="setting-label">Confidence Threshold</label>
                          <div className="confidence-slider">
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.1"
                              value={autoTranslateSettings.confidence}
                              onChange={(e) => handleAutoTranslateSettings({ confidence: parseFloat(e.target.value) })}
                              className="slider-input"
                            />
                            <span className="confidence-value">{(autoTranslateSettings.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <p className="setting-description">Minimum confidence level for automatic translations</p>
                        </div>
                        
                        <div className="setting-item">
                          <label className="setting-label">Fallback Language</label>
                          <select
                            value={autoTranslateSettings.fallbackLanguage}
                            onChange={(e) => handleAutoTranslateSettings({ fallbackLanguage: e.target.value })}
                            className="setting-select"
                          >
                            {availableLanguages.map((lang) => (
                              <option key={lang.id} value={lang.id}>
                                {lang.nativeName} ({lang.name})
                              </option>
                            ))}
                          </select>
                          <p className="setting-description">Language to use if translation fails</p>
                        </div>
                        
                        <div className="setting-item">
                          <label className="toggle-label">
                            <input
                              type="checkbox"
                              checked={autoTranslateSettings.autoDetect}
                              onChange={(e) => handleAutoTranslateSettings({ autoDetect: e.target.checked })}
                            />
                            <span className="toggle-text">Auto-detect language</span>
                          </label>
                          <p className="setting-description">Automatically detect source language for translation</p>
                        </div>
                        
                        <div className="setting-item">
                          <label className="toggle-label">
                            <input
                              type="checkbox"
                              checked={autoTranslateSettings.cacheTranslations}
                              onChange={(e) => handleAutoTranslateSettings({ cacheTranslations: e.target.checked })}
                            />
                            <span className="toggle-text">Cache translations</span>
                          </label>
                          <p className="setting-description">Store translations locally for faster loading</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="settings-section">
                      <h3 className="section-title">Content Preferences</h3>
                      <p className="section-description">Choose how you want to experience multilingual content</p>
                      
                      <div className="settings-grid">
                        <div className="setting-item">
                          <label className="setting-label">Subtitle Preference</label>
                          <select className="setting-select" defaultValue="auto">
                            <option value="auto">Auto-detect</option>
                            <option value="native">Native Language</option>
                            <option value="english">English</option>
                            <option value="none">No Subtitles</option>
                          </select>
                          <p className="setting-description">Preferred subtitle language for videos</p>
                        </div>
                        
                        <div className="setting-item">
                          <label className="setting-label">Audio Preference</label>
                          <select className="setting-select" defaultValue="auto">
                            <option value="auto">Auto-detect</option>
                            <option value="native">Native Language</option>
                            <option value="english">English</option>
                            <option value="original">Original Audio</option>
                          </select>
                          <p className="setting-description">Preferred audio language for videos</p>
                        </div>
                        
                        <div className="setting-item">
                          <label className="toggle-label">
                            <input
                              type="checkbox"
                              defaultChecked={true}
                            />
                            <span className="toggle-text">Show translation suggestions</span>
                          </label>
                          <p className="setting-description">Display suggested translations for community review</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Tab */}
                {activeTab === 'progress' && (
                  <div className="progress-content">
                    <div className="progress-header">
                      <h2 className="section-title">Translation Progress</h2>
                      <p className="section-description">Track the progress of language translations</p>
                    </div>
                    
                    <div className="progress-grid">
                      {availableLanguages.map((language) => (
                        <div key={language.id} className="progress-card">
                          <div className="progress-header">
                            <div className="language-info">
                              <span className="language-flag">{language.flag}</span>
                              <h3 className="language-name">{language.nativeName}</h3>
                            </div>
                            
                            <div className="progress-stats">
                              <div className="stat-item">
                                <span className="stat-label">Completion</span>
                                <span className="stat-value">{language.completionRate}%</span>
                              </div>
                              
                              <div className="stat-item">
                                <span className="stat-label">Contributors</span>
                                <span className="stat-value">{language.contributors}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${language.completionRate}%` }}
                            ></div>
                          </div>
                          
                          <div className="progress-details">
                            <div className="detail-item">
                              <span className="detail-label">Last Updated:</span>
                              <span className="detail-value">{language.lastUpdated.toLocaleDateString()}</span>
                            </div>
                            
                            <div className="detail-item">
                              <span className="detail-label">Status:</span>
                              <div className={`status-badge ${getLanguageStatusColor(language.status)}`}>
                                {getLanguageStatusIcon(language.status)}
                                <span>{language.status.replace('-', ' ').toUpperCase()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="progress-features">
                            <h4 className="features-title">Feature Status</h4>
                            <div className="features-status">
                              <div className={`feature-status ${language.features.subtitles ? 'complete' : 'incomplete'}`}>
                                <Subtitles className="w-4 h-4" />
                                <span>Subtitles</span>
                                {language.features.subtitles ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </div>
                              
                              <div className={`feature-status ${language.features.dubbing ? 'complete' : 'incomplete'}`}>
                                <Volume2 className="w-4 h-4" />
                                <span>Dubbing</span>
                                {language.features.dubbing ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </div>
                              
                              <div className={`feature-status ${language.features.ui ? 'complete' : 'incomplete'}`}>
                                <Monitor className="w-4 h-4" />
                                <span>UI</span>
                                {language.features.ui ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </div>
                              
                              <div className={`feature-status ${language.features.audioDescriptions ? 'complete' : 'incomplete'}`}>
                                <Eye className="w-4 h-4" />
                                <span>Audio Descriptions</span>
                                {language.features.audioDescriptions ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="language-disabled-state">
          <div className="disabled-content">
            <Languages className="w-16 h-16" />
            <h2>Multi-Language Support Disabled</h2>
            <p>Enable multi-language support to experience ACE Studio in your preferred language with automatic translation and localization.</p>
            
            <button
              className="enable-language-button"
              onClick={handleToggleMultiLanguage}
            >
              <Globe className="w-5 h-5" />
              <span>Enable Multi-Language</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
