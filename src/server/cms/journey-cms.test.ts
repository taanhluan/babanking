import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertJourneyCmsRouteAvailable,
  assertJourneyCmsWriteAllowed,
  isJourneyCmsRouteAvailable,
} from './journey-cms-environment-core';
import {
  assertJourneyStableSlug,
  canonicalizeJourneyDraft,
  journeyContentSchema,
  journeyPreviewJson,
  parseJourneyContentJson,
} from './journey-content-schema';
import {
  assertDraftEditable,
  assertDraftSubmittable,
  assertRevisionPublishable,
  assertRevisionReviewable,
} from './journey-cms-policy';
import { getJourneyCmsActionErrorCode } from './journey-cms-action-errors';
import { assertGovernedDraftSubmittable } from './governed-content-lifecycle';

const mockDatabase = vi.hoisted(() => ({ $transaction: vi.fn() }));
const mockServerEnvironment = vi.hoisted(() => ({
  APP_ENV: 'development' as 'development' | 'production',
  DATABASE_ENVIRONMENT: 'development' as 'development' | 'production',
  ALLOW_PRODUCTION_DATABASE_OPERATIONS: false,
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: mockDatabase }));
vi.mock('@/server/env', () => ({
  getServerEnvironment: () => mockServerEnvironment,
}));

beforeEach(() => {
  mockServerEnvironment.APP_ENV = 'development';
  mockServerEnvironment.DATABASE_ENVIRONMENT = 'development';
  mockServerEnvironment.ALLOW_PRODUCTION_DATABASE_OPERATIONS = false;
  vi.clearAllMocks();
});

const contentJson = JSON.stringify({
  title: 'Payments and Transfers',
  slug: 'payments-and-transfers',
  summary: 'A sufficiently detailed Payment Journey summary for validation.',
  schemaVersion: 1,
  modules: [{
    title: 'Overview',
    sections: [{
      title: 'Introduction',
      blocks: [{
        blockType: 'RICH_TEXT',
        schemaVersion: 1,
        payload: { text: 'Payment content' },
      }],
    }],
  }],
});

describe('Journey submission permissions', () => {
  it('keeps other governed content author-only by default', () => {
    expect(() => assertGovernedDraftSubmittable({ role: 'ADMIN', actorId: 'admin', authorId: 'author', status: 'DRAFT' }, 'BA Document')).toThrow();
  });
  it('allows admins to submit another author draft or requested changes', () => {
    for (const status of ['DRAFT', 'CHANGES_REQUESTED'] as const) {
      expect(() => assertDraftSubmittable({ role: 'ADMIN', actorId: 'admin', authorId: 'author', status })).not.toThrow();
    }
  });
  it('preserves ownership checks for contributors and state checks for admins', () => {
    expect(() => assertDraftSubmittable({ role: 'CONTRIBUTOR', actorId: 'other', authorId: 'author', status: 'DRAFT' })).toThrow();
    expect(() => assertDraftSubmittable({ role: 'CONTRIBUTOR', actorId: 'author', authorId: 'author', status: 'DRAFT' })).not.toThrow();
    for (const status of ['PUBLISHED', 'IN_REVIEW', 'REJECTED'] as const) {
      expect(() => assertDraftSubmittable({ role: 'ADMIN', actorId: 'admin', authorId: 'author', status })).toThrow();
    }
  });
});

