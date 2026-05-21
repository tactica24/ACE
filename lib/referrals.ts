import { NextRequest } from 'next/server';
import { prisma } from './db';

export function readReferralCode(req: NextRequest, bodyCode?: string) {
  if (bodyCode && typeof bodyCode === 'string') return bodyCode.trim() || null;
  const cookie = req.cookies.get('ace_ref')?.value;
  const header = req.headers.get('x-ace-referral') ?? req.headers.get('x-referral-code');
  return cookie ?? header ?? null;
}

export async function resolveReferral(code: string | null, videoId?: string) {
  if (!code) return null;
  const referral = await prisma.referralLink.findUnique({ where: { code } });
  if (!referral) return null;
  if (referral.expiresAt && referral.expiresAt < new Date()) return null;
  if (referral.targetVideoId && videoId && referral.targetVideoId !== videoId) return null;
  if (referral.targetVideoId && !videoId) return null;
  return referral;
}

