import 'server-only';
import { db } from '@/lib/db';
import { getRevisionHierarchy } from './revision-hierarchy';

export async function validateRevisionHierarchy(revisionId: string) {
  const revision = await db.contentRevision.findUnique({ where: { id: revisionId }, select: { id: true, contentItemId: true, status: true } });
  if (!revision) throw new Error('Revision not found.');
  const modules = await getRevisionHierarchy(revisionId);
  for (const revisionModule of modules) for (const section of revisionModule.sections) for (const block of section.blocks) {
    if (!block.blockType || block.schemaVersion < 1 || block.payload === null || typeof block.payload !== 'object' || Array.isArray(block.payload)) throw new Error('Revision hierarchy contains an invalid block.');
  }
  return revision;
}

export async function publishRevision(revisionId: string, reviewerId: string, reviewNote?: string) {
  const revision = await validateRevisionHierarchy(revisionId);
  if (revision.status !== 'IN_REVIEW') throw new Error('Only revisions in review can be published.');
  return db.$transaction(async (tx) => {
    const now = new Date();
    await tx.contentRevision.update({ where: { id: revisionId }, data: { status: 'PUBLISHED', reviewerId, reviewedAt: now, publishedAt: now, reviewNote: reviewNote || null } });
    await tx.contentItem.update({ where: { id: revision.contentItemId }, data: { publishedRevisionId: revisionId } });
    await tx.auditLog.create({ data: { actorId: reviewerId, action: 'CONTENT_PUBLISHED', entityType: 'ContentItem', entityId: revision.contentItemId, metadataJson: JSON.stringify({ revisionId }) } });
  });
}

export async function rollbackPublishedRevision(contentItemId: string, revisionId: string, actorId: string) {
  const target = await db.contentRevision.findFirst({ where: { id: revisionId, contentItemId, status: 'PUBLISHED' }, select: { id: true } });
  if (!target) throw new Error('Published revision not found for this Journey.');
  await db.$transaction(async (tx) => {
    await tx.contentItem.update({ where: { id: contentItemId }, data: { publishedRevisionId: revisionId } });
    await tx.auditLog.create({ data: { actorId, action: 'CONTENT_ROLLED_BACK', entityType: 'ContentItem', entityId: contentItemId, metadataJson: JSON.stringify({ revisionId }) } });
  });
}
