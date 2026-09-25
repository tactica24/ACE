export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['REVIEWED', 'SUPERSEDED'],
  REVIEWED: ['APPROVED', 'DRAFT', 'SUPERSEDED'],
  APPROVED: ['ISSUED', 'REVIEWED', 'SUPERSEDED'],
  ISSUED: ['PAID', 'APPROVED', 'SUPERSEDED'],
  PAID: ['SUPERSEDED'],
  SUPERSEDED: []
};

export function getValidNextStatuses(status: string): string[] {
  return VALID_STATUS_TRANSITIONS[status] ?? [];
}

export function isValidStatusTransition(currentStatus: string, nextStatus: string): boolean {
  if (currentStatus === nextStatus) return true;
  const validNext = VALID_STATUS_TRANSITIONS[currentStatus];
  return validNext ? validNext.includes(nextStatus) : false;
}
