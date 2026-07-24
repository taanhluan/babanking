import {
  assertDatabaseEnvironmentSafe,
  type ApplicationEnvironment,
  type ServerEnvironment,
} from '../environment-core';

export interface SafeDatabaseIdentity {
  configured: boolean;
  host: string;
  databaseName: string;
  expectedEnvironment: ApplicationEnvironment;
  credentialsHidden: true;
}

export interface SafeEnvironmentDiagnostic extends SafeDatabaseIdentity {
  applicationEnvironment: ApplicationEnvironment;
  databaseEnvironment: ApplicationEnvironment;
  vercelEnvironment: string;
  staticFallbackEnabled: boolean;
  safetyStatus: 'Safe' | 'Configuration mismatch' | 'Database unavailable' | 'Production protected';
}

export function getSafeDatabaseIdentity(environment: ServerEnvironment): SafeDatabaseIdentity {
  try {
    const databaseUrl = new URL(environment.DATABASE_URL);
    return {
      configured: true,
      host: databaseUrl.hostname,
      databaseName: databaseUrl.pathname.replace(/^\/+/, '') || '(default)',
      expectedEnvironment: environment.DATABASE_ENVIRONMENT,
      credentialsHidden: true,
    };
  } catch {
    return {
      configured: false,
      host: '(unavailable)',
      databaseName: '(unavailable)',
      expectedEnvironment: environment.DATABASE_ENVIRONMENT,
      credentialsHidden: true,
    };
  }
}

export function getSafeEnvironmentDiagnostic(
  environment: ServerEnvironment,
): SafeEnvironmentDiagnostic {
  const identity = getSafeDatabaseIdentity(environment);
  let safetyStatus: SafeEnvironmentDiagnostic['safetyStatus'] = 'Safe';
  try {
    assertDatabaseEnvironmentSafe(environment);
    if (environment.DATABASE_ENVIRONMENT === 'production'
      && !environment.ALLOW_PRODUCTION_DATABASE_OPERATIONS) {
      safetyStatus = 'Production protected';
    } else if (!identity.configured) {
      safetyStatus = 'Database unavailable';
    }
  } catch {
    safetyStatus = 'Configuration mismatch';
  }
  return {
    ...identity,
    applicationEnvironment: environment.APP_ENV,
    databaseEnvironment: environment.DATABASE_ENVIRONMENT,
    vercelEnvironment: environment.VERCEL_ENV ?? 'not provided',
    staticFallbackEnabled: environment.ENABLE_STATIC_CONTENT_FALLBACK,
    safetyStatus,
  };
}
