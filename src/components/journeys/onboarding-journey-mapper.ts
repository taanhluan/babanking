import type { BankingJourneyContent } from '@/data/content';
import {
  canonicalId,
  type CanonicalBlock,
  type CanonicalJourney,
  type CanonicalStage,
  type CanonicalState,
} from './canonical-journey-mapper';

export const ONBOARDING_FIELD_ACCOUNTING = {
  slug: 'MAPPED_TO_METADATA',
  title: 'MAPPED_TO_CANONICAL_CONTENT',
  shortTitle: 'MAPPED_TO_METADATA',
  category: 'MAPPED_TO_METADATA',
  summary: 'MAPPED_TO_CANONICAL_CONTENT',
  businessOverview: 'MAPPED_TO_CANONICAL_CONTENT',
  customerGoals: 'MAPPED_TO_CANONICAL_CONTENT',
  businessGoals: 'MAPPED_TO_CANONICAL_CONTENT',
  keyActors: 'MAPPED_TO_CANONICAL_CONTENT',
  channels: 'MAPPED_TO_CANONICAL_CONTENT',
  systems: 'MAPPED_TO_CANONICAL_CONTENT',
  capabilities: 'MAPPED_TO_CANONICAL_CONTENT',
  processSteps: 'MAPPED_TO_CANONICAL_CONTENT',
  businessRules: 'MAPPED_TO_CANONICAL_CONTENT',
  dataEntities: 'MAPPED_TO_CANONICAL_CONTENT',
  risksAndControls: 'MAPPED_TO_CANONICAL_CONTENT',
  commonExceptions: 'MAPPED_TO_CANONICAL_CONTENT',
  baQuestions: 'MAPPED_TO_CANONICAL_CONTENT',
  baOutputs: 'MAPPED_TO_CANONICAL_CONTENT',
  relatedPracticeSlugs: 'PRESERVED_FOR_COMPATIBILITY',
  relatedCaseStudySlugs: 'PRESERVED_FOR_COMPATIBILITY',
  relatedJourneySlugs: 'PRESERVED_FOR_COMPATIBILITY',
  keywords: 'MAPPED_TO_METADATA',
} as const satisfies Record<keyof BankingJourneyContent, FieldAccountingDisposition>;

export type FieldAccountingDisposition =
  | 'MAPPED_TO_CANONICAL_CONTENT'
  | 'MAPPED_TO_METADATA'
  | 'PRESERVED_FOR_COMPATIBILITY'
  | 'NOT_APPLICABLE'
  | 'INTENTIONALLY_EXCLUDED';

export type OnboardingCanonicalMetadata = {
  slug: string;
  shortTitle: string;
  category: string;
  keywords: string[];
  relatedPracticeSlugs: string[];
  relatedCaseStudySlugs: string[];
  relatedJourneySlugs: string[];
};

export type OnboardingCanonicalMapping = {
  journey: CanonicalJourney;
  metadata: OnboardingCanonicalMetadata;
};

export type StructuredOnboardingJourneyContent = {
  title: string;
  slug: string;
  summary: string;
  schemaVersion: 1;
  metadata: OnboardingCanonicalMetadata & { journeyReader: 'canonical' };
  modules: Array<{
    id: string;
    key: string;
    title: string;
    summary?: string;
    order: number;
    sections: Array<{
      id: string;
      key: string;
      title: string;
      summary?: string;
      order: number;
      blocks: Array<CanonicalBlock & { schemaVersion: 1 }>;
    }>;
  }>;
};