describe('Journey CMS environment protection', () => {
  it('allows normal Development and Production CMS writes independently of the technical override', () => {
    expect(() => assertJourneyCmsRouteAvailable({
      APP_ENV: 'development',
      DATABASE_ENVIRONMENT: 'development',
    })).not.toThrow();
    expect(() => assertJourneyCmsWriteAllowed({
      APP_ENV: 'development',
      DATABASE_ENVIRONMENT: 'development',
      ALLOW_PRODUCTION_DATABASE_OPERATIONS: false,
    })).not.toThrow();
    expect(() => assertJourneyCmsWriteAllowed({
      APP_ENV: 'development',
      DATABASE_ENVIRONMENT: 'development',
      ALLOW_PRODUCTION_DATABASE_OPERATIONS: true,
    })).not.toThrow();
    expect(() => assertJourneyCmsWriteAllowed({
      APP_ENV: 'production',
      DATABASE_ENVIRONMENT: 'production',
      ALLOW_PRODUCTION_DATABASE_OPERATIONS: false,
    })).not.toThrow();
    expect(() => assertJourneyCmsWriteAllowed({
      APP_ENV: 'production',
      DATABASE_ENVIRONMENT: 'production',
      ALLOW_PRODUCTION_DATABASE_OPERATIONS: true,
    })).not.toThrow();
  });

  it('rejects Preview and mismatched environments', () => {
    expect(() => assertJourneyCmsRouteAvailable({
      APP_ENV: 'preview',
      DATABASE_ENVIRONMENT: 'preview',
    })).toThrow(/unavailable/);
    expect(() => assertJourneyCmsWriteAllowed({
      APP_ENV: 'preview',
      DATABASE_ENVIRONMENT: 'preview',
    })).toThrow(/writes/);
    expect(() => assertJourneyCmsRouteAvailable({
      APP_ENV: 'development',
      DATABASE_ENVIRONMENT: 'production',
    })).toThrow(/unavailable/);
    expect(() => assertJourneyCmsWriteAllowed({
      APP_ENV: 'production',
      DATABASE_ENVIRONMENT: 'development',
      ALLOW_PRODUCTION_DATABASE_OPERATIONS: true,
    })).toThrow(/writes/);
    expect(isJourneyCmsRouteAvailable({
      APP_ENV: 'preview',
      DATABASE_ENVIRONMENT: 'preview',
    })).toBe(false);
    expect(() => assertJourneyCmsWriteAllowed({} as never)).toThrow(/writes/);
  });

  it('prevents an environment mismatch from invoking a mutation', () => {
    const mutation = vi.fn();
    expect(() => {
      assertJourneyCmsWriteAllowed({
        APP_ENV: 'development',
        DATABASE_ENVIRONMENT: 'production',
        ALLOW_PRODUCTION_DATABASE_OPERATIONS: false,
      });
      mutation();
    }).toThrow(/writes/);
    expect(mutation).not.toHaveBeenCalled();
  });

  it('creates a new Production draft with override disabled and records the validated environment', async () => {
    mockServerEnvironment.APP_ENV = 'production';
    mockServerEnvironment.DATABASE_ENVIRONMENT = 'production';
    const auditCreate = vi.fn();
    const revisionCreate = vi.fn().mockResolvedValue({ id: 'revision-v5', version: 5, status: 'DRAFT' });
    const transaction = {
      contentItem: { findUnique: vi.fn().mockResolvedValue({ id: 'journey', slug: 'payments-and-transfers', publishedRevision: { id: 'revision-v4', contentJson }, revisions: [] }) },
      contentRevision: { findFirst: vi.fn().mockResolvedValue({ version: 4 }), create: revisionCreate },
      auditLog: { create: auditCreate },
    };
    mockDatabase.$transaction.mockImplementation(async (callback) => callback(transaction));
    const { createJourneyDraftFromPublished } = await import('./journey-cms-service');
    await createJourneyDraftFromPublished('journey', { id: 'admin', role: 'ADMIN' });
    expect(revisionCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ version: 5, status: 'DRAFT' }) }));
    const metadata = JSON.parse(auditCreate.mock.calls[0][0].data.metadataJson);
    expect(metadata.environment).toBe('production');
  });

  it('saves an owned Production draft with override disabled through the existing workflow policy', async () => {
    mockServerEnvironment.APP_ENV = 'production';
    mockServerEnvironment.DATABASE_ENVIRONMENT = 'production';
    const revisionUpdate = vi.fn().mockResolvedValue({ id: 'revision-v5', status: 'DRAFT' });
    const transaction = {
      contentRevision: {
        findFirst: vi.fn().mockResolvedValue({ id: 'revision-v5', status: 'DRAFT', authorId: 'admin', contentJson, contentItem: { slug: 'payments-and-transfers' } }),
        update: revisionUpdate,
      },
      auditLog: { create: vi.fn() },
    };
    mockDatabase.$transaction.mockImplementation(async (callback) => callback(transaction));
    const { saveJourneyDraft } = await import('./journey-cms-service');
    await saveJourneyDraft(
      'journey',
      'revision-v5',
      'Payments and Transfers',
      'A sufficiently detailed Payment Journey summary for validation.',
      contentJson,
      { id: 'admin', role: 'ADMIN' },
    );
    expect(revisionUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'revision-v5' } }));
  });

  it('checks route availability before authorization and repository access', () => {
    const authorization = readFileSync(
      join(process.cwd(), 'src/server/cms/journey-cms-authorization.ts'),
      'utf8',
    );
    const authorizationBody = authorization.slice(
      authorization.indexOf('export async function requireJourneyCmsAccess'),
    );
    expect(authorizationBody.indexOf('requireJourneyCmsRouteAvailability()'))
      .toBeLessThan(authorizationBody.indexOf("requireRole('CONTRIBUTOR')"));
    expect(authorizationBody.indexOf("requireRole('CONTRIBUTOR')"))
      .toBeLessThan(authorizationBody.indexOf('evaluateContentSlugAccessForUser('));
    const listPage = readFileSync(
      join(process.cwd(), 'src/app/admin/contributor/journeys/page.tsx'),
      'utf8',
    );
    expect(listPage.indexOf('requireJourneyCmsRouteAvailability()'))
      .toBeLessThan(listPage.indexOf("requireRole('ADMIN')"));
    expect(listPage.indexOf("requireRole('ADMIN')"))
      .toBeLessThan(listPage.indexOf('JourneyCmsRepository.listAuthorized'));
  });
});

