import type { ContentType } from '@prisma/client';
import type { SupportedLocale } from '@/i18n/config';
import type { ServerEnvironment } from '@/server/environment-core';

type MockupStep = { step: string; label: string };
type JourneyMockup = {
  directory: string;
  // Journey stage (module) and section ids that deep-link into a mockup step.
  stages?: Record<string, MockupStep>;
  sections?: Record<string, MockupStep>;
};

const lendingStep = {
  registration: { step: 'registration', label: 'Registration & OTP' },
  profile: { step: 'profile', label: 'Your profile' },
  eligibility: { step: 'eligibility', label: 'Eligibility' },
  bureau: { step: 'bureau', label: 'Credit check' },
  documents: { step: 'documents', label: 'Documents' },
  affordability: { step: 'affordability', label: 'Affordability' },
  decision: { step: 'decision', label: 'Decision engine' },
  simulation: { step: 'simulation', label: 'Simulation' },
  offer: { step: 'offer', label: 'Your offer' },
  signing: { step: 'signing', label: 'Agreement signing' },
} satisfies Record<string, MockupStep>;

const mockups: Record<string, JourneyMockup> = {
  'customer-onboarding': { directory: 'customer-onboarding' },
  lending: {
    directory: 'digital-lending',
    stages: {
      'registration-and-onboarding': lendingStep.registration,
      'profile-and-information-collection': lendingStep.profile,
      'eligibility-check': lendingStep.eligibility,
      'credit-assessment': lendingStep.bureau,
      'income-and-affordability': lendingStep.affordability,
      'loan-product-and-simulation': lendingStep.simulation,
      'document-upload': lendingStep.documents,
      'risk-assessment': lendingStep.decision,
      'decision-engine': lendingStep.decision,
      'offer-and-agreement': lendingStep.offer,
    },
    sections: {
      'offer-and-agreement-step-5-agreement-signing': lendingStep.signing,
      'offer-and-agreement-step-6-agreement-signing': lendingStep.signing,
    },
  },
};

export type MockupStepLink = { href: string; label: string };
export type JourneyMockupLinks = { stages: Record<string, MockupStepLink>; sections: Record<string, MockupStepLink> };

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
  return Object.hasOwn(mockups, slug) ? mockups[slug] : null;
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

/** Per-stage and per-section deep links (`#step=`) into the Development mockup, or null when unavailable. */
export function getDevelopmentMockupStepLinks(
  type: ContentType,
  slug: string,
  locale: SupportedLocale,
  environment: Pick<ServerEnvironment, 'APP_ENV' | 'DATABASE_ENVIRONMENT'>,
): JourneyMockupLinks | null {
  const base = getDevelopmentMockupHref(type, slug, locale, environment);
  const mockup = getJourneyMockup(slug);
  if (!base || !mockup?.stages) return null;
  const link = ({ step, label }: MockupStep) => ({ href: `${base}#step=${step}`, label });
  const map = (entries: Record<string, MockupStep> = {}) =>
    Object.fromEntries(Object.entries(entries).map(([id, step]) => [id, link(step)]));
  return { stages: map(mockup.stages), sections: map(mockup.sections) };
}
