import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repository=readFileSync(join(process.cwd(),'src/server/ba-document/ba-document-repository.ts'),'utf8');
const memberRoute=readFileSync(join(process.cwd(),'src/app/ba-documents/[slug]/page.tsx'),'utf8');
const createRoute=readFileSync(join(process.cwd(),'src/app/admin/contributor/ba-documents/new/page.tsx'),'utf8');
const actions=readFileSync(join(process.cwd(),'src/app/admin/contributor/ba-documents/actions.ts'),'utf8');

describe('Phase 3 BA Document security architecture',()=>{
  it('filters member documents in SQL by accessible Primary Journey, publication and archive state',()=>{
    for(const guard of ['type: "BA_DOCUMENT"','isArchived: false','publishedRevisionId: { not: null }','primaryJourneyContentItemId: { in: journeyIds }'])expect(repository).toContain(guard);
    expect(repository.indexOf('getAccessibleContentIds')).toBeLessThan(repository.indexOf("primaryJourneyContentItemId: { in: journeyIds }"));
  });
  it('authorizes the Primary Journey before loading published document content',()=>{
    expect(memberRoute.indexOf('requireBaDocumentAccessBySlug')).toBeLessThan(memberRoute.indexOf('BaDocumentRepository.getPublished'));
    expect(memberRoute).not.toContain('relatedJourneySlugs');
    expect(memberRoute).not.toContain('metadata.primaryJourneySlug');
  });
  it('limits the Primary Journey selector to EDIT-authorized Journeys',()=>{
    expect(createRoute).toContain("getAccessibleContentIds(user.id,{type:'BANKING_JOURNEY',permission:'EDIT'})");
    expect(createRoute.indexOf('getAccessibleContentIds')).toBeLessThan(createRoute.indexOf('db.contentItem.findMany'));
  });
  it('routes create, save, submit, review and publish through Phase 2 services',()=>{
    for(const service of ['createBaDocument','saveBaDocumentDraft','submitBaDocumentRevision','reviewBaDocumentRevision','publishBaDocumentRevision'])expect(actions).toContain(service);
    expect(actions).toContain('requireBaDocumentAccessBySlug');
  });
  it('keeps Primary Journey immutable in the editor and serves only current textarea JSON',()=>{
    const editor=readFileSync(join(process.cwd(),'src/app/admin/contributor/ba-documents/BaDocumentEditor.tsx'),'utf8');
    expect(editor).not.toContain('primaryJourneyContentItemId');
    expect(editor).toContain('validateBaDocumentJson(current)');
    expect(editor).toContain('name="contentJson" value={json}');
  });
});
