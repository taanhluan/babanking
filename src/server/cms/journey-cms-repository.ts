import 'server-only';
import type { KnowledgePermission } from '@prisma/client';
import { db } from '@/lib/db';
import { getAccessibleContentIds } from '@/server/access-control/knowledge-access-repository';
import { assertJourneyCmsDevelopmentEnvironment } from './journey-cms-environment';

export const JourneyCmsRepository = {
  async listAuthorized(userId: string) {
    assertJourneyCmsDevelopmentEnvironment();
    const ids = await getAccessibleContentIds(userId, {
      type: 'BANKING_JOURNEY',
      permission: 'VIEW',
    });
    return db.contentItem.findMany({
      where: {
        id: { in: ids },
        type: 'BANKING_JOURNEY',
      },
      orderBy: { slug: 'asc' },
      select: {
        id: true,
        slug: true,
        isArchived: true,
        publishedRevisionId: true,
        previewJson: true,
        updatedAt: true,
        revisions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: {
            version: true,
            status: true,
            schemaVersion: true,
            createdAt: true,
            updatedAt: true,
            publishedAt: true,
            author: { select: { name: true } },
            reviewer: { select: { name: true } },
          },
        },
      },
    });
  },

  async getWorkspace(contentItemId: string) {
    assertJourneyCmsDevelopmentEnvironment();
    return db.contentItem.findUnique({
      where: { id: contentItemId, type: 'BANKING_JOURNEY' },
      select: {
        id: true,
        slug: true,
        isArchived: true,
        knowledgeScopes: {
          select: {
            relationshipType: true,
            knowledgeScope: { select: { code: true, nameEn: true } },
          },
        },
        publishedRevisionId: true,
        publishedRevision: {
          select: {
            id: true,
            version: true,
            status: true,
            schemaVersion: true,
            contentJson: true,
            createdAt: true,
            author: { select: { id: true, name: true } },
            reviewer: { select: { id: true, name: true } },
            updatedAt: true,
            publishedAt: true,
          },
        },
        revisions: {
          orderBy: { version: 'desc' },
          select: {
            id: true,
            version: true,
            status: true,
            authorId: true,
            reviewerId: true,
            author: { select: { name: true } },
            reviewer: { select: { name: true } },
            createdAt: true,
            updatedAt: true,
            publishedAt: true,
          },
        },
      },
    });
  },

  async getEditableRevision(contentItemId: string) {
    assertJourneyCmsDevelopmentEnvironment();
    return db.contentRevision.findFirst({
      where: {
        contentItemId,
        status: { in: ['DRAFT', 'CHANGES_REQUESTED', 'IN_REVIEW'] },
      },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        status: true,
        schemaVersion: true,
        contentJson: true,
        authorId: true,
        reviewerId: true,
        reviewNote: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        author: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
    });
  },

  async getRevision(contentItemId: string, revisionId: string) {
    assertJourneyCmsDevelopmentEnvironment();
    return db.contentRevision.findFirst({
      where: { id: revisionId, contentItemId },
      select: {
        id: true,
        version: true,
        status: true,
        schemaVersion: true,
        contentJson: true,
        author: { select: { name: true } },
        reviewer: { select: { name: true } },
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
    });
  },
};

export type JourneyCmsPermission = KnowledgePermission;
