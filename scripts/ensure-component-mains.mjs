#!/usr/bin/env node
/**
 * Ensures large component implementation files exist after thin entrypoint split.
 * Fetches last known-good content from GitHub when local files are missing.
 */
const fs = require('node:fs');
const path = require('node:path');

const PARENT = '6a4ccd2900040b9d0df7727393d464fd03c0d059';
const VIDEO = '910085f073926d930480848a4418ed7219bf028b';

const files = [
  {
    dest: 'components/upload-form/UploadFormMain.tsx',
    url: `https://raw.githubusercontent.com/tactica24/ACE/${PARENT}/components/UploadForm.tsx`,
  },
  {
    dest: 'components/moderation/ModerationQueueMain.tsx',
    url: `https://raw.githubusercontent.com/tactica24/ACE/${PARENT}/components/ModerationQueue.tsx`,
  },
  {
    dest: 'components/player/AcePlayerMain.tsx',
    url: `https://raw.githubusercontent.com/tactica24/ACE/${PARENT}/components/AcePlayer.tsx`,
  },
  {
    dest: 'app/api/studio/video/route.ts',
    url: `https://raw.githubusercontent.com/tactica24/ACE/${VIDEO}/app/api/studio/video/route.ts`,
    restoreIfSmallerThan: 5000,
  },
];

async function ensure(file) {
  const dest = path.join(process.cwd(), file.dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const exists = fs.existsSync(dest);
  const size = exists ? fs.statSync(dest).size : 0;
  const needs =
    !exists || (file.restoreIfSmallerThan && size < file.restoreIfSmallerThan);
  if (!needs) return;
  process.stdout.write(`Restoring ${file.dest} ...\n`);
  const res = await fetch(file.url);
  if (!res.ok) {
    console.warn(`Could not restore ${file.dest}: HTTP ${res.status}`);
    return;
  }
  const text = await res.text();
  fs.writeFileSync(dest, text);
  process.stdout.write(`Wrote ${file.dest} (${text.length} bytes)\n`);
}

(async () => {
  for (const file of files) {
    try {
      await ensure(file);
    } catch (err) {
      console.warn(err);
    }
  }
})();
