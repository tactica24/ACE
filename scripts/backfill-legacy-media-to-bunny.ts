import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { getObjectMetadata, putObject } from '@/lib/bunny-storage';
import { normalizeMediaKey } from '@/lib/media';

type AssetKind =
  | 'primary'
  | 'fallback'
  | 'poster'
  | 'master'
  | 'trailer'
  | 'subtitle'
  | 'landscape'
  | 'promo-still'
  | 'clean-audio'
  | 'delivery';

type AssetRecord = {
  key: string;
  kind: AssetKind;
  videoId: string;
  title: string;
  sourceUrl: string | null;
};

type ManifestEntry = {
  key: string;
  url: string;
};

type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
};

type LegacyBunnyConfig = {
  endpoint: string;
  apiKey: string;
  zone: string;
};

const prisma = new PrismaClient();
const DEFAULT_FETCH_TIMEOUT_MS = 1000 * 60 * 5;
const DEFAULT_FETCH_RETRIES = 3;

function parseArgs() {
  return Object.fromEntries(
    process.argv.slice(2).map((value) => {
      const [rawKey, ...rest] = value.replace(/^--/, '').split('=');
      return [rawKey, rest.join('=')];
    })
  ) as Record<string, string>;
}

function parseIntegerArg(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt((value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function encodePathPreservingSlashes(key: string) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function isSampleAssetKey(key: string) {
  return key.startsWith('samples/');
}

function resolveR2Config(args: Record<string, string>): R2Config | null {
  const endpoint = (
    args['r2-endpoint'] ||
    process.env.R2_ENDPOINT ||
    process.env.LEGACY_R2_ENDPOINT ||
    ''
  ).trim();
  const accessKeyId = (
    args['r2-access-key-id'] ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.LEGACY_R2_ACCESS_KEY_ID ||
    ''
  ).trim();
  const secretAccessKey = (
    args['r2-secret-access-key'] ||
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.LEGACY_R2_SECRET_ACCESS_KEY ||
    ''
  ).trim();
  const bucket = (
    args['r2-bucket'] ||
    process.env.R2_BUCKET ||
    process.env.LEGACY_R2_BUCKET ||
    ''
  ).trim();
  const region = (
    args['r2-region'] ||
    process.env.R2_REGION ||
    process.env.LEGACY_R2_REGION ||
    'auto'
  ).trim();

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    endpoint: endpoint.replace(/\/+$/, ''),
    accessKeyId,
    secretAccessKey,
    bucket,
    region: region || 'auto'
  };
}

function resolveLegacyBunnyConfig(args: Record<string, string>): LegacyBunnyConfig | null {
  const endpoint = (
    args['legacy-bunny-endpoint'] ||
    process.env.LEGACY_BUNNY_STORAGE_ENDPOINT ||
    process.env.LEGACY_BUNNY_ENDPOINT ||
    ''
  ).trim();
  const apiKey = (
    args['legacy-bunny-api-key'] ||
    process.env.LEGACY_BUNNY_STORAGE_API_KEY ||
    process.env.LEGACY_BUNNY_API_KEY ||
    ''
  ).trim();
  const zone = (
    args['legacy-bunny-zone'] ||
    process.env.LEGACY_BUNNY_STORAGE_ZONE ||
    process.env.LEGACY_BUNNY_ZONE ||
    ''
  ).trim();

  if (!endpoint || !apiKey || !zone) {
    return null;
  }

  return {
    endpoint: endpoint.replace(/\/+$/, ''),
    apiKey,
    zone
  };
}

function toAmzDateParts(now = new Date()) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: `${iso.slice(0, 8)}T${iso.slice(8, 14)}Z`,
    dateStamp: iso.slice(0, 8)
  };
}

