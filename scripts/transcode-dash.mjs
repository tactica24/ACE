import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, raw = ''] = value.replace(/^--/, '').split('=');
  return [key, raw];
}));

const input = args.input;
const videoId = args.videoId;
const outputRoot = args.output || path.resolve('storage', 'dash');
if (!input || !videoId) {
  console.error('Usage: node scripts/transcode-dash.mjs --input=/path/video.mp4 --videoId=abc123 [--output=storage/dash]');
  process.exit(1);
}

const outputDir = path.join(outputRoot, videoId);
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

const [, height] = probe.stdout.trim().split('x').map(Number);
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

ladder.forEach((profile, index) => {
  ffmpegArgs.push(
    '-map', `[v${profile.name}]`,
    `-c:v:${index}`, 'libx264',
    `-b:v:${index}`, profile.bitrate,
    `-maxrate:v:${index}`, profile.maxrate,
    `-bufsize:v:${index}`, profile.bufsize
  );
});

ffmpegArgs.push(
  '-map', '0:a:0?',
  '-c:a:0', 'aac',
  '-b:a:0', '128k',
  '-f', 'dash',
  '-seg_duration', process.env.ACE_DASH_SEGMENT_SECONDS || '4',
  '-use_template', '1',
  '-use_timeline', '1',
  '-adaptation_sets', 'id=0,streams=v id=1,streams=a',
  '-init_seg_name', 'init_$RepresentationID$.m4s',
  '-media_seg_name', 'chunk_$RepresentationID$_$Number%05d$.m4s',
  path.join(outputDir, 'manifest.mpd')
);

const result = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`DASH package ready at ${outputDir}`);