describe('Journey CMS validation and workflow policy', () => {
  it('keeps planned segment as non-authoritative preview metadata', () => {
    const content = parseJourneyContentJson(contentJson);
    expect(JSON.parse(journeyPreviewJson(content, 'sme'))).toMatchObject({
      title: 'Payments and Transfers',
      plannedSegment: 'sme',
    });
  });
  it('maps expected CMS policy failures to controlled codes without hiding technical errors', () => {
    expect(getJourneyCmsActionErrorCode(new Error('Journey CMS permission denied.'))).toBe('permission');
    expect(getJourneyCmsActionErrorCode(new Error('An active Journey revision already exists.'))).toBe('workflow');
    expect(getJourneyCmsActionErrorCode(new Error('Journey publication pointer conflict.'))).toBe('conflict');
    expect(getJourneyCmsActionErrorCode(new Error('database socket failed'))).toBeNull();
  });
  it('supports legacy JSON while validating structured modules and blocks', () => {
    expect(parseJourneyContentJson(contentJson).title).toBe('Payments and Transfers');
    expect(journeyContentSchema.safeParse({
      title: 'Payments and Transfers',
      summary: 'A sufficiently detailed Payment Journey summary for validation.',
      customerGoals: ['Fast payment'],
    }).success).toBe(true);
    expect(journeyContentSchema.safeParse({
      title: 'Payments and Transfers',
      summary: 'A sufficiently detailed Payment Journey summary for validation.',
      modules: [{ title: 'Overview', sections: [{ title: 'Intro', blocks: [{
        blockType: 'RICH_TEXT',
        schemaVersion: 0,
        payload: {},
      }] }] }],
    }).success).toBe(false);
  });

  it('keeps the ContentItem stable slug immutable', () => {
    const content = parseJourneyContentJson(contentJson);
    expect(() => assertJourneyStableSlug(content, 'payments-and-transfers')).not.toThrow();
    expect(() => assertJourneyStableSlug(content, 'cards')).toThrow(/cannot be changed/);
  });

  it('accepts v2 subsections while keeping v1 data flat and bounded', () => {
    const v1 = journeyContentSchema.parse({ title: 'Legacy Journey', summary: 'A sufficiently detailed legacy Journey summary for validation.', schemaVersion: 1, modules: [{ title: 'Module', sections: [{ title: 'Section', blocks: [] }] }] });
    expect(v1.schemaVersion).toBe(1);
    const v2 = journeyContentSchema.parse({ title: 'Structured Journey', summary: 'A sufficiently detailed structured Journey summary for validation.', schemaVersion: 2, modules: [{ title: 'Module', sections: [{ title: 'Section', blocks: [], subsections: [{ title: 'Subsection', blocks: [] }] }] }] });
    expect(v2.schemaVersion).toBe(2);
    expect(v2.modules?.[0].sections[0].subsections).toHaveLength(1);
    const tooMany = Array.from({ length: 21 }, (_, index) => ({ title: `Section ${index}`, blocks: [] }));
    expect(journeyContentSchema.safeParse({ title: 'Too many', summary: 'A sufficiently detailed structured Journey summary for validation.', schemaVersion: 2, modules: [{ title: 'Module', sections: tooMany }] }).success).toBe(false);
  });

  it('replaces legacy body fields only for explicitly canonical structured submissions', () => {
    const legacy = JSON.stringify({ ...JSON.parse(contentJson), businessOverview: 'Legacy duplicate' });
    const submitted = JSON.stringify({ ...JSON.parse(contentJson), metadata: { journeyReader: 'canonical' } });
    const result = canonicalizeJourneyDraft({
      authoritativeJson: legacy,
      submittedJson: submitted,
      title: 'Payments and Transfers',
      summary: 'A sufficiently detailed Payment Journey summary for validation.',
      stableSlug: 'payments-and-transfers',
    });
    expect(result).not.toHaveProperty('businessOverview');
    expect(result.metadata).toEqual({ journeyReader: 'canonical' });
  });

  it('canonicalizes editable fields while preserving unknown legacy content', () => {
    const canonical = canonicalizeJourneyDraft({
      authoritativeJson: JSON.stringify({
        title: 'Old title',
        slug: 'payments-and-transfers',
        summary: 'An existing sufficiently detailed summary for the Journey.',
        shortTitle: 'Payments',
        legacyBusinessField: ['preserve me'],
      }),
      submittedJson: JSON.stringify({
        title: 'Updated Journey title',
        slug: 'payments-and-transfers',
        summary: 'An updated sufficiently detailed summary for the Journey.',
        schemaVersion: 999,
        modules: [],
      }),
      title: 'Updated Journey title',
      summary: 'An updated sufficiently detailed summary for the Journey.',
      stableSlug: 'payments-and-transfers',
    });
    expect(canonical).toMatchObject({
      title: 'Updated Journey title',
      slug: 'payments-and-transfers',
      summary: 'An updated sufficiently detailed summary for the Journey.',
      schemaVersion: 1,
      shortTitle: 'Payments',
      legacyBusinessField: ['preserve me'],
      modules: [],
    });
  });

  it('rejects conflicting identity, technical and privileged metadata', () => {
    const base = {
      authoritativeJson: contentJson,
      title: 'Payments and Transfers',
      summary: 'A sufficiently detailed Payment Journey summary for validation.',
      stableSlug: 'payments-and-transfers',
    };
    expect(() => canonicalizeJourneyDraft({
      ...base,
      submittedJson: JSON.stringify({
        ...JSON.parse(contentJson),
        slug: 'cards',
      }),
    })).toThrow(/slug/);
    expect(() => canonicalizeJourneyDraft({
      ...base,
      submittedJson: JSON.stringify({
        ...JSON.parse(contentJson),
        status: 'PUBLISHED',
      }),
    })).toThrow(/System-owned/);
    expect(() => canonicalizeJourneyDraft({
      ...base,
      submittedJson: JSON.stringify({
        ...JSON.parse(contentJson),
        modules: [{
          title: 'Files',
          sections: [{
            title: 'Private',
            blocks: [{
              blockType: 'DOWNLOAD',
              schemaVersion: 1,
              payload: { storageKey: 'private/file.pdf' },
            }],
          }],
        }],
      }),
    })).toThrow(/Privileged/);
  });

  it('enforces role permissions, ownership and independent review', () => {
    expect(() => assertDraftEditable({
      role: 'CONTRIBUTOR',
      actorId: 'author',
      authorId: 'author',
      status: 'DRAFT',
    })).not.toThrow();
    expect(() => assertDraftEditable({
      role: 'MEMBER',
      actorId: 'member',
      authorId: 'member',
      status: 'DRAFT',
    })).toThrow(/permission/);
    expect(() => assertRevisionReviewable({
      role: 'REVIEWER',
      actorId: 'author',
      authorId: 'author',
      status: 'IN_REVIEW',
    })).toThrow(/reviewed/);
    expect(() => assertRevisionPublishable({
      role: 'ADMIN',
      actorId: 'author',
      authorId: 'author',
      status: 'IN_REVIEW',
    })).not.toThrow();
    expect(() => assertRevisionPublishable({
      role: 'REVIEWER',
      actorId: 'reviewer',
      authorId: 'author',
      status: 'IN_REVIEW',
    })).not.toThrow();
  });
});

