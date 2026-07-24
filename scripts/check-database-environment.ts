import {
  assertDatabaseEnvironmentSafe,
  parseServerEnvironment,
} from '../src/server/environment-core';
import { loadEnvironmentFiles } from './load-environment-files';

try {
  loadEnvironmentFiles();
  const environment = parseServerEnvironment(process.env, { requireAuthSecret: false });
  const databaseUrl = new URL(environment.DATABASE_URL);

  console.log(`Application environment: ${environment.APP_ENV}`);
  console.log(`Expected database environment: ${environment.DATABASE_ENVIRONMENT}`);
  console.log('Database configured: yes');
  console.log(`Database host: ${databaseUrl.hostname}`);
  console.log(`Database name: ${databaseUrl.pathname.replace(/^\/+/, '') || '(default)'}`);
  console.log('Credentials hidden: yes');
  assertDatabaseEnvironmentSafe(environment);
  console.log('Safety check passed.');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Environment validation failed.';
  console.error(`Database environment check blocked: ${message}`);
  process.exitCode = 1;
}
