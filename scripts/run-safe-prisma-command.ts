import { spawnSync } from 'node:child_process';
import {
  assertDatabaseOperationAllowed,
  parseServerEnvironment,
  type DatabaseOperation,
} from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

const commandName = process.argv[2];
const commands: Record<string, { operation: DatabaseOperation; command: string; args: string[] }> = {
  'migrate-status': {
    operation: 'migrate-status',
    command: 'npx',
    args: ['prisma', 'migrate', 'status'],
  },
  'migrate-dev': {
    operation: 'migrate-dev',
    command: 'npx',
    args: ['prisma', 'migrate', 'dev'],
  },
  'migrate-deploy': {
    operation: 'migrate-deploy',
    command: 'npx',
    args: ['prisma', 'migrate', 'deploy'],
  },
  'seed-development': {
    operation: 'seed-development',
    command: 'npx',
    args: ['tsx', 'prisma/seed.ts'],
  },
  'import-sqlite-development': {
    operation: 'import-sqlite-development',
    command: 'npx',
    args: ['tsx', 'scripts/import-legacy-sqlite.ts'],
  },
  studio: {
    operation: 'studio',
    command: 'npx',
    args: ['prisma', 'studio'],
  },
};

const selected = commands[commandName];
if (!selected) {
  throw new Error('Unknown safe database command.');
}

loadEnvironmentFiles();
const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
assertDatabaseOperationAllowed(selected.operation, environment);

const result = spawnSync(selected.command, selected.args, {
  stdio: 'inherit',
  env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
