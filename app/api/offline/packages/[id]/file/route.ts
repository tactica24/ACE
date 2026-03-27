import fs from 'fs';
import { Readable } from 'stream';
import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAcePath } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Mobile app authentication required.', { status: 401 });
  }

  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const offlinePackage = await prisma.offlinePackage.findUnique({ where: { id: params.id } });
  if (!offlinePackage || offlinePackage.ownerId !== auth.sub || offlinePackage.status !== 'READY') {
    return new Response('Not found', { status: 404 });
  }

  const acePath = getAcePath(offlinePackage.aceFileKey);
  const stream = fs.createReadStream(acePath);

  return new Response(Readable.toWeb(stream) as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${offlinePackage.aceFileKey}"`,
      'Cache-Control': 'private, max-age=0, no-store'
    }
  });
}
