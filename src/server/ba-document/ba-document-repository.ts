import 'server-only';
import { db } from '@/lib/db';
import type { AuthorizedBaDocument } from './ba-document-authorization';

export const BaDocumentRepository = {
  getWorkspace(authorization: AuthorizedBaDocument) {
    return db.contentItem.findUnique({
      where: { id: authorization.id, type: 'BA_DOCUMENT', primaryJourneyContentItemId: authorization.primaryJourneyContentItemId },
      select: {
        id: true, slug: true, previewJson: true, isArchived: true, primaryJourneyContentItemId: true,
        publishedRevisionId: true,
        publishedRevision: { select: { id: true, version: true, status: true, schemaVersion: true, contentJson: true, publishedAt: true } },
        revisions: { orderBy: { version: 'desc' as const }, select: { id: true, version: true, status: true, authorId: true, reviewerId: true, reviewNote: true, createdAt: true, updatedAt: true, publishedAt: true } },
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
