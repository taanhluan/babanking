import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks=vi.hoisted(()=>({save:vi.fn(),authorize:vi.fn(),revalidate:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}));
vi.mock('next/navigation',()=>({redirect:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{}}));
vi.mock('@/lib/auth',()=>({requireRole:vi.fn()}));
vi.mock('@/server/access-control/knowledge-access-repository',()=>({evaluateContentAccessForUser:vi.fn()}));
vi.mock('@/server/ba-document/ba-document-authorization',()=>({requireBaDocumentAccessBySlug:mocks.authorize}));
vi.mock('@/server/ba-document/ba-document-service',()=>({createBaDocument:vi.fn(),publishBaDocumentRevision:vi.fn(),reviewBaDocumentRevision:vi.fn(),saveBaDocumentDraft:mocks.save,submitBaDocumentRevision:vi.fn()}));

beforeEach(()=>vi.clearAllMocks());
describe('Phase 3 remediation guards',()=>{
  it('blocks invalid Save before authorization, DB service, audit and revalidation',async()=>{const {saveBaDocumentAction}=await import('./actions');const data=new FormData();data.set('slug','customer-onboarding-brd');data.set('revisionId','cmt5unmn00003rgwuj91nfjy9');data.set('contentJson',JSON.stringify({schemaVersion:1}));const result=await saveBaDocumentAction(data);expect(result).toMatchObject({ok:false,validation:{status:'INVALID_SCHEMA'}});expect(mocks.authorize).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();expect(mocks.revalidate).not.toHaveBeenCalled();});
  it('shows persisted review feedback read-only for changes requested',()=>{const page=readFileSync(join(process.cwd(),'src/app/admin/contributor/ba-documents/[slug]/page.tsx'),'utf8');expect(page).toContain('Review feedback · Read only');expect(page).toContain('feedback.reviewNote');expect(page).toContain('feedback.reviewer?.name');expect(page).not.toContain('name="reviewNote" value={feedback.reviewNote}');});
  it('validates current textarea state separately from save and renders grouped safe issues',()=>{const editor=readFileSync(join(process.cwd(),'src/app/admin/contributor/ba-documents/BaDocumentEditor.tsx'),'utf8');expect(editor).toContain('onClick={validate}');expect(editor).toContain('Validate JSON');expect(editor).toContain('validateBaDocumentJson(currentJson())');expect(editor).toContain('Validation failed —');expect(editor).not.toContain('ZodError');});
});
