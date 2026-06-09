import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getCreatorLinkAuthFromRequest } from '@/lib/creator-access-links';
import { normalizeSubtitleTracks, isSupportedLanguageCode, type SubmittedSubtitleTrack } from '@/lib/content-metadata';
import { isOwnedUploadKey, buildOwnedUploadKey, getUploadFolderIdFromKey, sanitizeUploadFilename } from '@/lib/upload-security';
import { getObjectBuffer, putObject } from '@/lib/bunny-storage';
import { convertSubtitleToVtt, ensureVttFilename } from '@/lib/subtitle-convert';
import { assertUploadedObjectExists } from '@/lib/uploaded-assets';
import { v4 as uuid } from 'uuid';

// Minimal short upload: accepts array of up to 5 items with title and file keys
// Example item: { title?: string, masterUploadKey?: string, trailerKey?: string, posterKey?: string, subtitleTracks?: [{ fileKey }] }

export async function POST(req: NextRequest) {
  try {
    const [sessionAuth, creatorLinkAuth] = await Promise.all([
      getAuthFromRequest(req),
      getCreatorLinkAuthFromRequest(req, 'short-upload')
    ]);
    const auth =
      sessionAuth && (sessionAuth.role === 'CREATOR' || sessionAuth.role === 'ADMIN')
        ? sessionAuth
        : creatorLinkAuth ?? sessionAuth;
    if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const items = Array.isArray(body?.items) ? body.items.slice(0, 5) : [];
    if (!items.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const createdIds: string[] = [];
    const pipelineVideoIds: string[] = [];

    for (const item of items) {
    const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim().slice(0, 240) : 'Untitled';
    const masterUploadKey = typeof item.masterUploadKey === 'string' ? item.masterUploadKey.trim() : null;
    const trailerKey = typeof item.trailerKey === 'string' ? item.trailerKey.trim() : null;
    const posterKey = typeof item.posterKey === 'string' ? item.posterKey.trim() : null;
    const rawSubtitleTracks = Array.isArray(item.subtitleTracks) ? item.subtitleTracks : [];

    // Basic ownership checks
    if (masterUploadKey && !isOwnedUploadKey(masterUploadKey, auth.sub, 'master')) {
      return NextResponse.json({ error: 'Invalid master upload' }, { status: 400 });
    }
    if (trailerKey && !isOwnedUploadKey(trailerKey, auth.sub, 'trailer')) {
      return NextResponse.json({ error: 'Invalid trailer upload' }, { status: 400 });
    }
    if (posterKey && !isOwnedUploadKey(posterKey, auth.sub, 'poster')) {
      return NextResponse.json({ error: 'Invalid poster upload' }, { status: 400 });
    }

    await assertUploadedObjectExists(masterUploadKey, 'Final playable MP4 master');
    await assertUploadedObjectExists(trailerKey, 'Trailer MP4');
    await assertUploadedObjectExists(posterKey, 'Poster artwork');

    const rawNormalizedSubtitleTracks = rawSubtitleTracks.map((track) => ({
      fileKey: typeof track?.fileKey === 'string' ? track.fileKey.trim() : '',
      label: typeof track?.label === 'string' && track.label.trim() ? track.label.trim() : 'Subtitles',
      languageCode: typeof track?.languageCode === 'string' && isSupportedLanguageCode(track.languageCode.trim().toLowerCase())
        ? track.languageCode.trim().toLowerCase()
        : 'en',
      kind: typeof track?.kind === 'string' ? track.kind : 'subtitles',
      isDefault: Boolean(track?.isDefault)
    })) as SubmittedSubtitleTrack[];

    const validatedSubtitleTracks = normalizeSubtitleTracks(rawNormalizedSubtitleTracks);
    const normalizedSubtitleTracks: SubmittedSubtitleTrack[] = [];

    for (const track of validatedSubtitleTracks) {
      if (!isOwnedUploadKey(track.fileKey, auth.sub, 'subtitle')) {
        return NextResponse.json({ error: 'Invalid subtitle upload' }, { status: 400 });
      }

      await assertUploadedObjectExists(track.fileKey, 'Subtitle file');

      const lowerKey = track.fileKey.toLowerCase();
      if (lowerKey.endsWith('.srt') || lowerKey.endsWith('.vtt')) {
        try {
          const { buffer } = await getObjectBuffer(track.fileKey);
          const vttBuffer = convertSubtitleToVtt(buffer);
          const originalName = track.fileKey.split('/').pop() || 'subtitle.srt';
          const newFilename = ensureVttFilename(sanitizeUploadFilename(originalName));
          const newKey = buildOwnedUploadKey({
            userId: auth.sub,
            purpose: 'subtitle',
            filename: newFilename,
            assetId: uuid(),
            folderId: getUploadFolderIdFromKey(track.fileKey)
          });
          await putObject(newKey, vttBuffer, 'text/vtt');
          normalizedSubtitleTracks.push({ ...track, fileKey: newKey });
        } catch (error) {
          console.error('Short upload subtitle conversion failed', track.fileKey, error);
          normalizedSubtitleTracks.push(track);
        }
      } else {
        normalizedSubtitleTracks.push(track);
      }
    }

    const tags = Array.isArray(item.tags)
      ? (item.tags as string[]).map((t) => t.trim()).filter(Boolean)
      : [];

    const hasExplicitDefaultSubtitle = normalizedSubtitleTracks.some((track) => track.isDefault);
    const technicalMetadataCreate = masterUploadKey || trailerKey ? {
      masterKey: masterUploadKey ?? null,
      masterFileName: null,
      processingStatus: masterUploadKey ? 'MASTER_UPLOADED' : 'NO_MASTER',
      trailerKey: trailerKey ?? null
    } : undefined;

    const created = await prisma.video.create({
      data: {
        creator: { connect: { id: auth.sub } },
        title,
        description: '',
        videoType: 'FEATURE',
        priceTier: 'STANDARD',
        rightsTier: 'SHARED',
        status: 'DRAFT',
        durationSec: 1,
        teaserSec: 0,
        posterKey: posterKey,
        tags,
        subtitleTracks: normalizedSubtitleTracks.length
          ? {
              create: normalizedSubtitleTracks.map((track, index) => ({
                label: track.label,
                languageCode: track.languageCode,
                kind: track.kind,
                fileKey: track.fileKey,
                isDefault: hasExplicitDefaultSubtitle ? track.isDefault : index === 0
              }))
            }
          : undefined,
        technicalMetadata: technicalMetadataCreate
          ? { create: technicalMetadataCreate }
          : undefined
      } as Prisma.VideoCreateInput
    });

    createdIds.push(created.id);
    if (masterUploadKey) {
      pipelineVideoIds.push(created.id);
    }
  }

  const pipelineWarnings = Array.from(new Set(pipelineVideoIds)).map((videoId) => `${videoId}: Awaiting Bunny Stream processing from the admin upload desk.`);

  return NextResponse.json({
    ok: true,
    createdIds,
    pipelineStarted: false,
    pipelineWarnings
  });
  } catch (error) {
    console.error('Short upload endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to complete upload.' },
      { status: 500 }
    );
  }
}
