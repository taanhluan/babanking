import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertContentReadBack,
  assertGovernedDraftEditable,
  assertGovernedRevisionPublishable,
  governedContentHash,
} from '@/server/cms/governed-content-lifecycle';
import { baDocumentTemplates } from './ba-document-templates';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  evaluate: vi.fn(),
  requireRole: vi.fn(),
  notFound: vi.fn(() => { throw new Error('not-found'); }),
  transaction: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: { $transaction: mocks.transaction, contentItem: { findUnique: mocks.findUnique } } }));
vi.mock('@/lib/auth', () => ({ requireRole: mocks.requireRole }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('@/server/access-control/knowledge-access-repository', () => ({ evaluateContentAccessForUser: mocks.evaluate }));
vi.mock('@/server/env', () => ({ getServerEnvironment: () => ({ APP_ENV: 'development', DATABASE_ENVIRONMENT: 'development', ALLOW_PRODUCTION_DATABASE_OPERATIONS: false }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ id: 'reviewer', role: 'REVIEWER' });
});

describe('BA Document lifecycle service', () => {
  const validJson = JSON.stringify(baDocumentTemplates.BRD_STANDARD);

  it('rejects invalid BA Document JSON before persistence', async () => {
    mocks.evaluate.mockResolvedValue({ allowed: true });
    const { createBaDocument } = await import('./ba-document-service');
    await expect(createBaDocument({ slug: 'bad', primaryJourneyContentItemId: 'journey', contentJson: '{}' }, { id: 'author', role: 'CONTRIBUTOR' })).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('returns a concurrent active draft without creating another revision', async () => {
    const create=vi.fn();
    const active={id:'active',version:2,status:'DRAFT',contentItemId:'document',schemaVersion:1,contentJson:validJson,authorId:'author'};
    const tx = { contentItem: { findUnique: vi.fn().mockResolvedValue({ primaryJourneyContentItemId:'journey',publishedRevision: { id: 'published', contentJson: validJson, schemaVersion: 1 }, revisions: [active] }) },contentRevision:{create} };
    mocks.evaluate.mockResolvedValue({allowed:true});
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    const { createBaDocumentDraftFromPublished } = await import('./ba-document-service');
    await expect(createBaDocumentDraftFromPublished('document', { id: 'author', role: 'CONTRIBUTOR' })).resolves.toEqual({revision:active,created:false});
    expect(create).not.toHaveBeenCalled();
  });

  it('creates only the next revision by cloning published canonical content', async()=>{
    const created={id:'draft-v2',contentItemId:'document',version:2,status:'DRAFT',schemaVersion:1,contentJson:validJson,authorId:'author'};
    const create=vi.fn().mockResolvedValue(created),auditCreate=vi.fn();
    const tx={contentItem:{findUnique:vi.fn().mockResolvedValue({primaryJourneyContentItemId:'journey',publishedRevision:{id:'published-v1',contentJson:validJson,schemaVersion:1},revisions:[]})},contentRevision:{findFirst:vi.fn().mockResolvedValue({version:1}),create},auditLog:{create:auditCreate}};
    mocks.evaluate.mockResolvedValue({allowed:true});mocks.transaction.mockImplementation(async callback=>callback(tx));
    const{createBaDocumentDraftFromPublished}=await import('./ba-document-service');
    const result=await createBaDocumentDraftFromPublished('document',{id:'author',role:'CONTRIBUTOR'});
    expect(result).toEqual({revision:created,created:true});
    expect(create).toHaveBeenCalledWith({data:expect.objectContaining({contentItemId:'document',version:2,status:'DRAFT',contentJson:validJson})});
    expect(tx.contentItem.findUnique).toHaveBeenCalledTimes(1);
    expect(JSON.parse(created.contentJson).artifacts).toEqual(baDocumentTemplates.BRD_STANDARD.artifacts);
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects a publication pointer race before audit', async () => {
    const auditCreate = vi.fn();
    const tx = {
      contentRevision: { findFirst: vi.fn().mockResolvedValue({ id: 'revision', status: 'IN_REVIEW', authorId: 'author', contentJson: validJson }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      contentItem: { findUnique: vi.fn().mockResolvedValue({ publishedRevisionId: 'old' }), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      auditLog: { create: auditCreate },
    };
    const { publishBaDocumentRevisionTransaction } = await import('./ba-document-service');
    await expect(publishBaDocumentRevisionTransaction(tx as never, 'document', 'revision', { id: 'reviewer', role: 'REVIEWER' })).rejects.toThrow(/pointer conflict/);
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('publishes the new revision by moving only the ContentItem pointer',async()=>{
    const revisionUpdate=vi.fn().mockResolvedValue({count:1}),itemUpdate=vi.fn().mockResolvedValue({count:1}),auditCreate=vi.fn();
    const tx={contentRevision:{findFirst:vi.fn().mockResolvedValue({id:'revision-v2',status:'IN_REVIEW',authorId:'author',contentJson:validJson}),updateMany:revisionUpdate},contentItem:{findUnique:vi.fn().mockResolvedValueOnce({publishedRevisionId:'revision-v1'}).mockResolvedValueOnce({publishedRevision:{contentJson:validJson}}),updateMany:itemUpdate},auditLog:{create:auditCreate}};
    const{publishBaDocumentRevisionTransaction}=await import('./ba-document-service');
    await publishBaDocumentRevisionTransaction(tx as never,'document','revision-v2',{id:'reviewer',role:'REVIEWER'});
    expect(itemUpdate).toHaveBeenCalledWith({where:{id:'document',publishedRevisionId:'revision-v1'},data:expect.objectContaining({publishedRevisionId:'revision-v2'})});
    expect(revisionUpdate).toHaveBeenCalledTimes(1);
    expect(revisionUpdate.mock.calls[0]?.[0].where.id).toBe('revision-v2');
    expect(JSON.stringify(revisionUpdate.mock.calls)).not.toContain('revision-v1');
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });
});

describe('shared governed content lifecycle', () => {
  it('enforces ownership, permissions and independent publish review for every governed type', () => {
    expect(() => assertGovernedDraftEditable({ role: 'CONTRIBUTOR', actorId: 'author', authorId: 'author', status: 'DRAFT' }, 'BA Document')).not.toThrow();
    expect(() => assertGovernedDraftEditable({ role: 'MEMBER', actorId: 'author', authorId: 'author', status: 'DRAFT' }, 'BA Document')).toThrow(/permission/);
    expect(() => assertGovernedRevisionPublishable({ role: 'ADMIN', actorId: 'author', authorId: 'author', status: 'IN_REVIEW' }, 'BA Document')).toThrow(/author/);
    expect(() => assertGovernedRevisionPublishable({ role: 'REVIEWER', actorId: 'reviewer', authorId: 'author', status: 'IN_REVIEW' }, 'BA Document')).not.toThrow();
  });

  it('uses SHA-256 read-back verification and rejects mismatches', () => {
    expect(governedContentHash('{"a":1}')).toMatch(/^[a-f0-9]{64}$/);
    expect(() => assertContentReadBack('{"a":1}', '{"a":1}', 'save')).not.toThrow();
    expect(() => assertContentReadBack('{"a":1}', '{"a":2}', 'save')).toThrow(/hash mismatch/);
  });
});

describe('BA Document authorization boundary', () => {
  it('authorizes exclusively through the Primary Journey database relation', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'document', primaryJourneyContentItemId: 'journey-primary' });
    mocks.evaluate.mockResolvedValue({ allowed: true, reasonCode: 'ALLOWED' });
    const { requireBaDocumentAccess } = await import('./ba-document-authorization');
    const result = await requireBaDocumentAccess('document', 'REVIEW');
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: 'document', type: 'BA_DOCUMENT' }, select: { id: true, primaryJourneyContentItemId: true } });
    expect(mocks.evaluate).toHaveBeenCalledWith('reviewer', 'journey-primary', 'REVIEW');
    expect(result.document).toEqual({ id: 'document', primaryJourneyContentItemId: 'journey-primary' });
  });

  it('does not fetch protected metadata/content when Primary Journey access is denied', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'document', primaryJourneyContentItemId: 'journey-primary' });
    mocks.evaluate.mockResolvedValue({ allowed: false, reasonCode: 'SCOPE_NOT_GRANTED' });
    const { requireBaDocumentAccess } = await import('./ba-document-authorization');
    await expect(requireBaDocumentAccess('document', 'VIEW')).rejects.toThrow('not-found');
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mocks.findUnique.mock.calls[0])).not.toMatch(/contentJson|previewJson|slug|revisions/);
  });

  it('contains no related-slug or document-body authorization input', () => {
    const source = readFileSync(join(process.cwd(), 'src/server/ba-document/ba-document-authorization.ts'), 'utf8');
    const identityRead = source.indexOf('select: { id: true, primaryJourneyContentItemId: true }');
    const accessCheck = source.indexOf('evaluateContentAccessForUser');
    expect(identityRead).toBeGreaterThan(-1);
    expect(identityRead).toBeLessThan(source.lastIndexOf('evaluateContentAccessForUser'));
    expect(source).not.toContain('relatedJourneySlugs');
    expect(source).not.toContain('contentJson');
    expect(source).not.toContain('previewJson');
    expect(accessCheck).toBeGreaterThan(-1);
  });

  it('requires the authorization capability before repository content reads', () => {
    const source = readFileSync(join(process.cwd(), 'src/server/ba-document/ba-document-repository.ts'), 'utf8');
    expect(source).toContain('authorization: AuthorizedBaDocument');
    expect(source).toContain('primaryJourneyContentItemId: authorization.primaryJourneyContentItemId');
  });
});
