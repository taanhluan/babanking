import type { PublishedContent } from '@/lib/repository';

export type PortalBlock = { id: string; blockType: string; schemaVersion?: number; payload: unknown };
export type PortalState = { id: string; title: string; summary?: string; blocks: PortalBlock[]; children: PortalState[] };
export type PortalStage = { id: string; title: string; summary?: string; states: PortalState[] };
export type PortalSection = { id: string; title: string; blocks: PortalBlock[] };
export type JourneyPortalViewModel = {
  mode: 'PAYMENT_TYPE_PORTAL' | 'LEGACY_PUBLISHED_CONTENT';
  contentReadiness: { hasPaymentTypes: boolean; paymentTypeCount: number; recognizedPaymentTypeKeys: string[]; legacyModuleCount: number };
  overview: { title: string; summary: string };
  lifecycle: PortalStage[];
  journeyTypes: Array<{ title: string; items: string[] }>;
  knowledgeAssets: string[];
  existingKnowledge: PortalSection[];
  relatedJourneys: string[];
  usedCompatibilityFallback: boolean;
  source: { lifecycle: 'cms' | 'compatibility-fallback' };
  paymentTypeGroups: Array<{ id: string; title: string; paymentTypes: Array<{ id: string; slug: string; title: string; summary: string; stageCount: number; knowledgeNodeCount: number; lifecycle: PortalStage[] }> }>;
  legacyModules: Array<{ id: string; title: string; sections: PortalSection[] }>;
};

export const LIFECYCLE_ALIASES = ['payment-lifecycle', 'end-to-end-business-process', 'end-to-end-process', 'transaction-lifecycle'];
export const LIFECYCLE_STAGE_ALIASES = {
  initiation: ['initiation', 'payment-initiation', 'transaction-initiation'], validation: ['validation', 'payment-validation', 'pre-validation'], complianceRisk: ['compliance', 'compliance-and-risk', 'risk-and-compliance', 'aml-and-fraud', 'fraud-and-aml'], authorization: ['authorization', 'approval', 'maker-checker-and-approval', 'maker-checker', 'transaction-authorization'], execution: ['execution', 'payment-execution', 'transaction-processing'], clearing: ['clearing', 'payment-clearing'], settlement: ['settlement', 'payment-settlement'], completion: ['completion', 'notification-and-completion', 'post-transaction'], exception: ['exception', 'exception-and-reversal', 'reversal-and-return'],
} as const;

const text = (value: unknown, keys: string[]) => {
  if (!value || typeof value !== 'object') return undefined;
  for (const key of keys) if (typeof (value as Record<string, unknown>)[key] === 'string') return (value as Record<string, string>)[key];
  return undefined;
};
const id = (value: unknown, fallback: string) => String(value || fallback).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || fallback;
const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function block(raw: Record<string, unknown>, fallback: string): PortalBlock {
  return { id: id(raw.id || raw.key, fallback), blockType: typeof raw.blockType === 'string' ? raw.blockType : 'RICH_TEXT', schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : undefined, payload: raw.payload };
}
function uniqueId(value: string, used: Set<string>) { let candidate = value; let suffix = 2; while (used.has(candidate)) candidate = `${value}-${suffix++}`; used.add(candidate); return candidate; }
const canonicalStages = Object.entries(LIFECYCLE_STAGE_ALIASES).map(([key, aliases]) => ({ key, title: key === 'complianceRisk' ? 'Compliance and Risk' : key.charAt(0).toUpperCase() + key.slice(1), aliases }));
const paymentTypeAliases = ['internal-transfer', 'same-owner-transfer', 'domestic-interbank-transfer', 'international-transfer', 'bill-payment', 'qr-payment', 'card-payment', 'top-up', 'payroll', 'bulk-payment', 'supplier-payment', 'tax-payment', 'collection', 'direct-debit', 'virtual-account', 'merchant-collection'];
function states(rawBlocks: unknown[], prefix: string, used = new Set<string>()): PortalState[] {
  return rawBlocks.map((raw, index) => {
    const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const childrenRaw = Array.isArray(value.children) ? value.children : Array.isArray(value.states) ? value.states : [];
    const stateId = uniqueId(id(value.id || value.key || text(value.payload, ['title', 'label', 'name']), `${prefix}-${index + 1}`), used);
    return { id: stateId, title: text(value, ['title', 'label', 'name']) || text(value.payload, ['title', 'label', 'name']) || String(value.id || value.key || `State ${index + 1}`), summary: text(value, ['summary', 'description']) || text(value.payload, ['summary', 'description']), blocks: [block(value, `${prefix}-${index + 1}`)], children: states(childrenRaw, stateId, used) };
  });
}

