export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
export type PayoutAction = 'approve' | 'reject' | 'mark_paid';

export type PayoutTransition = {
  nextStatus: PayoutStatus;
  shouldRestoreReservedBalance: boolean;
  shouldSetPaidAt: boolean;
  shouldSetReviewedAt: boolean;
};

export function resolvePayoutTransition(status: PayoutStatus, action: PayoutAction): PayoutTransition {
  if (action === 'approve') {
    if (status !== 'PENDING') {
      throw new Error('Only pending payout requests can be approved.');
    }

    return {
      nextStatus: 'APPROVED',
      shouldRestoreReservedBalance: false,
      shouldSetPaidAt: false,
      shouldSetReviewedAt: true
    };
  }

  if (action === 'reject') {
    if (status === 'REJECTED') {
      throw new Error('This payout request has already been rejected.');
    }
    if (status === 'PAID') {
      throw new Error('A paid payout request cannot be rejected.');
    }

    return {
      nextStatus: 'REJECTED',
      shouldRestoreReservedBalance: true,
      shouldSetPaidAt: false,
      shouldSetReviewedAt: true
    };
  }

  if (status !== 'APPROVED') {
    throw new Error('Only approved payout requests can be marked as paid.');
  }

  return {
    nextStatus: 'PAID',
    shouldRestoreReservedBalance: false,
    shouldSetPaidAt: true,
    shouldSetReviewedAt: true
  };
}
