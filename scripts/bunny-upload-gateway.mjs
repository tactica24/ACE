import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const PORT = Number.parseInt(process.env.PORT || '8081', 10);
const ACE_STREAM_SIGNING_SECRET = process.env.ACE_STREAM_SIGNING_SECRET || '';
const ALLOWED_UPLOAD_ORIGIN = (process.env.ACE_APP_BASE_URL || '').replace(/\/+$/, '');
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY || '';
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || '';
const BUNNY_STORAGE_ENDPOINT = (process.env.BUNNY_STORAGE_ENDPOINT || 'https://storage.bunnycdn.com').replace(/\/+$/, '');

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(req, res) {
  const requestOrigin = String(req.headers.origin || '').replace(/\/+$/, '');
  const allowOrigin = ALLOWED_UPLOAD_ORIGIN && requestOrigin === ALLOWED_UPLOAD_ORIGIN
    ? requestOrigin
    : ALLOWED_UPLOAD_ORIGIN || '*';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function normalizeKey(value) {
  return String(value || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
}

function bunnyUrl(key) {
  return `${BUNNY_STORAGE_ENDPOINT}/${encodeURIComponent(BUNNY_STORAGE_ZONE)}/${normalizeKey(key).split('/').map(encodeURIComponent).join('/')}`;
}

function assertGatewayConfig() {
  const missing = [];
  if (!ACE_STREAM_SIGNING_SECRET) missing.push('ACE_STREAM_SIGNING_SECRET');
  if (!BUNNY_STORAGE_API_KEY) missing.push('BUNNY_STORAGE_API_KEY');
  if (!BUNNY_STORAGE_ZONE) missing.push('BUNNY_STORAGE_ZONE');
  if (missing.length) throw new Error(`Missing upload gateway environment: ${missing.join(', ')}`);
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64');
}

function verifyUploadToken(token) {
  const [encodedHeader, encodedPayload, encodedSignature] = String(token || '').split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('Invalid upload token.');
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac('sha256', ACE_STREAM_SIGNING_SECRET)
    .update(signingInput)
    .digest('base64url');

  const providedSignature = Buffer.from(encodedSignature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    throw new Error('Upload token signature mismatch.');
  }

  const header = JSON.parse(decodeBase64Url(encodedHeader).toString('utf8'));
  if (header.alg !== 'HS256') {
    throw new Error('Unsupported upload token algorithm.');
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8'));
  if (payload.exp && Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
    throw new Error('Upload token has expired.');
  }

  return payload;
}

async function uploadIncomingStream(req, key, contentType) {
  const response = await fetch(bunnyUrl(key), {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_API_KEY,
      'Content-Type': contentType || 'application/octet-stream'
    },
    body: req,
    duplex: 'half'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Bunny upload failed (${response.status}) for ${key}: ${text || response.statusText}`);
  }
}

async function handleUpload(req, res) {
  assertGatewayConfig();
  setCorsHeaders(req, res);

  const token = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).searchParams.get('token')?.trim();
  if (!token) {
    return json(res, 401, { error: 'Missing upload token.' });
  }

  let payload;
  try {
    payload = verifyUploadToken(token);
  } catch (error) {
    return json(res, 401, { error: error instanceof Error ? error.message : 'Invalid upload token.' });
  }

  const key = normalizeKey(payload.key);
  const contentType = String(req.headers['content-type'] || payload.contentType || 'application/octet-stream');
  const expectedContentType = String(payload.contentType || '').split(';')[0];
  if (expectedContentType && contentType.split(';')[0] !== expectedContentType) {
    return json(res, 400, { error: 'Upload content type does not match the prepared file.' });
  }

  if (!key) {
    return json(res, 400, { error: 'Upload key is required.' });
  }

  try {
    await uploadIncomingStream(req, key, contentType);
    return json(res, 200, { ok: true, key });
  } catch (error) {
    return json(res, 502, { error: error instanceof Error ? error.message : 'Unable to upload to Bunny Storage.' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS' && (req.url || '').startsWith('/uploads/bunny')) {
      setCorsHeaders(req, res);
      res.writeHead(204);
      return res.end();
    }

    if (req.method === 'PUT' && (req.url || '').startsWith('/uploads/bunny')) {
      return await handleUpload(req, res);
    }

    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: 'Not found.' });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, () => {
  console.log(`Ace Bunny upload gateway listening on :${PORT}`);
});
