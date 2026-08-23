import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  artifactIdPattern,
  baDocumentContentSchema,
  crossDocumentReferencePattern,
  deriveBaDocumentRtm,
  parseBaDocumentContent,
  validateBaDocumentPrimaryJourney,
} from './ba-document-domain';
import { baDocumentTemplates } from './ba-document-templates';

const valid = () => structuredClone(baDocumentTemplates.BRD_STANDARD);
const requirement = (id = 'PAY-FR-001', overrides: Record<string, unknown> = {}) => ({
  id, type: 'FUNCTIONAL', title: 'Capture beneficiary', description: 'Capture the beneficiary details.',
  businessRationale: 'The transfer must identify its beneficiary.', source: { type: 'STAKEHOLDER' },
  priority: 'MUST', status: 'AGREED', ...overrides,
});

describe('BA Document Prisma foundation', () => {
  const schema = readFileSync(new URL('../../../prisma/schema.prisma', import.meta.url), 'utf8');
  const migration = readFileSync(new URL('../../../prisma/migrations/20260823060000_add_ba_document_foundation/migration.sql', import.meta.url), 'utf8');
  const constraintMigration = readFileSync(new URL('../../../prisma/migrations/20260823060100_add_ba_document_primary_journey_check/migration.sql', import.meta.url), 'utf8');
  it('declares BA_DOCUMENT and the Primary Journey self-relation', () => {
    expect(schema).toContain('BA_DOCUMENT');
    expect(schema).toContain('primaryJourneyContentItemId');
    expect(schema).toContain('@relation("BaDocumentPrimaryJourney"');
  });
  it('keeps the migration additive and free of row updates', () => {
    expect(migration).toContain("ADD VALUE 'BA_DOCUMENT'");
    expect(migration).toContain('ADD COLUMN "primaryJourneyContentItemId"');
    expect(`${migration}\n${constraintMigration}`).not.toMatch(/^\s*(DROP|TRUNCATE|DELETE|UPDATE)\b/im);
    expect(constraintMigration).toContain('ContentItem_ba_document_primary_journey_check');
  });
});

describe('BA Document content contract', () => {
  it.each(Object.entries(baDocumentTemplates))('accepts template %s', (_name, template) => {
    expect(() => parseBaDocumentContent(template)).not.toThrow();
  });
  it('rejects invalid document types and schema versions', () => {
    expect(baDocumentContentSchema.safeParse({ ...valid(), documentType: 'DECISION_LOG' }).success).toBe(false);
    expect(baDocumentContentSchema.safeParse({ ...valid(), schemaVersion: 2 }).success).toBe(false);
  });
  it('rejects blank required fields and unsupported blocks', () => {
    const blank = valid(); blank.metadata.title = '';
    expect(baDocumentContentSchema.safeParse(blank).success).toBe(false);
    const block = valid(); block.modules[0].sections[0].blocks.push({ id: 'bad', schemaVersion: 1, blockType: 'DOWNLOAD' as never, payload: {} });
    expect(baDocumentContentSchema.safeParse(block).success).toBe(false);
  });
  it('rejects duplicate module and section IDs', () => {
    const modules = valid(); modules.modules.push(structuredClone(modules.modules[0]));
    expect(baDocumentContentSchema.safeParse(modules).success).toBe(false);
    const sections = valid(); sections.modules[0].sections.push(structuredClone(sections.modules[0].sections[0]));
    expect(baDocumentContentSchema.safeParse(sections).success).toBe(false);
  });
});

