import 'server-only';
import { db } from '@/lib/db';
import { getAccessibleContentIds } from '@/server/access-control/knowledge-access-repository';
import type { AuthorizedBaDocument } from './ba-document-authorization';

export const BaDocumentRepository = {
  async listPublishedAuthorized(userId: string) {
    const journeyIds = await getAccessibleContentIds(userId, { type: 'BANKING_JOURNEY', permission: 'VIEW' });
    return db.contentItem.findMany({
      where: { type: 'BA_DOCUMENT', isArchived: false, publishedRevisionId: { not: null }, primaryJourneyContentItemId: { in: journeyIds } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, slug: true, previewJson: true, updatedAt: true, owner: { select: { name: true } },
        primaryJourney: { select: { id: true, slug: true, previewJson: true } },
        publishedRevision: { select: { version: true, publishedAt: true } },
      },
    });
  },
  async listContributorAuthorized(userId: string) {
    const journeyIds = await getAccessibleContentIds(userId, { type: 'BANKING_JOURNEY', permission: 'EDIT' });
    return db.contentItem.findMany({
      where: { type: 'BA_DOCUMENT', primaryJourneyContentItemId: { in: journeyIds } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, slug: true, previewJson: true, isArchived: true, updatedAt: true, owner: { select: { name: true } }, primaryJourney: { select: { slug: true, previewJson: true } }, publishedRevisionId: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { version: true, status: true, authorId: true } } },
    });
  },
  getPublished(authorization: AuthorizedBaDocument) {
    return db.contentItem.findFirst({
      where: { id: authorization.id, type: 'BA_DOCUMENT', isArchived: false, publishedRevisionId: { not: null }, primaryJourneyContentItemId: authorization.primaryJourneyContentItemId },
      select: { id: true, slug: true, previewJson: true, updatedAt: true, owner: { select: { name: true } }, primaryJourney: { select: { slug: true, previewJson: true } }, publishedRevision: { select: { id: true, version: true, contentJson: true, publishedAt: true, updatedAt: true } } },
    });
  },
  getWorkspace(authorization: AuthorizedBaDocument) {
    return db.contentItem.findUnique({
      where: { id: authorization.id, type: 'BA_DOCUMENT', primaryJourneyContentItemId: authorization.primaryJourneyContentItemId },
      select: {
        id: true, slug: true, previewJson: true, isArchived: true, primaryJourneyContentItemId: true,
        publishedRevisionId: true,
        publishedRevision: { select: { id: true, version: true, status: true, schemaVersion: true, contentJson: true, publishedAt: true } },
        revisions: { orderBy: { version: 'desc' as const }, select: { id: true, version: true, status: true, authorId: true, reviewerId: true, reviewNote: true, createdAt: true, updatedAt: true, submittedAt: true, reviewedAt: true, publishedAt: true } },
      },
    });
  },
  getEditableRevision(authorization: AuthorizedBaDocument) {
    return db.contentRevision.findFirst({
      where: { contentItemId: authorization.id, contentItem: { primaryJourneyContentItemId: authorization.primaryJourneyContentItemId }, status: { in: ['DRAFT', 'CHANGES_REQUESTED', 'IN_REVIEW'] } },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, status: true, schemaVersion: true, contentJson: true, authorId: true, reviewerId: true, reviewNote: true, createdAt: true, updatedAt: true },
    });
  },
  getRevision(authorization: AuthorizedBaDocument, revisionId: string) {
    return db.contentRevision.findFirst({
      where: { id: revisionId, contentItemId: authorization.id, contentItem: { primaryJourneyContentItemId: authorization.primaryJourneyContentItemId } },
      select: { id: true, version: true, status: true, schemaVersion: true, contentJson: true, authorId: true, reviewerId: true, reviewNote: true, createdAt: true, updatedAt: true, publishedAt: true },
    });
  },
  getHistory(authorization: AuthorizedBaDocument) {
    return db.contentRevision.findMany({
      where: { contentItemId: authorization.id, contentItem: { primaryJourneyContentItemId: authorization.primaryJourneyContentItemId } },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, status: true, authorId: true, reviewerId: true, createdAt: true, updatedAt: true, publishedAt: true },
    });
  },
};
