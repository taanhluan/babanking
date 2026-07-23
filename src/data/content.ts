import { bankingJourneys } from './banking-journeys';
import { practiceAreas } from './ba-practice';
import { caseStudies, type BaLevel, type VisualType } from './case-studies';
import { careerLevels } from './career-roadmap';

export interface ContentStep { title: string; description: string }
export interface BankingJourneyContent {
  slug: string; title: string; shortTitle: string; category: string; summary: string; businessOverview: string;
  customerGoals: string[]; businessGoals: string[]; keyActors: string[]; channels: string[]; systems: string[];
  capabilities: string[]; processSteps: ContentStep[]; businessRules: (ContentStep & { illustrative: true })[];
  dataEntities: string[]; risksAndControls: { risk: string; control: string }[]; commonExceptions: string[];
  baQuestions: string[]; baOutputs: string[]; relatedPracticeSlugs: string[]; relatedCaseStudySlugs: string[];
  relatedJourneySlugs: string[]; keywords: string[];
}
const journeySlug: Record<string, string> = {
  'customer-onboarding': 'customer-onboarding', deposits: 'deposits', 'personal-finance': 'personal-finance-management',
  payments: 'payments-and-transfers', cards: 'cards', lending: 'lending', wealth: 'wealth-and-investment',
  'customer-service': 'customer-service', notifications: 'notification-and-engagement', security: 'security-and-access',
};
const journeyPractice: Record<string, string[]> = {
  'customer-onboarding': ['requirement-discovery', 'business-process-mapping'], payments: ['business-process-mapping', 'business-rules-definition'],
  cards: ['fit-gap-analysis', 'business-rules-definition'], lending: ['business-rules-definition', 'impact-assessment'],
  security: ['impact-assessment', 'business-rules-definition'], 'customer-service': ['business-process-mapping', 'ba-documentation'],
};
const journeyCases: Record<string, string[]> = {
  'customer-onboarding': ['digital-onboarding-journey'], payments: ['understanding-payment-journey', 'payment-limits-business-rules'],
  cards: ['conducting-fit-gap-analysis'], lending: ['conducting-fit-gap-analysis'], 'customer-service': ['requirement-notes-to-brd'],
};
export const bankingJourneyContent: BankingJourneyContent[] = bankingJourneys.map((item, index) => ({
  slug: journeySlug[item.id], title: item.name, shortTitle: item.name.replace(' and ', ' & '), category: item.category, summary: item.description,
  businessOverview: `${item.name} connects customer intent with operational activities, decisions, systems, and controls. A BA should examine the visible experience and the supporting work required to complete it reliably.`,
  customerGoals: [item.customerGoal, 'Understand the current status, next action, and outcome.'],
  businessGoals: [`Deliver ${item.name.toLowerCase()} consistently across supported channels.`, 'Control operational and customer risk with clear audit evidence.'],
  keyActors: item.actors, channels: item.systems.filter((value) => /mobile|web|branch|center|app/i.test(value)), systems: item.systems,
  capabilities: item.capabilities, processSteps: item.process.map((title, step) => ({ title, description: `Typical step ${step + 1}: confirm inputs, ownership, status, decisions, and evidence for ${title.toLowerCase()}.` })),
  businessRules: item.rules.map((description, rule) => ({ title: `Illustrative rule ${rule + 1}`, description, illustrative: true as const })),
  dataEntities: ['Customer', 'Account', 'Request', 'Status', ...item.capabilities.slice(0, 3)],
  risksAndControls: item.risks.map((risk) => ({ risk, control: `Define preventive or detective checks, ownership, exception handling, and evidence for ${risk.toLowerCase()}.` })),
  commonExceptions: ['Information is incomplete or inconsistent', 'A control check cannot be completed', 'A downstream response is delayed or failed'],
  baQuestions: [`What outcome defines success for ${item.name}?`, 'Which rules vary by product, channel, customer, or risk?', 'Who owns exceptions?', 'Which system is the source of truth?'],
  baOutputs: item.outputs, relatedPracticeSlugs: journeyPractice[item.id] ?? ['requirement-discovery', 'capability-mapping'],
  relatedCaseStudySlugs: journeyCases[item.id] ?? ['mapping-business-requirements-to-capabilities'],
  relatedJourneySlugs: [journeySlug[bankingJourneys[(index + 9) % 10].id], journeySlug[bankingJourneys[(index + 1) % 10].id]],
  keywords: [item.name, item.category, ...item.capabilities, ...item.systems],
}));

