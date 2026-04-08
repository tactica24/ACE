export const CREDIT_VALUE_NAIRA = 100;
export const CREDIT_UNITS_PER_CREDIT = 2;
export const CREDIT_UNIT_VALUE_NAIRA = CREDIT_VALUE_NAIRA / CREDIT_UNITS_PER_CREDIT;

export function alignNairaToCreditValue(amountNaira: number, minimum = CREDIT_VALUE_NAIRA) {
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    return minimum;
  }

  return Math.max(minimum, Math.round(amountNaira / CREDIT_VALUE_NAIRA) * CREDIT_VALUE_NAIRA);
}

export function creditsToStoredUnits(credits: number) {
  if (!Number.isFinite(credits) || credits <= 0) {
    return 0;
  }

  return Math.round(credits * CREDIT_UNITS_PER_CREDIT);
}

export function storedUnitsToCredits(units: number) {
  if (!Number.isFinite(units) || units <= 0) {
    return 0;
  }

  return Number((units / CREDIT_UNITS_PER_CREDIT).toFixed(1));
}

export function getCreditUnitsForNaira(amountNaira: number) {
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(amountNaira / CREDIT_UNIT_VALUE_NAIRA));
}

export function getCreditsForNaira(amountNaira: number) {
  return storedUnitsToCredits(getCreditUnitsForNaira(amountNaira));
}

export function getCreditValueNaira(credits: number) {
  return getCreditValueNairaFromStoredUnits(creditsToStoredUnits(credits));
}

export function getCreditValueNairaFromStoredUnits(units: number) {
  if (!Number.isFinite(units) || units <= 0) {
    return 0;
  }

  return Math.round(units * CREDIT_UNIT_VALUE_NAIRA);
}

export function formatCredits(credits: number) {
  const normalizedCredits = Number((Math.round(credits * CREDIT_UNITS_PER_CREDIT) / CREDIT_UNITS_PER_CREDIT).toFixed(1));
  const normalized = Number.isInteger(normalizedCredits) ? `${normalizedCredits}` : normalizedCredits.toFixed(1);
  return `${normalized} credit${normalizedCredits === 1 ? '' : 's'}`;
}
