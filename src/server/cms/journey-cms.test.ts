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
  parseJourneyContentJson,
} from './journey-content-schema';
import {
  assertDraftEditable,
  assertRevisionPublishable,
  assertRevisionReviewable,
} from './journey-cms-policy';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/server/env', () => ({
  getServerEnvironment: () => ({
    APP_ENV: 'development',
    DATABASE_ENVIRONMENT: 'development',
  }),
}));

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

describe('Journey CMS environment protection', () => {
  it('allows Development writes and requires the canonical Production override', () => {
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
    })).toThrow(/writes/);
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

  it('prevents a denied environment from invoking a mutation', () => {
    const mutation = vi.fn();
    expect(() => {
      assertJourneyCmsWriteAllowed({
        APP_ENV: 'production',
        DATABASE_ENVIRONMENT: 'production',
        ALLOW_PRODUCTION_DATABASE_OPERATIONS: false,
      });
      mutation();
    }).toThrow(/writes/);
    expect(mutation).not.toHaveBeenCalled();
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
    })).toThrow(/author/);
    expect(() => assertRevisionPublishable({
      role: 'REVIEWER',
      actorId: 'reviewer',
      authorId: 'author',
      status: 'IN_REVIEW',
    })).not.toThrow();
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
      { id: 'author', role: 'ADMIN' },
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
    expect(editor).toContain("useState<'business' | 'advanced'>('business')");
    expect(editor).toContain('Business Editor');
    expect(editor).toContain('Advanced JSON');
    expect(editor).toContain('Modules, sections and blocks');
  });
});
