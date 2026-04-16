'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Share2, 
  Play, 
  Calendar,
  MapPin,
  Globe,
  Bell,
  Settings,
  Plus,
  X,
  Check,
  Clock,
  TrendingUp,
  Eye,
  EyeOff,
  UserPlus,
  Send,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  Volume2,
  SkipForward,
  SkipBack,
  Repeat,
  RepeatOne,
  Shuffle,
  ChevronRight,
  ChevronDown,
  Star,
  Gift,
  Award,
  Trophy,
  Target,
  Zap,
  Shield,
  Flag,
  MoreVertical,
  User,
  UserPlus as UserPlusIcon,
  UserCheck,
  UserX,
  Crown,
  Sparkles,
  Film,
  Tv,
  Smartphone,
  Monitor,
  Headphones,
  Gamepad2,
  Coffee,
  Pizza,
  Popcorn
} from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  isOnline: boolean;
  lastSeen?: Date;
  mutualFriends: number;
  joinDate: Date;
  preferences: {
    watchParties: boolean;
    shareRecommendations: boolean;
    activityStatus: boolean;
  };
  stats: {
    moviesWatched: number;
    averageRating: number;
    favoriteGenres: string[];
    watchTime: number;
  };
}

interface WatchParty {
  id: string;
  title: string;
  description: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  videoId: string;
  videoTitle: string;
  videoPoster: string;
  duration: number;
  startTime: Date;
  participants: Participant[];
  maxParticipants: number;
  isLive: boolean;
  isPublic: boolean;
  password?: string;
  chat: ChatMessage[];
  settings: {
    allowChat: boolean;
    requireApproval: boolean;
    autoPlayNext: boolean;
  };
}

interface Participant {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  joinedAt: Date;
  isHost: boolean;
  isMuted: boolean;
  playbackPosition: number;
  isReady: boolean;
  status: 'watching' | 'paused' | 'buffering' | 'disconnected';
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'emoji' | 'reaction';
  reactions?: { [emoji: string]: string[] };
}

interface SocialActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: 'watched' | 'rated' | 'liked' | 'shared' | 'reviewed' | 'joined_party' | 'friend_request';
  targetId?: string;
  targetTitle?: string;
  targetPoster?: string;
  metadata?: any;
  timestamp: Date;
  isPublic: boolean;
  likes: number;
  comments: number;
}

interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  media?: {
    type: 'image' | 'video' | 'gif';
    url: string;
    thumbnail?: string;
    duration?: number;
  };
  tags: string[];
  category: 'discussion' | 'review' | 'recommendation' | 'news' | 'meme';
  likes: number;
  comments: number;
  shares: number;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  isLocked: boolean;
}

