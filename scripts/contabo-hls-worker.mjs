import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const WORK_DIR = resolve(process.env.CONTABO_WORK_DIR || '/srv/ace-transcode/work');
const PIPELINE_SECRET = process.env.CONTABO_PIPELINE_SECRET || '';
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY || '';
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || '';
const BUNNY_STORAGE_ENDPOINT = (process.env.BUNNY_STORAGE_ENDPOINT || 'https://storage.bunnycdn.com').replace(/\/+$/, '');

const jobs = new Map();
let activeJobId = null;

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function isAuthorized(req) {
  const provided = req.headers['x-ace-pipeline-secret'];
  return Boolean(PIPELINE_SECRET && provided === PIPELINE_SECRET);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function normalizeKey(value) {
  return String(value || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
}

function contentTypeForPath(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (lower.endsWith('.ts')) return 'video/mp2t';
  if (lower.endsWith('.m4s')) return 'video/iso.segment';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

function bunnyUrl(key) {
  return `${BUNNY_STORAGE_ENDPOINT}/${encodeURIComponent(BUNNY_STORAGE_ZONE)}/${normalizeKey(key).split('/').map(encodeURIComponent).join('/')}`;
}

function normalizeDropboxDownloadUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'dropbox.com') {
    url.hostname = 'www.dropbox.com';
  }

  if (url.hostname === 'www.dropbox.com') {
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
  }

  return url.toString();
}

function assertWorkerConfig() {
  const missing = [];
  if (!PIPELINE_SECRET) missing.push('CONTABO_PIPELINE_SECRET');
  if (!BUNNY_STORAGE_API_KEY) missing.push('BUNNY_STORAGE_API_KEY');
  if (!BUNNY_STORAGE_ZONE) missing.push('BUNNY_STORAGE_ZONE');
  if (missing.length) throw new Error(`Missing worker environment: ${missing.join(', ')}`);
}

function jobDir(jobId) {
  const dir = resolve(WORK_DIR, jobId);
  if (!dir.startsWith(WORK_DIR + sep)) {
    throw new Error('Invalid job directory.');
  }
  return dir;
}

async function saveJob(job) {
  jobs.set(job.id, job);
  const statePath = join(jobDir(job.id), 'job.json');
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(job, null, 2));
}

async function callback(job, stage, extra = {}) {
  if (!job.callbackUrl) return;
  await fetch(job.callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ace-pipeline-secret': PIPELINE_SECRET
    },
    body: JSON.stringify({
      stage,
      videoId: job.videoId,
      jobId: job.id,
      hlsOutputPath: job.hlsOutputPath,
      hlsManifestKey: job.hlsManifestKey,
      ...extra
    })
  });
}

async function downloadMaster(job) {
  const masterPath = join(jobDir(job.id), 'master', 'source.mp4');
  await mkdir(dirname(masterPath), { recursive: true });

  const response = job.masterUrl
    ? await fetch(normalizeDropboxDownloadUrl(job.masterUrl))
    : await fetch(bunnyUrl(job.masterKey), {
        headers: { AccessKey: BUNNY_STORAGE_API_KEY }
      });
  if (!response.ok || !response.body) {
    throw new Error(`Master download failed (${response.status}) for ${job.masterUrl || job.masterKey}`);
  }

  await pipeline(response.body, createWriteStream(masterPath));
  return masterPath;
}

function runFfmpeg(masterPath, outputDir) {
  return new Promise((resolvePromise, rejectPromise) => {
    const args = [
      '-y',
      '-i', masterPath,
      '-filter_complex',
      '[0:v]split=3[v360][v720][v1080];[v360]scale=w=640:h=-2[v360out];[v720]scale=w=1280:h=-2[v720out];[v1080]scale=w=1920:h=-2[v1080out]',
      '-map', '[v360out]', '-map', '0:a:0',
      '-map', '[v720out]', '-map', '0:a:0',
      '-map', '[v1080out]', '-map', '0:a:0',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-sc_threshold', '0',
      '-g', '60',
      '-keyint_min', '60',
      '-c:a', 'aac',
      '-ar', '48000',
      '-b:a:0', '96k',
      '-b:a:1', '128k',
      '-b:a:2', '160k',
      '-b:v:0', '800k',
      '-maxrate:v:0', '856k',
      '-bufsize:v:0', '1200k',
      '-b:v:1', '3000k',
      '-maxrate:v:1', '3210k',
      '-bufsize:v:1', '4500k',
      '-b:v:2', '5500k',
      '-maxrate:v:2', '5885k',
      '-bufsize:v:2', '8250k',
      '-var_stream_map', 'v:0,a:0,name:360p v:1,a:1,name:720p v:2,a:2,name:1080p',
      '-master_pl_name', 'index.m3u8',
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', join(outputDir, '%v', 'segment_%05d.ts'),
      join(outputDir, '%v', 'playlist.m3u8')
    ];

    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`FFmpeg exited with ${code}: ${stderr}`));
      }
    });
  });
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

