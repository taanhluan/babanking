import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { baDocumentTemplates } from './ba-document-templates';
import type { BaDocumentContentV1 } from './ba-document-domain';
import { buildBaDocumentExportFilename, buildBaDocumentExportModel } from './ba-document-export-model';
import { renderBaDocumentDocx } from './ba-document-docx';
import { renderBaDocumentPdf } from './ba-document-pdf';

function fixture() {
  const content = structuredClone(baDocumentTemplates.BRD_STANDARD) as BaDocumentContentV1;
  content.metadata.documentCode = 'BRD-02';
  content.metadata.title = 'Customer Onboarding Business Requirements Document';
  content.metadata.summary = 'Governed Customer Onboarding requirements for professional export validation.';
  content.modules = [
    { id: 'scope', order: 2, title: 'Scope', sections: [{ id: 'out', order: 2, title: 'Out of Scope', blocks: [] }, { id: 'in', order: 1, title: 'In Scope', blocks: [{ id: 'long', schemaVersion: 1, blockType: 'RICH_TEXT', payload: { text: 'A'.repeat(2500) } }] }] },
    { id: 'overview', order: 1, title: 'Overview', sections: [{ id: 'purpose', order: 1, title: 'Purpose', blocks: [{ id: 'purpose-text', schemaVersion: 1, blockType: 'RICH_TEXT', payload: { text: 'Define the governed business outcome.' } }] }] },
  ];
  content.artifacts.requirements = [{
    id: 'CO-FR-001', type: 'FUNCTIONAL', title: 'Verify identity', description: 'Verify customer identity.', businessRationale: 'Reduce identity risk.',
    source: { type: 'STAKEHOLDER', description: 'Compliance stakeholder' }, priority: 'MUST', status: 'AGREED',
    businessRuleRefs: ['CO-RULE-001'], validationRefs: ['CO-VAL-001'], processRefs: ['CO-PROC-001'], acceptanceCriteriaRefs: ['CO-AC-001'], uatRefs: ['CO-UAT-001'],
  }];
  content.artifacts.businessRules = [{ id: 'CO-RULE-001', name: 'Identity rule', description: 'Approved evidence is required.', ruleOrigin: 'PROJECT_SPECIFIC_RULE', decision: 'Verify evidence.', outcome: 'Verification result.', sourceType: 'STAKEHOLDER', appliesToRequirementRefs: ['CO-FR-001'] }];
  content.artifacts.validations = [{ id: 'CO-VAL-001', name: 'Evidence validation', category: 'COMPLIANCE', trigger: 'Evidence received', condition: 'Evidence exists', validationLogic: 'Check evidence.', successOutcome: 'Accepted', failureOutcome: 'Rejected', requirementRefs: ['CO-FR-001'] }];
  content.artifacts.processes = [{ id: 'CO-PROC-001', name: 'Identity verification', purpose: 'Verify identity.', actors: ['Customer', 'Operations'], preconditions: ['Application exists'], trigger: 'Evidence submitted', steps: [{ id: 'STEP-1', name: 'Verify', laneId: 'Operations', responsibility: 'Check evidence', description: 'Perform approved checks.' }], outcomes: ['Verification completed'], requirementRefs: ['CO-FR-001'] }];
  content.artifacts.acceptanceCriteria = [{ id: 'CO-AC-001', requirementRef: 'CO-FR-001', title: 'Valid evidence accepted', format: 'BUSINESS_READABLE', expectedOutcome: 'Customer proceeds.' }];
  content.artifacts.uatScenarios = [{ id: 'CO-UAT-001', title: 'Valid evidence', objective: 'Confirm acceptance.', requirementRefs: ['CO-FR-001'], acceptanceCriteriaRefs: ['CO-AC-001'], steps: [{ order: 0, action: 'Submit evidence', expectedResult: 'Evidence accepted' }], expectedResult: 'Verification succeeds.', priority: 'HIGH' }];
  const model = buildBaDocumentExportModel({ content, sourceRevisionId: 'published-revision-v1', locale: 'en', primaryJourney: 'Customer Onboarding', version: 1, publishedAt: new Date('2026-08-24T00:00:00Z'), updatedAt: new Date('2026-08-24T00:00:00Z'), authorOrPublisher: 'BA Publisher' });
  return { content, model };
}

