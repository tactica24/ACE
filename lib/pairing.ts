import crypto from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
