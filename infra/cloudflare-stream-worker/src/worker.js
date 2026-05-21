const TEXT_ENCODER = new TextEncoder();

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function base64UrlToJson(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

async function timingSafeEqual(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  let mismatch = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    mismatch |= left[index] ^ right[index];
  }
  return mismatch === 0;
}

async function verifyJwt(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = base64UrlToJson(encodedHeader);
  if (header.alg !== 'HS256') throw new Error('Unsupported token algorithm');

  const key = await crypto.subtle.importKey(
    'raw',
    TEXT_ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expectedSignature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, TEXT_ENCODER.encode(`${encodedHeader}.${encodedPayload}`))
  );
  const actualSignature = base64UrlToBytes(encodedSignature);
  if (!(await timingSafeEqual(expectedSignature, actualSignature))) throw new Error('Invalid signature');

  const payload = base64UrlToJson(encodedPayload);
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) throw new Error('Expired token');
  if (typeof payload.videoId !== 'string' || !payload.videoId) throw new Error('Missing video id');

  return payload;
}

function getHlsContentType(key) {
  if (key.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (key.endsWith('.m4s') || key.endsWith('.mp4')) return 'video/mp4';
  if (key.endsWith('.ts')) return 'video/mp2t';
  if (key.endsWith('.vtt')) return 'text/vtt';
  return 'application/octet-stream';
}

function trimPlaylistToTeaser(playlist, teaserSec) {
  if (!playlist.includes('#EXTINF:')) return playlist;

  const lines = playlist.split(/\r?\n/);
  const trimmed = [];
  let consumedSec = 0;
  let pendingDuration = null;
  let ended = false;

  for (const line of lines) {
    if (ended) break;

    if (line.startsWith('#EXTINF:')) {
      pendingDuration = Number(line.slice('#EXTINF:'.length).split(',')[0]);
      if (!Number.isFinite(pendingDuration)) pendingDuration = 0;
      trimmed.push(line);
      continue;
    }

    if (pendingDuration !== null && line && !line.startsWith('#')) {
      consumedSec += pendingDuration;
      trimmed.push(line);
      pendingDuration = null;
      if (consumedSec >= teaserSec) {
        trimmed.push('#EXT-X-ENDLIST');
        ended = true;
      }
      continue;
    }

    if (!line.startsWith('#EXT-X-ENDLIST')) {
      trimmed.push(line);
    }
  }

  if (!trimmed.includes('#EXT-X-ENDLIST')) trimmed.push('#EXT-X-ENDLIST');
  return trimmed.join('\n');
}

function resolveRelativePath(basePath, relativePath) {
  const baseParts = basePath.includes('/') ? basePath.split('/').slice(0, -1) : [];
  const resolved = [...baseParts];
  for (const segment of relativePath.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      resolved.pop();
    } else {
      resolved.push(segment);
    }
  }
  return resolved.join('/');
}

function rewriteManifestUris(manifest, assetPath, token) {
  return manifest
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;

      const mapUri = (value) => {
        if (/^https?:\/\//i.test(value)) return value;
        const resolved = resolveRelativePath(assetPath, value);
        return `/movies/${resolved}?token=${encodeURIComponent(token)}`;
      };

      if (line.startsWith('#EXT-X-KEY') || line.startsWith('#EXT-X-MAP')) {
        return line.replace(/URI="([^"]+)"/g, (_match, value) => `URI="${mapUri(value)}"`);
      }
      if (line.startsWith('#')) return line;
      if (/^https?:\/\//i.test(line)) return line;
      return mapUri(line);
    })
    .join('\n');
}

function getCorsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    Vary: 'Origin'
  };
}

async function readObjectBody(object) {
  return object ? new Response(object.body).text() : null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const token = url.searchParams.get('token') || '';
    let payload;
    try {
      payload = await verifyJwt(token, env.ACE_STREAM_SIGNING_SECRET);
    } catch {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!pathname.startsWith('movies/') || pathname.includes('..')) {
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    const [, videoId, ...assetParts] = pathname.split('/');
    if (videoId !== payload.videoId || assetParts.length === 0) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const assetPath = assetParts.join('/');
    const objectKey = `movies/${videoId}/${assetPath}`;
    const contentType = getHlsContentType(objectKey);
    const isManifest = objectKey.endsWith('.m3u8');

    if (isManifest) {
      const object = await env.HLS_BUCKET.get(objectKey);
      const manifest = await readObjectBody(object);
      if (!manifest) return new Response('Not found', { status: 404, headers: corsHeaders });

      const playableManifest = payload.fullAccess ? manifest : trimPlaylistToTeaser(manifest, payload.teaserSec || 0);
      const rewritten = rewriteManifestUris(playableManifest, `${videoId}/${assetPath}`, token);

      return new Response(request.method === 'HEAD' ? null : rewritten, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=0, no-store'
        }
      });
    }

    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/${objectKey}`, request);
    let response = await cache.match(cacheKey);
    if (!response) {
      const object = await env.HLS_BUCKET.get(objectKey);
      if (!object) return new Response('Not found', { status: 404, headers: corsHeaders });

      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', contentType);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Accept-Ranges', 'bytes');
      if (object.size) headers.set('Content-Length', String(object.size));

      response = new Response(request.method === 'HEAD' ? null : object.body, {
        status: 200,
        headers
      });

      if (request.method === 'GET') {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }
    }

    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: response.status,
      headers: responseHeaders
    });
  }
};
