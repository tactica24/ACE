import { NextRequest, NextResponse } from 'next/server';
import { createStreamToken, getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getProcessingVideo } from '../helpers';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const movieId = typeof body.movieId === 'string' ? body.movieId.trim() : '';
  if (!movieId) {
    return NextResponse.json({ error: 'movieId required' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: movieId },
    select: {
      id: true,
      title: true,
      hlsUrl: true,
      hlsVersion: true,
      qualities: true,
      status: true,
      technicalMetadata: {
        select: {
          playbackUrl: true,
          hlsPlaybackUrl: true
        }
      }
    }
  });

  const hlsUrl = video?.technicalMetadata?.hlsPlaybackUrl?.trim() || video?.hlsUrl?.trim() || '';
  if (!video || !hlsUrl) {
    return NextResponse.json({ error: 'Movie not found or no HLS URL' }, { status: 404 });
  }

  const results = {
    movieId,
    title: video.title,
    hlsUrl,
    hlsVersion: video.hlsVersion,
    qualities: video.qualities,
    checks: {} as Record<string, any>,
    passed: true,
    errors: [] as string[]
  };
  const token = createStreamToken({
    userId: auth.sub,
    videoId: movieId,
    role: auth.role,
    fullAccess: true
  });
  const withToken = (url: string) => {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('token', token);
    return parsedUrl.toString();
  };
  const masterUrl = withToken(hlsUrl);

  // Check master.m3u8
  try {
    const masterRes = await fetch(masterUrl, { method: 'HEAD' });
    results.checks.masterPlaylist = {
      status: masterRes.status,
      contentType: masterRes.headers.get('content-type'),
      cacheControl: masterRes.headers.get('cache-control')
    };
    if (masterRes.status !== 200) {
      results.errors.push(`Master playlist HTTP ${masterRes.status}`);
      results.passed = false;
    }
    if (!masterRes.headers.get('content-type')?.includes('mpegurl')) {
      results.errors.push('Master playlist has incorrect Content-Type');
      results.passed = false;
    }
  } catch (e) {
    results.checks.masterPlaylist = { error: 'Failed to fetch' };
    results.errors.push('Master playlist unreachable');
    results.passed = false;
  }

  // Parse master.m3u8 for quality playlists
  let masterContent = '';
  try {
    const masterRes = await fetch(masterUrl);
    masterContent = await masterRes.text();
    const lines = masterContent.split('\n');
    const qualityPlaylists = lines.filter(line => line.endsWith('.m3u8') && !line.startsWith('#'));
    results.checks.qualityPlaylists = qualityPlaylists;

    for (const playlist of qualityPlaylists) {
      const playlistUrl = withToken(new URL(playlist, hlsUrl).toString());
      try {
        const playlistRes = await fetch(playlistUrl, { method: 'HEAD' });
        results.checks[`playlist_${playlist}`] = {
          status: playlistRes.status,
          contentType: playlistRes.headers.get('content-type'),
          cacheControl: playlistRes.headers.get('cache-control')
        };
        if (playlistRes.status !== 200) {
          results.errors.push(`Quality playlist ${playlist} HTTP ${playlistRes.status}`);
          results.passed = false;
        }
      } catch (e) {
        results.checks[`playlist_${playlist}`] = { error: 'Failed to fetch' };
        results.errors.push(`Quality playlist ${playlist} unreachable`);
        results.passed = false;
      }
    }
  } catch (e) {
    results.errors.push('Failed to parse master playlist');
    results.passed = false;
  }

  // Check sample segments
  if (masterContent) {
    const qualityPlaylists = masterContent.split('\n').map((line) => line.trim()).filter((line) => line.endsWith('.m3u8') && !line.startsWith('#'));
    const firstPlaylist = qualityPlaylists[0];
    if (firstPlaylist) {
      try {
        const playlistUrl = withToken(new URL(firstPlaylist, hlsUrl).toString());
        const playlistRes = await fetch(playlistUrl);
        const playlistContent = await playlistRes.text();
        const sampleSegment = playlistContent
          .split('\n')
          .map((line) => line.trim())
          .find((line) => line && !line.startsWith('#') && !line.toLowerCase().endsWith('.m3u8'));

        if (sampleSegment) {
          const segmentUrl = withToken(new URL(sampleSegment, new URL(firstPlaylist, hlsUrl)).toString());
          const segmentRes = await fetch(segmentUrl, { method: 'HEAD' });
          results.checks.sampleSegment = {
            status: segmentRes.status,
            contentType: segmentRes.headers.get('content-type'),
            cacheControl: segmentRes.headers.get('cache-control')
          };
          if (segmentRes.status !== 200 && segmentRes.status !== 206) {
            results.errors.push(`Sample segment HTTP ${segmentRes.status}`);
            results.passed = false;
          }
        }
      } catch {
        results.checks.sampleSegment = { error: 'Failed to fetch' };
        results.errors.push('Sample segment unreachable');
        results.passed = false;
      }
    }
  }

  // CORS check (simplified)
  try {
    const corsRes = await fetch(masterUrl, {
      method: 'OPTIONS',
      headers: { 'Origin': 'https://www.acestudio.ng' }
    });
    results.checks.cors = {
      status: corsRes.status,
      allowOrigin: corsRes.headers.get('access-control-allow-origin'),
      allowMethods: corsRes.headers.get('access-control-allow-methods'),
      allowHeaders: corsRes.headers.get('access-control-allow-headers')
    };
  } catch (e) {
    results.checks.cors = { error: 'CORS check failed' };
  }

  // Update video with validation result
  await prisma.video.update({
    where: { id: movieId },
    data: {
      status: ['APPROVED', 'PUBLISHED'].includes(video.status) ? video.status : results.passed ? 'READY' : 'HLS_UPLOADED'
    }
  });

  await prisma.videoTechnicalMetadata.update({
    where: { videoId: movieId },
    data: {
      processingStatus: results.passed ? 'READY_TO_STREAM' : 'HLS_UPLOADED',
      hlsVerifiedAt: results.passed ? new Date() : undefined,
      readyToStreamAt: results.passed ? new Date() : undefined
    }
  });

  return NextResponse.json({
    ...results,
    video: await getProcessingVideo(movieId)
  });
}
