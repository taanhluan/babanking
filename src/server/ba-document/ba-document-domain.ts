import { z } from 'zod';

export const baDocumentTypes = ['BRD', 'REQUIREMENT_SPECIFICATION', 'PROCESS_SPECIFICATION', 'DATA_SPECIFICATION', 'UAT_SPECIFICATION'] as const;
export const baDocumentTypeSchema = z.enum(baDocumentTypes);
export const artifactIdPattern = /^[A-Z][A-Z0-9]{1,9}-(BR|FR|NFR|RULE|VAL|PROC|DATA|MAP|AC|UAT|OBJ|DEC)-[0-9]{3}(?:-[0-9]{2})?$/;
export const crossDocumentReferencePattern = /^document:[A-Za-z0-9][A-Za-z0-9:_-]{2,199}#[A-Z][A-Z0-9]{1,9}-(?:BR|FR|NFR|RULE|VAL|PROC|DATA|MAP|AC|UAT|OBJ|DEC)-[0-9]{3}(?:-[0-9]{2})?$/;

const text = z.string().trim().min(1);
const refs = z.array(z.string().min(1)).default([]);
const artifactId = z.string().regex(artifactIdPattern);

export const journeyKnowledgeReferenceSchema = z.object({
  journeySlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  referenceKind: z.enum(['SECTION', 'RULE', 'VALIDATION', 'PROCESS', 'STATE_MODEL', 'RISK_CONTROL']),
  referenceId: z.string().trim().min(1).optional(),
  displayLabel: text,
  sourceRevisionId: z.string().trim().min(1).optional(),
});

const requirementSchema = z.object({
  id: artifactId, type: z.enum(['BUSINESS', 'FUNCTIONAL', 'NON_FUNCTIONAL']), title: text,
  description: text, businessRationale: text,
  source: z.object({ type: z.enum(['STAKEHOLDER', 'REGULATION', 'JOURNEY_REFERENCE', 'PROJECT_DECISION', 'OTHER']), ref: text.optional(), description: text.optional() }),
  priority: z.enum(['MUST', 'SHOULD', 'COULD', 'WONT_V1']), status: z.enum(['PROPOSED', 'AGREED', 'DEFERRED', 'REJECTED']),
  owner: text.optional(), journeyStageRef: text.optional(), processRefs: refs.optional(), businessRuleRefs: refs.optional(),
  validationRefs: refs.optional(), dataRefs: refs.optional(), acceptanceCriteriaRefs: refs.optional(), uatRefs: refs.optional(),
  dependencies: refs.optional(), notes: text.optional(),
}).superRefine((value, ctx) => {
  const expected = value.type === 'BUSINESS' ? '-BR-' : value.type === 'FUNCTIONAL' ? '-FR-' : '-NFR-';
  if (!value.id.includes(expected)) ctx.addIssue({ code: 'custom', path: ['id'], message: `Requirement ID must contain ${expected}.` });
  if (value.dependencies?.includes(value.id)) ctx.addIssue({ code: 'custom', path: ['dependencies'], message: 'Requirement cannot depend on itself.' });
  if (['DEFERRED', 'REJECTED'].includes(value.status) && !value.notes) ctx.addIssue({ code: 'custom', path: ['notes'], message: `${value.status} requirement requires notes.` });
});

const businessRuleSchema = z.object({
  id: artifactId, name: text, description: text,
  ruleOrigin: z.enum(['REFERENCE_TO_CANONICAL_JOURNEY_RULE', 'PROJECT_SPECIFIC_RULE']),
  condition: text.optional(), decision: text, outcome: text, exceptions: z.array(text).optional(),
  sourceType: z.enum(['JOURNEY_KNOWLEDGE', 'REGULATION', 'POLICY', 'PROJECT_DECISION', 'STAKEHOLDER']),
  sourceRef: text.optional(), journeyKnowledgeRef: journeyKnowledgeReferenceSchema.optional(),
  appliesToRequirementRefs: refs, validationRefs: refs.optional(), notes: text.optional(),
}).superRefine((value, ctx) => {
  if (value.ruleOrigin === 'REFERENCE_TO_CANONICAL_JOURNEY_RULE' && !value.journeyKnowledgeRef) ctx.addIssue({ code: 'custom', path: ['journeyKnowledgeRef'], message: 'Canonical Journey rule reference is required.' });
});

