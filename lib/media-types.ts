export type RoleValue = 'USER' | 'CREATOR' | 'ADMIN';
export type SignupIntentValue = 'VIEWER' | 'CREATOR';
export type CreatorAccessStatusValue = 'NONE' | 'REQUESTED' | 'INVITED' | 'SUBMITTED';
export type SupportTicketStatusValue = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type SupportTicketCategoryValue =
  | 'PAYMENT'
  | 'ACCOUNT_ACCESS'
  | 'CATALOG_HELP'
  | 'CREATOR_ONBOARDING'
  | 'VIDEO_UPLOAD'
  | 'CONTRACTS'
  | 'OTHER';
export type PriceTierValue = 'SNACK' | 'STANDARD' | 'PREMIERE';
export type VideoStatusValue =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'MASTER_UPLOADED'
  | 'PROCESSING'
  | 'HLS_UPLOADED'
  | 'READY'
  | 'PUBLISHED'
  | 'ARCHIVED';
export type VideoTypeValue = 'FEATURE' | 'SERIES' | 'SHORT' | 'SKIT' | 'DOCUMENTARY' | 'ADVERT';
export type AgeRatingValue = 'ALL' | 'PG13' | 'PG16' | 'PG18';
export type SubtitleKindValue = 'subtitles' | 'captions' | 'sdh';
export type ContentWarningValue =
  | 'violence'
  | 'sex'
  | 'nudity'
  | 'strong_language'
  | 'substance_use'
  | 'self_harm'
  | 'horror'
  | 'abuse';

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'ar', label: 'Arabic' },
  { code: 'sw', label: 'Swahili' },
  { code: 'ha', label: 'Hausa' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ig', label: 'Igbo' },
  { code: 'am', label: 'Amharic' },
  { code: 'zu', label: 'Zulu' },
  { code: 'xh', label: 'Xhosa' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'es', label: 'Spanish' }
] as const;

export const CONTENT_WARNING_OPTIONS = [
  { value: 'violence', label: 'Violence' },
  { value: 'sex', label: 'Sex' },
  { value: 'nudity', label: 'Nudity' },
  { value: 'strong_language', label: 'Strong language' },
  { value: 'substance_use', label: 'Substance use' },
  { value: 'self_harm', label: 'Self-harm' },
  { value: 'horror', label: 'Horror or disturbing scenes' },
  { value: 'abuse', label: 'Abuse or exploitation' }
] as const;

export const SUBTITLE_KIND_OPTIONS = [
  { value: 'subtitles', label: 'Subtitles' },
  { value: 'captions', label: 'Closed captions' },
  { value: 'sdh', label: 'SDH' }
] as const;

export function getLanguageLabel(code: string) {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.label ?? code.toUpperCase();
}

export function getContentWarningLabel(value: string) {
  return CONTENT_WARNING_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
