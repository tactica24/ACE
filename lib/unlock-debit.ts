import { getCreditValueNairaFromStoredUnits } from '@/lib/credits';

export type UnlockDebitPlanInput = {
  creditsRequiredUnits: number;
  passCreditsRemainingUnits: number[];
  walletCreditsUnits: number;
  walletBalanceNaira: number;
};

export type UnlockDebitPlan = {
  passUsageUnits: number[];
  passCreditUnitsUsed: number;
  walletCreditUnitsUsed: number;
  walletBalanceNeeded: number;
  remainingCreditUnits: number;
  sufficientBalance: boolean;
  source: 'PASS' | 'WALLET';
};

export function planUnlockDebit(input: UnlockDebitPlanInput): UnlockDebitPlan {
  const passUsageUnits: number[] = [];
  let remainingCreditUnits = Math.max(0, Math.floor(input.creditsRequiredUnits));
  let passCreditUnitsUsed = 0;

  for (const creditsRemaining of input.passCreditsRemainingUnits) {
    if (remainingCreditUnits <= 0) {
      passUsageUnits.push(0);
      continue;
    }

    const usage = Math.min(Math.max(0, creditsRemaining), remainingCreditUnits);
    passUsageUnits.push(usage);
    passCreditUnitsUsed += usage;
    remainingCreditUnits -= usage;
  }

  const walletCreditUnitsUsed = Math.min(Math.max(0, input.walletCreditsUnits), remainingCreditUnits);
  remainingCreditUnits -= walletCreditUnitsUsed;
  const walletBalanceNeeded = getCreditValueNairaFromStoredUnits(remainingCreditUnits);
  const sufficientBalance = input.walletBalanceNaira >= walletBalanceNeeded;

  return {
    passUsageUnits,
    passCreditUnitsUsed,
    walletCreditUnitsUsed,
    walletBalanceNeeded,
    remainingCreditUnits,
    sufficientBalance,
    source:
      passCreditUnitsUsed === input.creditsRequiredUnits && walletCreditUnitsUsed === 0 && walletBalanceNeeded === 0
        ? 'PASS'
        : 'WALLET'
  };
}
