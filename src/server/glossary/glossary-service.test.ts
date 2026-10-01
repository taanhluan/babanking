import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    contentItem: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    contentRevision: { create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    scopeFind: vi.fn(),
    itemFindMany: vi.fn(),
    revisionFindFirst: vi.fn(),
    assertContent: vi.fn(),
    assertScope: vi.fn(),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/server/env', () => ({ getServerEnvironment: () => ({ APP_ENV: 'development', DATABASE_ENVIRONMENT: 'development' }) }));
vi.mock('@/server/access-control/require-knowledge-access', () => ({ assertContentActionAccess: mocks.assertContent, assertScopeActionAccess: mocks.assertScope }));
vi.mock('@/lib/db', () => ({
  db: {
    knowledgeScope: { findFirst: mocks.scopeFind },
    contentItem: { findMany: mocks.itemFindMany },
    contentRevision: { findFirst: mocks.revisionFindFirst },
    $transaction: (callback: (tx: typeof mocks.tx) => unknown) => callback(mocks.tx),
  },
}));

import { createGlossaryEntry, publishGlossaryEntry, rollbackGlossaryEntry, saveGlossaryEntry } from './glossary-service';
import { glossaryInitialContent } from './glossary-domain';

const ready = {
  ...glossaryInitialContent('TERM', 'Know Your Customer'),
  domains: ['AML_KYC'],
  en: { name: 'Know Your Customer', shortDefinition: 'Process to verify the identity of a customer.', body: '', baNotes: '' },
  vi: { name: 'Định danh khách hàng', shortDefinition: 'Quy trình xác minh danh tính khách hàng.', body: '', baNotes: '' },
  relatedEntrySlugs: ['ekyc-circular'],
  relatedJourneySlugs: ['customer-onboarding'],
};
const admin = { id: 'admin-1', role: 'ADMIN' as const };
const contributor = { id: 'author-1', role: 'CONTRIBUTOR' as const };
const reviewer = { id: 'reviewer-1', role: 'REVIEWER' as const };
const revision = (overrides: Record<string, unknown> = {}) => ({ id: 'rev-2', contentItemId: 'item-1', authorId: 'author-1', status: 'IN_REVIEW', contentJson: JSON.stringify(ready), contentItem: { slug: 'kyc', publishedRevisionId: 'rev-1' }, ...overrides });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tx.contentRevision.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.contentItem.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.contentRevision.findUniqueOrThrow.mockImplementation(async () => ({ contentJson: JSON.stringify(ready) }));
});

describe('glossary creation', () => {
  it('fails closed when the shared glossary scope is not configured', async () => {
    mocks.scopeFind.mockResolvedValue(null);
    await expect(createGlossaryEntry({ slug: 'kyc', kind: 'TERM', name: 'KYC' }, admin)).rejects.toThrow(/BANKING_GLOSSARY/);
    expect(mocks.tx.contentItem.create).not.toHaveBeenCalled();
  });

  it('creates the item with a required scope mapping, a v1 draft and an audit record', async () => {
    mocks.scopeFind.mockResolvedValue({ id: 'scope-1' });
    mocks.tx.contentItem.findUnique.mockResolvedValue(null);
    mocks.tx.contentItem.create.mockResolvedValue({ id: 'item-1', slug: 'kyc' });
    mocks.tx.contentRevision.create.mockImplementation(async ({ data }: { data: { contentJson: string } }) => ({ id: 'rev-1', contentJson: data.contentJson }));
    await createGlossaryEntry({ slug: 'kyc', kind: 'TERM', name: 'KYC' }, contributor);
    expect(mocks.assertScope).toHaveBeenCalledWith('author-1', 'scope-1', 'EDIT');
    expect(mocks.tx.contentItem.create.mock.calls[0][0].data.knowledgeScopes.create).toEqual({ knowledgeScopeId: 'scope-1', relationshipType: 'PRIMARY', isRequired: true });
    expect(mocks.tx.contentRevision.create.mock.calls[0][0].data).toMatchObject({ version: 1, authorId: 'author-1' });
    expect(mocks.tx.auditLog.create.mock.calls[0][0].data.action).toBe('GLOSSARY_ENTRY_CREATED');
  });

  it('rejects invalid slugs and members without edit rights', async () => {
    await expect(createGlossaryEntry({ slug: 'Bad Slug', kind: 'TERM', name: 'KYC' }, admin)).rejects.toThrow(/slug/);
    await expect(createGlossaryEntry({ slug: 'kyc', kind: 'TERM', name: 'KYC' }, { id: 'm', role: 'MEMBER' })).rejects.toThrow(/permission/);
  });
});

