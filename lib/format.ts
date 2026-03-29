function getCurrencyLocale(currency: string) {
  if (currency === 'NGN') return 'en-NG';
  if (currency === 'GBP') return 'en-GB';
  if (currency === 'CAD') return 'en-CA';
  return 'en-US';
}

export function formatCurrencyAmount(value: number, currency: string) {
  const fractionDigits = currency === 'NGN' ? 0 : 2;

  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

export function formatCurrencyMinor(amountMinor: number, currency: string) {
  const value = currency === 'NGN' ? Math.round(amountMinor / 100) : amountMinor / 100;
  return formatCurrencyAmount(value, currency);
}

export function formatRecordedCharge({
  amountMinor,
  amountNaira,
  currency
}: {
  amountMinor: number;
  amountNaira: number;
  currency: string;
}) {
  return currency === 'NGN' ? formatCurrencyAmount(amountNaira, 'NGN') : formatCurrencyMinor(amountMinor, currency);
}

export function formatNaira(value: number) {
  return formatCurrencyAmount(value, 'NGN');
}
