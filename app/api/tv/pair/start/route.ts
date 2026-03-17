import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { generatePairingCode, getPairingExpiry } from '@/lib/pairing';

async function createUniqueCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generatePairingCode();
    const exists = await prisma.tvPairingSession.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error('Unable to generate pairing code');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const deviceName = typeof body.deviceName === 'string' ? body.deviceName.slice(0, 80) : null;
  const platform = typeof body.platform === 'string' ? body.platform.slice(0, 40) : 'tv';
  const code = await createUniqueCode();

  const session = await prisma.tvPairingSession.create({
    data: {
      code,
      deviceName: deviceName || 'Living room screen',
      platform,
      expiresAt: getPairingExpiry()
    }
  });

  const baseUrl = env.ACE_APP_BASE_URL.replace(/\/$/, '');
  return NextResponse.json({
    sessionId: session.id,
    code: session.code,
    expiresAt: session.expiresAt,
    claimUrl: `${baseUrl}/tv/pair?code=${session.code}`
  });
}
