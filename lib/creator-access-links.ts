import 'server-only';

import crypto from 'crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { type AuthTokenPayload } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

export type CreatorAccessLinkScope = 'upload' | 'report' | 'short-upload';

type CreatorAccessLinkPayload = JwtPayload & {
  typ: 'creator_access_link';
  sub: string;
  scope: CreatorAccessLinkScope;
};

const CREATOR_LINK_AUDIENCE = 'ace-creator-access-link';
const CREATOR_LINK_ISSUER = 'ace-studio';
const CREATOR_LINK_COOKIE_NAME = 'ace_creator_link';
const ACE_PUBLIC_BASE_URL = 'https://www.acestudio.ng';

function normalizeScope(scope: string | null | undefined): CreatorAccessLinkScope | null {
  if (scope === 'upload' || scope === 'report' || scope === 'short-upload') {
    return scope;
  }

  return null;
}

export function createCreatorAccessLinkToken({
  creatorUserId,
  scope,
  expiresIn
}: {
  creatorUserId: string;
  scope: CreatorAccessLinkScope;
  expiresIn?: SignOptions['expiresIn'] | null;
}) {
  const options: SignOptions = {
    audience: CREATOR_LINK_AUDIENCE,
    issuer: CREATOR_LINK_ISSUER,
    noTimestamp: true
  };
  if (expiresIn) {
    options.expiresIn = expiresIn;
  }

  return jwt.sign(
    {
      typ: 'creator_access_link',
      sub: creatorUserId,
      scope
    },
    env.ACE_STREAM_SIGNING_SECRET,
    options
  );
}

export function createCreatorAccessShortCode(creatorNumber: string, scope: CreatorAccessLinkScope) {
  return crypto
    .createHmac('sha256', env.ACE_STREAM_SIGNING_SECRET)
    .update(`${creatorNumber}:${scope}`)
    .digest('base64url')
    .slice(0, 12);
}

export function isValidCreatorAccessShortCode(creatorNumber: string, scope: CreatorAccessLinkScope, code: string) {
  const expected = createCreatorAccessShortCode(creatorNumber, scope);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(code);
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function createCreatorAccessLinkUrl({
  creatorNumber,
  scope
}: {
  creatorNumber: string;
  scope: CreatorAccessLinkScope;
}) {
  const configuredBaseUrl = env.ACE_APP_BASE_URL.replace(/\/+$/, '');
  const baseUrl = configuredBaseUrl.includes('.vercel.app') ? ACE_PUBLIC_BASE_URL : configuredBaseUrl;
  const code = createCreatorAccessShortCode(creatorNumber, scope);
  return `${baseUrl}/creator/${encodeURIComponent(creatorNumber)}/${scope}/${code}`;
}

export function verifyCreatorAccessLinkToken(token: string, expectedScope?: CreatorAccessLinkScope) {
  try {
    const decoded = jwt.verify(token, env.ACE_STREAM_SIGNING_SECRET, {
      audience: CREATOR_LINK_AUDIENCE,
      issuer: CREATOR_LINK_ISSUER
    }) as CreatorAccessLinkPayload;
    const scope = normalizeScope(decoded.scope);
    if (!scope || decoded.typ !== 'creator_access_link' || typeof decoded.sub !== 'string' || !decoded.sub.trim()) {
      return null;
    }

    if (expectedScope && scope !== expectedScope) {
      return null;
    }

    return {
      creatorUserId: decoded.sub,
      scope
    };
  } catch {
    return null;
  }
}

export async function getCreatorAccessTokenFromRequest(req: NextRequest | Request) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CREATOR_LINK_COOKIE_NAME)?.value?.trim();
  if (cookieToken) {
    return cookieToken;
  }

  const requestUrl = new URL(req.url);
  const queryToken = requestUrl.searchParams.get('token')?.trim();
  if (queryToken) {
    return queryToken;
  }

  const headerToken =
    req.headers.get('x-ace-creator-link') ??
    req.headers.get('X-Ace-Creator-Link') ??
    req.headers.get('x-creator-access-token');
  return headerToken?.trim() || null;
}

export async function resolveCreatorFromAccessToken(token: string, expectedScope: CreatorAccessLinkScope) {
  const verified = verifyCreatorAccessLinkToken(token, expectedScope);
  if (!verified) {
    return null;
  }

  const creator = await prisma.user.findUnique({
    where: {
      id: verified.creatorUserId
    },
    select: {
      id: true,
      role: true,
      signupIntent: true,
      creatorAccessStatus: true,
      name: true,
      email: true,
      firebaseUid: true,
      creator: {
        select: {
          displayName: true,
          creatorNumber: true
        }
      }
    }
  });

  if (!creator?.creator?.creatorNumber) {
    return null;
  }

  return creator;
}

export async function getCreatorLinkAuthFromRequest(req: NextRequest | Request, expectedScope: CreatorAccessLinkScope) {
  const token = await getCreatorAccessTokenFromRequest(req);
  if (!token) {
    return null;
  }

  const creator = await resolveCreatorFromAccessToken(token, expectedScope);
  if (!creator) {
    return null;
  }

  return {
    sub: creator.id,
    role: 'CREATOR',
    signupIntent: 'CREATOR',
    creatorAccessStatus: creator.creatorAccessStatus,
    name: creator.name ?? creator.creator?.displayName ?? null,
    email: creator.email,
    firebaseUid: creator.firebaseUid ?? `creator-link:${creator.id}`,
    emailVerified: true
  } satisfies AuthTokenPayload;
}