const validationSchema = z.object({
  id: artifactId, name: text, category: z.enum(['ELIGIBILITY', 'DATA_QUALITY', 'COMPLIANCE', 'LIMIT', 'DUPLICATE', 'STATE', 'AUTHORIZATION', 'OTHER']),
  trigger: text, condition: text, validationLogic: text, successOutcome: text, failureOutcome: text,
  errorMessageGuidance: text.optional(), exceptionHandling: text.optional(), requirementRefs: refs,
  processRefs: refs.optional(), ruleRefs: refs.optional(),
});

const processStepSchema = z.object({ id: text, name: text, laneId: text, responsibility: text, description: text, requirementRefs: refs.optional(), ruleRefs: refs.optional(), validationRefs: refs.optional() });
const processSchema = z.object({
  id: artifactId, name: text, purpose: text, actors: z.array(text), preconditions: z.array(text), trigger: text,
  steps: z.array(processStepSchema), decisions: z.array(z.record(z.string(), z.unknown())).optional(), exceptions: z.array(z.record(z.string(), z.unknown())).optional(),
  rework: z.array(z.record(z.string(), z.unknown())).optional(), outcomes: z.array(text), businessRuleRefs: refs.optional(),
  validationRefs: refs.optional(), requirementRefs: refs.optional(), diagram: z.record(z.string(), z.unknown()).optional(),
});

const dataElementSchema = z.object({
  id: artifactId, name: text, businessDefinition: text, businessOwner: text.optional(),
  dataType: z.enum(['TEXT', 'NUMBER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'CODE', 'IDENTIFIER', 'OTHER']),
  format: text.optional(), mandatory: z.boolean(), classification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']),
  sensitivity: z.array(text).optional(), sourceSystem: text.optional(), targetSystem: text.optional(), validationRefs: refs.optional(), requirementRefs: refs.optional(), notes: text.optional(),
});
const dataMappingSchema = z.object({ id: artifactId, sourceSystem: text, sourceEntity: text, sourceField: text, transformationRule: text.optional(), targetSystem: text, targetEntity: text, targetField: text, validationRefs: refs.optional(), requirementRefs: refs.optional(), notes: text.optional() });
const acceptanceCriterionSchema = z.object({
  id: artifactId, requirementRef: text, title: text, format: z.enum(['BDD', 'BUSINESS_READABLE']), precondition: text.optional(),
  given: text.optional(), when: text.optional(), then: text.optional(), expectedOutcome: text,
  businessRuleRefs: refs.optional(), validationRefs: refs.optional(), notes: text.optional(),
}).superRefine((value, ctx) => { if (value.format === 'BDD' && (!value.given || !value.when || !value.then)) ctx.addIssue({ code: 'custom', path: ['format'], message: 'BDD criteria require given, when, and then.' }); });
const uatScenarioSchema = z.object({
  id: artifactId, title: text, objective: text, requirementRefs: refs, acceptanceCriteriaRefs: refs,
  preconditions: z.array(text).optional(), testData: z.array(text).optional(),
  steps: z.array(z.object({ order: z.number().int().nonnegative(), action: text, expectedResult: text.optional() })), expectedResult: text,
  businessRuleRefs: refs.optional(), validationRefs: refs.optional(), priority: z.enum(['HIGH', 'MEDIUM', 'LOW']), notes: text.optional(),
});
const objectiveSchema = z.object({ id: artifactId, title: text, description: text, measure: text.optional() });
const decisionSchema = z.object({ id: artifactId, title: text, decision: text, rationale: text, owner: text.optional(), relatedRequirementRefs: refs.optional() });

const blockSchema = z.object({
  id: text, schemaVersion: z.literal(1), blockType: z.enum(['RICH_TEXT', 'TABLE', 'CHECKLIST', 'CALLOUT', 'DIAGRAM', 'REFERENCE', 'CODE', 'API_REFERENCE']),
  payload: z.record(z.string(), z.unknown()),
});
const sectionSchema = z.object({ id: text, title: text, summary: text.optional(), order: z.number().int().nonnegative(), blocks: z.array(blockSchema) });
const moduleSchema = z.object({ id: text, title: text, summary: text.optional(), order: z.number().int().nonnegative(), sections: z.array(sectionSchema) });

export const baDocumentContentSchema = z.object({
  schemaVersion: z.literal(1), documentType: baDocumentTypeSchema,
  metadata: z.object({ documentCode: text, title: text, summary: z.string().trim().min(30), primaryJourneySlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), businessDomain: text.optional(), versionLabel: text.optional(), effectiveDate: z.iso.date().optional(), lastReviewedDate: z.iso.date().optional(), tags: z.array(text).optional(), relatedJourneySlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).optional(), changeSummary: text.optional() }),
  objectives: z.array(objectiveSchema).optional(), modules: z.array(moduleSchema),
  artifacts: z.object({ requirements: z.array(requirementSchema).optional(), businessRules: z.array(businessRuleSchema).optional(), validations: z.array(validationSchema).optional(), processes: z.array(processSchema).optional(), dataElements: z.array(dataElementSchema).optional(), dataMappings: z.array(dataMappingSchema).optional(), acceptanceCriteria: z.array(acceptanceCriterionSchema).optional(), uatScenarios: z.array(uatScenarioSchema).optional(), decisions: z.array(decisionSchema).optional() }),
  references: z.object({ journeyKnowledge: z.array(journeyKnowledgeReferenceSchema).optional(), external: z.array(z.object({ label: text, url: z.url() })).optional(), crossDocument: z.array(z.object({ reference: z.string().regex(crossDocumentReferencePattern), status: z.literal('UNVERIFIED_EXTERNAL') })).optional() }).optional(),
}).superRefine((value, ctx) => validateBaDocumentContent(value, ctx));

