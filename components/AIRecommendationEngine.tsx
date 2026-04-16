'use client';

import Image from 'next/image';

import { useState, useEffect, useMemo } from 'react';
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Star, 
  Eye, 
  Heart, 
  Bookmark, 
  Share2, 
  Play, 
  Info,
  Sparkles,
  Zap,
  Target,
  Users,
  Film,
  Tv,
  Smartphone,
  Monitor,
  Globe,
  Filter,
  RefreshCw,
  ChevronRight,
  X,
  Check,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Activity
} from 'lucide-react';

interface ViewingHistory {
  id: string;
  videoId: string;
  title: string;
  genre: string[];
  duration: number;
  watchedAt: Date;
  watchTime: number;
  completionRate: number;
  rating: number;
  liked: boolean;
  bookmarked: boolean;
  shared: boolean;
}

interface UserProfile {
  id: string;
  preferences: {
    genres: string[];
    actors: string[];
    directors: string[];
    languages: string[];
    contentRatings: string[];
    watchTime: 'morning' | 'afternoon' | 'evening' | 'night';
    deviceType: 'tv' | 'desktop' | 'tablet' | 'mobile';
  };
  behavior: {
    averageSessionLength: number;
    preferredVideoLength: 'short' | 'medium' | 'long';
    skipIntroRate: number;
    rewatchRate: number;
    bingeWatchingTendency: number;
    socialSharingFrequency: number;
  };
  demographics: {
    age: number;
    location: string;
    language: string;
    timezone: string;
  };
}

interface RecommendationScore {
  videoId: string;
  score: number;
  factors: {
    contentMatch: number;
    behaviorMatch: number;
    popularityScore: number;
    timeRelevance: number;
    socialProof: number;
  };
  explanation: string[];
}

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  duration: number;
  genre: string[];
  rating: string;
  year: number;
  matchScore: number;
  matchReasons: string[];
  watchProbability: number;
  confidence: 'high' | 'medium' | 'low';
  recommendationType: 'personalized' | 'trending' | 'similar' | 'discovery';
  metadata: {
    director?: string;
    cast?: string[];
    language?: string;
    subtitles?: string[];
    quality?: string[];
  };
}

