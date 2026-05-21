import crypto from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIRING_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export function generatePairingCode(length = 6) {
  return Array.from(crypto.randomBytes(length))
    .map((value) => CODE_ALPHABET[value % CODE_ALPHABET.length])
    .join('');
}

export function getPairingExpiry(minutes = 10) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  return expiresAt;
}

export function isPairingExpired(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now();
}

export function normalizePairingCode(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidPairingCode(value: string) {
  return PAIRING_CODE_PATTERN.test(value);
}