function uniqueId(value: string, used: Set<string>) {
  let candidate = value;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${value}-${suffix++}`;
  used.add(candidate);
  return candidate;
}

function block(id: string, blockType: 'RICH_TEXT' | 'CHECKLIST' | 'TABLE', payload: Record<string, unknown>): CanonicalBlock {
  return { id: canonicalId(id, 'block'), blockType, payload };
}

function state(id: string, title: string, content: CanonicalBlock[], summary?: string): CanonicalState {
  return { id: canonicalId(id, 'state'), title, summary, blocks: content, children: [] };
}

function createStage(id: string, title: string, states: CanonicalState[], usedIds: Set<string>, summary?: string): CanonicalStage {
  return { id: uniqueId(canonicalId(id || title, 'stage'), usedIds), title, summary, states };
}

export function mapOnboardingJourney(source: BankingJourneyContent): OnboardingCanonicalMapping {
  const usedStageIds = new Set<string>();
  const overview = createStage('overview', 'Overview', [
    state('business-overview', 'Business Overview', [block('business-overview', 'RICH_TEXT', { title: 'Business Overview', text: source.businessOverview })]),
    state('customer-goals', 'Customer Goals', [block('customer-goals', 'CHECKLIST', { title: 'Customer Goals', items: source.customerGoals })]),
    state('business-goals', 'Business Goals', [block('business-goals', 'CHECKLIST', { title: 'Business Goals', items: source.businessGoals })]),
    state('key-actors', 'Key Actors', [block('key-actors', 'CHECKLIST', { title: 'Key Actors', items: source.keyActors })]),
    state('channels', 'Channels', [block('channels', 'CHECKLIST', { title: 'Channels', items: source.channels })]),
    state('systems', 'Systems', [block('systems', 'CHECKLIST', { title: 'Systems', items: source.systems })]),
    state('capabilities', 'Capabilities', [block('capabilities', 'CHECKLIST', { title: 'Capabilities', items: source.capabilities })]),
  ], usedStageIds, source.summary);

  const processStages = source.processSteps.map((step) => {
    const stageId = uniqueId(canonicalId(step.title, 'stage'), usedStageIds);
    const detailId = canonicalId(`${stageId}-purpose-details`, 'state');
    return {
      id: stageId,
      title: step.title,
      summary: step.description,
      states: [state(detailId, 'Purpose and Details', [
        block(detailId, 'RICH_TEXT', { title: 'Purpose and Details', text: step.description }),
      ], step.description)],
    };
  });

  const analysis = createStage('business-analysis', 'Business Analysis', [
    state('business-rules', 'Business Rules', [block('business-rules', 'TABLE', {
      title: 'Business Rules', columns: ['Rule', 'Description', 'Illustrative'], rows: source.businessRules.map((rule) => [rule.title, rule.description, rule.illustrative]),
    })]),
    state('data-entities', 'Data Entities', [block('data-entities', 'CHECKLIST', { title: 'Data Entities', items: source.dataEntities })]),
    state('risks-and-controls', 'Risks and Controls', [block('risks-and-controls', 'TABLE', {
      title: 'Risks and Controls', columns: ['Risk', 'Control'], rows: source.risksAndControls.map((item) => [item.risk, item.control]),
    })]),
    state('common-exceptions', 'Common Exceptions', [block('common-exceptions', 'CHECKLIST', { title: 'Common Exceptions', items: source.commonExceptions })]),
    state('ba-questions', 'BA Questions', [block('ba-questions', 'CHECKLIST', { title: 'BA Questions', items: source.baQuestions })]),
    state('ba-outputs', 'BA Outputs', [block('ba-outputs', 'CHECKLIST', { title: 'BA Outputs', items: source.baOutputs })]),
  ], usedStageIds);

  return {
    journey: { id: canonicalId(source.slug, 'customer-onboarding'), title: source.title, summary: source.summary, stages: [overview, ...processStages, analysis] },
    metadata: {
      slug: source.slug,
      shortTitle: source.shortTitle,
      category: source.category,
      keywords: [...source.keywords],
      relatedPracticeSlugs: [...source.relatedPracticeSlugs],
      relatedCaseStudySlugs: [...source.relatedCaseStudySlugs],
      relatedJourneySlugs: [...source.relatedJourneySlugs],
    },
  };
}

export function mapOnboardingToCanonical(source: BankingJourneyContent): CanonicalJourney {
  return mapOnboardingJourney(source).journey;
}

export function buildOnboardingStructuredJourneyContent(source: BankingJourneyContent): StructuredOnboardingJourneyContent {
  const { journey, metadata } = mapOnboardingJourney(source);
  return {
    title: journey.title,
    slug: source.slug,
    summary: journey.summary || source.summary,
    schemaVersion: 1,
    metadata: { journeyReader: 'canonical', ...metadata },
    modules: journey.stages.map((stage, stageIndex) => ({
      id: stage.id,
      key: stage.id,
      title: stage.title,
      summary: stage.summary,
      order: stageIndex,
      sections: stage.states.map((item, stateIndex) => ({
        id: item.id,
        key: item.id,
        title: item.title,
        summary: item.summary,
        order: stateIndex,
        blocks: item.blocks.map((entry) => ({ ...entry, schemaVersion: 1 })),
      })),
    })),
  };
}
