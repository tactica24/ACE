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

const prisma = new PrismaClient();

function parseArgs() {
  return Object.fromEntries(
    process.argv.slice(2).map((value) => {
      const [rawKey, ...rest] = value.replace(/^--/, '').split('=');
      return [rawKey, rest.join('=')];
    })
  ) as Record<string, string>;
}

function encodePathPreservingSlashes(key: string) {
  return key.split('/').map(encodeURIComponent).join('/');
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

function buildSignedR2Request(config: R2Config, key: string) {
  const url = new URL(`${config.endpoint}/${encodePathPreservingSlashes(config.bucket)}/${encodePathPreservingSlashes(key)}`);
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

async function existsInBunny(key: string) {
  try {
    await getObjectMetadata(key);
    return true;
  } catch {
    return false;
  }
}

async function fetchR2Object(config: R2Config, key: string) {
  const request = buildSignedR2Request(config, key);
  const response = await fetch(request.url, {
    method: 'GET',
    headers: request.headers
  });

  if (!response.ok || !response.body) {
    throw new Error(`R2 fetch failed (${response.status}) for ${key}`);
  }

  return response;
}

async function copyAsset(asset: AssetRecord, options: { r2: R2Config | null }) {
  let response: Response;

  if (asset.sourceUrl) {
    response = await fetch(asset.sourceUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Legacy fetch failed (${response.status}) for ${asset.sourceUrl}`);
    }
  } else if (options.r2) {
    response = await fetchR2Object(options.r2, asset.key);
  } else {
    throw new Error('No legacy source URL or R2 configuration could be resolved for this asset.');
  }

  await putObject(asset.key, response.body, response.headers.get('content-type') ?? 'application/octet-stream');
}

async function main() {
  const args = parseArgs();
  const dryRun = 'dry-run' in args;
  const verifyOnly = 'verify-only' in args;
  const force = 'force' in args;
  const reportPath = args['report-json']?.trim();
  const baseUrl = args['source-base-url'] || process.env.LEGACY_MEDIA_BASE_URL;
  const manifest = await readManifest(args.manifest);
  const r2 = resolveR2Config(args);
  const onlyKinds = new Set(
    (args.kinds || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (!verifyOnly && !baseUrl && manifest.size === 0 && !r2) {
    throw new Error(
      'Provide --source-base-url=<legacy-public-base>, --manifest=<json-file>, or private R2 credentials so legacy assets can be fetched.'
    );
  }

  const assets = await collectAssets(baseUrl, manifest);
  const filteredAssets = onlyKinds.size
    ? assets.filter((asset) => onlyKinds.has(asset.kind))
    : assets;

  console.log(`Discovered ${assets.length} unique video-related asset keys.`);
  if (onlyKinds.size) {
    console.log(`Filtered to ${filteredAssets.length} asset(s) for kinds: ${[...onlyKinds].join(', ')}`);
  }

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
        console.log(`DRY   ${asset.kind.padEnd(11)} ${asset.key} <= ${asset.sourceUrl ?? (r2 ? 'private-r2' : 'unresolved source')}`);
        continue;
      }

      try {
        await copyAsset(asset, { r2 });
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