describe('Journey creation foundation', () => {
  it('creates an unpublished scoped Draft with planned segment metadata and audit', async () => {
    const itemCreate = vi.fn().mockResolvedValue({ id: 'new-journey', slug: 'sme-business-onboarding' });
    const revisionCreate = vi.fn().mockResolvedValue({ id: 'new-revision', version: 1, status: 'DRAFT' });
    const auditCreate = vi.fn();
    const transaction = {
      contentItem: { findUnique: vi.fn().mockResolvedValue(null), create: itemCreate },
      knowledgeScope: { findFirst: vi.fn().mockResolvedValue({ id: 'scope-1' }) },
      contentRevision: { create: revisionCreate },
      auditLog: { create: auditCreate },
    };
    mockDatabase.$transaction.mockImplementation(async (callback) => callback(transaction));
    const { createJourney } = await import('./journey-cms-service');
    await createJourney({
      slug: 'sme-business-onboarding',
      title: 'SME Business Onboarding',
      summary: 'A controlled end-to-end onboarding Journey for small and medium-sized enterprises.',
      knowledgeScopeId: 'scope-1',
      plannedSegment: 'sme',
    }, { id: 'admin', role: 'ADMIN' });
    expect(itemCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'BANKING_JOURNEY',
      slug: 'sme-business-onboarding',
      previewJson: expect.stringContaining('"plannedSegment":"sme"'),
      knowledgeScopes: { create: { knowledgeScopeId: 'scope-1', relationshipType: 'PRIMARY', isRequired: true } },
    }) });
    expect(revisionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ version: 1, status: 'DRAFT', authorId: 'admin' }) });
    expect(auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'JOURNEY_CREATED', entityId: 'new-journey' }) });
  });

  it('fails closed before creation for duplicate slugs or inactive scopes', async () => {
    const create = vi.fn();
    const transaction = {
      contentItem: { findUnique: vi.fn().mockResolvedValue({ id: 'existing' }), create },
      knowledgeScope: { findFirst: vi.fn().mockResolvedValue(null) },
      contentRevision: { create },
      auditLog: { create },
    };
    mockDatabase.$transaction.mockImplementation(async (callback) => callback(transaction));
    const { createJourney } = await import('./journey-cms-service');
    await expect(createJourney({
      slug: 'cards',
      title: 'Duplicate Cards Journey',
      summary: 'A sufficiently detailed duplicate Journey summary that must never be persisted.',
      knowledgeScopeId: 'missing-scope',
      plannedSegment: 'retail-banking',
    }, { id: 'admin', role: 'ADMIN' })).rejects.toThrow(/already exists/);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('Journey CMS publish and rollback transactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes atomically, synchronizes preview metadata and writes audit', async () => {
    const contentRevisionUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const contentItemUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const auditCreate = vi.fn();
    const transaction = {
      contentRevision: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'revision-new',
          status: 'IN_REVIEW',
          authorId: 'author',
          contentJson,
        }),
        updateMany: contentRevisionUpdateMany,
      },
      contentItem: {
        findUnique: vi.fn().mockResolvedValue({
          publishedRevisionId: 'revision-old',
          slug: 'payments-and-transfers',
        }),
        updateMany: contentItemUpdateMany,
      },
      auditLog: { create: auditCreate },
    } as unknown as Prisma.TransactionClient;
    const { publishJourneyRevisionTransaction } = await import('./journey-cms-service');

    await publishJourneyRevisionTransaction(
      transaction,
      'journey-id',
      'revision-new',
      { id: 'reviewer', role: 'REVIEWER' },
    );

    expect(contentRevisionUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'revision-new', contentItemId: 'journey-id', status: 'IN_REVIEW' },
      data: expect.objectContaining({ status: 'PUBLISHED', reviewerId: 'reviewer' }),
    }));
    expect(contentItemUpdateMany).toHaveBeenCalledWith({
      where: { id: 'journey-id', publishedRevisionId: 'revision-old' },
      data: {
        publishedRevisionId: 'revision-new',
        previewJson: JSON.stringify({
          title: 'Payments and Transfers',
          summary: 'A sufficiently detailed Payment Journey summary for validation.',
        }),
      },
    });
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'JOURNEY_PUBLISHED' }),
    }));
    expect(JSON.parse(auditCreate.mock.calls[0][0].data.metadataJson).environment).toBe('development');
  });

  it('fails before writes for self-publish or invalid content', async () => {
    const update = vi.fn();
    const transaction = {
      contentRevision: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'revision-new',
          status: 'IN_REVIEW',
          authorId: 'author',
          contentJson,
        }),
        updateMany: update,
      },
      contentItem: { findUnique: vi.fn(), updateMany: update },
      auditLog: { create: vi.fn() },
    } as unknown as Prisma.TransactionClient;
    const { publishJourneyRevisionTransaction } = await import('./journey-cms-service');
    await expect(publishJourneyRevisionTransaction(
      transaction,
      'journey-id',
      'revision-new',
      { id: 'author', role: 'REVIEWER' },
    )).rejects.toThrow(/author/);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a crafted revision from another Journey', async () => {
    const updateMany = vi.fn();
    const transaction = {
      contentRevision: {
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany,
      },
      contentItem: { findUnique: vi.fn(), updateMany },
      auditLog: { create: vi.fn() },
    } as unknown as Prisma.TransactionClient;
    const { publishJourneyRevisionTransaction } = await import('./journey-cms-service');
    await expect(publishJourneyRevisionTransaction(
      transaction,
      'journey-a',
      'revision-from-journey-b',
      { id: 'reviewer', role: 'ADMIN' },
    )).rejects.toThrow(/not found/);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rolls back the transaction when the publication pointer changed concurrently', async () => {
    const auditCreate = vi.fn();
    const transaction = {
      contentRevision: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'revision-new',
          status: 'IN_REVIEW',
          authorId: 'author',
          contentJson,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      contentItem: {
        findUnique: vi.fn().mockResolvedValue({
          publishedRevisionId: 'revision-old',
          slug: 'payments-and-transfers',
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: { create: auditCreate },
    } as unknown as Prisma.TransactionClient;
    const { publishJourneyRevisionTransaction } = await import('./journey-cms-service');
    await expect(publishJourneyRevisionTransaction(
      transaction,
      'journey-id',
      'revision-new',
      { id: 'reviewer', role: 'ADMIN' },
    )).rejects.toThrow(/pointer conflict/);
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('rolls back by repointing publication and preserving revision history', async () => {
    const contentItemUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const auditCreate = vi.fn();
    const transaction = {
      contentRevision: {
        findFirst: vi.fn().mockResolvedValue({ id: 'revision-old', contentJson }),
      },
      contentItem: {
        findUnique: vi.fn().mockResolvedValue({
          publishedRevisionId: 'revision-new',
          slug: 'payments-and-transfers',
        }),
        updateMany: contentItemUpdateMany,
      },
      auditLog: { create: auditCreate },
    } as unknown as Prisma.TransactionClient;
    const { rollbackJourneyRevisionTransaction } = await import('./journey-cms-service');
    await rollbackJourneyRevisionTransaction(
      transaction,
      'journey-id',
      'revision-old',
      { id: 'admin', role: 'ADMIN' },
    );
    expect(contentItemUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ publishedRevisionId: 'revision-old' }),
    }));
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'JOURNEY_ROLLED_BACK' }),
    }));
  });
});

