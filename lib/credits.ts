export const CREDIT_VALUE_NAIRA = 100;

export function alignNairaToCreditValue(amountNaira: number, minimum = CREDIT_VALUE_NAIRA) {
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    return minimum;
  }

  return Math.max(minimum, Math.round(amountNaira / CREDIT_VALUE_NAIRA) * CREDIT_VALUE_NAIRA);
}

export function getCreditsForNaira(amountNaira: number) {
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(amountNaira / CREDIT_VALUE_NAIRA));
}

export function getCreditValueNaira(credits: number) {
  if (!Number.isFinite(credits) || credits <= 0) {
    return 0;
  }

  return Math.round(credits * CREDIT_VALUE_NAIRA);
}

export function formatCredits(credits: number) {
  const normalized = Number.isInteger(credits) ? `${credits}` : credits.toFixed(1);
  return `${normalized} credit${credits === 1 ? '' : 's'}`;
}