export function mapJourneyPortal(content: PublishedContent): JourneyPortalViewModel {
  const body = content.body as Record<string, unknown>;
  const modules = Array.isArray(body.modules) ? body.modules.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];
  const normalized = (value: unknown) => id(value, '');
  const lifecycleModule = modules.find((module) => LIFECYCLE_ALIASES.includes(normalized(module.key)) || LIFECYCLE_ALIASES.includes(normalized(module.title)) || (Array.isArray(module.sections) && module.sections.some((section) => LIFECYCLE_ALIASES.includes(normalized((section as Record<string, unknown>).key)) || LIFECYCLE_ALIASES.includes(normalized((section as Record<string, unknown>).title)))));
  const sections = lifecycleModule && Array.isArray(lifecycleModule.sections) ? lifecycleModule.sections as Record<string, unknown>[] : [];
  const stageSections = sections.filter((section) => !['payment-lifecycle', 'end-to-end-business-process'].includes(normalized(section.title)));
  const correctedLifecycle = lifecycleModule ? canonicalStages.map((stage, index) => {
    const matching = stageSections.find((section) => (stage.aliases as readonly string[]).includes(normalized(section.key)) || (stage.aliases as readonly string[]).includes(normalized(section.title)));
    const blocks = matching && Array.isArray(matching.blocks) ? matching.blocks : stage.key === 'authorization' ? sections.filter((section) => /maker-checker|approval|authorization/i.test(String(section.title))).flatMap((section) => Array.isArray(section.blocks) ? section.blocks : []) : [];
    return { id: stage.key, title: stage.title, order: index, states: states(blocks, stage.key) };
  }).filter((stage) => stage.states.length || !stageSections.length) : [];
  const existingKnowledge = modules.filter((module) => module !== lifecycleModule && !paymentTypeAliases.includes(normalized(module.key)) && !paymentTypeAliases.includes(normalized(module.title))).flatMap((module, moduleIndex) => (Array.isArray(module.sections) ? module.sections : []).map((raw, sectionIndex) => {
    const section = raw as Record<string, unknown>;
    return { id: id(section.id || section.key, `knowledge-${moduleIndex + 1}-${sectionIndex + 1}`), title: String(section.title || module.title || 'Knowledge'), blocks: (Array.isArray(section.blocks) ? section.blocks : []).map((item, index) => block(item as Record<string, unknown>, `block-${index + 1}`)) };
  }));
  const fallback = !lifecycleModule;
  const cmsPaymentModules = modules.filter((module) => paymentTypeAliases.includes(normalized(module.key)) || paymentTypeAliases.includes(normalized(module.title)));
  const stageIgnore = new Set(['journey-overview', 'business-overview', 'related-knowledge', 'actors', 'channels', 'preconditions', 'business-rules', 'apis-and-service-contracts', 'integration-points', 'data-objects', 'ui-screens', 'exception-scenarios', 'operational-guidance', 'sequence-diagram', 'activity-flow', 'state-machine', 'interview-questions', 'case-study']);
  const cmsTypes = cmsPaymentModules.map((module) => { const moduleStages = Array.isArray(module.sections) ? (module.sections as Record<string, unknown>[]).filter((section) => { const sectionKey = normalized(section.key || ''); const sectionTitle = normalized(section.title || ''); return !stageIgnore.has(sectionKey) && !stageIgnore.has(sectionTitle) && !sectionKey.startsWith('overview-'); }).map((section, index) => ({ id: id(section.key || section.title, `stage-${index + 1}`), title: String(section.title || `Stage ${index + 1}`), states: states(Array.isArray(section.blocks) ? section.blocks : [], `payment-${index + 1}`) })) : []; const title = String(module.title || module.key); return { id: id(module.key || title, 'payment-type'), slug: id(module.key || title, 'payment-type'), title, summary: text(module, ['summary', 'description']) || `${title} payment journey`, stageCount: moduleStages.length, knowledgeNodeCount: moduleStages.reduce((sum, stage) => sum + stage.states.length, 0), lifecycle: moduleStages }; });
  const fallbackTypes = compatibilityPaymentTypes().flatMap((group) => group.items.filter((item) => !cmsPaymentModules.some((module) => normalized(module.key || module.title) === normalized(item))).map((item) => ({ id: id(item, 'payment-type'), slug: id(item, 'payment-type'), title: item, summary: `${item} payment journey`, stageCount: correctedLifecycle.length || 7, knowledgeNodeCount: correctedLifecycle.reduce((sum, stage) => sum + stage.states.length, 0), lifecycle: compatibilityLifecycle(), group: group.title })));
  const paymentTypeGroups = (cmsTypes.length ? [{ id: 'cms-payment-types', title: 'CMS Payment Journeys', paymentTypes: cmsTypes }] : []).concat(fallbackTypes.length ? [{ id: 'compatibility-payment-types', title: 'Additional Payment Types', paymentTypes: fallbackTypes }] : []);
  const legacyModules = modules.filter((module) => module !== lifecycleModule && !paymentTypeAliases.includes(normalized(module.key)) && !paymentTypeAliases.includes(normalized(module.title))).map((module, moduleIndex) => ({ id: id(module.key || module.title, `legacy-module-${moduleIndex + 1}`), title: String(module.title || module.key || `Module ${moduleIndex + 1}`), sections: existingKnowledge.filter((section) => section.id.startsWith(`knowledge-${moduleIndex + 1}-`)) }));
  return { mode: cmsTypes.length ? 'PAYMENT_TYPE_PORTAL' : 'LEGACY_PUBLISHED_CONTENT', contentReadiness: { hasPaymentTypes: cmsTypes.length > 0, paymentTypeCount: cmsTypes.length, recognizedPaymentTypeKeys: cmsTypes.map((payment) => payment.slug), legacyModuleCount: legacyModules.length }, overview: { title: content.title, summary: content.summary }, lifecycle: fallback ? compatibilityLifecycle() : correctedLifecycle, journeyTypes: fallback ? compatibilityTypes() : [], knowledgeAssets: fallback ? ['API', 'Business Rules', 'Glossary', 'Interview Questions', 'Case Studies', 'Sequence Diagram', 'State Diagram', 'Test Cases'] : [], existingKnowledge, legacyModules, relatedJourneys: list(body.relatedJourneySlugs), usedCompatibilityFallback: fallback, source: { lifecycle: fallback ? 'compatibility-fallback' : 'cms' }, paymentTypeGroups };
}