describe('public Journey reader regression', () => {
  it('continues to read only the published revision and never static content', () => {
    const repository = readFileSync(join(process.cwd(), 'src/lib/repository.ts'), 'utf8');
    expect(repository).toContain('publishedRevision: { select: { contentJson: true } }');
    expect(repository).not.toMatch(/from ['"]@\/data\//);
    expect(repository).not.toContain("status: 'DRAFT'");
  });

  it('enables all authorized Banking Journeys without a slug allowlist', () => {
    const repository = readFileSync(
      join(process.cwd(), 'src/server/cms/journey-cms-repository.ts'),
      'utf8',
    );
    const editor = readFileSync(
      join(process.cwd(), 'src/app/admin/contributor/journeys/[slug]/page.tsx'),
      'utf8',
    );
    expect(repository).not.toContain('journeyCmsSlugs');
    expect(repository).not.toContain("slug: { in:");
    expect(editor).not.toContain('journeyCmsSlugs');
  });

  it('keeps CMS list and history queries metadata-only', () => {
    const repository = readFileSync(
      join(process.cwd(), 'src/server/cms/journey-cms-repository.ts'),
      'utf8',
    );
    const listMethod = repository.slice(
      repository.indexOf('async listAuthorized'),
      repository.indexOf('async getWorkspace'),
    );
    expect(listMethod).not.toContain('contentJson');
    expect(repository).toContain('publishedRevision: {');
    expect(repository).toContain('async getRevision');
  });

  it('defaults to a Business Editor and keeps Advanced JSON secondary', () => {
    const editor = readFileSync(
      join(process.cwd(), 'src/app/admin/contributor/journeys/[slug]/JourneyBusinessEditor.tsx'),
      'utf8',
    );
    expect(editor).toMatch(/useState<['"]business['"] \| ['"]advanced['"]>\(['"]business['"]\)/);
    expect(editor).toContain('Business Editor');
    expect(editor).toContain('Advanced JSON');
    expect(editor).toContain('Modules, sections and blocks');
  });
});
