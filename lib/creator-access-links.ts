import 'server-only';

import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { type NextRequest } from 'next/server';
import { type AuthTokenPayload } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

export type CreatorAccessLinkScope = 'upload' | 'report';

type CreatorAccessLinkPayload = JwtPayload & {
  typ: 'creator_access_link';
  sub: string;
  scope: CreatorAccessLinkScope;
};

const CREATOR_LINK_AUDIENCE = 'ace-creator-access-link';
const CREATOR_LINK_ISSUER = 'ace-studio';

function normalizeScope(scope: string | null | undefined): CreatorAccessLinkScope | null {
  if (scope === 'upload' || scope === 'report') {
    return scope;
  }

  return null;
}

export function createCreatorAccessLinkToken({
  creatorUserId,
  scope,
  expiresIn = '90d'
}: {
  creatorUserId: string;
  scope: CreatorAccessLinkScope;
  expiresIn?: SignOptions['expiresIn'];
}) {
  return jwt.sign(
    {
      typ: 'creator_access_link',
      sub: creatorUserId,
      scope
    },
    env.ACE_STREAM_SIGNING_SECRET,
    {
      expiresIn,
      audience: CREATOR_LINK_AUDIENCE,
      issuer: CREATOR_LINK_ISSUER
    }
  );
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

export function getCreatorAccessTokenFromRequest(req: NextRequest | Request) {
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

  return prisma.user.findFirst({
    where: {
      id: verified.creatorUserId,
      OR: [
        { role: 'CREATOR' },
        { signupIntent: 'CREATOR' },
        { creator: { isNot: null } }
      ]
    },
    select: {
      id: true,
      role: true,
      signupIntent: true,
      creatorAccessStatus: true,
      name: true,
      email: true,
      phone: true,
      firebaseUid: true,
      creator: {
        select: {
          displayName: true,
          creatorNumber: true
        }
      }
    }
  });
}

export async function getCreatorLinkAuthFromRequest(req: NextRequest | Request, expectedScope: CreatorAccessLinkScope) {
  const token = getCreatorAccessTokenFromRequest(req);
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
    phone: creator.phone,
    firebaseUid: creator.firebaseUid ?? `creator-link:${creator.id}`,
    emailVerified: true,
    phoneVerified: true
  } satisfies AuthTokenPayload;
}
