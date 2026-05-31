import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getObjectStream } from '@/lib/bunny-storage';
import { prisma } from '@/lib/db';
import { Readable } from 'node:stream';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const videoId = searchParams.get('videoId')?.trim();

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        title: true,
        technicalMetadata: {
          select: {
            masterKey: true,
            masterFileName: true
          }
        }
      }
    });

    if (!video || !video.technicalMetadata?.masterKey) {
      return NextResponse.json({ error: 'Master file not found for this video' }, { status: 404 });
    }

    const masterKey = video.technicalMetadata.masterKey;
    const masterFileName = video.technicalMetadata.masterFileName || `${video.title}-master.mp4`;

    const result = await getObjectStream(masterKey);
    const body = result.Body as Readable | undefined;
    if (!body) {
      return NextResponse.json({ error: 'Master file could not be loaded' }, { status: 502 });
    }

    return new Response(Readable.toWeb(body) as never, {
      status: 200,
      headers: {
        'Content-Type': result.ContentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${masterFileName.replace(/"/g, '\\"')}"`,
        ...(typeof result.ContentLength === 'number' ? { 'Content-Length': String(result.ContentLength) } : {})
      }
    });
  } catch (error) {
    console.error('Error generating master download:', error);
    return NextResponse.json(
      { error: 'Failed to generate download link' },
      { status: 500 }
    );
  }
}
