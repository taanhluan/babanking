import type { ContentType } from '@prisma/client';
import type { SupportedLocale } from '@/i18n/config';
import type { ServerEnvironment } from '@/server/environment-core';

type MockupStep = { step: string; label: string };
type JourneyMockup = {
  directory: string;
  // Allow-listed files (path → content type); nothing else in the directory is served.
  files: Record<string, string>;
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

const onboardingStep = {
  product: { step: 'product', label: 'Select product' },
  contact: { step: 'contact', label: 'Contact & OTP' },
  eligibility: { step: 'eligibility', label: 'Eligibility' },
  identity: { step: 'identity', label: 'Verify identity' },
  information: { step: 'information', label: 'Your information' },
  configuration: { step: 'configuration', label: 'Product options' },
  digital: { step: 'digital', label: 'Digital banking' },
  card: { step: 'card', label: 'Card options' },
  consent: { step: 'consent', label: 'Agreements' },
  provisioning: { step: 'provisioning', label: 'Create product' },
} satisfies Record<string, MockupStep>;

const datumFiles: Record<string, string> = {
  'index.html': 'text/html; charset=utf-8',
  'app.mjs': 'text/javascript; charset=utf-8',
  'model.mjs': 'text/javascript; charset=utf-8',
  'assets/datum-logo-white.png': 'image/png',
  'assets/datum-favicon.svg': 'image/svg+xml',
  'assets/manrope-regular.ttf': 'font/ttf',
  'assets/manrope-semibold.ttf': 'font/ttf',
  'assets/manrope-bold.ttf': 'font/ttf',
};

const iftFeeWorkbenchFiles: Record<string, string> = {
  'index.html': 'text/html; charset=utf-8',
  'styles.css': 'text/css; charset=utf-8',
  'app.mjs': 'text/javascript; charset=utf-8',
  'engine.mjs': 'text/javascript; charset=utf-8',
};

const mockups: Record<string, JourneyMockup> = {
  'customer-onboarding': {
    directory: 'customer-onboarding',
    files: datumFiles,
    stages: {
      overview: onboardingStep.product,
      'initiation-and-eligibility': onboardingStep.eligibility,
      'application-management': onboardingStep.contact,
      'customer-information-service': onboardingStep.information,
      'account-setup-service': onboardingStep.configuration,
      'digital-banking-enrollment-service': onboardingStep.digital,
      'card-enrollment-service': onboardingStep.card,
      'consent-agreement-service': onboardingStep.consent,
      'account-creation-service-provisioning': onboardingStep.provisioning,
      'external-system-integration': onboardingStep.identity,
    },
    sections: {
      'application-management-start-application': onboardingStep.product,
    },
  },
  lending: {
    directory: 'digital-lending',
    files: datumFiles,
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
  // T24 → IFT corporate international transfer fee workbench (no step deep links).
  'payments-and-transfers': {
    directory: 'ift-fee-workbench',
    files: iftFeeWorkbenchFiles,
  },
};

export type MockupStepLink = { href: string; label: string };
export type JourneyMockupLinks = { stages: Record<string, MockupStepLink>; sections: Record<string, MockupStepLink> };

export function isDevelopmentMockupEnvironment(
  environment: Pick<ServerEnvironment, 'APP_ENV' | 'DATABASE_ENVIRONMENT'>,
) {
  return environment.APP_ENV === 'development'
    && environment.DATABASE_ENVIRONMENT === 'development';
}

export function getJourneyMockup(slug: string) {
  return Object.hasOwn(mockups, slug) ? mockups[slug] : null;
}

export function getMockupResource(mockup: JourneyMockup, asset?: string[]) {
  const file = asset?.length ? asset.join('/') : 'index.html';
  return Object.hasOwn(mockup.files, file) ? { file, contentType: mockup.files[file] } : null;
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
