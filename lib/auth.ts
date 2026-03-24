import 'server-only';

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { type DecodedIdToken } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';
import { env } from './env';
import { getFirebaseAdminAuth } from './firebase-admin';
import { type RoleValue } from './media-types';

const AUTH_COOKIE_NAME = 'ace_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;
const FIREBASE_PASSWORD_SENTINEL = 'FIREBASE_AUTH_MANAGED';

export type AuthTokenPayload = {
  sub: string;
  role: RoleValue;
  name?: string | null;
  email: string;
  phone: string;
  firebaseUid: string;
  emailVerified?: boolean;
};

type SyncOptions = {
  allowCreate?: boolean;
  name?: string | null;
  phone?: string | null;
};

type DbAuthUser = {
  id: string;
  firebaseUid: string | null;
  name: string | null;
  email: string;
  phone: string;
  role: RoleValue;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? '';
}

function normalizePhone(phone?: string | null) {
  return phone?.trim() ?? '';
}

function normalizeName(name?: string | null) {
  const value = name?.trim() ?? '';
  return value || null;
}

function toAuthPayload(user: DbAuthUser, decodedToken?: DecodedIdToken): AuthTokenPayload {
  if (!user.firebaseUid) {
    throw new Error('User is missing a Firebase UID.');
  }

  return {
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    firebaseUid: user.firebaseUid,
    emailVerified: decodedToken?.email_verified ?? false
  };
}

function readSessionCookie(req: NextRequest | Request) {
  if ('cookies' in req) {
    return req.cookies.get(AUTH_COOKIE_NAME)?.value;
  }

  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === AUTH_COOKIE_NAME) {
      return rawValue.join('=');
    }
  }

  return undefined;
}

async function verifySessionCookie(sessionCookie: string) {
  return getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
}

async function syncUserRecord(decodedToken: DecodedIdToken, options: SyncOptions = {}) {
  const firebaseUid = decodedToken.uid;
  const name = normalizeName(options.name ?? decodedToken.name);
  const email = normalizeEmail(decodedToken.email);
  const phone = normalizePhone(options.phone ?? decodedToken.phone_number);

  if (!firebaseUid || !email) {
    return null;
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ firebaseUid }, { email }]
    },
    select: {
      id: true,
      firebaseUid: true,
      name: true,
      email: true,
      phone: true,
      role: true
    }
  });

  if (!user) {
    if (!options.allowCreate) {
      return null;
    }

    if (!phone) {
      throw new Error('A phone number is required to complete account setup.');
    }

    user = await prisma.user.create({
      data: {
        firebaseUid,
        name,
        email,
        phone,
        passwordHash: FIREBASE_PASSWORD_SENTINEL,
        wallet: { create: {} }
      },
      select: {
        id: true,
        firebaseUid: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    });
  } else {
    const updateData: { firebaseUid?: string; name?: string | null; email?: string; phone?: string } = {};

    if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
      throw new Error('This account is already linked to a different Firebase user.');
    }
    if (!user.firebaseUid) {
      updateData.firebaseUid = firebaseUid;
    }
    if (name && user.name !== name) {
      updateData.name = name;
    }
    if (user.email !== email) {
      updateData.email = email;
    }
    if (phone && user.phone !== phone) {
      updateData.phone = phone;
    }

    if (Object.keys(updateData).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          firebaseUid: true,
          name: true,
          email: true,
          phone: true,
          role: true
        }
      });
    }

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id }
    });
  }

  return toAuthPayload(user, decodedToken);
}

export async function verifyFirebaseIdToken(token: string) {
  return getFirebaseAdminAuth().verifyIdToken(token, true);
}

export async function syncAuthSession(idToken: string, options: SyncOptions = {}) {
  const decodedToken = await verifyFirebaseIdToken(idToken);
  const user = await syncUserRecord(decodedToken, { allowCreate: true, ...options });

  if (!user) {
    throw new Error('Unable to resolve the authenticated user.');
  }

  const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS
  });

  return { user, sessionCookie };
}

export function applyAuthSession(response: NextResponse, sessionCookie: string) {
  response.cookies.set(AUTH_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });
  return response;
}

export function clearAuthSession(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
  return response;
}

export function getAuthCookie() {
  return cookies().get(AUTH_COOKIE_NAME)?.value;
}

export async function getCurrentUser() {
  const sessionCookie = getAuthCookie();
  if (!sessionCookie) return null;

  try {
    const decodedToken = await verifySessionCookie(sessionCookie);
    return await syncUserRecord(decodedToken);
  } catch {
    return null;
  }
}

export async function getAuthFromRequest(req: NextRequest | Request) {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  try {
    if (bearerToken) {
      const decodedToken = await verifyFirebaseIdToken(bearerToken);
      return await syncUserRecord(decodedToken);
    }

    const sessionCookie = readSessionCookie(req);
    if (!sessionCookie) return null;

    const decodedToken = await verifySessionCookie(sessionCookie);
    return await syncUserRecord(decodedToken);
  } catch {
    return null;
  }
}

export async function requireAuthFromRequest(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
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
