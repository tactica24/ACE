import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertUploadedObjectExists } from '@/lib/uploaded-assets';

type SubmittedSubtitleTrack = {
  label?: string;
  languageCode?: string;
  kind?: string;
  fileKey?: string;
  isDefault?: boolean;
};

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  const posterKey = typeof body.posterKey === 'string' ? body.posterKey.trim() || null : null;
  const subtitleTracks = Array.isArray(body.subtitleTracks) ? (body.subtitleTracks as SubmittedSubtitleTrack[]) : [];

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required.' }, { status: 400 });
  }

  await assertUploadedObjectExists(posterKey, 'Poster artwork');
  for (const track of subtitleTracks) {
    await assertUploadedObjectExists(track.fileKey ?? null, 'Subtitle file');
  }

  const normalizedTracks = subtitleTracks
    .map((track, index) => ({
      label: typeof track.label === 'string' && track.label.trim() ? track.label.trim() : `Subtitle ${index + 1}`,
      languageCode:
        typeof track.languageCode === 'string' && track.languageCode.trim()
          ? track.languageCode.trim().toLowerCase()
          : 'und',
      kind: typeof track.kind === 'string' && track.kind.trim() ? track.kind.trim() : 'subtitles',
      fileKey: typeof track.fileKey === 'string' ? track.fileKey.trim() : '',
      isDefault: Boolean(track.isDefault)
    }))
    .filter((track) => track.fileKey);

  const hasExplicitDefault = normalizedTracks.some((track) => track.isDefault);

  const updated = await prisma.video.update({
    where: { id: videoId },
    data: {
      ...(posterKey ? { posterKey } : {}),
      subtitleTracks: {
        deleteMany: {},
        ...(normalizedTracks.length
          ? {
              create: normalizedTracks.map((track, index) => ({
                label: track.label,
                languageCode: track.languageCode,
                kind: track.kind,
                fileKey: track.fileKey,
                isDefault: hasExplicitDefault ? track.isDefault : index === 0
              }))
            }
          : {})
      }
    },
    select: {
      id: true,
      posterKey: true,
      subtitleTracks: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
      }
    }
  });

  return NextResponse.json({
    ok: true,
    video: updated
  });
}