describe('stable artifact IDs and requirements', () => {
  it.each(['PAY-BR-001', 'PAY-FR-001', 'PAY-NFR-001', 'PAY-AC-001-01'])('accepts %s', id => expect(artifactIdPattern.test(id)).toBe(true));
  it.each(['P-BR-001', 'pay-FR-001', 'PAY-REQ-001', 'PAY-AC-1'])('rejects %s', id => expect(artifactIdPattern.test(id)).toBe(false));
  it('rejects duplicate IDs across collections', () => {
    const doc = valid(); doc.artifacts.requirements = [requirement() as never];
    doc.artifacts.businessRules = [{ id: 'PAY-FR-001', name: 'Rule', description: 'Description', ruleOrigin: 'PROJECT_SPECIFIC_RULE', decision: 'Decide', outcome: 'Outcome', sourceType: 'PROJECT_DECISION', appliesToRequirementRefs: [] }];
    expect(baDocumentContentSchema.safeParse(doc).success).toBe(false);
  });
  it.each([['PAY-BR-001', 'BUSINESS'], ['PAY-FR-001', 'FUNCTIONAL'], ['PAY-NFR-001', 'NON_FUNCTIONAL']])('matches %s to %s', (id, type) => {
    const doc = valid(); doc.artifacts.requirements = [requirement(id, { type }) as never];
    expect(baDocumentContentSchema.safeParse(doc).success).toBe(true);
  });
  it('rejects self dependencies, cycles, and terminal states without notes', () => {
    const self = valid(); self.artifacts.requirements = [requirement('PAY-FR-001', { dependencies: ['PAY-FR-001'] }) as never];
    expect(baDocumentContentSchema.safeParse(self).success).toBe(false);
    const cycle = valid(); cycle.artifacts.requirements = [requirement('PAY-FR-001', { dependencies: ['PAY-FR-002'] }) as never, requirement('PAY-FR-002', { dependencies: ['PAY-FR-001'] }) as never];
    expect(baDocumentContentSchema.safeParse(cycle).success).toBe(false);
    for (const status of ['DEFERRED', 'REJECTED']) { const doc = valid(); doc.artifacts.requirements = [requirement('PAY-FR-001', { status }) as never]; expect(baDocumentContentSchema.safeParse(doc).success).toBe(false); }
  });
});

describe('same-document references and RTM', () => {
  it('accepts valid references and derives PARTIAL RTM coverage', () => {
    const doc = valid(); doc.artifacts.requirements = [requirement('PAY-FR-001', { validationRefs: ['PAY-VAL-001'] }) as never];
    doc.artifacts.validations = [{ id: 'PAY-VAL-001', name: 'Validate', category: 'DATA_QUALITY', trigger: 'Submission', condition: 'Always', validationLogic: 'Check value', successOutcome: 'Accepted', failureOutcome: 'Rejected', requirementRefs: ['PAY-FR-001'] }];
    const parsed = parseBaDocumentContent(doc);
    expect(deriveBaDocumentRtm(parsed)[0].status).toBe('PARTIAL');
  });
  it('rejects missing and wrong-kind references', () => {
    const missing = valid(); missing.artifacts.requirements = [requirement('PAY-FR-001', { validationRefs: ['PAY-VAL-999'] }) as never];
    expect(baDocumentContentSchema.safeParse(missing).success).toBe(false);
    const wrong = valid(); wrong.artifacts.requirements = [requirement('PAY-FR-001', { validationRefs: ['PAY-RULE-001'] }) as never];
    wrong.artifacts.businessRules = [{ id: 'PAY-RULE-001', name: 'Rule', description: 'Description', ruleOrigin: 'PROJECT_SPECIFIC_RULE', decision: 'Decision', outcome: 'Outcome', sourceType: 'PROJECT_DECISION', appliesToRequirementRefs: ['PAY-FR-001'] }];
    expect(baDocumentContentSchema.safeParse(wrong).success).toBe(false);
  });
  it('validates qualified cross-document syntax without resolving it', () => {
    expect(crossDocumentReferencePattern.test('document:BA_DOCUMENT:PAY:BRD#PAY-FR-001')).toBe(true);
    expect(crossDocumentReferencePattern.test('document:bad ref#PAY-FR-001')).toBe(false);
  });
});

describe('Primary Journey validation', () => {
  it('requires BA Documents to reference BANKING_JOURNEY content', () => {
    expect(() => validateBaDocumentPrimaryJourney({ contentType: 'BA_DOCUMENT', primaryJourneyContentItemId: null, parentType: 'BANKING_JOURNEY' })).toThrow();
    expect(() => validateBaDocumentPrimaryJourney({ contentType: 'BA_DOCUMENT', primaryJourneyContentItemId: 'journey', parentType: 'BA_PRACTICE' })).toThrow();
    expect(() => validateBaDocumentPrimaryJourney({ contentType: 'BA_DOCUMENT', primaryJourneyContentItemId: 'journey', parentType: 'BANKING_JOURNEY' })).not.toThrow();
  });
  it('rejects relations on other content and changes after revision creation', () => {
    expect(() => validateBaDocumentPrimaryJourney({ contentType: 'BA_PRACTICE', primaryJourneyContentItemId: 'journey' })).toThrow();
    expect(() => validateBaDocumentPrimaryJourney({ contentType: 'BA_DOCUMENT', primaryJourneyContentItemId: 'new', parentType: 'BANKING_JOURNEY', existingPrimaryJourneyContentItemId: 'old', hasRevision: true })).toThrow();
  });
});
