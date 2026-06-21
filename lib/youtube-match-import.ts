import { slugifyMatch, type LiveMatchStatusValue } from '@/lib/live-matches';

export const VERIFIED_MATCH_CHANNELS = [
  { id: 'UCpEcljS0e6_wXIDAnZ75eTA', label: 'ONE Championship', sport: 'Combat sports' },
  { id: 'UC6Z0XNInwU80IdHHYVsk0lw', label: 'FIBA Basketball', sport: 'Basketball' },
  { id: 'UC6KshgIidq_w_uLbeunS4bA', label: 'European Cricket', sport: 'Cricket' }
] as const;

type SearchResponse = {
  items?: Array<{ id?: { videoId?: string } }>;
  error?: { message?: string };
};

type VideosResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      channelId?: string;
      channelTitle?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    status?: { embeddable?: boolean };
    liveStreamingDetails?: {
      scheduledStartTime?: string;
      actualStartTime?: string;
      actualEndTime?: string;
    };
  }>;
  error?: { message?: string };
};

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

async function youtubeGet<T extends { error?: { message?: string } }>(path: string, params: Record<string, string>, apiKey: string) {
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

export async function collectVerifiedYouTubeMatches(apiKey: string): Promise<CollectedYouTubeMatch[]> {
  const collected: CollectedYouTubeMatch[] = [];

  for (const channel of VERIFIED_MATCH_CHANNELS) {
    const search = await youtubeGet<SearchResponse>('search', {
      part: 'snippet',
      channelId: channel.id,
      eventType: 'live',
      type: 'video',
      videoEmbeddable: 'true',
      maxResults: '25'
    }, apiKey);
    const videoIds = (search.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
    if (!videoIds.length) continue;

    const videos = await youtubeGet<VideosResponse>('videos', {
      part: 'snippet,status,liveStreamingDetails',
      id: videoIds.join(',')
    }, apiKey);

    for (const video of videos.items ?? []) {
      if (video.status?.embeddable !== true || video.snippet?.channelId !== channel.id) continue;
      const title = video.snippet.title?.trim();
      if (!title) continue;
      const live = video.liveStreamingDetails;
      const kickoffValue = live?.scheduledStartTime ?? live?.actualStartTime;
      const kickoffAt = kickoffValue ? new Date(kickoffValue) : new Date();
      if (Number.isNaN(kickoffAt.getTime())) continue;
      const status: LiveMatchStatusValue = live?.actualEndTime ? 'ENDED' : live?.actualStartTime ? 'LIVE' : 'UPCOMING';
      const teams = splitTeams(title, channel.label);
      const titleSlug = slugifyMatch(title).slice(0, 65) || 'live-match';

      collected.push({
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
        sourceLabel: `${channel.label} · verified YouTube channel`
      });
    }
  }

  return collected;
}
