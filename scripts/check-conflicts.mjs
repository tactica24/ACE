import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean)
  .filter((f) => !f.startsWith('node_modules/'));

const markerPattern = /^(<<<<<<<|=======|>>>>>>>)\s?.*$/m;
const offenders = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  if (markerPattern.test(content)) offenders.push(file);
}

if (offenders.length > 0) {
  console.error('Merge conflict markers detected in tracked files:');
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  process.exit(1);
}

console.log('No merge conflict markers detected.');
