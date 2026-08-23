import { describe, expect, it } from 'vitest';
import { artifactIdPattern } from './ba-document-domain';
import { baDocumentTemplates } from './ba-document-templates';
import { validateBaDocumentJson } from './ba-document-validation';

describe('BA Document UI-safe validation',()=>{
  const mutableTemplate=()=>structuredClone(baDocumentTemplates.BRD_STANDARD) as unknown as {modules:Array<{sections:Array<{blocks:unknown[]}>}>;artifacts:Record<string,unknown[]>};
  it('returns JSON_PARSE without exposing a thrown ZodError',()=>{const result=validateBaDocumentJson('{bad');expect(result.status).toBe('INVALID_JSON');expect(result.issues[0]).toMatchObject({category:'JSON_PARSE',code:'invalid_json'});});
  it.each(['paragraph','artifactRefs'])('detects non-canonical %s blocks with concise guidance',(type)=>{const content=mutableTemplate();content.modules[0]!.sections[0]!.blocks=[{id:`block-${type}`,type,content:'Legacy',artifactType:'requirements',artifactIds:[]}];const result=validateBaDocumentJson(JSON.stringify(content));expect(result.status).toBe('INVALID_SCHEMA');expect(result.nonCanonicalBlockCount).toBe(1);expect(result.issues.some(issue=>issue.code==='non_canonical_block'&&issue.message.includes('schemaVersion + blockType + payload'))).toBe(true);expect(result.groups.blocks).toBeGreaterThan(1);});
  it('groups block and artifact issues',()=>{const content=mutableTemplate();content.modules[0]!.sections[0]!.blocks=[{id:'legacy',type:'paragraph'}];content.artifacts.requirements=[{id:'FR-ONB-001'}];const result=validateBaDocumentJson(JSON.stringify(content));expect(result.groups.blocks).toBeGreaterThan(0);expect(result.groups.artifacts).toBeGreaterThan(0);});
  it('explains wrong-order stable IDs and accepts the canonical order',()=>{const content=mutableTemplate();content.artifacts.requirements=[{id:'FR-ONB-001',type:'FUNCTIONAL',title:'Requirement',description:'Description',businessRationale:'Rationale',source:{type:'STAKEHOLDER'},priority:'MUST',status:'AGREED'}];const result=validateBaDocumentJson(JSON.stringify(content));expect(result.issues.some(issue=>issue.message.includes('Journey-prefix first')&&issue.message.includes('ONB-FR-001'))).toBe(true);expect(artifactIdPattern.test('ONB-FR-001')).toBe(true);});
  it('validates canonical templates without mutation',()=>{const input=JSON.stringify(baDocumentTemplates.BRD_STANDARD);const result=validateBaDocumentJson(input);expect(result.status).toBe('VALID');expect(JSON.stringify(baDocumentTemplates.BRD_STANDARD)).toBe(input);});
});
