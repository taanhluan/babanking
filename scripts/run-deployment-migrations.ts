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
if (result.status !== 0) process.exit(result.status ?? 1);

// A release-specific, explicit Production flag promotes the immutable approved
// Customer Segment artifact after its additive migration and before app build.
if (environment.APP_ENV === 'production' && process.env.CUSTOMER_SEGMENT_RELEASE_CONFIRM) {
  const promotion = spawnSync('npx', ['tsx', 'scripts/promote-customer-segments.ts', '--apply'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (promotion.error) throw promotion.error;
  if (promotion.status !== 0) process.exit(promotion.status ?? 1);
}

// A separate one-time release gate promotes only SME and Enterprise Banking.
// The promotion itself verifies that Retail Banking's hash and published pointer
// remain unchanged before the transaction can commit.
if (environment.APP_ENV === 'production' && process.env.SME_ENTERPRISE_RELEASE_CONFIRM) {
  const promotion = spawnSync('npx', ['tsx', 'scripts/promote-sme-enterprise-release.ts', '--apply'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (promotion.error) throw promotion.error;
  if (promotion.status !== 0) process.exit(promotion.status ?? 1);
}

process.exit(0);