export type BaDocumentContentV1 = z.infer<typeof baDocumentContentSchema>;
export type BaDocumentValidationError = { code: string; path: string; message: string };

const refRules: Record<string, Set<string>> = {
  processRefs: new Set(['PROC']), businessRuleRefs: new Set(['RULE']), validationRefs: new Set(['VAL']), dataRefs: new Set(['DATA', 'MAP']),
  acceptanceCriteriaRefs: new Set(['AC']), uatRefs: new Set(['UAT']), dependencies: new Set(['BR', 'FR', 'NFR']),
  appliesToRequirementRefs: new Set(['BR', 'FR', 'NFR']), requirementRefs: new Set(['BR', 'FR', 'NFR']), ruleRefs: new Set(['RULE']),
  requirementRef: new Set(['BR', 'FR', 'NFR']), relatedRequirementRefs: new Set(['BR', 'FR', 'NFR']),
};
function kind(id: string) { return id.match(artifactIdPattern)?.[1]; }
function validateBaDocumentContent(value: Record<string, unknown>, ctx: z.core.$RefinementCtx) {
  const modules = value.modules as Array<{ id: string; sections: Array<{ id: string }> }>;
  const moduleIds = new Set<string>(); const sectionIds = new Set<string>();
  modules.forEach((module, mi) => { if (moduleIds.has(module.id)) ctx.addIssue({ code: 'custom', path: ['modules', mi, 'id'], message: 'Duplicate module ID.' }); moduleIds.add(module.id); module.sections.forEach((section, si) => { if (sectionIds.has(section.id)) ctx.addIssue({ code: 'custom', path: ['modules', mi, 'sections', si, 'id'], message: 'Duplicate section ID.' }); sectionIds.add(section.id); }); });
  const artifacts = value.artifacts as Record<string, Array<Record<string, unknown>> | undefined>;
  const all = Object.entries(artifacts).flatMap(([collection, entries]) => (entries ?? []).map((entry, index) => ({ collection, entry, index })));
  const ids = new Map<string, { collection: string; entry: Record<string, unknown> }>();
  for (const item of all) { const id = String(item.entry.id); if (ids.has(id)) ctx.addIssue({ code: 'custom', path: ['artifacts', item.collection, item.index, 'id'], message: 'Duplicate artifact ID across document.' }); else ids.set(id, item); }
  const visit = (node: unknown, path: (string | number)[]) => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach((v, i) => visit(v, [...path, i])); for (const [key, raw] of Object.entries(node)) { const allowed = refRules[key]; if (allowed) { const values = Array.isArray(raw) ? raw : [raw]; values.forEach((ref, ri) => { if (typeof ref !== 'string' || ref.startsWith('document:')) return; const target = ids.get(ref); const refPath = [...path, key, ...(Array.isArray(raw) ? [ri] : [])]; if (!target) ctx.addIssue({ code: 'custom', path: refPath, message: `Missing artifact reference: ${ref}.` }); else if (!allowed.has(kind(ref) ?? '')) ctx.addIssue({ code: 'custom', path: refPath, message: `Wrong-kind artifact reference: ${ref}.` }); }); } visit(raw, [...path, key]); } };
  visit(artifacts, ['artifacts']);
  const requirements = artifacts.requirements ?? []; const graph = new Map(requirements.map(r => [String(r.id), (r.dependencies as string[] | undefined) ?? []]));
  const visiting = new Set<string>(); const visited = new Set<string>();
  const dfs = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); if ((graph.get(id) ?? []).some(dep => graph.has(dep) && dfs(dep))) return true; visiting.delete(id); visited.add(id); return false; };
  if ([...graph.keys()].some(dfs)) ctx.addIssue({ code: 'custom', path: ['artifacts', 'requirements'], message: 'Requirement dependency cycle detected.' });
}