function hashSha256Hex(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function getSigningKey(secretAccessKey: string, dateStamp: string, region: string, service: string) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function buildR2ObjectUrl(config: R2Config, key: string, style: 'path' | 'virtual-hosted') {
  const normalizedKey = encodePathPreservingSlashes(key);
  if (style === 'virtual-hosted') {
    const endpoint = new URL(config.endpoint);
    return new URL(`${endpoint.protocol}//${encodeURIComponent(config.bucket)}.${endpoint.host}/${normalizedKey}`);
  }

  return new URL(`${config.endpoint}/${encodePathPreservingSlashes(config.bucket)}/${normalizedKey}`);
}

function buildSignedR2Request(config: R2Config, key: string, style: 'path' | 'virtual-hosted') {
  const url = buildR2ObjectUrl(config, key, style);
  const { amzDate, dateStamp } = toAmzDateParts();
  const payloadHash = hashSha256Hex('');
  const host = url.host;
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'GET',
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hashSha256Hex(canonicalRequest)
  ].join('\n');
  const signingKey = getSigningKey(config.secretAccessKey, dateStamp, config.region, 's3');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: url.toString(),
    headers: {
      Authorization: authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate
    }
  };
}

async function readManifest(filePath: string | undefined) {
  if (!filePath) return new Map<string, string>();

  const { readFile } = await import('node:fs/promises');
  const raw = await readFile(filePath, 'utf8');
  const json = JSON.parse(raw) as ManifestEntry[] | Record<string, string>;

  const entries = Array.isArray(json)
    ? json
        .filter((item): item is ManifestEntry => Boolean(item?.key && item?.url))
        .map((item) => [normalizeMediaKey(item.key) ?? item.key, item.url] as const)
    : Object.entries(json).map(([key, url]) => [normalizeMediaKey(key) ?? key, String(url)] as const);

  return new Map(entries);
}

function buildSourceUrl(key: string, baseUrl: string | undefined, manifest: Map<string, string>) {
  const fromManifest = manifest.get(key);
  if (fromManifest) return fromManifest;
  if (!baseUrl) return null;

  return `${baseUrl.replace(/\/+$/, '')}/${encodePathPreservingSlashes(key)}`;
}

function pushAsset(
  target: Map<string, AssetRecord>,
  input: {
    key: string | null | undefined;
    kind: AssetKind;
    videoId: string;
    title: string;
    sourceUrl: string | null;
  }
) {
  const key = normalizeMediaKey(input.key);
  if (!key || target.has(key)) return;

  target.set(key, {
    key,
    kind: input.kind,
    videoId: input.videoId,
    title: input.title,
    sourceUrl: input.sourceUrl
  });
}

async function collectAssets(baseUrl: string | undefined, manifest: Map<string, string>) {
  const videos = await prisma.video.findMany({
    select: {
      id: true,
      title: true,
      primaryStorageKey: true,
      fallbackStorageKey: true,
      posterKey: true,
      subtitleTracks: {
        select: {
          fileKey: true
        }
      },
      technicalMetadata: {
        select: {
          masterKey: true,
          trailerKey: true,
          landscapeArtworkKey: true,
          promotionalStillKeys: true,
          cleanAudioMasterKey: true,
          masterDeliveryKey: true
        }
      }
    }
  });

  const assets = new Map<string, AssetRecord>();

  for (const video of videos) {
    const title = video.title;
    const add = (key: string | null | undefined, kind: AssetKind) =>
      pushAsset(assets, {
        key,
        kind,
        videoId: video.id,
        title,
        sourceUrl: key ? buildSourceUrl(normalizeMediaKey(key) ?? key, baseUrl, manifest) : null
      });

    add(video.primaryStorageKey, 'primary');
    add(video.fallbackStorageKey, 'fallback');
    add(video.posterKey, 'poster');
    add(video.technicalMetadata?.masterKey, 'master');
    add(video.technicalMetadata?.trailerKey, 'trailer');
    add(video.technicalMetadata?.landscapeArtworkKey, 'landscape');
    add(video.technicalMetadata?.cleanAudioMasterKey, 'clean-audio');
    add(video.technicalMetadata?.masterDeliveryKey, 'delivery');

    for (const stillKey of video.technicalMetadata?.promotionalStillKeys ?? []) {
      add(stillKey, 'promo-still');
    }

    for (const subtitle of video.subtitleTracks) {
      add(subtitle.fileKey, 'subtitle');
    }
  }

  return [...assets.values()].sort((left, right) => left.key.localeCompare(right.key));
}

