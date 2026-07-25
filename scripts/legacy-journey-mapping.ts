import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { BankingJourneyContent } from '../src/data/content';

export type JourneyImportBlock = {
  stableKey: string;
  blockType: 'RICH_TEXT' | 'TABLE' | 'BUSINESS_RULE' | 'CHECKLIST' | 'CALLOUT' | 'REFERENCE';
  payload: Prisma.InputJsonObject;
};

export type JourneyImportSection = {
  stableKey: string;
  title: string;
  blocks: JourneyImportBlock[];
};

export type JourneyImportModule = {
  stableKey: string;
  title: string;
  description: string;
  sections: JourneyImportSection[];
};

export type JourneyImportRecord = {
  slug: string;
  stableKey: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  checksum: string;
  metadata: Record<string, unknown>;
  modules: JourneyImportModule[];
};

function section(
  stableKey: string,
  title: string,
  blockType: JourneyImportBlock['blockType'],
  payload: Prisma.InputJsonObject,
): JourneyImportSection {
  return {
    stableKey,
    title,
    blocks: [{ stableKey: `${stableKey}-content`, blockType, payload }],
  };
}

export function mapLegacyJourney(source: BankingJourneyContent): JourneyImportRecord {
  const checksum = createHash('sha256').update(JSON.stringify(source)).digest('hex');
  const metadata = {
    title: source.title,
    shortTitle: source.shortTitle,
    slug: source.slug,
    summary: source.summary,
    category: source.category,
    keywords: source.keywords,
    relatedJourneySlugs: source.relatedJourneySlugs,
    relatedPracticeSlugs: source.relatedPracticeSlugs,
    relatedCaseStudySlugs: source.relatedCaseStudySlugs,
    migration: { source: 'static-banking-journeys-v1', checksum },
  };

  return {
    slug: source.slug,
    stableKey: `BANKING_JOURNEY:${source.slug}`,
    title: source.title,
    summary: source.summary,
    category: source.category,
    tags: source.keywords,
    checksum,
    metadata,
    modules: [
      {
        stableKey: 'overview',
        title: 'Business Overview',
        description: 'Customer and business outcomes for this Banking Journey.',
        sections: [
          section('business-overview', 'Overview', 'RICH_TEXT', { text: source.businessOverview }),
          section('customer-goals', 'Customer Goals', 'CHECKLIST', { items: source.customerGoals }),
          section('business-goals', 'Business Goals', 'CHECKLIST', { items: source.businessGoals }),
        ],
      },
      {
        stableKey: 'ecosystem',
        title: 'Actors, Channels and Systems',
        description: 'The participants and technology involved in delivering the Journey.',
        sections: [
          section('key-actors', 'Key Actors', 'CHECKLIST', { items: source.keyActors }),
          section('channels', 'Channels', 'CHECKLIST', { items: source.channels }),
          section('systems', 'Systems', 'CHECKLIST', { items: source.systems }),
        ],
      },
      {
        stableKey: 'capabilities-and-process',
        title: 'Capabilities and Process',
        description: 'Business capabilities and the end-to-end operating flow.',
        sections: [
          section('capabilities', 'Capabilities', 'CHECKLIST', { items: source.capabilities }),
          section('process-steps', 'Process Steps', 'REFERENCE', {
            items: source.processSteps.map((step) => ({ title: step.title, description: step.description })),
          }),
        ],
      },
      {
        stableKey: 'rules-and-data',
        title: 'Business Rules and Data',
        description: 'Illustrative decision logic, core data and exception scenarios.',
        sections: [
          section('business-rules', 'Business Rules', 'BUSINESS_RULE', {
            items: source.businessRules.map((rule) => ({ title: rule.title, description: rule.description, illustrative: true })),
          }),
          section('data-entities', 'Data Entities', 'CHECKLIST', { items: source.dataEntities }),
          section('common-exceptions', 'Common Exceptions', 'CALLOUT', { title: 'Exception scenarios', items: source.commonExceptions }),
        ],
      },
      {
        stableKey: 'risk-and-control',
        title: 'Risks and Controls',
        description: 'Key risks and corresponding control considerations.',
        sections: [
          section('risks-and-controls', 'Risk and Control Matrix', 'TABLE', {
            columns: ['Risk', 'Control'],
            rows: source.risksAndControls.map((entry) => [entry.risk, entry.control]),
          }),
        ],
      },
      {
        stableKey: 'ba-toolkit',
        title: 'Business Analysis Toolkit',
        description: 'Questions and expected outputs for Banking Business Analysts.',
        sections: [
          section('ba-questions', 'BA Questions', 'CHECKLIST', { items: source.baQuestions }),
          section('ba-outputs', 'BA Outputs', 'CHECKLIST', { items: source.baOutputs }),
          section('related-knowledge', 'Related Knowledge', 'REFERENCE', {
            groups: [
              { title: 'Banking Journeys', slugs: source.relatedJourneySlugs },
              { title: 'BA Practices', slugs: source.relatedPracticeSlugs },
              { title: 'Case Studies', slugs: source.relatedCaseStudySlugs },
            ],
          }),
        ],
      },
    ],
  };
}