export function parseBaDocumentContent(value: unknown) { return baDocumentContentSchema.parse(value); }
export function validateBaDocumentPrimaryJourney(input: { contentType: string; primaryJourneyContentItemId: string | null; parentType?: string; existingPrimaryJourneyContentItemId?: string | null; hasRevision?: boolean }) {
  if (input.contentType === 'BA_DOCUMENT') {
    if (!input.primaryJourneyContentItemId) throw new Error('BA Document requires a Primary Journey.');
    if (input.parentType !== 'BANKING_JOURNEY') throw new Error('Primary Journey must be BANKING_JOURNEY content.');
    if (input.hasRevision && input.existingPrimaryJourneyContentItemId !== input.primaryJourneyContentItemId) throw new Error('Primary Journey is immutable after the first revision.');
  } else if (input.primaryJourneyContentItemId) throw new Error('Only BA Documents may have a Primary Journey relation.');
}

export type RtmStatus = 'LINKED' | 'PARTIAL' | 'UNLINKED' | 'INVALID_REFERENCE';
export function deriveBaDocumentRtm(content: BaDocumentContentV1) {
  const artifacts = content.artifacts; const ids = new Set(Object.values(artifacts).flatMap(entries => (entries ?? []).map(entry => entry.id)));
  return (artifacts.requirements ?? []).map(requirement => {
    const groups = { processRefs: requirement.processRefs ?? [], businessRuleRefs: requirement.businessRuleRefs ?? [], validationRefs: requirement.validationRefs ?? [], dataRefs: requirement.dataRefs ?? [], acceptanceCriteriaRefs: requirement.acceptanceCriteriaRefs ?? [], uatRefs: requirement.uatRefs ?? [] };
    const links = Object.values(groups).flat(); const invalid = links.some(ref => !ids.has(ref)); const linkedGroups = Object.values(groups).filter(group => group.length).length;
    const status: RtmStatus = invalid ? 'INVALID_REFERENCE' : linkedGroups === 0 ? 'UNLINKED' : linkedGroups === Object.keys(groups).length ? 'LINKED' : 'PARTIAL';
    return { requirementId: requirement.id, ...groups, status };
  });
}
