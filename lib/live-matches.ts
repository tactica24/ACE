export const LIVE_MATCH_STATUSES = ['UPCOMING', 'LIVE', 'ENDED', 'POSTPONED'] as const;
export const LIVE_CHAT_EMOJIS = ['🔥', '⚽', '😂', '👏', '😮', '❤️'] as const;
export const LIVE_CHAT_AVATARS = ['⚽', '🏆', '🦁', '🦅', '🔥', '⭐', '🌟', '🎉'] as const;

export type LiveMatchStatusValue = (typeof LIVE_MATCH_STATUSES)[number];

export function isLiveMatchStatus(value: unknown): value is LiveMatchStatusValue {
  return typeof value === 'string' && LIVE_MATCH_STATUSES.includes(value as LiveMatchStatusValue);
}

export function slugifyMatch(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function extractEmbedUrl(value: string) {
  const trimmed = value.trim();
  const iframeMatch = trimmed.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i);
  const candidate = (iframeMatch?.[1] ?? trimmed).replace(/&amp;/g, '&').trim();

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeChatHandle(value: string) {
  return value.trim().replace(/\s+/g, '_');
}

export function isValidChatHandle(value: string) {
  return /^[A-Za-z0-9_]{3,20}$/.test(value);
}

export function formatKickoff(value: Date | string) {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(new Date(value));
}
