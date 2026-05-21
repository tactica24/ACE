import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, raw = ''] = value.replace(/^--/, '').split('=');
  return [key, raw];
}));

const input = args.input;
const videoId = args.videoId;
const outputRoot = args.output || path.resolve('storage', 'hls');
if (!input || !videoId) {
  console.error('Usage: node scripts/transcode-hls.mjs --input=/path/video.mp4 --videoId=abc123 [--output=storage/hls]');
  process.exit(1);
}

const outputDir = path.join(outputRoot, videoId, 'hls-v1');
mkdirSync(outputDir, { recursive: true });

const probe = spawnSync('ffprobe', [
  '-v', 'error',
  '-select_streams', 'v:0',
  '-show_entries', 'stream=width,height',
  '-of', 'csv=s=x:p=0',
  input
], { encoding: 'utf8' });

if (probe.status !== 0) {
  console.error(probe.stderr || 'ffprobe failed');
  process.exit(probe.status || 1);
}

const [width, height] = probe.stdout.trim().split('x').map(Number);
const ladder = [
  { name: '2160', height: 2160, bitrate: '12000k', maxrate: '14000k', bufsize: '24000k' },
  { name: '1080', height: 1080, bitrate: '6000k', maxrate: '7000k', bufsize: '12000k' },
  { name: '720', height: 720, bitrate: '3000k', maxrate: '3500k', bufsize: '6000k' }
].filter((profile) => Number.isFinite(height) && profile.height <= height);

if (ladder.length === 0) {
  console.error(`No ladder profiles fit source height ${height}`);
  process.exit(1);
}

const splitCount = ladder.length;
const filterParts = [`[0:v]split=${splitCount}${ladder.map((_, index) => `[v${index}]`).join('')}`];
ladder.forEach((profile, index) => {
  filterParts.push(`[v${index}]scale=-2:${profile.height}:force_original_aspect_ratio=decrease[v${profile.name}]`);
});

const ffmpegArgs = [
  '-y',
  '-i', input,
  '-filter_complex', filterParts.join(';'),
  '-preset', process.env.ACE_TRANSCODE_PRESET || 'veryfast'
];

const varStreamMap = [];
ladder.forEach((profile, index) => {
  ffmpegArgs.push(
    '-map', `[v${profile.name}]`,
    '-map', '0:a:0?',
    `-c:v:${index}`, 'libx264',
    `-b:v:${index}`, profile.bitrate,
    `-maxrate:v:${index}`, profile.maxrate,
    `-bufsize:v:${index}`, profile.bufsize,
    `-c:a:${index}`, 'aac',
    `-b:a:${index}`, '128k'
  );
  varStreamMap.push(`v:${index},a:${index},name:${profile.name}`);
});

ffmpegArgs.push(
  '-f', 'hls',
  '-hls_time', process.env.ACE_HLS_SEGMENT_SECONDS || '6',
  '-hls_playlist_type', 'vod',
  '-hls_flags', 'independent_segments',
  '-master_pl_name', 'master.m3u8',
  '-var_stream_map', varStreamMap.join(' '),
  '-hls_segment_filename', path.join(outputDir, '%v', 'seg-%05d.ts'),
  path.join(outputDir, '%v', 'index.m3u8')
);

const result = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`HLS package ready at ${outputDir}`);
