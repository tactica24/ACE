import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyP2PToken } from '@/lib/auth';
import { getAcePath } from '@/lib/cache';
import { unwrapKey, decryptFile } from '@/lib/crypto';
import { env } from '@/lib/env';
import fs from 'fs/promises';
import { streamFile } from '@/lib/stream';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return new Response('Missing token', { status: 401 });

  let payload: { transferId: string; userId: string };
  try {
    payload = verifyP2PToken(token);
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  if (payload.transferId !== params.id) return new Response('Token mismatch', { status: 403 });

  const transfer = await prisma.p2pTransfer.findUnique({ where: { id: params.id } });
  if (!transfer || transfer.status !== 'UNLOCKED') return new Response('Not unlocked', { status: 403 });

  const acePath = getAcePath(transfer.aceFileKey);
  const decPath = `${acePath}.mp4`;
  try {
    await fs.access(decPath);
  } catch {
    const key = unwrapKey(transfer.wrappedKey, env.ACE_STREAM_SIGNING_SECRET);
    await decryptFile(acePath, decPath, key);
  }

  const result = await streamFile(decPath, req.headers.get('range'));
  return new Response(Readable.toWeb(result.stream) as any, {
    status: result.status,
    headers: {
      ...result.headers,
      'Cache-Control': 'private, max-age=0, no-store'
    }
  });
}




