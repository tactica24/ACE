import { slugifyMatch, type LiveMatchStatusValue } from '@/lib/live-matches';

export type MatchChannel = { id: string; label: string; sport: string; url?: string };

export const VERIFIED_MATCH_CHANNELS: MatchChannel[] = [
  { id: 'UCpEcljS0e6_wXIDAnZ75eTA', label: 'ONE Championship', sport: 'Combat sports', url: 'https://www.youtube.com/channel/UCpEcljS0e6_wXIDAnZ75eTA' },
  { id: 'UC6Z0XNInwU80IdHHYVsk0lw', label: 'FIBA Basketball', sport: 'Basketball', url: 'https://www.youtube.com/channel/UC6Z0XNInwU80IdHHYVsk0lw' },
  { id: 'UC6KshgIidq_w_uLbeunS4bA', label: 'European Cricket', sport: 'Cricket', url: 'https://www.youtube.com/channel/UC6KshgIidq_w_uLbeunS4bA' }
];

type YouTubeError = { error?: { message?: string } };
type ChannelItem = {
  id: string;
  snippet?: { title?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};
type ChannelsResponse = YouTubeError & { items?: ChannelItem[] };
type PlaylistResponse = YouTubeError & { items?: Array<{ contentDetails?: { videoId?: string } }> };
type VideoItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    liveBroadcastContent?: 'live' | 'upcoming' | 'none';
    thumbnails?: Record<string, { url?: string }>;
  };
  status?: { embeddable?: boolean };
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
};
type VideosResponse = YouTubeError & { items?: VideoItem[] };

export type CollectedYouTubeMatch = {
  youtubeVideoId: string;
  youtubeChannelId: string;
  slug: string;
  title: string;
  sport: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date;
  status: LiveMatchStatusValue;
  embedUrl: string;
  posterUrl: string | null;
  description: string | null;
  sourceLabel: string;
};

async function youtubeGet<T extends YouTubeError>(path: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json() as T;
  if (!response.ok) throw new Error(payload.error?.message ?? `YouTube ${path} request failed.`);
  return payload;
}

function splitTeams(title: string, fallback: string) {
  const cleaned = title.replace(/\s*[|•].*$/, '').trim();
  const parts = cleaned.split(/\s+(?:vs?\.?|versus|@)\s+/i);
  if (parts.length >= 2) {
    return { homeTeam: parts[0].slice(0, 80), awayTeam: parts.slice(1).join(' vs ').slice(0, 80) };
  }
  return { homeTeam: cleaned.slice(0, 80), awayTeam: fallback.slice(0, 80) };
}

function selectPoster(thumbnails: Record<string, { url?: string }> | undefined) {
  return thumbnails?.maxres?.url ?? thumbnails?.standard?.url ?? thumbnails?.high?.url ?? thumbnails?.medium?.url ?? null;
}

