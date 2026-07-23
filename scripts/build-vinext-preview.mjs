import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const databasePath = fileURLToPath(new URL('../src/lib/db.ts', import.meta.url));
const previewDatabasePath = fileURLToPath(new URL('../src/lib/db.preview.ts', import.meta.url));
const vinextCliPath = fileURLToPath(new URL('../node_modules/vinext/dist/cli.js', import.meta.url));

const originalDatabase = await readFile(databasePath);
const previewDatabase = await readFile(previewDatabasePath);

try {
  await writeFile(databasePath, previewDatabase);
  const result = spawnSync(process.execPath, [vinextCliPath, 'build'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, CLOUDFLARE_PUBLIC_PREVIEW: '1' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  await writeFile(databasePath, originalDatabase);
}
