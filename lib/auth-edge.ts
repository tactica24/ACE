import { env } from './env';
import { type RoleValue } from './media-types';

export type EdgeAuthTokenPayload = {
  sub: string;
  role: RoleValue;
  email: string;
  phone: string;
  iat?: number;
  exp?: number;
};

function base64UrlToUint8Array(value: string) {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function verifyHs256Signature(unsignedToken: string, signature: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsignedToken));
  return timingSafeEqual(new Uint8Array(expected), base64UrlToUint8Array(signature));
}

export async function verifyAuthTokenEdge(token: string): Promise<EdgeAuthTokenPayload> {
  const segments = token.split('.');
  if (segments.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(headerSegment))) as {
    alg?: string;
    typ?: string;
  };

  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('Unsupported token algorithm');
  }

  const valid = await verifyHs256Signature(`${headerSegment}.${payloadSegment}`, signatureSegment);
  if (!valid) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(payloadSegment))) as EdgeAuthTokenPayload;

  if (!payload.sub || !payload.email || !payload.phone || !payload.role) {
    throw new Error('Invalid token payload');
  }

  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    throw new Error('Token expired');
  }

  return payload;
}