export interface BAPracticeContent {
  slug: string; title: string; summary: string; purpose: string; whenToUse: string[]; inputs: string[];
  activities: ContentStep[]; outputs: string[]; techniques: string[]; bankingExamples: ContentStep[];
  commonMistakes: string[]; qualityChecklist: string[]; sampleQuestions: string[]; relatedJourneySlugs: string[];
  relatedCaseStudySlugs: string[]; relatedPracticeSlugs: string[]; keywords: string[];
}
export const slugify = (value: string) => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const practiceLinks: Record<string, { journeys: string[]; cases: string[] }> = {
  'requirement-discovery': { journeys: ['customer-onboarding', 'customer-service'], cases: ['requirement-notes-to-brd'] },
  'business-process-mapping': { journeys: ['payments-and-transfers', 'customer-onboarding'], cases: ['understanding-payment-journey'] },
  'business-rules-definition': { journeys: ['payments-and-transfers', 'lending'], cases: ['payment-limits-business-rules'] },
  'capability-mapping': { journeys: ['deposits', 'personal-finance-management'], cases: ['mapping-business-requirements-to-capabilities'] },
  'fit-gap-analysis': { journeys: ['cards', 'lending'], cases: ['conducting-fit-gap-analysis'] },
};
export const baPracticeContent: BAPracticeContent[] = practiceAreas.map((item, index) => {
  const slug = slugify(item.name);
  const links = practiceLinks[slug] ?? { journeys: ['customer-onboarding', 'payments-and-transfers'], cases: ['mapping-business-requirements-to-capabilities'] };
  return {
    slug, title: item.name, summary: item.purpose, purpose: item.purpose,
    whenToUse: ['When a delivery decision depends on unresolved assumptions', 'When customer, operations, control, data, or technology views differ'],
    inputs: item.inputs, activities: item.activities.map((title) => ({ title, description: `Apply ${title.toLowerCase()}, record evidence and assumptions, and validate the result with the appropriate stakeholders.` })),
    outputs: item.outputs, techniques: ['Structured interview', 'Facilitated workshop', 'Visual mapping', 'Peer review'],
    bankingExamples: [{ title: 'Illustrative banking example', description: `Apply ${item.name.toLowerCase()} to a payment or onboarding change, making rules, exceptions, ownership, and impacts explicit.` }],
    commonMistakes: item.mistakes, qualityChecklist: ['Outcome and scope are explicit', 'Assumptions are visible', 'Rules and exceptions have owners', 'Outputs are traceable', 'Impacted stakeholders reviewed the result'],
    sampleQuestions: ['What decision will this analysis enable?', 'Which scenarios are in scope?', 'What evidence supports this understanding?', 'What could change the recommendation?'],
    relatedJourneySlugs: links.journeys, relatedCaseStudySlugs: links.cases,
    relatedPracticeSlugs: [slugify(practiceAreas[(index + 8) % 9].name), slugify(practiceAreas[(index + 1) % 9].name)],
    keywords: [item.name, ...item.inputs, ...item.outputs, ...item.activities],
  };
});

export interface CaseStudyContent {
  slug: string; title: string; summary: string; contentType: string; domain: string; level: BaLevel; readingTime: string;
  featured: boolean; challenge: string; businessContext: string; stakeholders: string[]; currentState: string[];
  requirements: string[]; analysisApproach: ContentStep[]; findings: string[]; gaps: { title: string; description: string; severity?: 'Low' | 'Medium' | 'High' }[];
  recommendation: string[]; expectedArtifacts: string[]; lessonsLearned: string[]; discussionQuestions: string[];
  relatedJourneySlugs: string[]; relatedPracticeSlugs: string[]; relatedCaseStudySlugs: string[]; topics: string[]; visualType: VisualType;
}
const caseJourney: Record<string, string[]> = {
  'understanding-payment-journey': ['payments-and-transfers'], 'digital-onboarding-journey': ['customer-onboarding'],
  'payment-limits-business-rules': ['payments-and-transfers'], 'conducting-fit-gap-analysis': ['cards', 'lending'],
};
export const caseStudyContent: CaseStudyContent[] = caseStudies.map((item, index) => ({
  ...item, visualType: item.visual,
  challenge: `The team needs a traceable approach to ${item.title.toLowerCase()} without losing business context, exceptions, or controls.`,
  businessContext: 'This educational case study uses a generic banking scenario. It does not describe a verified implementation at a specific institution.',
  stakeholders: ['Product Owner', 'Business Analyst', 'Operations SME', 'Technology Lead', 'Risk or Control Representative'],
  currentState: ['Knowledge is distributed across discussions and documents', 'Rules and exceptions are not consistently structured', 'Solution coverage is difficult to assess'],
  requirements: ['Create a shared view of the intended outcome', 'Make rules, exceptions, and ownership explicit', 'Produce traceable delivery outputs'],
  analysisApproach: [{ title: 'Frame', description: 'Confirm outcomes, scope, stakeholders, constraints, and evidence.' }, { title: 'Analyze', description: 'Map journeys, capabilities, rules, data, and impacts.' }, { title: 'Evaluate', description: 'Compare coverage, gaps, risk, and feasibility.' }, { title: 'Recommend', description: 'Present a defensible option and validate it with decision owners.' }],
  findings: ['Outcomes are clearer when expressed independently from solutions', 'Exceptions materially affect effort and customer experience', 'Traceability reduces conflicting interpretation'],
  gaps: [{ title: 'Incomplete rule coverage', description: 'Decision conditions and exception paths are not fully defined.', severity: 'High' }, { title: 'Unclear ownership', description: 'Operational accountability is not explicit.', severity: 'Medium' }],
  recommendation: ['Create one governed analysis baseline', 'Resolve high-impact rules before detailed design', 'Trace objectives through requirements and decisions'],
  expectedArtifacts: ['Context and scope', 'Process or journey map', 'Rule catalogue', 'Gap assessment', 'Recommendation'],
  lessonsLearned: ['Start with the decision the analysis supports', 'Treat exceptions as first-class requirements', 'Use visuals to simplify review'],
  discussionQuestions: ['Which assumption creates the greatest risk?', 'What evidence could change the recommendation?', 'Who owns the unresolved exception?'],
  relatedJourneySlugs: caseJourney[item.slug] ?? ['customer-onboarding', 'payments-and-transfers'],
  relatedPracticeSlugs: item.slug.includes('gap') ? ['fit-gap-analysis', 'solution-recommendation'] : item.slug.includes('rule') ? ['business-rules-definition'] : ['requirement-discovery', 'capability-mapping'],
  relatedCaseStudySlugs: [caseStudies[(index + 1) % 6].slug],
}));

