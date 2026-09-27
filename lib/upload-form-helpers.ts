import { formatUploadLimit } from './upload-limits';

export type SubtitleDraft = {
  id: string;
  label: string;
  languageCode: string;
  kind: 'subtitles' | 'captions';
  isDefault: boolean;
  file: File | null;
};

export type EpisodeDraft = {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string;
  durationSec: number;
  highlightSeconds: string;
  primaryVideoFile: File | null;
  fallbackVideoFile: File | null;
  posterFile: File | null;
  subtitleTracks: SubtitleDraft[];
};

export function createClientId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function validateFileSize(file: { size: number }, maxBytes: number, label: string): string | null {
  if (file.size > maxBytes) {
    return `${label} file is too large. Keep it under ${formatUploadLimit(maxBytes)}.`;
  }
  return null;
}

export function createSubtitleDraft(
  languageCode = 'en',
  labelResolver: (code: string) => string = (code) => code,
): SubtitleDraft {
  return {
    id: createClientId(),
    label: labelResolver(languageCode),
    languageCode,
    kind: 'subtitles',
    isDefault: false,
    file: null,
  };
}

export function createEpisodeDraft(seasonNumber = 1, episodeNumber = 1): EpisodeDraft {
  return {
    id: createClientId(),
    seasonNumber,
    episodeNumber,
    title: '',
    description: '',
    durationSec: 1500,
    highlightSeconds: '',
    primaryVideoFile: null,
    fallbackVideoFile: null,
    posterFile: null,
    subtitleTracks: [],
  };
}
