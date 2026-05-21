import {
  CONTENT_WARNING_OPTIONS,
  LANGUAGE_OPTIONS,
  SUBTITLE_KIND_OPTIONS,
  type ContentWarningValue,
  type SubtitleKindValue
} from '@/lib/media-types';

type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]['code'];

export type SubmittedSubtitleTrack = {
  label: string;
  languageCode: string;
  kind: SubtitleKindValue;
  fileKey: string;
  isDefault?: boolean;
};

const LANGUAGE_CODES = new Set<string>(LANGUAGE_OPTIONS.map((option) => option.code));
const CONTENT_WARNING_VALUES = new Set<string>(CONTENT_WARNING_OPTIONS.map((option) => option.value));
const SUBTITLE_KIND_VALUES = new Set<string>(SUBTITLE_KIND_OPTIONS.map((option) => option.value));

export function isSupportedLanguageCode(value: string | undefined): value is LanguageCode {
  return Boolean(value && LANGUAGE_CODES.has(value));
}

export function normalizeLanguageCodes(values: string[] = []) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => LANGUAGE_CODES.has(value))
    )
  );
}

export function normalizeContentWarnings(values: string[] = []) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value): value is ContentWarningValue => CONTENT_WARNING_VALUES.has(value))
    )
  );
}

export function normalizeSubtitleTracks(values: SubmittedSubtitleTrack[] = []) {
  return values
    .map((value) => ({
      label: value.label.trim(),
      languageCode: value.languageCode.trim().toLowerCase(),
      kind: value.kind,
      fileKey: value.fileKey.trim(),
      isDefault: Boolean(value.isDefault)
    }))
    .filter((value) => value.label && value.fileKey && LANGUAGE_CODES.has(value.languageCode) && SUBTITLE_KIND_VALUES.has(value.kind));
}
