import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getAcePath } from '@/lib/cache';
import fs from 'fs';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const transfer = await prisma.p2PTransfer.findUnique({ where: { id: params.id } });
  if (!transfer) return new Response('Not found', { status: 404 });
  if (transfer.senderId !== auth.sub) return new Response('Forbidden', { status: 403 });

  const acePath = getAcePath(transfer.aceFileKey);
  const stream = fs.createReadStream(acePath);

  return new Response(Readable.toWeb(stream) as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${transfer.aceFileKey}"`
    }
  });
}
