import { z } from 'zod';

export const applicationEnvironmentSchema = z.enum([
  'development',
  'preview',
  'production',
  'test',
]);

export type ApplicationEnvironment = z.infer<typeof applicationEnvironmentSchema>;
export type EnvironmentSource = Record<string, string | undefined>;

const vercelEnvironmentSchema = z.enum(['development', 'preview', 'production']);
const postgresUrlSchema = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === 'postgres:' || protocol === 'postgresql:';
    } catch {
      return false;
    }
  }, 'A PostgreSQL connection URL is required.');

const optionalPostgresUrlSchema = z.preprocess(
  (value) => value === '' ? undefined : value,
  postgresUrlSchema.optional(),
);
const optionalAuthSecretSchema = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().min(32).optional(),
);

const booleanEnvironmentSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export interface ServerEnvironment {
  APP_ENV: ApplicationEnvironment;
  DATABASE_ENVIRONMENT: ApplicationEnvironment;
  DATABASE_URL: string;
  DIRECT_URL?: string;
  APP_BASE_URL: string;
  AUTH_SECRET?: string;
  ALLOW_PRODUCTION_DATABASE_OPERATIONS: boolean;
  ENABLE_STATIC_CONTENT_FALLBACK: boolean;
  KNOWLEDGE_ACCESS_MATRIX_MODE: 'disabled' | 'shadow' | 'enforced';
  VERCEL_ENV?: 'development' | 'preview' | 'production';
}

export type DatabaseOperation =
  | 'runtime'
  | 'migrate-status'
  | 'migrate-dev'
  | 'migrate-deploy'
  | 'seed-development'
  | 'import-sqlite-development'
  | 'backfill-development'
  | 'backfill-preview'
  | 'cleanup-development'
  | 'studio'
  | 'destructive';

export function resolveApplicationEnvironment(source: EnvironmentSource): ApplicationEnvironment {
  const explicit = source.APP_ENV
    ? applicationEnvironmentSchema.parse(source.APP_ENV)
    : undefined;
  const vercel = source.VERCEL_ENV
    ? vercelEnvironmentSchema.parse(source.VERCEL_ENV)
    : undefined;

  if (explicit && vercel && explicit !== vercel) {
    throw new Error('APP_ENV conflicts with VERCEL_ENV. Database operations have been blocked.');
  }
  if (explicit) return explicit;
  if (vercel) return vercel;
  if (source.NODE_ENV === 'test') return 'test';
  if (!source.NODE_ENV || source.NODE_ENV === 'development') return 'development';
  throw new Error('APP_ENV is required when the application environment cannot be resolved safely.');
}

export function parseServerEnvironment(
  source: EnvironmentSource = process.env,
  options: { requireAuthSecret?: boolean } = {},
): ServerEnvironment {
  const appEnvironment = resolveApplicationEnvironment(source);
  const previewHost = source.VERCEL_BRANCH_URL || source.VERCEL_URL;
  const normalizedSource = {
    ...source,
    APP_BASE_URL: source.APP_BASE_URL
      || (appEnvironment === 'preview' && previewHost ? `https://${previewHost}` : undefined),
  };
  const schema = z.object({
    DATABASE_ENVIRONMENT: applicationEnvironmentSchema,
    DATABASE_URL: postgresUrlSchema,
    DIRECT_URL: optionalPostgresUrlSchema,
    APP_BASE_URL: z.url(),
    AUTH_SECRET: options.requireAuthSecret === false
      ? optionalAuthSecretSchema
      : z.string().min(32),
    ALLOW_PRODUCTION_DATABASE_OPERATIONS: booleanEnvironmentSchema,
    ENABLE_STATIC_CONTENT_FALLBACK: booleanEnvironmentSchema,
    KNOWLEDGE_ACCESS_MATRIX_MODE: z.enum(['disabled', 'shadow', 'enforced']),
    VERCEL_ENV: vercelEnvironmentSchema.optional(),
  });
  const parsed = schema.parse(normalizedSource);
  if (appEnvironment === 'production' && parsed.ENABLE_STATIC_CONTENT_FALLBACK) {
    throw new Error('Static content fallback cannot be enabled in production.');
  }
  return { APP_ENV: appEnvironment, ...parsed };
}

export function assertDatabaseEnvironmentSafe(environment: ServerEnvironment) {
  if (environment.APP_ENV !== environment.DATABASE_ENVIRONMENT) {
    throw new Error(
      `Database environment mismatch: application is ${environment.APP_ENV} but the database label is ${environment.DATABASE_ENVIRONMENT}. Operations have been blocked.`,
    );
  }
}

export function assertDestructiveDatabaseOperationAllowed(environment: ServerEnvironment) {
  assertDatabaseEnvironmentSafe(environment);
  if (
    environment.DATABASE_ENVIRONMENT === 'production'
    && !environment.ALLOW_PRODUCTION_DATABASE_OPERATIONS
  ) {
    throw new Error(
      'Destructive database operation blocked because production operations are not explicitly enabled.',
    );
  }
}

export function assertDatabaseOperationAllowed(
  operation: DatabaseOperation,
  environment: ServerEnvironment,
) {
  assertDatabaseEnvironmentSafe(environment);
  if (operation === 'runtime' || operation === 'migrate-status') return;
  if (operation === 'migrate-dev' || operation === 'seed-development'
    || operation === 'import-sqlite-development' || operation === 'backfill-development'
    || operation === 'cleanup-development' || operation === 'studio') {
    if (
      environment.APP_ENV !== 'development'
      || environment.DATABASE_ENVIRONMENT !== 'development'
    ) {
      throw new Error(`${operation} is allowed only with a development application and development database.`);
    }
    return;
  }
  if (operation === 'migrate-deploy') {
    if (!['preview', 'production'].includes(environment.APP_ENV)) {
      throw new Error('migrate-deploy is allowed only for matching preview or production environments.');
    }
    return;
  }
  if (operation === 'backfill-preview') {
    if (
      environment.APP_ENV !== 'preview'
      || environment.DATABASE_ENVIRONMENT !== 'preview'
    ) {
      throw new Error('backfill-preview is allowed only with a preview application and preview database.');
    }
    return;
  }
  assertDestructiveDatabaseOperationAllowed(environment);
}
