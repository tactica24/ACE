'use client';

import Image from 'next/image';

import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Repeat, 
  RepeatOne, 
  Shuffle, 
  Mic, 
  MicOff, 
  ChatBubbleLeft, 
  ChatBubbleRight, 
  Send, 
  Settings, 
  Crown, 
  Sparkles, 
  Tv, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Wifi, 
  WifiOff, 
  Clock, 
  Calendar, 
  MapPin, 
  Globe, 
  Lock, 
  Unlock, 
  Key, 
  Eye, 
  EyeOff, 
  Share2, 
  Heart, 
  Bookmark, 
  Flag, 
  MoreVertical, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  UserPlus,
  UserMinus,
  Zap,
  Target,
  Award,
  Gift,
  Film,
  Video,
  Music,
  Headphones,
  Gamepad2,
  Coffee,
  Pizza,
  Popcorn
} from 'lucide-react';

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
  videoDuration: number;
  startTime: Date;
  endTime?: Date;
  participants: Participant[];
  maxParticipants: number;
  isLive: boolean;
  isPublic: boolean;
  password?: string;
  settings: {
    allowChat: boolean;
    requireApproval: boolean;
    autoPlayNext: boolean;
    syncPlayback: boolean;
    allowSkip: boolean;
    allowPause: boolean;
    allowSeek: boolean;
  };
  chat: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
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
  status: 'watching' | 'paused' | 'buffering' | 'disconnected' | 'seeking';
  lastSeen: Date;
  deviceType: 'tv' | 'desktop' | 'tablet' | 'mobile';
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  bandwidth: number;
  latency: number;
}

interface ChatMessage {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'emoji' | 'reaction';
  reactions?: { [emoji: string]: string[] };
  isHost?: boolean;
}

interface WatchPartySettings {
  defaultMaxParticipants: number;
  allowPublicParties: boolean;
  requireApproval: boolean;
  autoSync: boolean;
  chatHistory: boolean;
  moderationEnabled: boolean;
  customEmojis: boolean;
  allowScreenShare: boolean;
  allowCamera: boolean;
  recordSession: boolean;
}