export default function AIRecommendationEngine() {
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [viewingHistory, setViewingHistory] = useState<ViewingHistory[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'personalized' | 'trending' | 'similar'>('all');
  const [learningMode, setLearningMode] = useState<'basic' | 'advanced' | 'experimental'>('basic');

  // Mock data - replace with actual API calls
  const mockViewingHistory: ViewingHistory[] = [
    {
      id: 'vh_1',
      videoId: 'video_1',
      title: 'The Last Guardian',
      genre: ['Action', 'Adventure'],
      duration: 7200,
      watchedAt: new Date('2024-01-15T20:30:00Z'),
      watchTime: 6500,
      completionRate: 0.9,
      rating: 4.5,
      liked: true,
      bookmarked: true,
      shared: false
    },
    {
      id: 'vh_2',
      videoId: 'video_2',
      title: 'Digital Dreams',
      genre: ['Sci-Fi', 'Thriller'],
      duration: 5400,
      watchedAt: new Date('2024-01-14T19:00:00Z'),
      watchTime: 5400,
      completionRate: 1.0,
      rating: 4.2,
      liked: true,
      bookmarked: false,
      shared: true
    }
  ];

  const mockUserProfile: UserProfile = {
    id: 'user_123',
    preferences: {
      genres: ['Action', 'Sci-Fi', 'Drama', 'Thriller'],
      actors: ['Tom Hardy', 'Scarlett Johansson', 'Chris Hemsworth'],
      directors: ['Christopher Nolan', 'Denis Villeneuve'],
      languages: ['English', 'Spanish'],
      contentRatings: ['PG-13', 'R'],
      watchTime: 'evening',
      deviceType: 'tv'
    },
    behavior: {
      averageSessionLength: 7200,
      preferredVideoLength: 'medium',
      skipIntroRate: 0.3,
      rewatchRate: 0.2,
      bingeWatchingTendency: 0.8,
      socialSharingFrequency: 0.4
    },
    demographics: {
      age: 28,
      location: 'New York, USA',
      language: 'English',
      timezone: 'America/New_York'
    }
  };

  useEffect(() => {
    if (isAIEnabled) {
      loadUserData();
      generateRecommendations();
    }
  }, [isAIEnabled]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      setViewingHistory(mockViewingHistory);
      setUserProfile(mockUserProfile);
      
      // Simulate learning delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRecommendationScore = (video: any, user: UserProfile, history: ViewingHistory[]): RecommendationScore => {
    const factors = {
      contentMatch: 0,
      behaviorMatch: 0,
      popularityScore: 0,
      timeRelevance: 0,
      socialProof: 0
    };

    // Content matching based on preferences
    const genreMatch = video.genre?.some((g: string) => user.preferences.genres.includes(g)) ? 0.3 : 0;
    const actorMatch = video.cast?.some((a: string) => user.preferences.actors.includes(a)) ? 0.2 : 0;
    const directorMatch = user.preferences.directors.includes(video.director) ? 0.2 : 0;
    const ratingMatch = user.preferences.contentRatings.includes(video.rating) ? 0.1 : 0;
    factors.contentMatch = genreMatch + actorMatch + directorMatch + ratingMatch;

    // Behavior matching based on viewing patterns
    const durationMatch = video.duration <= user.behavior.averageSessionLength * 1.2 ? 0.2 : 0;
    const bingeMatch = video.series && user.behavior.bingeWatchingTendency > 0.7 ? 0.3 : 0;
    const timeMatch = isOptimalWatchTime(video.duration, user.preferences.watchTime) ? 0.1 : 0;
    factors.behaviorMatch = durationMatch + bingeMatch + timeMatch;

    // Popularity score (mock data)
    factors.popularityScore = Math.random() * 0.3;

    // Time relevance (recent releases, trending)
    const daysSinceRelease = (Date.now() - new Date(video.releaseDate).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = daysSinceRelease < 30 ? 0.2 : daysSinceRelease < 90 ? 0.1 : 0;
    factors.timeRelevance = recencyScore;

    // Social proof (views, ratings, shares)
    const viewsScore = Math.min(video.views / 1000000, 0.2);
    const ratingScore = (video.averageRating / 5) * 0.1;
    factors.socialProof = viewsScore + ratingScore;

    const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);

    return {
      videoId: video.id,
      score: totalScore,
      factors,
      explanation: generateExplanation(factors, video, user)
    };
  };

  const generateExplanation = (factors: any, video: any, user: UserProfile): string[] => {
    const explanations = [];
    
    if (factors.contentMatch > 0.5) {
      explanations.push(`Matches your favorite genres: ${video.genre?.join(', ')}`);
    }
    
    if (factors.behaviorMatch > 0.3) {
      explanations.push('Perfect length for your viewing sessions');
    }
    
    if (factors.popularityScore > 0.2) {
      explanations.push('Trending in your region');
    }
    
    if (factors.timeRelevance > 0.1) {
      explanations.push('Recently released content');
    }
    
    return explanations;
  };

  const isOptimalWatchTime = (duration: number, preferredTime: string): boolean => {
    const hour = new Date().getHours();
    const timeSlots = {
      morning: [6, 12],
      afternoon: [12, 18],
      evening: [18, 22],
      night: [22, 6]
    };
    
    const [start, end] = timeSlots[preferredTime as keyof typeof timeSlots];
    const isInPreferredTime = hour >= start && hour < end;
    const isShortContent = duration < 3600; // Less than 1 hour
    
    return isInPreferredTime || isShortContent;
  };

  const generateRecommendations = async () => {
    setIsLoading(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock recommendation data
      const mockRecommendations: AIRecommendation[] = [
        {
          id: 'rec_1',
          title: 'Cyber Revolution',
          description: 'In a dystopian future, a hacker uncovers a conspiracy that threatens humanity.',
          posterUrl: '/api/placeholder/movie/rec_1',
          duration: 8400,
          genre: ['Sci-Fi', 'Action', 'Thriller'],
          rating: 'PG-13',
          year: 2024,
          matchScore: 0.92,
          matchReasons: [
            'Matches your favorite Sci-Fi genre',
            'Perfect length for your viewing sessions',
            'Trending in your region'
          ],
          watchProbability: 0.87,
          confidence: 'high',
          recommendationType: 'personalized',
          metadata: {
            director: 'Alex Chen',
            cast: ['Emma Stone', 'Michael B. Jordan', 'Oscar Isaac'],
            language: 'English',
            subtitles: ['English', 'Spanish', 'French'],
            quality: ['4K', 'HDR', 'Dolby Vision']
          }
        },
        {
          id: 'rec_2',
          title: 'The Silent Observer',
          description: 'A psychological thriller that explores the boundaries of reality and perception.',
          posterUrl: '/api/placeholder/movie/rec_2',
          duration: 6600,
          genre: ['Thriller', 'Mystery', 'Drama'],
          rating: 'R',
          year: 2024,
          matchScore: 0.85,
          matchReasons: [
            'Similar to movies you have rated highly',
            'Recently released content',
            'Popular in your social circle'
          ],
          watchProbability: 0.78,
          confidence: 'high',
          recommendationType: 'similar',
          metadata: {
            director: 'Sarah Martinez',
            cast: ['Jake Gyllenhaal', 'Amy Adams', 'Willem Dafoe'],
            language: 'English',
            subtitles: ['English', 'German', 'Japanese'],
            quality: ['4K', 'HDR']
          }
        },
        {
          id: 'rec_3',
          title: 'Neon Nights',
          description: 'A visually stunning cyberpunk adventure set in a futuristic metropolis.',
          posterUrl: '/api/placeholder/movie/rec_3',
          duration: 9000,
          genre: ['Sci-Fi', 'Action', 'Adventure'],
          rating: 'PG-13',
          year: 2024,
          matchScore: 0.78,
          matchReasons: [
            'Trending globally this week',
            'High user engagement',
            'Critically acclaimed'
          ],
          watchProbability: 0.72,
          confidence: 'medium',
          recommendationType: 'trending',
          metadata: {
            director: 'Kenji Tanaka',
            cast: ['Rinko Kikuchi', 'Takeshi Kaneshiro', 'Haruka Ayase'],
            language: 'Japanese',
            subtitles: ['English', 'Japanese', 'Chinese'],
            quality: ['4K', 'HDR']
          }
        },
        {
          id: 'rec_4',
          title: 'Echoes of Tomorrow',
          description: 'A mind-bending exploration of time travel and parallel universes.',
          posterUrl: '/api/placeholder/movie/rec_4',
          duration: 7200,
          genre: ['Sci-Fi', 'Drama', 'Mystery'],
          rating: 'PG-13',
          year: 2023,
          matchScore: 0.65,
          matchReasons: [
            'Hidden gem you might have missed',
            'Award-winning indie film',
            'Unique storytelling'
          ],
          watchProbability: 0.58,
          confidence: 'low',
          recommendationType: 'discovery',
          metadata: {
            director: 'Maya Patel',
            cast: ['Dev Patel', 'Lupita Nyong\'o', 'John Boyega'],
            language: 'English',
            subtitles: ['English', 'Hindi', 'French'],
            quality: ['1080p', '720p']
          }
        }
      ];
      
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecommendations = useMemo(() => {
    if (selectedFilter === 'all') return recommendations;
    return recommendations.filter(rec => rec.recommendationType === selectedFilter);
  }, [recommendations, selectedFilter]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <Target className="w-4 h-4" />;
      case 'medium': return <Activity className="w-4 h-4" />;
      case 'low': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getRecommendationTypeIcon = (type: string) => {
    switch (type) {
      case 'personalized': return <Brain className="w-5 h-5" />;
      case 'trending': return <TrendingUp className="w-5 h-5" />;
      case 'similar': return <Film className="w-5 h-5" />;
      case 'discovery': return <Sparkles className="w-5 h-5" />;
      default: return <Lightbulb className="w-5 h-5" />;
    }
  };

  const handleRefreshRecommendations = () => {
    generateRecommendations();
  };

  const handleToggleAI = () => {
    setIsAIEnabled(!isAIEnabled);
  };

  return (
    <div className="ai-recommendation-engine">
      {/* Header */}
      <div className="ai-header">
        <div className="header-content">
          <div className="ai-status">
            <div className="status-indicator">
              <Brain className={`w-6 h-6 ${isAIEnabled ? 'active' : ''}`} />
              <span className={`status-text ${isAIEnabled ? 'active' : ''}`}>
                AI {isAIEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            
            <button
              className={`ai-toggle ${isAIEnabled ? 'enabled' : ''}`}
              onClick={handleToggleAI}
            >
              {isAIEnabled ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>AI Enabled</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Enable AI</span>
                </>
              )}
            </button>
          </div>
          
          <div className="learning-mode">
            <label className="mode-label">Learning Mode:</label>
            <select
              value={learningMode}
              onChange={(e) => setLearningMode(e.target.value as any)}
              className="mode-select"
            >
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
              <option value="experimental">Experimental</option>
            </select>
          </div>
        </div>
        
        <div className="header-actions">
          <button
            className="refresh-button"
            onClick={handleRefreshRecommendations}
            disabled={isLoading || !isAIEnabled}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isAIEnabled ? (
        <div className="ai-content">
          {/* Filters */}
          <div className="recommendation-filters">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${selectedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('all')}
              >
                <Filter className="w-4 h-4" />
                <span>All</span>
              </button>
              
              <button
                className={`filter-tab ${selectedFilter === 'personalized' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('personalized')}
              >
                <Brain className="w-4 h-4" />
                <span>For You</span>
              </button>
              
              <button
                className={`filter-tab ${selectedFilter === 'trending' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('trending')}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Trending</span>
              </button>
              
              <button
                className={`filter-tab ${selectedFilter === 'similar' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('similar')}
              >
                <Film className="w-4 h-4" />
                <span>Similar</span>
              </button>
            </div>
          </div>

          {/* Recommendations Grid */}
          <div className="recommendations-grid">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner">
                  <Brain className="w-8 h-8 animate-pulse" />
                </div>
                <p>Analyzing your preferences...</p>
                <p>Generating personalized recommendations...</p>
              </div>
            ) : (
              filteredRecommendations.map((recommendation) => (
                <div key={recommendation.id} className="recommendation-card">
                  <div className="recommendation-header">
                    <div className="recommendation-type">
                      {getRecommendationTypeIcon(recommendation.recommendationType)}
                      <span className="type-text">
                        {recommendation.recommendationType.charAt(0).toUpperCase() + recommendation.recommendationType.slice(1)}
                      </span>
                    </div>
                    
                    <div className={`confidence-badge ${getConfidenceColor(recommendation.confidence)}`}>
                      {getConfidenceIcon(recommendation.confidence)}
                      <span>{recommendation.confidence.toUpperCase()}</span>
                    </div>
                  </div>
                  
                  <div className="recommendation-content">
                    <div className="movie-poster">
                      <Image
                        src={recommendation.posterUrl}
                        alt={recommendation.title}
                        className="poster-image"
                        width={200}
                        height={300}
                      />
                      <div className="poster-overlay">
                        <Play className="w-8 h-8" />
                      </div>
                    </div>
                    
                    <div className="movie-info">
                      <h3 className="movie-title">{recommendation.title}</h3>
                      <p className="movie-description">{recommendation.description}</p>
                      
                      <div className="movie-meta">
                        <div className="meta-item">
                          <span className="meta-label">Year:</span>
                          <span className="meta-value">{recommendation.year}</span>
                        </div>
                        
                        <div className="meta-item">
                          <span className="meta-label">Duration:</span>
                          <span className="meta-value">{Math.floor(recommendation.duration / 60)}m</span>
                        </div>
                        
                        <div className="meta-item">
                          <span className="meta-label">Rating:</span>
                          <span className="meta-value rating">{recommendation.rating}</span>
                        </div>
                      </div>
                      
                      <div className="genre-tags">
                        {recommendation.genre.map((genre, index) => (
                          <span key={index} className="genre-tag">{genre}</span>
                        ))}
                      </div>
                      
                      <div className="match-reasons">
                        <h4 className="reasons-title">Why you might like this:</h4>
                        <ul className="reasons-list">
                          {recommendation.matchReasons.map((reason, index) => (
                            <li key={index} className="reason-item">
                              <Check className="w-3 h-3" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="match-score">
                        <div className="score-bar">
                          <div className="score-label">Match Score:</div>
                          <div className="score-progress">
                            <div 
                              className="score-fill"
                              style={{ width: `${recommendation.matchScore * 100}%` }}
                            ></div>
                          </div>
                          <span className="score-value">{Math.round(recommendation.matchScore * 100)}%</span>
                        </div>
                        
                        <div className="watch-probability">
                          <span className="probability-label">
                            <Eye className="w-4 h-4" />
                            {Math.round(recommendation.watchProbability * 100)}% likely to watch
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="recommendation-actions">
                    <button className="action-button primary">
                      <Play className="w-4 h-4" />
                      <span>Watch Now</span>
                    </button>
                    
                    <button className="action-button secondary">
                      <Bookmark className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    
                    <button className="action-button secondary">
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="ai-disabled-state">
          <div className="disabled-content">
            <Brain className="w-16 h-16" />
            <h2>AI Recommendations Disabled</h2>
            <p>Enable AI-powered recommendations to get personalized content suggestions based on your viewing habits and preferences.</p>
            
            <button
              className="enable-ai-button"
              onClick={handleToggleAI}
            >
              <Zap className="w-5 h-5" />
              <span>Enable AI Recommendations</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
