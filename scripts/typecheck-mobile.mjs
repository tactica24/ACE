import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const mobileDir = path.join(repoRoot, 'mobile');
const rootCsstypeFile = path.join(repoRoot, 'node_modules', 'csstype', 'index.d.ts');
const mobileCsstypeFile = path.join(mobileDir, 'node_modules', 'csstype', 'index.d.ts');
const rootTscEntrypoint = path.join(
  repoRoot,
  'node_modules',
  'typescript',
  'bin',
  'tsc',
);

function repairCsstypeIfNeeded() {
  if (!fs.existsSync(rootCsstypeFile) || !fs.existsSync(mobileCsstypeFile)) {
    return;
  }

  const rootContents = fs.readFileSync(rootCsstypeFile, 'utf8');
  const mobileContents = fs.readFileSync(mobileCsstypeFile, 'utf8');
  const mobileLooksBroken =
    !mobileContents.includes('works across many devices and browser versions') ||
    mobileContents.length < rootContents.length;

  if (!mobileLooksBroken) {
    return;
  }

  fs.copyFileSync(rootCsstypeFile, mobileCsstypeFile);
  process.stdout.write('Repaired mobile csstype definitions from root install.\n');
}

repairCsstypeIfNeeded();

const result = spawnSync(process.execPath, [rootTscEntrypoint, '--noEmit'], {
  cwd: mobileDir,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