export default function SocialFeatures() {
  const [activeTab, setActiveTab] = useState<'friends' | 'parties' | 'activity' | 'community'>('friends');
  const [isSocialEnabled, setIsSocialEnabled] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [watchParties, setWatchParties] = useState<WatchParty[]>([]);
  const [socialActivity, setSocialActivity] = useState<SocialActivity[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [newPartyData, setNewPartyData] = useState({
    title: '',
    description: '',
    videoId: '',
    maxParticipants: 8,
    isPublic: false,
    password: '',
    settings: {
      allowChat: true,
      requireApproval: false,
      autoPlayNext: true
    }
  });

  // Mock data - replace with actual API calls
  const mockFriends: Friend[] = [
    {
      id: 'friend_1',
      name: 'Alice Johnson',
      username: 'alicej',
      avatar: '/api/placeholder/user/alice',
      status: 'online',
      isOnline: true,
      mutualFriends: 24,
      joinDate: new Date('2024-01-15'),
      preferences: {
        watchParties: true,
        shareRecommendations: true,
        activityStatus: true
      },
      stats: {
        moviesWatched: 342,
        averageRating: 4.2,
        favoriteGenres: ['Drama', 'Sci-Fi', 'Thriller'],
        watchTime: 1250
      }
    },
    {
      id: 'friend_2',
      name: 'Bob Smith',
      username: 'bobsmith',
      avatar: '/api/placeholder/user/bob',
      status: 'offline',
      isOnline: false,
      lastSeen: new Date('2024-01-20T14:30:00Z'),
      mutualFriends: 18,
      joinDate: new Date('2024-01-10'),
      preferences: {
        watchParties: true,
        shareRecommendations: true,
        activityStatus: true
      },
      stats: {
        moviesWatched: 256,
        averageRating: 3.8,
        favoriteGenres: ['Action', 'Comedy', 'Adventure'],
        watchTime: 980
      }
    }
  ];

  const mockWatchParties: WatchParty[] = [
    {
      id: 'party_1',
      title: 'Friday Night Movie Marathon',
      description: 'Join us for a fun movie night with friends!',
      hostId: 'user_123',
      hostName: 'John Doe',
      hostAvatar: '/api/placeholder/user/john',
      videoId: 'video_456',
      videoTitle: 'The Last Guardian',
      videoPoster: '/api/placeholder/movie/poster1',
      duration: 7200,
      startTime: new Date('2024-01-20T20:00:00Z'),
      participants: [
        {
          id: 'part_1',
          userId: 'user_456',
          name: 'Alice Johnson',
          avatar: '/api/placeholder/user/alice',
          joinedAt: new Date('2024-01-20T19:55:00Z'),
          isHost: false,
          isMuted: false,
          playbackPosition: 3600,
          isReady: true,
          status: 'watching'
        }
      ],
      maxParticipants: 8,
      isLive: true,
      isPublic: false,
      chat: [
        {
          id: 'chat_1',
          userId: 'user_456',
          userName: 'Alice Johnson',
          userAvatar: '/api/placeholder/user/alice',
          message: 'This is amazing! 🍿',
          timestamp: new Date('2024-01-20T20:05:00Z'),
          type: 'text'
        }
      ],
      settings: {
        allowChat: true,
        requireApproval: false,
        autoPlayNext: true
      }
    }
  ];

  const mockSocialActivity: SocialActivity[] = [
    {
      id: 'activity_1',
      userId: 'user_123',
      userName: 'John Doe',
      userAvatar: '/api/placeholder/user/john',
      action: 'watched',
      targetId: 'video_789',
      targetTitle: 'Digital Dreams',
      targetPoster: '/api/placeholder/movie/poster2',
      metadata: {
        duration: 5400,
        completionRate: 0.85,
        rating: 4.5
      },
      timestamp: new Date('2024-01-20T18:30:00Z'),
      isPublic: true,
      likes: 12,
      comments: 3
    },
    {
      id: 'activity_2',
      userId: 'user_456',
      userName: 'Alice Johnson',
      userAvatar: '/api/placeholder/user/alice',
      action: 'rated',
      targetId: 'video_789',
      targetTitle: 'Digital Dreams',
      targetPoster: '/api/placeholder/movie/poster2',
      metadata: {
        rating: 5,
        review: 'Absolutely stunning visuals and compelling storyline!'
      },
      timestamp: new Date('2024-01-20T16:45:00Z'),
      isPublic: true,
      likes: 1,
      comments: 0
    }
  ];

  const mockCommunityPosts: CommunityPost[] = [
    {
      id: 'post_1',
      authorId: 'user_789',
      authorName: 'Sarah Chen',
      authorAvatar: '/api/placeholder/user/sarah',
      title: 'Hidden Gems You Might Have Missed',
      content: 'I just discovered this incredible indie sci-fi film that deserves way more attention. The cinematography is breathtaking and the story will keep you thinking for days. Perfect for fans of thoughtful, character-driven science fiction!',
      media: {
        type: 'image',
        url: '/api/placeholder/community/post1',
        thumbnail: '/api/placeholder/community/post1_thumb'
      },
      tags: ['indie', 'sci-fi', 'recommendation', 'hidden-gems'],
      category: 'recommendation',
      likes: 24,
      comments: 8,
      shares: 12,
      createdAt: new Date('2024-01-20T14:30:00Z'),
      updatedAt: new Date('2024-01-20T14:30:00Z'),
      isPinned: true,
      isLocked: false
    }
  ];

  useEffect(() => {
    if (isSocialEnabled) {
      loadSocialData();
    }
  }, [isSocialEnabled]);

  const loadSocialData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFriends(mockFriends);
      setWatchParties(mockWatchParties);
      setSocialActivity(mockSocialActivity);
      setCommunityPosts(mockCommunityPosts);
    } catch (error) {
      console.error('Failed to load social data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSocial = () => {
    setIsSocialEnabled(!isSocialEnabled);
  };

  const handleCreateParty = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newParty: WatchParty = {
        id: `party_${Date.now()}`,
        title: newPartyData.title,
        description: newPartyData.description,
        hostId: 'current_user',
        hostName: 'You',
        hostAvatar: '/api/placeholder/user/current',
        videoId: newPartyData.videoId,
        videoTitle: 'Selected Video',
        videoPoster: '/api/placeholder/movie/poster',
        duration: 7200,
        startTime: new Date(),
        participants: [],
        maxParticipants: newPartyData.maxParticipants,
        isLive: false,
        isPublic: newPartyData.isPublic,
        password: newPartyData.password || undefined,
        chat: [],
        settings: newPartyData.settings
      };
      
      setWatchParties(prev => [newParty, ...prev]);
      setShowCreateParty(false);
      setNewPartyData({
        title: '',
        description: '',
        videoId: '',
        maxParticipants: 8,
        isPublic: false,
        password: '',
        settings: {
          allowChat: true,
          requireApproval: false,
          autoPlayNext: true
        }
      });
    } catch (error) {
      console.error('Failed to create party:', error);
    }
  };

  const handleJoinParty = async (partyId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSelectedParty(partyId);
      console.log('Joining party:', partyId);
    } catch (error) {
      console.error('Failed to join party:', error);
    }
  };

  const handleSendFriendRequest = async (friendId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Sending friend request to:', friendId);
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Eye className="w-3 h-3" />;
      case 'away': return <Clock className="w-3 h-3" />;
      case 'busy': return <X className="w-3 h-3" />;
      default: return <EyeOff className="w-3 h-3" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'discussion': return <MessageSquare className="w-4 h-4" />;
      case 'review': return <Star className="w-4 h-4" />;
      case 'recommendation': return <TrendingUp className="w-4 h-4" />;
      case 'news': return <Globe className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'tv': return <Tv className="w-4 h-4" />;
      case 'desktop': return <Monitor className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPosts = communityPosts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="social-features">
      {/* Header */}
      <div className="social-header">
        <div className="header-content">
          <h1 className="header-title">Social Features</h1>
          <p className="header-subtitle">Connect with friends, join watch parties, and share your experience</p>
        </div>
        
        <div className="header-actions">
          <div className="social-status">
            <div className={`status-indicator ${isSocialEnabled ? 'active' : ''}`}>
              <Users className={`w-5 h-5 ${isSocialEnabled ? 'active' : ''}`} />
              <span>Social {isSocialEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            
            <button
              className={`social-toggle ${isSocialEnabled ? 'enabled' : ''}`}
              onClick={handleToggleSocial}
            >
              {isSocialEnabled ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Disable</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Enable</span>
                </>
              )}
            </button>
          </div>
          
          <button
            className="create-party-button"
            onClick={() => setShowCreateParty(true)}
            disabled={!isSocialEnabled}
          >
            <Users className="w-5 h-5" />
            <span>Create Watch Party</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isSocialEnabled ? (
        <div className="social-content">
          {/* Navigation Tabs */}
          <div className="social-tabs">
            <button
              className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              <Users className="w-5 h-5" />
              <span>Friends</span>
            </button>
            
            <button
              className={`tab-button ${activeTab === 'parties' ? 'active' : ''}`}
              onClick={() => setActiveTab('parties')}
            >
              <Tv className="w-5 h-5" />
              <span>Watch Parties</span>
            </button>
            
            <button
              className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <Activity className="w-5 h-5" />
              <span>Activity</span>
            </button>
            
            <button
              className={`tab-button ${activeTab === 'community' ? 'active' : ''}`}
              onClick={() => setActiveTab('community')}
            >
              <Globe className="w-5 h-5" />
              <span>Community</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner">
                  <Users className="w-8 h-8 animate-pulse" />
                </div>
                <p>Loading social features...</p>
              </div>
            ) : (
              <>
                {/* Friends Tab */}
                {activeTab === 'friends' && (
                  <div className="friends-content">
                    <div className="friends-header">
                      <div className="search-box">
                        <Users className="w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Search friends..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="search-input"
                        />
                      </div>
                      
                      <button className="add-friend-button">
                        <UserPlus className="w-5 h-5" />
                        <span>Add Friends</span>
                      </button>
                    </div>
                    
                    <div className="friends-grid">
                      {filteredFriends.map((friend) => (
                        <div key={friend.id} className="friend-card">
                          <div className="friend-avatar">
                            <img
                              src={friend.avatar || '/api/placeholder/user/default'}
                              alt={friend.name}
                              className="avatar-image"
                            />
                            <div className={`status-indicator ${getStatusColor(friend.status)}`}>
                              {getStatusIcon(friend.status)}
                            </div>
                          </div>
                          
                          <div className="friend-info">
                            <div className="friend-header">
                              <h3 className="friend-name">{friend.name}</h3>
                              <span className="friend-username">@{friend.username}</span>
                            </div>
                            
                            <div className="friend-stats">
                              <div className="stat-item">
                                <span className="stat-label">Movies:</span>
                                <span className="stat-value">{friend.stats.moviesWatched}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Rating:</span>
                                <span className="stat-value">{friend.stats.averageRating.toFixed(1)}</span>
                              </div>
                            </div>
                            
                            <div className="friend-genres">
                              {friend.stats.favoriteGenres.slice(0, 3).map((genre, index) => (
                                <span key={index} className="genre-tag">{genre}</span>
                              ))}
                            </div>
                            
                            <div className="friend-actions">
                              <button
                                className="action-button primary"
                                onClick={() => handleSendFriendRequest(friend.id)}
                              >
                                <UserPlus className="w-4 h-4" />
                                <span>Connect</span>
                              </button>
                              
                              <button className="action-button secondary">
                                <MessageSquare className="w-4 h-4" />
                                <span>Message</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Watch Parties Tab */}
                {activeTab === 'parties' && (
                  <div className="parties-content">
                    <div className="parties-header">
                      <h2 className="section-title">Active Watch Parties</h2>
                      <button
                        className="create-party-button"
                        onClick={() => setShowCreateParty(true)}
                      >
                        <Plus className="w-5 h-5" />
                        <span>Create New Party</span>
                      </button>
                    </div>
                    
                    <div className="parties-grid">
                      {watchParties.map((party) => (
                        <div key={party.id} className="party-card">
                          <div className="party-header">
                            <div className="party-info">
                              <h3 className="party-title">{party.title}</h3>
                              <p className="party-description">{party.description}</p>
                              
                              <div className="party-meta">
                                <div className="meta-item">
                                  <Host className="w-4 h-4" />
                                  <span>Host: {party.hostName}</span>
                                </div>
                                <div className="meta-item">
                                  <Users className="w-4 h-4" />
                                  <span>{party.participants.length}/{party.maxParticipants}</span>
                                </div>
                                <div className="meta-item">
                                  <Globe className="w-4 h-4" />
                                  <span>{party.isPublic ? 'Public' : 'Private'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="party-status">
                              {party.isLive && (
                                <div className="live-indicator">
                                  <div className="live-dot"></div>
                                  <span>LIVE</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="party-content">
                            <div className="party-video">
                              <img
                                src={party.videoPoster}
                                alt={party.videoTitle}
                                className="video-poster"
                              />
                              <div className="video-overlay">
                                <Play className="w-8 h-8" />
                              </div>
                            </div>
                            
                            <div className="party-details">
                              <h4 className="video-title">{party.videoTitle}</h4>
                              <div className="video-duration">
                                <Clock className="w-4 h-4" />
                                <span>{Math.floor(party.duration / 60)}:{(party.duration % 60).toString().padStart(2, '0')}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="party-participants">
                            <h4 className="participants-title">Participants</h4>
                            <div className="participants-list">
                              {party.participants.map((participant) => (
                                <div key={participant.id} className="participant-item">
                                  <img
                                    src={participant.avatar || '/api/placeholder/user/default'}
                                    alt={participant.name}
                                    className="participant-avatar"
                                  />
                                  <div className="participant-info">
                                    <div className="participant-name">{participant.name}</div>
                                    <div className="participant-status">
                                      <div className={`status-dot ${participant.status === 'watching' ? 'watching' : ''}`}></div>
                                      <span>{participant.status}</span>
                                    </div>
                                  </div>
                                  {participant.isHost && (
                                    <div className="host-badge">
                                      <Crown className="w-3 h-3" />
                                      <span>Host</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="party-actions">
                            <button
                              className={`action-button ${selectedParty === party.id ? 'joined' : ''}`}
                              onClick={() => handleJoinParty(party.id)}
                              disabled={selectedParty === party.id}
                            >
                              {selectedParty === party.id ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>Joined</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  <span>Join Party</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <div className="activity-content">
                    <div className="activity-header">
                      <h2 className="section-title">Recent Activity</h2>
                      <div className="activity-filters">
                        <button className="filter-button">
                          <TrendingUp className="w-4 h-4" />
                          <span>Trending</span>
                        </button>
                        <button className="filter-button">
                          <Users className="w-4 h-4" />
                          <span>Friends</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="activity-feed">
                      {socialActivity.map((activity) => (
                        <div key={activity.id} className="activity-item">
                          <div className="activity-avatar">
                            <img
                              src={activity.userAvatar || '/api/placeholder/user/default'}
                              alt={activity.userName}
                              className="activity-avatar-image"
                            />
                          </div>
                          
                          <div className="activity-content">
                            <div className="activity-header">
                              <h4 className="activity-user">{activity.userName}</h4>
                              <span className="activity-time">
                                {activity.timestamp.toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="activity-action">
                              {activity.action === 'watched' && (
                                <>
                                  <Eye className="w-4 h-4" />
                                  <span>watched</span>
                                </>
                              )}
                              {activity.action === 'rated' && (
                                <>
                                  <Star className="w-4 h-4" />
                                  <span>rated</span>
                                </>
                              )}
                              {activity.action === 'liked' && (
                                <>
                                  <Heart className="w-4 h-4" />
                                  <span>liked</span>
                                </>
                              )}
                              {activity.action === 'shared' && (
                                <>
                                  <Share2 className="w-4 h-4" />
                                  <span>shared</span>
                                </>
                              )}
                              {activity.action === 'reviewed' && (
                                <>
                                  <MessageSquare className="w-4 h-4" />
                                  <span>reviewed</span>
                                </>
                              )}
                              {activity.action === 'joined_party' && (
                                <>
                                  <Tv className="w-4 h-4" />
                                  <span>joined watch party</span>
                                </>
                              )}
                              {activity.action === 'friend_request' && (
                                <>
                                  <UserPlus className="w-4 h-4" />
                                  <span>sent friend request</span>
                                </>
                              )}
                            </div>
                            
                            <div className="activity-target">
                              {activity.targetTitle && (
                                <h3 className="target-title">{activity.targetTitle}</h3>
                              )}
                              
                              {activity.targetPoster && (
                                <img
                                  src={activity.targetPoster}
                                  alt={activity.targetTitle}
                                  className="target-poster"
                                />
                              )}
                            </div>
                            
                            <div className="activity-metadata">
                              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                <div className="metadata-info">
                                  {activity.metadata.duration && (
                                    <div className="metadata-item">
                                      <span className="metadata-label">Duration:</span>
                                      <span className="metadata-value">
                                        {Math.floor(activity.metadata.duration / 60)}:{(activity.metadata.duration % 60).toString().padStart(2, '0')}
                                      </span>
                                    </div>
                                  )}
                                  {activity.metadata.rating && (
                                    <div className="metadata-item">
                                      <span className="metadata-label">Rating:</span>
                                      <span className="metadata-value">
                                        {'★'.repeat(Math.round(activity.metadata.rating))}
                                      </span>
                                    </div>
                                  )}
                                  {activity.metadata.completionRate && (
                                    <div className="metadata-item">
                                      <span className="metadata-label">Completion:</span>
                                      <span className="metadata-value">
                                        {Math.round(activity.metadata.completionRate * 100)}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="activity-engagement">
                              <div className="engagement-item">
                                <Heart className="w-4 h-4" />
                                <span>{activity.likes}</span>
                              </div>
                              <div className="engagement-item">
                                <MessageSquare className="w-4 h-4" />
                                <span>{activity.comments}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Tab */}
                {activeTab === 'community' && (
                  <div className="community-content">
                    <div className="community-header">
                      <h2 className="section-title">Community Posts</h2>
                      <div className="community-filters">
                        <button className="filter-button">
                          <TrendingUp className="w-4 h-4" />
                          <span>Trending</span>
                        </button>
                        <button className="filter-button">
                          <Award className="w-4 h-4" />
                          <span>Top Rated</span>
                        </button>
                        <button className="filter-button">
                          <Gift className="w-4 h-4" />
                          <span>Latest</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="community-posts">
                      {filteredPosts.map((post) => (
                        <div key={post.id} className="community-post">
                          {post.isPinned && (
                            <div className="pinned-indicator">
                              <Target className="w-4 h-4" />
                              <span>Pinned</span>
                            </div>
                          )}
                          
                          <div className="post-header">
                            <div className="post-author">
                              <img
                                src={post.authorAvatar || '/api/placeholder/user/default'}
                                alt={post.authorName}
                                className="author-avatar"
                              />
                              <div className="author-info">
                                <h4 className="author-name">{post.authorName}</h4>
                                <span className="post-time">
                                  {post.createdAt.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="post-category">
                              {getCategoryIcon(post.category)}
                              <span>{post.category}</span>
                            </div>
                          </div>
                          
                          <div className="post-content">
                            <h3 className="post-title">{post.title}</h3>
                            <p className="post-text">{post.content}</p>
                            
                            {post.media && (
                              <div className="post-media">
                                {post.media.type === 'image' && (
                                  <img
                                    src={post.media.url}
                                    alt={post.title}
                                    className="media-image"
                                  />
                                )}
                                {post.media.type === 'video' && (
                                  <div className="media-video">
                                    <img
                                      src={post.media.thumbnail}
                                      alt={post.title}
                                      className="video-thumbnail"
                                    />
                                    <div className="video-overlay">
                                      <Play className="w-8 h-8" />
                                    </div>
                                    <div className="video-duration">
                                      {post.media.duration && `${Math.floor(post.media.duration / 60)}:${(post.media.duration % 60).toString().padStart(2, '0')}`}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="post-tags">
                              {post.tags.map((tag, index) => (
                                <span key={index} className="tag">{tag}</span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="post-engagement">
                            <div className="engagement-stats">
                              <div className="stat-item">
                                <Heart className="w-4 h-4" />
                                <span>{post.likes}</span>
                              </div>
                              <div className="stat-item">
                                <MessageSquare className="w-4 h-4" />
                                <span>{post.comments}</span>
                              </div>
                              <div className="stat-item">
                                <Share2 className="w-4 h-4" />
                                <span>{post.shares}</span>
                              </div>
                            </div>
                            
                            <div className="engagement-actions">
                              <button className="engagement-button">
                                <Heart className="w-4 h-4" />
                              </button>
                              <button className="engagement-button">
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button className="engagement-button">
                                <Share2 className="w-4 h-4" />
                              </button>
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
        <div className="social-disabled-state">
          <div className="disabled-content">
            <Users className="w-16 h-16" />
            <h2>Social Features Disabled</h2>
            <p>Enable social features to connect with friends, join watch parties, and share your ACE Studio experience.</p>
            
            <button
              className="enable-social-button"
              onClick={handleToggleSocial}
            >
              <Users className="w-5 h-5" />
              <span>Enable Social Features</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Watch Party Modal */}
      {showCreateParty && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create Watch Party</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateParty(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-section">
                <label className="form-label">Party Title</label>
                <input
                  type="text"
                  value={newPartyData.title}
                  onChange={(e) => setNewPartyData(prev => ({ ...prev, title: e.target.value }))}
                  className="form-input"
                  placeholder="Give your watch party a name"
                />
              </div>
              
              <div className="form-section">
                <label className="form-label">Description</label>
                <textarea
                  value={newPartyData.description}
                  onChange={(e) => setNewPartyData(prev => ({ ...prev, description: e.target.value }))}
                  className="form-textarea"
                  placeholder="Describe your watch party"
                  rows={3}
                />
              </div>
              
              <div className="form-section">
                <label className="form-label">Video</label>
                <input
                  type="text"
                  value={newPartyData.videoId}
                  onChange={(e) => setNewPartyData(prev => ({ ...prev, videoId: e.target.value }))}
                  className="form-input"
                  placeholder="Enter video ID or search for a video"
                />
              </div>
              
              <div className="form-row">
                <div className="form-section">
                  <label className="form-label">Max Participants</label>
                  <input
                    type="number"
                    value={newPartyData.maxParticipants}
                    onChange={(e) => setNewPartyData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                    className="form-input"
                    min="2"
                    max="50"
                  />
                </div>
                
                <div className="form-section">
                  <label className="form-label">Privacy</label>
                  <select
                    value={newPartyData.isPublic ? 'public' : 'private'}
                    onChange={(e) => setNewPartyData(prev => ({ ...prev, isPublic: e.target.value === 'public' }))}
                    className="form-select"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              
              {!newPartyData.isPublic && (
                <div className="form-section">
                  <label className="form-label">Password (Optional)</label>
                  <input
                    type="password"
                    value={newPartyData.password}
                    onChange={(e) => setNewPartyData(prev => ({ ...prev, password: e.target.value }))}
                    className="form-input"
                    placeholder="Password for private party"
                  />
                </div>
              )}
              
              <div className="form-section">
                <h3 className="form-subtitle">Party Settings</h3>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newPartyData.settings.allowChat}
                    onChange={(e) => setNewPartyData(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, allowChat: e.target.checked }
                    }))}
                  />
                  <span className="checkbox-text">Allow chat</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newPartyData.settings.requireApproval}
                    onChange={(e) => setNewPartyData(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, requireApproval: e.target.checked }
                    }))}
                  />
                  <span className="checkbox-text">Require approval to join</span>
                </label>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newPartyData.settings.autoPlayNext}
                    onChange={(e) => setNewPartyData(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, autoPlayNext: e.target.checked }
                    }))}
                  />
                  <span className="checkbox-text">Auto-play next episode</span>
                </label>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="modal-button secondary"
                onClick={() => setShowCreateParty(false)}
              >
                Cancel
              </button>
              
              <button
                className="modal-button primary"
                onClick={handleCreateParty}
                disabled={!newPartyData.title || !newPartyData.videoId}
              >
                <Users className="w-4 h-4" />
                <span>Create Party</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
