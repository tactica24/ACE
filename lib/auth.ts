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
  firebaseUid: string;
  emailVerified?: boolean;
};

export const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  'Verify your email address before using this feature. You can resend the verification link from your account dashboard.';

type SyncOptions = {
  allowCreate?: boolean;
  name?: string | null;
  signupIntent?: SignupIntentValue | null;
};

type DbAuthUser = {
  id: string;
  firebaseUid: string | null;
  name: string | null;
  email: string;
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

    const signupIntent = requestedSignupIntent ?? 'VIEWER';
    const creatorAccessStatus: CreatorAccessStatusValue = signupIntent === 'CREATOR' ? 'REQUESTED' : 'NONE';

    user = await prisma.user.create({
      data: {
        firebaseUid,
        name,
        email,
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

  const creatorVerificationUpdate: { emailVerified?: boolean } = {};
  if (decodedToken.email_verified) {
    creatorVerificationUpdate.emailVerified = true;
  }
  if (Object.keys(creatorVerificationUpdate).length > 0) {
    await prisma.creatorProfile.updateMany({
      where: { userId: user.id },
      data: creatorVerificationUpdate
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
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: new Date(Date.now() + SESSION_DURATION_MS)
  });
  return response;
}

function buildAuthCookieHeader(
  value: string,
  {
    domain,
    maxAge,
    expires
  }: {
    domain?: string;
    maxAge: number;
    expires: Date;
  }
) {
  const segments = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    `Expires=${expires.toUTCString()}`,
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (process.env.NODE_ENV === 'production') {
    segments.push('Secure');
  }

  if (domain) {
    segments.push(`Domain=${domain}`);
  }

  return segments.join('; ');
}

function getSessionCookieDomains(req?: NextRequest | Request) {
  const hostHeader = req?.headers.get('x-forwarded-host') ?? req?.headers.get('host');
  const hostname = hostHeader?.split(',')[0]?.trim().split(':')[0]?.toLowerCase();

  if (!hostname || hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return [] as string[];
  }

  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 2) {
    return [] as string[];
  }

  const baseDomain = parts.slice(-2).join('.');
  const domains = new Set<string>();

  domains.add(baseDomain);
  domains.add(`.${baseDomain}`);

  if (hostname !== baseDomain) {
    domains.add(hostname);
  }

  return [...domains];
}

export function clearAuthSession(response: NextResponse, req?: NextRequest | Request) {
  const expires = new Date(0);
  response.headers.append(
    'Set-Cookie',
    buildAuthCookieHeader('', {
      maxAge: 0,
      expires
    })
  );

  for (const domain of getSessionCookieDomains(req)) {
    response.headers.append(
      'Set-Cookie',
      buildAuthCookieHeader('', {
        maxAge: 0,
        expires,
        domain
      })
    );
  }

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

export function hasVerifiedEmail(auth: Pick<AuthTokenPayload, 'emailVerified'> | null | undefined) {
  return Boolean(auth?.emailVerified);
}


export function createStreamToken(payload: {
  userId?: string;
  videoId: string;
  guest?: boolean;
  deviceSessionId?: string;
  role?: RoleValue;
  fullAccess?: boolean;
  previewAsset?: boolean;
  streamKey?: string;
  teaserSec?: number;
  durationSec?: number;
  streamBytes?: number;
  streamContentType?: string;
}) {
  return jwt.sign(payload, env.ACE_STREAM_SIGNING_SECRET, { expiresIn: '15m' });
}

export function createGuestPreviewStreamToken(payload: {
  videoId: string;
  fullAccess?: boolean;
  previewAsset?: boolean;
  streamKey?: string;
  teaserSec?: number;
  durationSec?: number;
  streamBytes?: number;
  streamContentType?: string;
}) {
  const ttlSeconds = 60 * 10;
  const nowSec = Math.floor(Date.now() / 1000);
  const bucketStart = Math.floor(nowSec / ttlSeconds) * ttlSeconds;
  const exp = bucketStart + ttlSeconds;

  return jwt.sign(
    {
      ...payload,
      guest: true,
      userId: 'guest',
      fullAccess: payload.fullAccess ?? false,
      exp
    },
    env.ACE_STREAM_SIGNING_SECRET,
    { noTimestamp: true }
  );
}

export function verifyStreamToken(token: string) {
  return jwt.verify(token, env.ACE_STREAM_SIGNING_SECRET) as {
    userId?: string;
    videoId: string;
    guest?: boolean;
    deviceSessionId?: string;
    role?: RoleValue;
    fullAccess?: boolean;
    previewAsset?: boolean;
    streamKey?: string;
    teaserSec?: number;
    durationSec?: number;
    streamBytes?: number;
    streamContentType?: string;
  };
}