describe('glossary drafts', () => {
  it('rejects self links and never touches a published revision', async () => {
    mocks.revisionFindFirst.mockResolvedValue(revision({ status: 'DRAFT' }));
    await expect(saveGlossaryEntry('item-1', 'rev-2', { ...ready, relatedEntrySlugs: ['kyc'] }, contributor)).rejects.toThrow(/itself/);
    await saveGlossaryEntry('item-1', 'rev-2', ready, contributor);
    expect(mocks.tx.contentRevision.updateMany.mock.calls[0][0].where).toEqual({ id: 'rev-2', status: { in: ['DRAFT', 'CHANGES_REQUESTED'] } });
  });
});

describe('glossary publication', () => {
  it('blocks a non-admin author from publishing their own revision', async () => {
    mocks.revisionFindFirst.mockResolvedValue(revision());
    await expect(publishGlossaryEntry('item-1', 'rev-2', { id: 'author-1', role: 'REVIEWER' })).rejects.toThrow(/author/);
  });

  it('refuses placeholders and unpublished links', async () => {
    mocks.revisionFindFirst.mockResolvedValue(revision({ contentJson: JSON.stringify(glossaryInitialContent('TERM', 'KYC')) }));
    await expect(publishGlossaryEntry('item-1', 'rev-2', reviewer)).rejects.toThrow(/placeholder/);
    mocks.revisionFindFirst.mockResolvedValue(revision());
    mocks.itemFindMany.mockResolvedValue([]);
    await expect(publishGlossaryEntry('item-1', 'rev-2', reviewer)).rejects.toThrow(/entry ekyc-circular, journey customer-onboarding/);
    expect(mocks.tx.contentItem.updateMany).not.toHaveBeenCalled();
  });

  it('publishes with conditional status and pointer updates plus an audit record', async () => {
    mocks.revisionFindFirst.mockResolvedValue(revision());
    mocks.itemFindMany.mockImplementation(async ({ where }: { where: { type: string } }) => [{ slug: where.type === 'GLOSSARY_ENTRY' ? 'ekyc-circular' : 'customer-onboarding' }]);
    await publishGlossaryEntry('item-1', 'rev-2', reviewer);
    expect(mocks.assertContent).toHaveBeenCalledWith('reviewer-1', 'item-1', 'PUBLISH');
    expect(mocks.tx.contentRevision.updateMany.mock.calls[0][0].where).toEqual({ id: 'rev-2', status: 'IN_REVIEW' });
    expect(mocks.tx.contentItem.updateMany.mock.calls[0][0].where).toEqual({ id: 'item-1', publishedRevisionId: 'rev-1' });
    expect(mocks.tx.auditLog.create.mock.calls[0][0].data.action).toBe('GLOSSARY_ENTRY_PUBLISHED');
  });

  it('fails when the publication pointer moved concurrently', async () => {
    mocks.revisionFindFirst.mockResolvedValue(revision());
    mocks.itemFindMany.mockImplementation(async ({ where }: { where: { type: string } }) => [{ slug: where.type === 'GLOSSARY_ENTRY' ? 'ekyc-circular' : 'customer-onboarding' }]);
    mocks.tx.contentItem.updateMany.mockResolvedValue({ count: 0 });
    await expect(publishGlossaryEntry('item-1', 'rev-2', reviewer)).rejects.toThrow(/concurrently/);
  });

  it('rolls back only to an earlier published revision', async () => {
    mocks.revisionFindFirst.mockResolvedValue(revision({ id: 'rev-1', status: 'PUBLISHED', contentItem: { slug: 'kyc', publishedRevisionId: 'rev-2' } }));
    await rollbackGlossaryEntry('item-1', 'rev-1', admin);
    expect(mocks.tx.contentItem.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'item-1', publishedRevisionId: 'rev-2' }, data: { publishedRevisionId: 'rev-1' } });
    mocks.revisionFindFirst.mockResolvedValue(revision({ status: 'DRAFT' }));
    await expect(rollbackGlossaryEntry('item-1', 'rev-2', admin)).rejects.toThrow(/previously published/);
  });
});