function toCollectedMatch(video: VideoItem, channel: MatchChannel): CollectedYouTubeMatch | null {
  const title = video.snippet?.title?.trim();
  const live = video.liveStreamingDetails;
  const broadcastState = video.snippet?.liveBroadcastContent;
  if (!title || video.status?.embeddable !== true || video.snippet?.channelId !== channel.id || !live || live.actualEndTime) return null;
  if (broadcastState !== 'live' && broadcastState !== 'upcoming') return null;
  const kickoffValue = live.scheduledStartTime ?? live.actualStartTime;
  if (!kickoffValue) return null;
  const kickoffAt = new Date(kickoffValue);
  if (Number.isNaN(kickoffAt.getTime())) return null;
  const status: LiveMatchStatusValue = broadcastState === 'live' || live.actualStartTime ? 'LIVE' : 'UPCOMING';
  const teams = splitTeams(title, channel.label);
  const titleSlug = slugifyMatch(title).slice(0, 65) || 'live-match';

  return {
    youtubeVideoId: video.id,
    youtubeChannelId: channel.id,
    slug: `${titleSlug}-${video.id.toLowerCase()}`,
    title: title.slice(0, 140),
    sport: channel.sport,
    competition: channel.label,
    ...teams,
    kickoffAt,
    status,
    embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}`,
    posterUrl: selectPoster(video.snippet.thumbnails),
    description: video.snippet.description?.trim().slice(0, 1200) || null,
    sourceLabel: `${channel.label} · approved YouTube source`
  };
}

function parseYouTubeVideoId(input: string) {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] ?? null;
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    const parts = url.pathname.split('/').filter(Boolean);
    if (['live', 'embed', 'shorts'].includes(parts[0])) return parts[1] ?? null;
  } catch {
    return null;
  }
  return null;
}

function channelLookup(input: string) {
  const value = input.trim();
  if (/^UC[A-Za-z0-9_-]{22}$/.test(value)) return { id: value };
  if (value.startsWith('@')) return { forHandle: value.slice(1) };
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'channel' && parts[1]) return { id: parts[1] };
    if (parts[0]?.startsWith('@')) return { forHandle: parts[0].slice(1) };
    if (parts[0] === 'user' && parts[1]) return { forUsername: parts[1] };
  } catch {
    return null;
  }
  return null;
}

export function classifyYouTubeInput(input: string): 'video' | 'channel' | null {
  if (parseYouTubeVideoId(input)) return 'video';
  if (channelLookup(input)) return 'channel';
  return null;
}

async function getChannelItem(channelId: string, apiKey: string) {
  const response = await youtubeGet<ChannelsResponse>('channels', { part: 'snippet,contentDetails', id: channelId }, apiKey);
  return response.items?.[0] ?? null;
}

export async function resolveYouTubeChannel(input: string, sport: string, apiKey: string): Promise<MatchChannel & { url: string }> {
  const lookup = channelLookup(input);
  if (!lookup) throw new Error('Paste a YouTube @handle, /channel/ URL, /user/ URL, or channel ID.');
  const response = await youtubeGet<ChannelsResponse>('channels', { part: 'snippet,contentDetails', ...lookup }, apiKey);
  const channel = response.items?.[0];
  if (!channel?.id || !channel.snippet?.title) throw new Error('YouTube channel not found.');
  return {
    id: channel.id,
    label: channel.snippet.title.slice(0, 120),
    sport: sport.trim().slice(0, 50) || 'Sports',
    url: `https://www.youtube.com/channel/${channel.id}`
  };
}

export async function inspectYouTubeMatchVideo(input: string, apiKey: string): Promise<CollectedYouTubeMatch> {
  const videoId = parseYouTubeVideoId(input);
  if (!videoId) throw new Error('Paste a valid YouTube watch, live, short, embed, or youtu.be link.');
  const response = await youtubeGet<VideosResponse>('videos', { part: 'snippet,status,liveStreamingDetails', id: videoId }, apiKey);
  const video = response.items?.[0];
  if (!video?.snippet?.channelId) throw new Error('YouTube video not found.');
  const channel: MatchChannel = {
    id: video.snippet.channelId,
    label: video.snippet.channelTitle?.trim() || 'YouTube channel',
    sport: 'Sports'
  };
  const match = toCollectedMatch(video, channel);
  if (!match) throw new Error('This link is not an active or upcoming embeddable YouTube live broadcast.');
  return match;
}

export async function collectVerifiedYouTubeMatches(apiKey: string, channels: MatchChannel[] = VERIFIED_MATCH_CHANNELS) {
  const collected: CollectedYouTubeMatch[] = [];
  const uniqueChannels = [...new Map(channels.map((channel) => [channel.id, channel])).values()];

  for (const configuredChannel of uniqueChannels) {
    try {
      const channel = await getChannelItem(configuredChannel.id, apiKey);
      const uploadsPlaylist = channel?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylist) continue;
      const playlist = await youtubeGet<PlaylistResponse>('playlistItems', {
        part: 'contentDetails',
        playlistId: uploadsPlaylist,
        maxResults: '50'
      }, apiKey);
      const videoIds = (playlist.items ?? []).map((item) => item.contentDetails?.videoId).filter((id): id is string => Boolean(id));
      if (!videoIds.length) continue;
      const videos = await youtubeGet<VideosResponse>('videos', {
        part: 'snippet,status,liveStreamingDetails',
        id: videoIds.join(',')
      }, apiKey);
      const resolvedChannel = { ...configuredChannel, label: channel?.snippet?.title?.trim() || configuredChannel.label };
      for (const video of videos.items ?? []) {
        const match = toCollectedMatch(video, resolvedChannel);
        if (match) collected.push(match);
      }
    } catch (error) {
      console.warn(`YouTube source ${configuredChannel.id} could not be scanned:`, error);
    }
  }

  return collected;
}
