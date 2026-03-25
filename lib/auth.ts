import 'server-only';

import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { type DecodedIdToken } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';
import { env } from './env';
import { getFirebaseAdminAuth } from './firebase-admin';
import { type CreatorAccessStatusValue, type RoleValue, type SignupIntentValue } from './media-types';

const AUTH_COOKIE_NAME = 'ace_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;
const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;
const FIREBASE_PASSWORD_SENTINEL = 'FIREBASE_AUTH_MANAGED';

export type AuthTokenPayload = {
  sub: string;
  role: RoleValue;
  signupIntent: SignupIntentValue;
  creatorAccessStatus: CreatorAccessStatusValue;
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
  signupIntent?: SignupIntentValue | null;
};

type DbAuthUser = {
  id: string;
  firebaseUid: string | null;
  name: string | null;
  email: string;
  phone: string;
  role: RoleValue;
  signupIntent: SignupIntentValue;
  creatorAccessStatus: CreatorAccessStatusValue;
};

const REQUIRED_AUTH_SERVER_ENV_KEYS = [
  'DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
] as const;

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

function normalizeSignupIntent(signupIntent?: string | null): SignupIntentValue {
  return signupIntent === 'CREATOR' ? 'CREATOR' : 'VIEWER';
}

export function getMissingAuthServerEnvKeys() {
  return REQUIRED_AUTH_SERVER_ENV_KEYS.filter((key) => !process.env[key]?.trim());
}

export function getAuthServerConfigErrorMessage() {
  const missing = getMissingAuthServerEnvKeys();
  if (missing.length === 0) return null;

  return `Auth server configuration is missing: ${missing.join(', ')}. Add these values to .env.local or your deployment environment variables.`;
}

function getFirebaseProjectMismatchErrorMessage() {
  const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const adminProjectId = process.env.FIREBASE_PROJECT_ID?.trim();

  if (!publicProjectId || !adminProjectId || publicProjectId === adminProjectId) {
    return null;
  }

  return `Firebase project mismatch detected: NEXT_PUBLIC_FIREBASE_PROJECT_ID (${publicProjectId}) does not match FIREBASE_PROJECT_ID (${adminProjectId}). Your web app and admin SDK must point to the same Firebase project.`;
}

function toAuthSyncErrorMessage(error: unknown) {
  const projectMismatchError = getFirebaseProjectMismatchErrorMessage();
  if (projectMismatchError) {
    return projectMismatchError;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return 'The database connection for account sync is unavailable. Check DATABASE_URL and the production database status.';
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return 'This account already exists but could not be linked cleanly. Try signing in instead, or reset the previous account record.';
    }

    if (error.code === 'P2021' || error.code === 'P2022') {
      return 'The production database schema is missing the latest auth columns. Apply the latest Prisma migrations, including the Firebase auth bridge migration.';
    }
  }

  if (error instanceof Error) {
    if (/firebaseUid/i.test(error.message) && /column|does not exist|invalid/i.test(error.message)) {
      return 'The production database schema is missing the latest Firebase auth bridge changes. Apply the latest Prisma migrations and retry registration.';
    }

    if (/permission denied|authentication failed|connect|connection|database/i.test(error.message)) {
      return 'The account service could not reach the database. Check DATABASE_URL and database availability.';
    }

    return error.message;
  }

  return 'Unable to complete account registration right now.';
}

function toAuthPayload(user: DbAuthUser, decodedToken?: DecodedIdToken): AuthTokenPayload {
  if (!user.firebaseUid) {
    throw new Error('User is missing a Firebase UID.');
  }

  return {
    sub: user.id,
    role: user.role,
    signupIntent: user.signupIntent,
    creatorAccessStatus: user.creatorAccessStatus,
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
  const requestedSignupIntent = options.signupIntent ? normalizeSignupIntent(options.signupIntent) : null;

  if (!firebaseUid || !email) {
    return null;
  }

  let user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: {
      id: true,
      firebaseUid: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      signupIntent: true,
      creatorAccessStatus: true
    }
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firebaseUid: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        signupIntent: true,
        creatorAccessStatus: true
      }
    });
  }

  if (!user) {
    if (!options.allowCreate) {
      return null;
    }

    if (!phone) {
      throw new Error('A phone number is required to complete account setup.');
    }

    const signupIntent = requestedSignupIntent ?? 'VIEWER';
    const creatorAccessStatus: CreatorAccessStatusValue = signupIntent === 'CREATOR' ? 'REQUESTED' : 'NONE';

    user = await prisma.user.create({
      data: {
        firebaseUid,
        name,
        email,
        phone,
        passwordHash: FIREBASE_PASSWORD_SENTINEL,
        signupIntent,
        creatorAccessStatus,
        wallet: { create: {} }
      },
      select: {
        id: true,
        firebaseUid: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        signupIntent: true,
        creatorAccessStatus: true
      }
    });
  } else {
    const updateData: {
      firebaseUid?: string;
      name?: string | null;
      email?: string;
      phone?: string;
      signupIntent?: SignupIntentValue;
      creatorAccessStatus?: CreatorAccessStatusValue;
    } = {};

    if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
      // Allow safe relinking when the verified Firebase token email matches the existing app account.
      if (user.email !== email) {
        throw new Error('This account is already linked to a different Firebase user.');
      }
      updateData.firebaseUid = firebaseUid;
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
    if (requestedSignupIntent && user.signupIntent !== requestedSignupIntent) {
      updateData.signupIntent = requestedSignupIntent;
    }
    if (requestedSignupIntent === 'CREATOR' && user.role === 'USER' && user.creatorAccessStatus === 'NONE') {
      updateData.creatorAccessStatus = 'REQUESTED';
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
          role: true,
          signupIntent: true,
          creatorAccessStatus: true
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
  const configError = getAuthServerConfigErrorMessage();
  if (configError) {
    throw new Error(configError);
  }

  const projectMismatchError = getFirebaseProjectMismatchErrorMessage();
  if (projectMismatchError) {
    throw new Error(projectMismatchError);
  }

  return getFirebaseAdminAuth().verifyIdToken(token, true);
}

export async function syncAuthSession(idToken: string, options: SyncOptions = {}) {
  let decodedToken: DecodedIdToken;

  try {
    decodedToken = await verifyFirebaseIdToken(idToken);
  } catch (error) {
    throw new Error(toAuthSyncErrorMessage(error));
  }

  let user: AuthTokenPayload | null;
  try {
    user = await syncUserRecord(decodedToken, { allowCreate: true, ...options });
  } catch (error) {
    throw new Error(toAuthSyncErrorMessage(error));
  }

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
