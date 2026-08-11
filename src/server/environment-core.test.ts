import { describe, expect, it } from 'vitest';
import {
  assertDatabaseOperationAllowed,
  parseServerEnvironment,
  resolveApplicationEnvironment,
  type EnvironmentSource,
  type ServerEnvironment,
} from './environment-core';
import { getSafeEnvironmentDiagnostic } from './database/database-environment-core';

const baseSource: EnvironmentSource = {
  APP_ENV: 'development',
  DATABASE_ENVIRONMENT: 'development',
  DATABASE_URL: 'postgresql://development.example.test/app_dev?sslmode=require',
  DIRECT_URL: 'postgresql://development.example.test/app_dev?sslmode=require',
  APP_BASE_URL: 'http://localhost:3000',
  AUTH_SECRET: 'test-secret-that-is-longer-than-thirty-two-characters',
  ALLOW_PRODUCTION_DATABASE_OPERATIONS: 'false',
  ENABLE_STATIC_CONTENT_FALLBACK: 'false',
  KNOWLEDGE_ACCESS_MATRIX_MODE: 'enforced',
};

function environment(overrides: Partial<ServerEnvironment> = {}): ServerEnvironment {
  return {
    ...parseServerEnvironment(baseSource),
    ...overrides,
  };
}

describe('application environment resolution', () => {
  it('uses explicit APP_ENV', () => {
    expect(resolveApplicationEnvironment({ APP_ENV: 'preview' })).toBe('preview');
  });

  it('uses validated VERCEL_ENV when APP_ENV is absent', () => {
    expect(resolveApplicationEnvironment({ VERCEL_ENV: 'preview' })).toBe('preview');
  });

  it('blocks conflicting environment values', () => {
    expect(() => resolveApplicationEnvironment({
      APP_ENV: 'development',
      VERCEL_ENV: 'production',
    })).toThrow(/conflicts/);
  });

  it('blocks unknown environments', () => {
    expect(() => resolveApplicationEnvironment({ APP_ENV: 'staging' })).toThrow();
    expect(() => resolveApplicationEnvironment({ NODE_ENV: 'production' })).toThrow(/required/);
  });

  it('derives the Preview application URL from VERCEL_BRANCH_URL', () => {
    const parsed = parseServerEnvironment({
      ...baseSource,
      APP_ENV: 'preview',
      DATABASE_ENVIRONMENT: 'preview',
      APP_BASE_URL: undefined,
      VERCEL_ENV: 'preview',
      VERCEL_BRANCH_URL: 'preview.example.vercel.app',
    });
    expect(parsed.APP_BASE_URL).toBe('https://preview.example.vercel.app');
  });
});

describe('database safety guard', () => {
  it.each([
    ['development', 'development'],
    ['preview', 'preview'],
    ['production', 'production'],
  ] as const)('allows %s runtime with a %s database label', (app, database) => {
    expect(() => assertDatabaseOperationAllowed('runtime', environment({
      APP_ENV: app,
      DATABASE_ENVIRONMENT: database,
    }))).not.toThrow();
  });

  it.each([
    ['development', 'production'],
    ['preview', 'production'],
  ] as const)('blocks %s runtime with a %s database label', (app, database) => {
    expect(() => assertDatabaseOperationAllowed('runtime', environment({
      APP_ENV: app,
      DATABASE_ENVIRONMENT: database,
    }))).toThrow(/mismatch/);
  });

  it('blocks destructive production operations by default', () => {
    expect(() => assertDatabaseOperationAllowed('destructive', environment({
      APP_ENV: 'production',
      DATABASE_ENVIRONMENT: 'production',
    }))).toThrow(/blocked/);
  });

  it('allows destructive production operations only with the explicit technical override', () => {
    expect(() => assertDatabaseOperationAllowed('destructive', environment({
      APP_ENV: 'production',
      DATABASE_ENVIRONMENT: 'production',
      ALLOW_PRODUCTION_DATABASE_OPERATIONS: true,
    }))).not.toThrow();
  });

  it('allows development seed only in development', () => {
    expect(() => assertDatabaseOperationAllowed('seed-development', environment())).not.toThrow();
    expect(() => assertDatabaseOperationAllowed('seed-development', environment({
      APP_ENV: 'production',
      DATABASE_ENVIRONMENT: 'production',
    }))).toThrow(/development/);
  });

  it('blocks migrate dev outside development', () => {
    expect(() => assertDatabaseOperationAllowed('migrate-dev', environment({
      APP_ENV: 'preview',
      DATABASE_ENVIRONMENT: 'preview',
    }))).toThrow(/development/);
  });
});

describe('safe database diagnostics', () => {
  it('never contains credentials or the full database URL', () => {
    const diagnostic = getSafeEnvironmentDiagnostic(environment());
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic.host).toBe('development.example.test');
    expect(diagnostic.databaseName).toBe('app_dev');
    expect(diagnostic.credentialsHidden).toBe(true);
    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain(baseSource.DATABASE_URL);
  });
});
