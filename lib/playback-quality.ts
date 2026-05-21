export type PlaybackQualityPreference = 'adaptive' | 'high' | 'data-saver' | '1080p' | '720p';

export type ProgressivePlaybackQuality = '1080p' | '720p';

export type ProgressiveVariantSelection = {
  key: string | null;
  quality: ProgressivePlaybackQuality | null;
};

type ProgressiveVariantInput = {
  primaryKey: string | null;
  primaryReady: boolean;
  fallbackKey: string | null;
  fallbackReady: boolean;
};

export function normalizePlaybackQualityPreference(value?: string | null): PlaybackQualityPreference {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case 'high':
    case 'high quality':
    case 'high-quality':
    case 'high_quality':
    case '1080':
    case '1080p':
      return '1080p';
    case 'data-saver':
    case 'data saver':
    case 'data_saver':
    case 'low':
    case '720':
    case '720p':
      return '720p';
    case 'adaptive':
    default:
      return 'adaptive';
  }
}

export function getAvailableProgressiveQualities({
  primaryReady,
  fallbackReady
}: Pick<ProgressiveVariantInput, 'primaryReady' | 'fallbackReady'>): ProgressivePlaybackQuality[] {
  const qualities: ProgressivePlaybackQuality[] = [];

  if (primaryReady) {
    qualities.push('1080p');
  }

  if (fallbackReady) {
    qualities.push('720p');
  }

  return qualities;
}

export function selectProgressiveVariant(
  input: ProgressiveVariantInput,
  preference: PlaybackQualityPreference
): ProgressiveVariantSelection {
  const available = getAvailableProgressiveQualities(input);
  if (!available.length) {
    return { key: null, quality: null };
  }

  if ((preference === '720p' || preference === 'data-saver') && input.fallbackReady && input.fallbackKey) {
    return { key: input.fallbackKey, quality: '720p' };
  }

  if ((preference === '1080p' || preference === 'high') && input.primaryReady && input.primaryKey) {
    return { key: input.primaryKey, quality: '1080p' };
  }

  if (input.primaryReady && input.primaryKey) {
    return { key: input.primaryKey, quality: '1080p' };
  }

  if (input.fallbackReady && input.fallbackKey) {
    return { key: input.fallbackKey, quality: '720p' };
  }

  return { key: null, quality: null };
}