async function uploadFile(localPath, key) {
  const response = await fetch(bunnyUrl(key), {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_API_KEY,
      'Content-Type': contentTypeForPath(localPath)
    },
    body: createReadStream(localPath),
    duplex: 'half'
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Bunny upload failed (${response.status}) for ${key}: ${text || response.statusText}`);
  }
}

async function uploadHlsDirectory(job, outputDir) {
  const files = await walkFiles(outputDir);
  for (const file of files) {
    const rel = relative(outputDir, file).split(sep).join('/');
    await uploadFile(file, `${job.hlsOutputPath}/${rel}`);
  }
}

async function verifyManifest(job) {
  const manifestPath = join(jobDir(job.id), 'hls', 'index.m3u8');
  const text = await readFile(manifestPath, 'utf8');
  if (!text.includes('#EXTM3U')) {
    throw new Error('Generated HLS manifest is invalid.');
  }

  const manifestStat = await stat(manifestPath);
  if (!manifestStat.size) {
    throw new Error('Generated HLS manifest is empty.');
  }
}

async function processJob(job) {
  activeJobId = job.id;
  try {
    job.status = 'processing';
    await saveJob(job);
    await callback(job, 'submitted');

    const dir = jobDir(job.id);
    const hlsDir = join(dir, 'hls');
    await mkdir(hlsDir, { recursive: true });

    const masterPath = await downloadMaster(job);
    await runFfmpeg(masterPath, hlsDir);
    await verifyManifest(job);
    await uploadHlsDirectory(job, hlsDir);

    job.status = 'completed';
    await saveJob(job);
    await callback(job, 'completed');
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
    await saveJob(job);
    await callback(job, 'failed', { error: job.error }).catch(() => {});
  } finally {
    activeJobId = null;
  }
}

async function createJob(req, res) {
  assertWorkerConfig();
  if (activeJobId) {
    return json(res, 409, { error: `Worker is busy with job ${activeJobId}` });
  }

  const body = await readJson(req);
  const videoId = String(body.videoId || '').trim();
  const masterKey = normalizeKey(body.masterKey);
  const masterUrl = String(body.masterUrl || '').trim();
  const hlsOutputPath = normalizeKey(body.hlsOutputPath || `streams/${videoId}/hls`);
  const callbackUrl = String(body.callbackUrl || '').trim();

  if (!videoId || (!masterKey && !masterUrl) || !hlsOutputPath || !callbackUrl) {
    return json(res, 400, { error: 'videoId, masterKey or masterUrl, hlsOutputPath, and callbackUrl are required.' });
  }

  const jobId = String(body.jobId || randomUUID()).trim();
  const job = {
    id: jobId,
    status: 'queued',
    videoId,
    title: String(body.title || videoId),
    masterKey,
    masterUrl,
    hlsOutputPath,
    hlsManifestKey: `${hlsOutputPath}/index.m3u8`,
    callbackUrl,
    createdAt: new Date().toISOString()
  };

  await saveJob(job);
  processJob(job);
  return json(res, 202, job);
}

async function getJob(res, jobId) {
  const memoryJob = jobs.get(jobId);
  if (memoryJob) return json(res, 200, memoryJob);

  try {
    const raw = await readFile(join(jobDir(jobId), 'job.json'), 'utf8');
    return json(res, 200, JSON.parse(raw));
  } catch {
    return json(res, 404, { error: 'Job not found.' });
  }
}

async function deleteArtifacts(res, jobId) {
  if (activeJobId === jobId) {
    return json(res, 409, { error: 'Cannot delete artifacts while the job is active.' });
  }

  await rm(jobDir(jobId), { recursive: true, force: true });
  jobs.delete(jobId);
  return json(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  try {
    if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'POST' && url.pathname === '/jobs') return await createJob(req, res);
    if (req.method === 'GET' && parts[0] === 'jobs' && parts[1]) return await getJob(res, parts[1]);
    if (req.method === 'DELETE' && parts[0] === 'jobs' && parts[1] && parts[2] === 'artifacts') {
      return await deleteArtifacts(res, parts[1]);
    }

    return json(res, 404, { error: 'Not found.' });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, () => {
  console.log(`Ace Contabo HLS worker listening on :${PORT}`);
});