export default function WatchPartyFeature() {
  const [isWatchPartyEnabled, setIsWatchPartyEnabled] = useState(false);
  const [activeParty, setActiveParty] = useState<WatchParty | null>(null);
  const [myParties, setMyParties] = useState<WatchParty[]>([]);
  const [availableParties, setAvailableParties] = useState<WatchParty[]>([]);
  const [partySettings, setPartySettings] = useState<WatchPartySettings>({
    defaultMaxParticipants: 8,
    allowPublicParties: true,
    requireApproval: false,
    autoSync: true,
    chatHistory: true,
    moderationEnabled: true,
    customEmojis: true,
    allowScreenShare: false,
    allowCamera: false,
    recordSession: false
  });
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showJoinParty, setShowJoinParty] = useState(false);
  const [joinCode, setJoinCode] = useState('');
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
      autoPlayNext: true,
      syncPlayback: true,
      allowSkip: true,
      allowPause: true,
      allowSeek: true
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mock data - replace with actual API calls
  const mockMyParties: WatchParty[] = [
    {
      id: 'party_1',
      title: 'Friday Night Movie Marathon',
      description: 'Join us for a fun movie night with friends!',
      hostId: 'user_123',
      hostName: 'You',
      hostAvatar: '/api/placeholder/user/current',
      videoId: 'video_456',
      videoTitle: 'The Last Guardian',
      videoPoster: '/api/placeholder/movie/poster1',
      videoDuration: 7200,
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
          status: 'watching',
          lastSeen: new Date(),
          deviceType: 'desktop',
          networkQuality: 'good',
          bandwidth: 15.2,
          latency: 45
        }
      ],
      maxParticipants: 8,
      isLive: true,
      isPublic: false,
      password: 'secret123',
      settings: {
        allowChat: true,
        requireApproval: false,
        autoPlayNext: true,
        syncPlayback: true,
        allowSkip: true,
        allowPause: true,
        allowSeek: true
      },
      chat: [
        {
          id: 'chat_1',
          participantId: 'user_456',
          participantName: 'Alice Johnson',
          participantAvatar: '/api/placeholder/user/alice',
          message: 'This is amazing! 🍿',
          timestamp: new Date('2024-01-20T20:05:00Z'),
          type: 'text',
          reactions: { '🍿': ['user_123'] }
        }
      ],
      createdAt: new Date('2024-01-20T19:30:00Z'),
      updatedAt: new Date('2024-01-20T20:05:00Z')
    }
  ];

  const mockAvailableParties: WatchParty[] = [
    {
      id: 'party_2',
      title: 'Sci-Fi Movie Night',
      description: 'Join us for an epic sci-fi movie marathon!',
      hostId: 'user_789',
      hostName: 'John Doe',
      hostAvatar: '/api/placeholder/user/john',
      videoId: 'video_789',
      videoTitle: 'Digital Dreams',
      videoPoster: '/api/placeholder/movie/poster2',
      videoDuration: 5400,
      startTime: new Date('2024-01-21T21:00:00Z'),
      participants: [
        {
          id: 'part_2',
          userId: 'user_456',
          name: 'Alice Johnson',
          avatar: '/api/placeholder/user/alice',
          joinedAt: new Date('2024-01-21T20:50:00Z'),
          isHost: false,
          isMuted: false,
          playbackPosition: 0,
          isReady: true,
          status: 'watching',
          lastSeen: new Date(),
          deviceType: 'desktop',
          networkQuality: 'excellent',
          bandwidth: 25.5,
          latency: 12
        }
      ],
      maxParticipants: 10,
      isLive: false,
      isPublic: true,
      settings: {
        allowChat: true,
        requireApproval: true,
        autoPlayNext: false,
        syncPlayback: true,
        allowSkip: true,
        allowPause: true,
        allowSeek: true
      },
      chat: [],
      createdAt: new Date('2024-01-21T20:00:00Z'),
      updatedAt: new Date('2024-01-21T20:00:00Z')
    }
  ];

  useEffect(() => {
    if (isWatchPartyEnabled) {
      loadWatchPartyData();
    }
  }, [isWatchPartyEnabled]);

  const loadWatchPartyData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMyParties(mockMyParties);
      setAvailableParties(mockAvailableParties);
    } catch (error) {
      console.error('Failed to load watch party data:', error);
      setError('Failed to load watch party data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWatchParty = () => {
    setIsWatchPartyEnabled(!isWatchPartyEnabled);
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
        videoDuration: 7200,
        startTime: new Date(),
        participants: [],
        maxParticipants: newPartyData.maxParticipants,
        isLive: false,
        isPublic: newPartyData.isPublic,
        password: newPartyData.password || undefined,
        settings: newPartyData.settings,
        chat: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setMyParties(prev => [newParty, ...prev]);
      setActiveParty(newParty);
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
          autoPlayNext: true,
          syncPlayback: true,
          allowSkip: true,
          allowPause: true,
          allowSeek: true
        }
      });
    } catch (error) {
      console.error('Failed to create party:', error);
      setError('Failed to create watch party');
    }
  };

  const handleJoinParty = async (partyId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const party = availableParties.find(p => p.id === partyId);
      if (party) {
        setActiveParty(party);
        setShowJoinParty(false);
        setJoinCode('');
      }
    } catch (error) {
      console.error('Failed to join party:', error);
      setError('Failed to join watch party');
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a valid party code');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const party = availableParties.find(p => p.password === joinCode);
      if (party) {
        setActiveParty(party);
        setShowJoinParty(false);
        setJoinCode('');
      } else {
        setError('Invalid party code');
      }
    } catch (error) {
      console.error('Failed to join party by code:', error);
      setError('Failed to join watch party');
    }
  };

  const handleLeaveParty = async () => {
    if (!activeParty) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setActiveParty(null);
    } catch (error) {
      console.error('Failed to leave party:', error);
      setError('Failed to leave watch party');
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !activeParty) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newMessage: ChatMessage = {
        id: `chat_${Date.now()}`,
        participantId: 'current_user',
        participantName: 'You',
        participantAvatar: '/api/placeholder/user/current',
        message: chatMessage,
        timestamp: new Date(),
        type: 'text',
        isHost: true
      };
      
      if (activeParty) {
        setActiveParty(prev => ({
          ...prev,
          chat: [...prev.chat, newMessage]
        }));
      }
      
      setChatMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    }
  };

  const handleVideoControl = (action: string) => {
    // Dispatch video control event
    window.dispatchEvent(new CustomEvent('watchPartyVideoControl', { 
      detail: { action, partyId: activeParty?.id } 
    }));
  };

  const getParticipantStatusColor = (status: string) => {
    switch (status) {
      case 'watching': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'buffering': return 'text-blue-600 bg-blue-100';
      case 'disconnected': return 'text-red-600 bg-red-100';
      case 'seeking': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getNetworkQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeParty?.chat]);

  return (
    <div className="watch-party-feature">
      {/* Header */}
      <div className="party-header">
        <div className="header-content">
          <h1 className="header-title">Watch Parties</h1>
          <p className="header-subtitle">Host or join watch parties to enjoy movies together with friends</p>
        </div>
        
        <div className="header-actions">
          <div className="party-status">
            <div className={`status-indicator ${isWatchPartyEnabled ? 'active' : ''}`}>
              <Users className={`w-6 h-6 ${isWatchPartyEnabled ? 'active' : ''}`} />
              <span className={`status-text ${isWatchPartyEnabled ? 'active' : ''}`}>
                Watch Parties {isWatchPartyEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            
            <button
              className={`party-toggle ${isWatchPartyEnabled ? 'enabled' : ''}`}
              onClick={handleToggleWatchParty}
            >
              {isWatchPartyEnabled ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Enable</span>
                </>
              )}
            </button>
          </div>
          
          <button
            className="create-party-button"
            onClick={() => setShowCreateParty(true)}
            disabled={!isWatchPartyEnabled}
          >
            <UserPlus className="w-5 h-5" />
            <span>Create Party</span>
          </button>
          
          <button
            className="join-party-button"
            onClick={() => setShowJoinParty(true)}
            disabled={!isWatchPartyEnabled}
          >
            <Plus className="w-5 h-5" />
            <span>Join Party</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isWatchPartyEnabled ? (
        <div className="party-content">
          {/* Active Party */}
          {activeParty && (
            <div className="active-party">
              <div className="party-info">
                <div className="party-header">
                  <div className="party-title">
                    <h2 className="title">{activeParty.title}</h2>
                    <p className="description">{activeParty.description}</p>
                  </div>
                  
                  <div className="party-status">
                    <div className={`live-indicator ${activeParty.isLive ? 'live' : ''}`}>
                      <div className="live-dot"></div>
                      <span>{activeParty.isLive ? 'LIVE' : 'SCHEDULED'}</span>
                    </div>
                    
                    <button
                      className="leave-button"
                      onClick={handleLeaveParty}
                    >
                      <X className="w-4 h-4" />
                      <span>Leave Party</span>
                    </button>
                  </div>
                </div>
                
                <div className="party-details">
                  <div className="detail-item">
                    <span className="detail-label">Host:</span>
                    <span className="detail-value">{activeParty.hostName}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Video:</span>
                    <span className="detail-value">{activeParty.videoTitle}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Participants:</span>
                    <span className="detail-value">{activeParty.participants.length}/{activeParty.maxParticipants}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Started:</span>
                    <span className="detail-value">{activeParty.startTime.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="party-content">
                <div className="video-section">
                  <div className="video-player">
                    <div className="video-container">
                      <Image
                        src={activeParty.videoPoster}
                        alt={activeParty.videoTitle}
                        className="video-poster"
                        width={400}
                        height={225}
                      />
                      
                      <div className="video-overlay">
                        <div className="video-controls">
                          <button
                            className="control-button"
                            onClick={() => handleVideoControl('play')}
                          >
                            <Play className="w-5 h-5" />
                          </button>
                          
                          <button
                            className="control-button"
                            onClick={() => handleVideoControl('pause')}
                          >
                            <Pause className="w-5 h-5" />
                          </button>
                          
                          <button
                            className="control-button"
                            onClick={() => handleVideoControl('seek_backward')}
                          >
                            <SkipBack className="w-5 h-5" />
                          </button>
                          
                          <button
                            className="control-button"
                            onClick={() => handleVideoControl('seek_forward')}
                          >
                            <SkipForward className="w-5 h-5" />
                          </button>
                          
                          <button
                            className="control-button"
                            onClick={() => handleVideoControl('volume_up')}
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                          
                          <button
                            className="control-button"
                            onClick={() => handleVideoControl('volume_down')}
                          >
                            <VolumeX className="w-5 h-5" />
                          </button>
                          
                          <button
                            className="control-button"
                            onClick={() => handleVideoControl('fullscreen')}
                          >
                            <Maximize2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="participants-section">
                  <h3 className="section-title">Participants ({activeParty.participants.length})</h3>
                  
                  <div className="participants-list">
                    {activeParty.participants.map((participant) => (
                      <div key={participant.id} className="participant-item">
                        <div className="participant-avatar">
                          <Image
                            src={participant.avatar || '/api/placeholder/user/default'}
                            alt={participant.name}
                            className="avatar-image"
                            width={40}
                            height={40}
                          />
                          {participant.isHost && (
                            <div className="host-badge">
                              <Crown className="w-3 h-3" />
                              <span>Host</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="participant-info">
                          <div className="participant-header">
                            <h4 className="participant-name">{participant.name}</h4>
                            <div className={`participant-status ${getParticipantStatusColor(participant.status)}`}>
                              <span className="status-text">{participant.status.toUpperCase()}</span>
                            </div>
                          </div>
                          
                          <div className="participant-details">
                            <div className="detail-item">
                              <span className="detail-label">Device:</span>
                              <span className="detail-value">{participant.deviceType}</span>
                            </div>
                            
                            <div className="detail-item">
                              <span className="detail-label">Network:</span>
                              <div className={`network-quality ${getNetworkQualityColor(participant.networkQuality)}`}>
                                <span className="quality-text">{participant.networkQuality.toUpperCase()}</span>
                                <span className="quality-details">
                                  {participant.bandwidth} Mbps • {participant.latency}ms
                                </span>
                              </div>
                            </div>
                            
                            <div className="detail-item">
                              <span className="detail-label">Position:</span>
                              <span className="detail-value">
                                {Math.floor(participant.playbackPosition / 60)}:{(participant.playbackPosition % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="participant-actions">
                          <button
                            className={`action-button ${participant.isMuted ? 'muted' : ''}`}
                            onClick={() => {/* Toggle mute */}}
                          >
                            {participant.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>
                          
                          <button
                            className="action-button"
                            onClick={() => {/* Kick participant */}}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="chat-section">
                  <h3 className="section-title">Chat</h3>
                  
                  <div className="chat-container" ref={chatContainerRef}>
                    {activeParty.chat.map((message) => (
                      <div key={message.id} className={`chat-message ${message.participantId === 'current_user' ? 'own' : 'other'}`}>
                        <div className="message-avatar">
                          <Image
                            src={message.participantAvatar || '/api/placeholder/user/default'}
                            alt={message.participantName}
                            className="avatar-image"
                            width={40}
                            height={40}
                          />
                        </div>
                        
                        <div className="message-content">
                          <div className="message-header">
                            <span className="message-author">{message.participantName}</span>
                            <span className="message-time">{message.timestamp.toLocaleTimeString()}</span>
                            {message.isHost && (
                              <span className="host-badge">Host</span>
                            )}
                          </div>
                          
                          <div className="message-body">
                            <p className="message-text">{message.message}</p>
                            
                            {message.reactions && Object.keys(message.reactions).length > 0 && (
                              <div className="message-reactions">
                                {Object.entries(message.reactions).map(([emoji, reactors]) => (
                                  <span key={emoji} className="reaction">
                                    <span>{emoji}</span>
                                    <span className="reaction-count">{reactors.length}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="chat-input">
                    <div className="input-container">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="chat-input-field"
                      />
                      
                      <button
                        className="send-button"
                        onClick={handleSendMessage}
                        disabled={!chatMessage.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="chat-status">
                      {isTyping && (
                        <span className="typing-indicator">Someone is typing...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Party List */}
          {!activeParty && (
            <div className="party-list">
              <div className="list-header">
                <h2 className="section-title">My Parties</h2>
                <span className="party-count">({myParties.length})</span>
              </div>
              
              <div className="parties-grid">
                {myParties.map((party) => (
                  <div key={party.id} className="party-card">
                    <div className="party-poster">
                      <Image
                        src={party.videoPoster}
                        alt={party.videoTitle}
                        className="poster-image"
                        width={300}
                        height={169}
                      />
                      <div className="party-overlay">
                        <div className="party-status">
                          {party.isLive && (
                            <div className="live-indicator">
                              <div className="live-dot"></div>
                              <span>LIVE</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="party-info">
                      <h3 className="party-title">{party.title}</h3>
                      <p className="party-description">{party.description}</p>
                      
                      <div className="party-details">
                        <div className="detail-item">
                          <span className="detail-label">Host:</span>
                          <span className="detail-value">{party.hostName}</span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-label">Video:</span>
                          <span className="detail-value">{party.videoTitle}</span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-label">Participants:</span>
                          <span className="detail-value">{party.participants.length}/{party.maxParticipants}</span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-label">Created:</span>
                          <span className="detail-value">{party.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="party-actions">
                        <button
                          className="action-button primary"
                          onClick={() => setActiveParty(party)}
                        >
                          <Play className="w-4 h-4" />
                          <span>Join Party</span>
                        </button>
                        
                        <button
                          className="action-button secondary"
                          onClick={() => {/* Edit party */}}
                        >
                          <Settings className="w-4 h-4" />
                          <span>Manage</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="list-header">
                <h2 className="section-title">Available Parties</h2>
                <span className="party-count">({availableParties.length})</span>
              </div>
              
              <div className="parties-grid">
                {availableParties.map((party) => (
                  <div key={party.id} className="party-card">
                    <div className="party-poster">
                      <Image
                        src={party.videoPoster}
                        alt={party.videoTitle}
                        className="poster-image"
                        width={300}
                        height={169}
                      />
                      <div className="party-overlay">
                        <div className="party-status">
                          {party.isLive && (
                            <div className="live-indicator">
                              <div className="live-dot"></div>
                              <span>LIVE</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="party-info">
                      <h3 className="party-title">{party.title}</h3>
                      <p className="party-description">{party.description}</p>
                      
                      <div className="party-details">
                        <div className="detail-item">
                          <span className="detail-label">Host:</span>
                          <span className="detail-value">{party.hostName}</span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-label">Video:</span>
                          <span className="detail-value">{party.videoTitle}</span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-label">Participants:</span>
                          <span className="detail-value">{party.participants.length}/{party.maxParticipants}</span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-label">Start Time:</span>
                          <span className="detail-value">{party.startTime.toLocaleString()}</span>
                        </div>
                        
                        {party.isPublic ? (
                          <div className="detail-item">
                            <span className="detail-label">Access:</span>
                            <span className="detail-value public">Public</span>
                          </div>
                        ) : (
                          <div className="detail-item">
                            <span className="detail-label">Access:</span>
                            <span className="detail-value private">Private</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="party-actions">
                        <button
                          className="action-button primary"
                          onClick={() => handleJoinParty(party.id)}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Join Party</span>
                        </button>
                        
                        {party.isPublic && (
                          <button
                            className="action-button secondary"
                            onClick={() => {/* Share party */}}
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="party-disabled-state">
          <div className="disabled-content">
            <Users className="w-16 h-16" />
            <h2>Watch Parties Disabled</h2>
            <p>Enable watch parties to enjoy movies together with friends in real-time synchronized viewing.</p>
            
            <button
              className="enable-party-button"
              onClick={handleToggleWatchParty}
            >
              <Users className="w-5 h-5" />
              <span>Enable Watch Parties</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Party Modal */}
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

      {/* Join Party Modal */}
      {showJoinParty && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Join Watch Party</h2>
              <button
                className="modal-close"
                onClick={() => setShowJoinParty(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-section">
                <label className="form-label">Party Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="form-input"
                  placeholder="Enter party code"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinByCode();
                    }
                  }}
                />
              </div>
              
              <div className="form-section">
                <label className="form-label">Or Browse Available Parties</label>
                <div className="available-parties">
                  {availableParties.map((party) => (
                    <div
                      key={party.id}
                      className="party-option"
                      onClick={() => handleJoinParty(party.id)}
                    >
                      <div className="party-option-poster">
                        <Image
                          src={party.videoPoster}
                          alt={party.videoTitle}
                          className="option-poster"
                          width={200}
                          height={113}
                        />
                      </div>
                      
                      <div className="party-option-info">
                        <h4 className="option-title">{party.title}</h4>
                        <p className="option-description">{party.description}</p>
                        
                        <div className="option-details">
                          <div className="detail-item">
                            <span className="detail-label">Host:</span>
                            <span className="detail-value">{party.hostName}</span>
                          </div>
                          
                          <div className="detail-item">
                            <span className="detail-label">Participants:</span>
                            <span className="detail-value">{party.participants.length}/{party.maxParticipants}</span>
                          </div>
                          
                          <div className="detail-item">
                            <span className="detail-label">Start Time:</span>
                            <span className="detail-value">{party.startTime.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="modal-button secondary"
                onClick={() => setShowJoinParty(false)}
              >
                Cancel
              </button>
              
              <button
                className="modal-button primary"
                onClick={handleJoinByCode}
                disabled={!joinCode.trim()}
              >
                <Plus className="w-4 h-4" />
                <span>Join by Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
          <button
            className="error-dismiss"
            onClick={() => setError(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
