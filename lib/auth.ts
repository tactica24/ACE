import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { env } from './env';
import { type RoleValue } from './media-types';

export type AuthTokenPayload = {
  sub: string;
  role: RoleValue;
  email: string;
  phone: string;
};

export function createAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

export function getAuthCookie() {
  return cookies().get('ace_token')?.value;
}

export function getAuthFromRequest(req: NextRequest | Request) {
  const cookieToken =
    'cookies' in req ? (req as NextRequest).cookies.get('ace_token')?.value : undefined;
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = cookieToken ?? bearerToken;
  if (!token) return null;
  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

export function requireAuthFromRequest(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw new Error('Unauthorized');
  }
  return auth;
}

export function createStreamToken(payload: { userId?: string; videoId: string; guest?: boolean }) {
  return jwt.sign(payload, env.ACE_STREAM_SIGNING_SECRET, { expiresIn: '15m' });
}

export function verifyStreamToken(token: string) {
  return jwt.verify(token, env.ACE_STREAM_SIGNING_SECRET) as {
    userId?: string;
    videoId: string;
    guest?: boolean;
  };
}

export function createP2PToken(payload: { transferId: string; userId: string }) {
  return jwt.sign(payload, env.ACE_STREAM_SIGNING_SECRET, { expiresIn: '30m' });
}

export function verifyP2PToken(token: string) {
  return jwt.verify(token, env.ACE_STREAM_SIGNING_SECRET) as { transferId: string; userId: string };
}
