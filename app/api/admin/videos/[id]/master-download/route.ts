import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { createPresignedGetUrl, getMasterBucket } from '@/lib/r2';
import { prisma } from '@/lib/db';

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

    const downloadUrl = await createPresignedGetUrl(masterKey, {
      contentDisposition: `attachment; filename="${masterFileName.replace(/"/g, '\\"')}"`
    }, getMasterBucket());

    return NextResponse.json({
      success: true,
      downloadUrl,
      fileName: masterFileName,
      masterKey
    });
  } catch (error) {
    console.error('Error generating master download:', error);
    return NextResponse.json(
      { error: 'Failed to generate download link' },
      { status: 500 }
    );
  }
}
