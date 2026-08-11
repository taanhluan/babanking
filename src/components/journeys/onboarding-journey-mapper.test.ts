import { describe, expect, it } from 'vitest';
import { bankingJourneyContent, type BankingJourneyContent } from '@/data/content';
import { buildStageHref, deriveJourneyNavigation } from './journey-navigation';
import {
  mapOnboardingJourney,
  mapOnboardingToCanonical,
  buildOnboardingStructuredJourneyContent,
  ONBOARDING_FIELD_ACCOUNTING,
} from './onboarding-journey-mapper';

const onboarding = bankingJourneyContent.find((item) => item.slug === 'customer-onboarding') as BankingJourneyContent;

function canonicalValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(canonicalValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(canonicalValues);
  return [];
}

function sourceBusinessValues(source: BankingJourneyContent) {
  return [
    source.businessOverview,
    ...source.customerGoals, ...source.businessGoals, ...source.keyActors, ...source.channels, ...source.systems, ...source.capabilities,
    ...source.processSteps.flatMap((step) => [step.title, step.description]),
    ...source.businessRules.flatMap((rule) => [rule.title, rule.description]),
    ...source.dataEntities,
    ...source.risksAndControls.flatMap((item) => [item.risk, item.control]),
    ...source.commonExceptions, ...source.baQuestions, ...source.baOutputs,
  ];
}

describe('Customer Onboarding canonical adapter', () => {
  it('accounts for every field in the actual source contract', () => {
    expect(onboarding).toBeDefined();
    expect(Object.keys(ONBOARDING_FIELD_ACCOUNTING).sort()).toEqual(Object.keys(onboarding).sort());
    expect(Object.values(ONBOARDING_FIELD_ACCOUNTING)).not.toContain('INTENTIONALLY_EXCLUDED');
  });

  it('maps actual process steps to stable stages without losing process detail', () => {
    const journey = mapOnboardingToCanonical(onboarding);
    const lifecycle = journey.stages.slice(1, -1);
    expect(lifecycle.map((stage) => stage.title)).toEqual(onboarding.processSteps.map((step) => step.title));
    expect(lifecycle.map((stage) => stage.summary)).toEqual(onboarding.processSteps.map((step) => step.description));
    expect(lifecycle.map((stage) => stage.id)).toEqual(['capture-customer-data', 'verify-identity', 'screen-and-assess-risk', 'approve-and-open-account']);
  });

  it('preserves every required source business value in canonical content', () => {
    const mapped = new Set(canonicalValues(mapOnboardingToCanonical(onboarding)));
    for (const value of sourceBusinessValues(onboarding)) expect(mapped, value).toContain(value);
  });

  it('preserves structured business rules and risk/control pairs exactly', () => {
    const journey = mapOnboardingToCanonical(onboarding);
    const analysis = journey.stages.at(-1)!;
    const rules = analysis.states.find((item) => item.id === 'business-rules')!.blocks[0].payload;
    const risks = analysis.states.find((item) => item.id === 'risks-and-controls')!.blocks[0].payload;
    expect(rules).toEqual({ title: 'Business Rules', columns: ['Rule', 'Description', 'Illustrative'], rows: onboarding.businessRules.map(({ title, description, illustrative }) => [title, description, illustrative]) });
    expect(risks).toEqual({ title: 'Risks and Controls', columns: ['Risk', 'Control'], rows: onboarding.risksAndControls.map(({ risk, control }) => [risk, control]) });
  });

  it('uses only generic supported blocks and fabricates no diagram or API content', () => {
    const types = mapOnboardingToCanonical(onboarding).stages.flatMap((stage) => stage.states.flatMap((item) => item.blocks.map((entry) => entry.blockType)));
    expect(new Set(types)).toEqual(new Set(['RICH_TEXT', 'CHECKLIST', 'TABLE']));
    expect(types).not.toContain('DIAGRAM');
    expect(types).not.toContain('API_REFERENCE');
  });

  it('preserves related content and keywords as non-visible compatibility metadata', () => {
    const { metadata, journey } = mapOnboardingJourney(onboarding);
    expect(metadata).toMatchObject({
      keywords: onboarding.keywords,
      relatedPracticeSlugs: onboarding.relatedPracticeSlugs,
      relatedCaseStudySlugs: onboarding.relatedCaseStudySlugs,
      relatedJourneySlugs: onboarding.relatedJourneySlugs,
    });
    expect(canonicalValues(journey)).not.toEqual(expect.arrayContaining(onboarding.keywords));
  });

  it('produces deterministic IDs and suffixes duplicate process-step titles', () => {
    expect(mapOnboardingJourney(onboarding)).toEqual(mapOnboardingJourney(onboarding));
    const duplicate = { ...onboarding, processSteps: [onboarding.processSteps[0], onboarding.processSteps[0]] };
    const stages = mapOnboardingToCanonical(duplicate).stages.slice(1, -1);
    expect(stages.map((stage) => stage.id)).toEqual(['capture-customer-data', 'capture-customer-data-2']);
    expect(stages.flatMap((stage) => stage.states.map((item) => item.id))).toEqual(['capture-customer-data-purpose-details', 'capture-customer-data-2-purpose-details']);
    expect(stages.flatMap((stage) => stage.states.flatMap((item) => item.blocks.map((entry) => entry.id)))).toEqual(['capture-customer-data-purpose-details', 'capture-customer-data-2-purpose-details']);
  });

  it('is compatible with shared navigation and URLs without paymentType', () => {
    const journey = mapOnboardingToCanonical(onboarding);
    const navigation = deriveJourneyNavigation(journey.stages);
    expect(navigation).toHaveLength(onboarding.processSteps.length + 2);
    expect(buildStageHref({ basePath: '/en/banking-journeys/customer-onboarding' }, navigation[1].id, navigation[1].sections[0].id))
      .toBe('/en/banking-journeys/customer-onboarding?stage=capture-customer-data#state-capture-customer-data-purpose-details');
  });

  it('generates clean deterministic CMS modules without duplicated legacy business fields', () => {
    const content = buildOnboardingStructuredJourneyContent(onboarding);
    expect(content).toEqual(buildOnboardingStructuredJourneyContent(onboarding));
    expect(content.metadata).toMatchObject({ journeyReader: 'canonical', shortTitle: onboarding.shortTitle, category: onboarding.category, keywords: onboarding.keywords });
    expect(content.modules.map((item) => item.title)).toEqual(['Overview', ...onboarding.processSteps.map((item) => item.title), 'Business Analysis']);
    expect(content.modules.flatMap((item) => item.sections).flatMap((item) => item.blocks).every((item) => item.schemaVersion === 1)).toBe(true);
    expect(content).not.toHaveProperty('businessOverview');
    expect(content).not.toHaveProperty('processSteps');
  });
});