export interface CareerLevelContent {
  slug: string; level: number; title: string; shortTitle: string; summary: string; primaryFocus: string[];
  bankingKnowledge: string[]; responsibilities: string[]; expectedDeliverables: string[]; stakeholderScope: string[];
  recommendedPracticeSlugs: string[]; recommendedJourneySlugs: string[]; readinessIndicators: string[];
  commonDevelopmentGaps: string[]; nextLevelSlug?: string; previousLevelSlug?: string; keywords: string[];
}
const careerSlugs = ['fresher-ba', 'junior-ba', 'middle-ba', 'senior-ba', 'lead-principal-ba', 'product-owner-domain-consultant'];
export const careerLevelContent: CareerLevelContent[] = careerLevels.map((item, index) => ({
  slug: careerSlugs[index], level: index + 1, title: item.name, shortTitle: item.shortName, summary: item.overview,
  primaryFocus: [item.focus], bankingKnowledge: item.knowledge, responsibilities: item.responsibilities,
  expectedDeliverables: item.deliverables, stakeholderScope: [item.stakeholders], recommendedPracticeSlugs: item.practice.map(slugify),
  recommendedJourneySlugs: index < 2 ? ['customer-onboarding', 'payments-and-transfers'] : ['lending', 'security-and-access'],
  readinessIndicators: item.readiness, commonDevelopmentGaps: ['Focusing on documents instead of outcomes', 'Missing exceptions and downstream impacts', 'Validating assumptions too late'],
  previousLevelSlug: index ? careerSlugs[index - 1] : undefined, nextLevelSlug: index < 5 ? careerSlugs[index + 1] : undefined,
  keywords: [item.name, item.focus, ...item.knowledge, ...item.practice],
}));

export type SearchContentType = 'Banking Journey' | 'BA Practice' | 'Case Study' | 'Career Level';
export interface SearchRecord { type: SearchContentType; title: string; summary: string; keywords: string[]; context: string; url: string }
export const searchIndex: SearchRecord[] = [
  ...bankingJourneyContent.map((x) => ({ type: 'Banking Journey' as const, title: x.title, summary: x.summary, keywords: x.keywords, context: x.category, url: `/banking-journeys/${x.slug}` })),
  ...baPracticeContent.map((x) => ({ type: 'BA Practice' as const, title: x.title, summary: x.summary, keywords: x.keywords, context: 'BA Practice', url: `/ba-practice/${x.slug}` })),
  ...caseStudyContent.map((x) => ({ type: 'Case Study' as const, title: x.title, summary: x.summary, keywords: x.topics, context: `${x.domain} · ${x.level}`, url: `/case-studies/${x.slug}` })),
  ...careerLevelContent.map((x) => ({ type: 'Career Level' as const, title: x.title, summary: x.summary, keywords: x.keywords, context: `Career level ${x.level}`, url: `/career-roadmap/${x.slug}` })),
];
