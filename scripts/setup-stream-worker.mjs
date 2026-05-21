import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import crypto from 'node:crypto';
import path from 'node:path';

const workerDir = path.resolve('infra/cloudflare-stream-worker');
const wranglerTomlPath = path.join(workerDir, 'wrangler.toml');
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
      shell: false,
      cwd: options.cwd ?? process.cwd(),
      env: process.env
    });

    if (options.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    }

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function ask(question, fallback) {
  const answer = (await rl.question(`${question}${fallback ? ` (${fallback})` : ''}: `)).trim();
  return answer || fallback;
}

async function ensureWranglerAuth() {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    await run(npxCommand, ['wrangler', 'whoami'], { cwd: workerDir });
    return;
  }

  try {
    await run(npxCommand, ['wrangler', 'whoami'], { cwd: workerDir });
  } catch {
    console.log('\nCloudflare login is required. A browser window may open.');
    await run(npxCommand, ['wrangler', 'login'], { cwd: workerDir });
  }
}

const rl = createInterface({ input, output });

try {
  console.log('ACE secure stream worker setup\n');
  console.log('This deploys a Cloudflare Worker for private, signed HLS delivery on stream.acestudio.ng.');
  console.log('You need your HLS R2 bucket name. The bucket should already exist.\n');

  const domain = await ask('Stream domain', process.env.ACE_STREAM_DOMAIN || 'stream.acestudio.ng');
  const zoneName = await ask('Cloudflare zone name', process.env.CLOUDFLARE_ZONE_NAME || 'acestudio.ng');
  const hlsBucket = await ask('HLS R2 bucket name', process.env.HLS_R2_BUCKET || 'ace-hls');
  if (!hlsBucket) throw new Error('HLS R2 bucket name is required.');

  const allowedOrigin = await ask('Allowed app origin', process.env.ACE_APP_BASE_URL || 'https://acestudio.ng');
  const defaultSecret = process.env.ACE_STREAM_SIGNING_SECRET || crypto.randomBytes(48).toString('hex');
  const signingSecret = await ask('ACE_STREAM_SIGNING_SECRET (press Enter to generate/use current)', defaultSecret);
  if (!signingSecret || signingSecret.length < 32) {
    throw new Error('ACE_STREAM_SIGNING_SECRET must be at least 32 characters.');
  }

  await mkdir(workerDir, { recursive: true });
  const wranglerToml = `name = "ace-stream"
main = "src/worker.js"
compatibility_date = "2026-05-05"

routes = [
  { pattern = "${domain}/*", zone_name = "${zoneName}" }
]

[[r2_buckets]]
binding = "HLS_BUCKET"
bucket_name = "${hlsBucket}"

[vars]
ALLOWED_ORIGIN = "${allowedOrigin}"
`;

  await writeFile(wranglerTomlPath, wranglerToml, 'utf8');
  console.log(`\nWrote ${wranglerTomlPath}`);

  await ensureWranglerAuth();
  await run(npxCommand, ['wrangler', 'secret', 'put', 'ACE_STREAM_SIGNING_SECRET'], {
    cwd: workerDir,
    input: `${signingSecret}\n`
  });
  await run(npxCommand, ['wrangler', 'deploy'], { cwd: workerDir });

  console.log('\nSecure stream worker deployed.');
  console.log('\nSet these Vercel environment variables to match:');
  console.log(`ACE_CDN_BASE_URL=https://${domain}`);
  console.log(`HLS_R2_BUCKET=${hlsBucket}`);
  console.log('ACE_STREAM_SIGNING_SECRET=<same value you entered here>');
  console.log('\nKeep this secret private. If you generated a new value here, update Vercel before testing playback.');

  if (!existsSync(path.join(workerDir, 'wrangler.toml'))) {
    throw new Error('Worker config was not created.');
  }
} finally {
  rl.close();
}
