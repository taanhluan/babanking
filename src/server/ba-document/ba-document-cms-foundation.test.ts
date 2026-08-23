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

  it('rejects a concurrent active draft', async () => {
    const tx = { contentItem: { findUnique: vi.fn().mockResolvedValue({ publishedRevision: { id: 'published', contentJson: validJson, schemaVersion: 1 }, revisions: [{ id: 'active' }] }) } };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    const { createBaDocumentDraftFromPublished } = await import('./ba-document-service');
    await expect(createBaDocumentDraftFromPublished('document', { id: 'author', role: 'CONTRIBUTOR' })).rejects.toThrow(/active BA Document revision/);
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
