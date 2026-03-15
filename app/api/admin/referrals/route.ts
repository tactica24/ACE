import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { env } from '@/lib/env';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateCode() {
  return `ACE${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function generateUniqueCode() {
  for (let i = 0; i < 5; i += 1) {
    const code = generateCode();
    const existing = await prisma.referralLink.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return generateCode();
}

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const links = await prisma.referralLink.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      promoter: { select: { id: true, email: true, phone: true } },
      targetVideo: { select: { id: true, title: true } },
      events: { select: { unlockId: true, paymentId: true, commissionNaira: true, createdAt: true } }
    }
  });

  const baseUrl = env.ACE_APP_BASE_URL.replace(/\/$/, '');
  const data = links.map((link) => {
    const unlocks = link.events.filter((event) => event.unlockId).length;
    const topups = link.events.filter((event) => event.paymentId).length;
    const commissionNaira = link.events.reduce((sum, event) => sum + event.commissionNaira, 0);
    const lastEventAt = link.events.reduce<Date | null>((acc, event) => {
      if (!acc || event.createdAt > acc) return event.createdAt;
      return acc;
    }, null);
    return {
      id: link.id,
      code: link.code,
      promoter: link.promoter,
      commissionPercent: link.commissionPercent,
      targetVideo: link.targetVideo,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      metrics: { unlocks, topups, commissionNaira, lastEventAt },
      linkUrl: `${baseUrl}/r/${link.code}`
    };
  });

  return NextResponse.json({ links: data });
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const promoterId = body.promoterId as string | undefined;
  const commissionPercent = Number(body.commissionPercent ?? 0);
  const targetVideoId = body.targetVideoId as string | undefined;
  const expiresAtRaw = body.expiresAt as string | undefined;

  if (!promoterId) return NextResponse.json({ error: 'Missing promoterId' }, { status: 400 });
  if (!Number.isFinite(commissionPercent) || commissionPercent <= 0 || commissionPercent > 100) {
    return NextResponse.json({ error: 'Invalid commission percent' }, { status: 400 });
  }

  const promoter = await prisma.user.findUnique({ where: { id: promoterId } });
  if (!promoter) {
    return NextResponse.json({ error: 'Promoter not found' }, { status: 404 });
  }

  const code = await generateUniqueCode();
  let expiresAt: Date | null = null;
  if (expiresAtRaw) {
    const parsed = new Date(expiresAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 });
    }
    expiresAt = parsed;
  }

  const referral = await prisma.referralLink.create({
    data: {
      code,
      promoterId,
      commissionPercent,
      targetVideoId: targetVideoId || null,
      expiresAt
    },
    include: { promoter: { select: { id: true, email: true, phone: true } }, targetVideo: { select: { id: true, title: true } } }
  });

  return NextResponse.json({
    id: referral.id,
    code: referral.code,
    promoter: referral.promoter,
    commissionPercent: referral.commissionPercent,
    targetVideo: referral.targetVideo,
    expiresAt: referral.expiresAt
  });
}