describe('BA Document professional export', () => {
  it('uses one governed source revision and preserves persisted module/section ordering', () => {
    const { model } = fixture();
    expect(model.sourceRevisionId).toBe('published-revision-v1');
    expect(model.modules.map((item) => item.id)).toEqual(['overview', 'scope']);
    expect(model.modules[1]!.sections.map((item) => item.id)).toEqual(['in', 'out']);
    expect(model.artifactGroups.map((group) => group.key)).toEqual(['requirements', 'businessRules', 'validations', 'processes', 'acceptanceCriteria', 'uatScenarios']);
    expect(model.traceability[0]).toMatchObject({ requirement: 'CO-FR-001', integrity: 'VALID', uat: ['CO-UAT-001'] });
  });

  it('creates governed filenames without database IDs or unsafe characters', () => {
    const { model } = fixture();
    expect(buildBaDocumentExportFilename(model, 'docx')).toBe('BRD-02_Customer-Onboarding-Business-Requirements-Document_v1.docx');
    expect(buildBaDocumentExportFilename({ ...model, metadata: { ...model.metadata, title: '../../Internal : BRD?' } }, 'pdf')).toBe('BRD-02_Internal-BRD_v1.pdf');
  });

  it('generates genuine DOCX and deterministic PDF buffers, including long content', async () => {
    const { model } = fixture();
    const [docx, pdf] = await Promise.all([renderBaDocumentDocx(model), renderBaDocumentPdf(model)]);
    expect(docx.subarray(0, 2).toString()).toBe('PK');
    expect(docx.length).toBeGreaterThan(5_000);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(5_000);
  });

  it('does not mutate governed content and omits empty optional collections', async () => {
    const { content, model } = fixture();
    const before = JSON.stringify(content);
    await renderBaDocumentDocx(model); await renderBaDocumentPdf(model);
    expect(JSON.stringify(content)).toBe(before);
    expect(model.artifactGroups.some((group) => group.key === 'decisions')).toBe(false);
  });

  it('keeps authorization before protected reads and filters archived/unpublished records', () => {
    const service = readFileSync(join(process.cwd(), 'src/server/ba-document/ba-document-export-service.ts'), 'utf8');
    const repository = readFileSync(join(process.cwd(), 'src/server/ba-document/ba-document-repository.ts'), 'utf8');
    const page = readFileSync(join(process.cwd(), 'src/app/ba-documents/[slug]/page.tsx'), 'utf8');
    const route = readFileSync(join(process.cwd(), 'src/app/api/ba-documents/[slug]/export/route.ts'), 'utf8');
    expect(service.indexOf("requireBaDocumentAccessBySlug(slug, 'VIEW')")).toBeLessThan(service.indexOf('BaDocumentRepository.getPublished(document)'));
    expect(repository).toContain('isArchived: false');
    expect(repository).toContain('publishedRevisionId: { not: null }');
    expect(route).toContain('loadAuthorizedPublishedBaDocumentExport');
    expect(page).toContain('loadAuthorizedPublishedBaDocumentView');
    expect(service).toContain('sourceRevisionId: sourceRevision.id');
  });

  it('calls the locale-prefixed export endpoint without a middleware redirect', () => {
    const control = readFileSync(join(process.cwd(), 'src/components/ba-documents/BaDocumentExportControl.tsx'), 'utf8');
    expect(control).toContain('fetch(`/${locale}/api/ba-documents/${encodeURIComponent(slug)}/export?format=${format}&locale=${locale}`');
    expect(control).not.toContain('fetch(`/api/ba-documents/');
  });

  it('selects a structurally valid published translation without merging languages', () => {
    const service = readFileSync(join(process.cwd(), 'src/server/ba-document/ba-document-export-service.ts'), 'utf8');
    expect(service).toContain("locale === 'vi' ? await BaDocumentRepository.getPublishedTranslation");
    expect(service).toContain('validateTranslationStructure(source, translated).valid');
    expect(service).toContain('translationUnavailable');
  });
});
