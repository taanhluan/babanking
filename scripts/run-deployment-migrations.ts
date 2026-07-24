import { spawnSync } from 'node:child_process';
import { parseServerEnvironment } from '../src/server/environment-core';

// Migrations are a controlled Vercel build step, never an application-startup step.
if (process.env.VERCEL !== '1') {
  console.log('Skipping deployment migrations outside Vercel.');
  process.exit(0);
}

const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
if (!['preview', 'production'].includes(environment.APP_ENV)) {
  throw new Error('Deployment migrations are permitted only for Vercel Preview or Production.');
}

const result = spawnSync('npx', ['tsx', 'scripts/run-safe-prisma-command.ts', 'migrate-deploy'], {
  stdio: 'inherit',
  env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