async function fetchWithRetry(
  input: string,
  init: RequestInit,
  options: {
    retries: number;
    timeoutMs: number;
    label: string;
  }
) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      });
      clearTimeout(timer);
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt >= options.retries) break;
      console.warn(`[retry ${attempt}/${options.retries}] ${options.label}`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Request failed for ${options.label}`);
}

async function existsInBunny(key: string) {
  try {
    await getObjectMetadata(key);
    return true;
  } catch {
    return false;
  }
}

function buildLegacyBunnyObjectUrl(config: LegacyBunnyConfig, key: string) {
  const normalizedKey = normalizeMediaKey(key);
  if (!normalizedKey) {
    throw new Error('Legacy Bunny source key is required.');
  }

  return `${config.endpoint}/${encodeURIComponent(config.zone)}/${normalizedKey
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

async function fetchLegacyBunnyObject(
  config: LegacyBunnyConfig,
  key: string,
  options: {
    retries: number;
    timeoutMs: number;
  }
) {
  const url = buildLegacyBunnyObjectUrl(config, key);
  const response = await fetchWithRetry(
    url,
    {
      method: 'GET',
      headers: {
        AccessKey: config.apiKey
      }
    },
    {
      retries: options.retries,
      timeoutMs: options.timeoutMs,
      label: `legacy Bunny ${key}`
    }
  );

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`Legacy Bunny fetch failed (${response.status}) for ${key}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  return response;
}

async function fetchR2Object(
  config: R2Config,
  key: string,
  options: {
    retries: number;
    timeoutMs: number;
  }
) {
  const attempts: Array<'path' | 'virtual-hosted'> = ['path', 'virtual-hosted'];
  const failures: string[] = [];

  for (const style of attempts) {
    const request = buildSignedR2Request(config, key, style);
    const response = await fetchWithRetry(request.url, {
      method: 'GET',
      headers: request.headers
    }, {
      retries: options.retries,
      timeoutMs: options.timeoutMs,
      label: `R2 ${style} ${key}`
    });

    if (response.ok && response.body) {
      return response;
    }

    const text = await response.text().catch(() => '');
    failures.push(`${style}: ${response.status}${text ? ` ${text.slice(0, 200)}` : ''}`);
  }

  throw new Error(`R2 fetch failed for ${key}. Attempts: ${failures.join(' | ')}`);
}

async function copyAsset(
  asset: AssetRecord,
  options: {
    r2: R2Config | null;
    legacyBunny: LegacyBunnyConfig | null;
    retries: number;
    timeoutMs: number;
  }
) {
  let response: Response;

  if (asset.sourceUrl) {
    response = await fetchWithRetry(asset.sourceUrl, {
      method: 'GET'
    }, {
      retries: options.retries,
      timeoutMs: options.timeoutMs,
      label: `legacy URL ${asset.key}`
    });
    if (!response.ok || !response.body) {
      throw new Error(`Legacy fetch failed (${response.status}) for ${asset.sourceUrl}`);
    }
  } else if (options.r2) {
    response = await fetchR2Object(options.r2, asset.key, {
      retries: options.retries,
      timeoutMs: options.timeoutMs
    });
  } else if (options.legacyBunny) {
    response = await fetchLegacyBunnyObject(options.legacyBunny, asset.key, {
      retries: options.retries,
      timeoutMs: options.timeoutMs
    });
  } else {
    throw new Error('No legacy source URL, private R2 configuration, or legacy Bunny source could be resolved for this asset.');
  }

  await putObject(asset.key, response.body, response.headers.get('content-type') ?? 'application/octet-stream');
}

async function main() {
  const args = parseArgs();
  const dryRun = 'dry-run' in args;
  const verifyOnly = 'verify-only' in args;
  const force = 'force' in args;
  const includeSamples = 'include-samples' in args;
  const limit = parseIntegerArg(args.limit, Number.MAX_SAFE_INTEGER);
  const retries = parseIntegerArg(args.retries, DEFAULT_FETCH_RETRIES);
  const timeoutMs = parseIntegerArg(args['timeout-ms'], DEFAULT_FETCH_TIMEOUT_MS);
  const reportPath = args['report-json']?.trim();
  const baseUrl = args['source-base-url'] || process.env.LEGACY_MEDIA_BASE_URL;
  const manifest = await readManifest(args.manifest);
  const r2 = resolveR2Config(args);
  const legacyBunny = resolveLegacyBunnyConfig(args);
  const videoIdFilter = (args['video-id'] || '').trim();
  const keyPrefixFilter = (args['key-prefix'] || '').trim();
  const onlyKinds = new Set(
    (args.kinds || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (!verifyOnly && !baseUrl && manifest.size === 0 && !r2 && !legacyBunny) {
    throw new Error(
      'Provide --source-base-url=<legacy-public-base>, --manifest=<json-file>, private R2 credentials, or legacy Bunny source credentials so legacy assets can be fetched.'
    );
  }

  const assets = await collectAssets(baseUrl, manifest);
  const filteredAssets = assets.filter((asset) => {
    if (!includeSamples && isSampleAssetKey(asset.key)) {
      return false;
    }

    if (videoIdFilter && asset.videoId !== videoIdFilter) {
      return false;
    }

    if (keyPrefixFilter && !asset.key.startsWith(keyPrefixFilter)) {
      return false;
    }

    return onlyKinds.size ? onlyKinds.has(asset.kind) : true;
  }).slice(0, limit);

  console.log(`Discovered ${assets.length} unique video-related asset keys.`);
  if (!includeSamples) {
    const excludedSamples = assets.filter((asset) => isSampleAssetKey(asset.key)).length;
    if (excludedSamples) {
      console.log(`Excluded ${excludedSamples} sample asset(s). Pass --include-samples to migrate demo keys too.`);
    }
  }
  if (onlyKinds.size) {
    console.log(`Filtered to ${filteredAssets.length} asset(s) for kinds: ${[...onlyKinds].join(', ')}`);
  }
  if (videoIdFilter) {
    console.log(`Filtered to videoId=${videoIdFilter}`);
  }
  if (keyPrefixFilter) {
    console.log(`Filtered to key prefix=${keyPrefixFilter}`);
  }
  if (Number.isFinite(limit) && limit !== Number.MAX_SAFE_INTEGER) {
    console.log(`Limited to first ${filteredAssets.length} asset(s).`);
  }
  console.log(`Fetch retries=${retries}, timeoutMs=${timeoutMs}`);

  let copied = 0;
  let skipped = 0;
  let failed = 0;
  const missingKeys: string[] = [];
  const failedKeys: Array<{ key: string; message: string }> = [];

  if (!verifyOnly) {
    for (const asset of filteredAssets) {
      const alreadyExists = force ? false : await existsInBunny(asset.key);
      if (alreadyExists) {
        skipped += 1;
        console.log(`SKIP  ${asset.kind.padEnd(11)} ${asset.key} (already in Bunny)`);
        continue;
      }

      if (dryRun) {
        skipped += 1;
        console.log(
          `DRY   ${asset.kind.padEnd(11)} ${asset.key} <= ${
            asset.sourceUrl ?? (r2 ? 'private-r2' : legacyBunny ? 'legacy-bunny' : 'unresolved source')
          }`
        );
        continue;
      }

      try {
        await copyAsset(asset, { r2, legacyBunny, retries, timeoutMs });
        copied += 1;
        console.log(`COPY  ${asset.kind.padEnd(11)} ${asset.key}`);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        failedKeys.push({ key: asset.key, message });
        console.error(`FAIL  ${asset.kind.padEnd(11)} ${asset.key}`);
        console.error(message);
      }
    }
  }

  let verifiedPresent = 0;
  for (const asset of filteredAssets) {
    const present = await existsInBunny(asset.key);
    if (present) {
      verifiedPresent += 1;
    } else {
      missingKeys.push(asset.key);
    }
  }

  console.log('');
  console.log('Legacy Bunny backfill summary');
  console.log(`Copied:  ${copied}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Verified in Bunny: ${verifiedPresent}/${filteredAssets.length}`);

  if (missingKeys.length) {
    console.log('Missing in Bunny after verification:');
    for (const key of missingKeys.slice(0, 25)) {
      console.log(`- ${key}`);
    }
    if (missingKeys.length > 25) {
      console.log(`...and ${missingKeys.length - 25} more`);
    }
  }

  if (reportPath) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(reportPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      dryRun,
      verifyOnly,
      force,
      totalDiscovered: assets.length,
      totalProcessed: filteredAssets.length,
      copied,
      skipped,
      failed,
      verifiedPresent,
      missingKeys,
      failedKeys
    }, null, 2));
    console.log(`Report written to ${reportPath}`);
  }

  if (failed > 0 || missingKeys.length > 0) {
    process.exitCode = 1;
  }
}

void main()
  .catch((error) => {
    console.error('Legacy Bunny backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
