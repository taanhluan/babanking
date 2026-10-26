import type { ContentType } from '@prisma/client';
import type { SupportedLocale } from '@/i18n/config';
import type { ServerEnvironment } from '@/server/environment-core';

const mockups = {
  'customer-onboarding': { directory: 'customer-onboarding' },
} as const;

const files: Record<string, string> = {
  'index.html': 'text/html; charset=utf-8',
  'app.mjs': 'text/javascript; charset=utf-8',
  'model.mjs': 'text/javascript; charset=utf-8',
  'assets/datum-logo-white.png': 'image/png',
  'assets/datum-favicon.svg': 'image/svg+xml',
  'assets/manrope-regular.ttf': 'font/ttf',
  'assets/manrope-semibold.ttf': 'font/ttf',
  'assets/manrope-bold.ttf': 'font/ttf',
};

export function isDevelopmentMockupEnvironment(
  environment: Pick<ServerEnvironment, 'APP_ENV' | 'DATABASE_ENVIRONMENT'>,
) {
  return environment.APP_ENV === 'development'
    && environment.DATABASE_ENVIRONMENT === 'development';
}

export function getJourneyMockup(slug: string) {
  return Object.hasOwn(mockups, slug) ? mockups[slug as keyof typeof mockups] : null;
}

export function getMockupResource(asset?: string[]) {
  const file = asset?.length ? asset.join('/') : 'index.html';
  return Object.hasOwn(files, file) ? { file, contentType: files[file] } : null;
}

export function getDevelopmentMockupHref(
  type: ContentType,
  slug: string,
  locale: SupportedLocale,
  environment: Pick<ServerEnvironment, 'APP_ENV' | 'DATABASE_ENVIRONMENT'>,
) {
  if (type !== 'BANKING_JOURNEY' || !isDevelopmentMockupEnvironment(environment)
    || !getJourneyMockup(slug)) return null;
  return `/${locale}/banking-journeys/${slug}/mockup`;
}