export function shouldUseJourneyPortal(content: PublishedContent) {
  if (content.type !== 'BANKING_JOURNEY' || content.slug !== 'payments-and-transfers') return false;
  const body = content.body as Record<string, unknown>;
  const modules = Array.isArray(body.modules) ? body.modules : [];
  return modules.some((module) => {
    if (!module || typeof module !== 'object') return false;
    const value = module as Record<string, unknown>;
    return paymentTypeAliases.includes(id(value.key, '')) || paymentTypeAliases.includes(id(value.title, ''));
  });
}

function compatibilityLifecycle(): PortalStage[] { return ['Initiation', 'Validation', 'Compliance', 'Authorization', 'Execution', 'Settlement', 'Completion'].map((title, index) => ({ id: id(title, `stage-${index + 1}`), title, states: [], })); }
function compatibilityTypes() { return [{ title: 'Retail', items: ['Internal Transfer', 'Domestic Transfer', 'International Transfer', 'QR Payment', 'Bill Payment', 'Top-up', 'Card Payment'] }, { title: 'Corporate', items: ['Payroll', 'Bulk Payment', 'Tax Payment', 'Supplier Payment'] }, { title: 'Collection', items: ['Direct Debit', 'Virtual Account'] }]; }
function compatibilityPaymentTypes() { return [{ title: 'Retail Payments', items: ['Internal Transfer', 'Same-owner Transfer', 'Domestic Interbank Transfer', 'International Transfer', 'Bill Payment', 'QR Payment', 'Top-up', 'Card Payment'] }, { title: 'Corporate Payments', items: ['Payroll', 'Bulk Payment', 'Supplier Payment', 'Tax Payment'] }, { title: 'Collection and Receivables', items: ['Direct Debit', 'Collection', 'Virtual Account', 'Merchant Collection'] }]; }
