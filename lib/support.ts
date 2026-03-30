import { type SupportTicketCategoryValue, type SupportTicketStatusValue } from './media-types';

export const supportCategoryLabels: Record<SupportTicketCategoryValue, string> = {
  PAYMENT: 'Payment challenge',
  ACCOUNT_ACCESS: 'Account access',
  CATALOG_HELP: 'Catalog or viewing help',
  CREATOR_ONBOARDING: 'Producer onboarding',
  VIDEO_UPLOAD: 'Video upload issue',
  CONTRACTS: 'Contracts or rights',
  OTHER: 'Other'
};

export const supportStatusLabels: Record<SupportTicketStatusValue, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved'
};

export const viewerSupportCategories: SupportTicketCategoryValue[] = ['PAYMENT', 'ACCOUNT_ACCESS', 'CATALOG_HELP', 'OTHER'];
export const creatorSupportCategories: SupportTicketCategoryValue[] = ['CREATOR_ONBOARDING', 'VIDEO_UPLOAD', 'CONTRACTS', 'ACCOUNT_ACCESS', 'OTHER'];

export function isSupportTicketCategory(value: string): value is SupportTicketCategoryValue {
  return value in supportCategoryLabels;
}

export function isSupportTicketStatus(value: string): value is SupportTicketStatusValue {
  return value in supportStatusLabels;
}
