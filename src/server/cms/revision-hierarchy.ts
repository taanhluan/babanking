import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';

type Database = PrismaClient | Prisma.TransactionClient;

function revisionBlockPayload(value: Prisma.JsonValue): Prisma.InputJsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Revision block payload must be a JSON object.');
  }
  return value as Prisma.InputJsonObject;
}

export const revisionHierarchySelect = {
  where: { isArchived: false },
  orderBy: { displayOrder: 'asc' as const },
  select: {
    id: true, stableKey: true, title: true, description: true, displayOrder: true,
    sections: {
      where: { isArchived: false }, orderBy: { displayOrder: 'asc' as const },
      select: { id: true, stableKey: true, title: true, displayOrder: true, blocks: {
        where: { isArchived: false }, orderBy: { displayOrder: 'asc' as const },
        select: { id: true, blockType: true, schemaVersion: true, payload: true, displayOrder: true },
      } },
    },
  },
} as const;

export async function resolveRevision(contentItemId: string, revisionId?: string) {
  if (revisionId) return db.contentRevision.findFirst({ where: { id: revisionId, contentItemId } });
  const item = await db.contentItem.findUnique({ where: { id: contentItemId }, select: { publishedRevisionId: true } });
  return item?.publishedRevisionId ? db.contentRevision.findUnique({ where: { id: item.publishedRevisionId } }) : null;
}

export async function getRevisionHierarchy(revisionId: string, client: Database = db) {
  return client.revisionModule.findMany({ where: { contentRevisionId: revisionId, isArchived: false }, orderBy: { displayOrder: 'asc' }, select: revisionHierarchySelect.select });
}

export async function cloneRevisionHierarchy(sourceRevisionId: string, targetRevisionId: string, client: Database = db) {
  const source = await client.revisionModule.findMany({ where: { contentRevisionId: sourceRevisionId, isArchived: false }, orderBy: { displayOrder: 'asc' }, include: { sections: { where: { isArchived: false }, orderBy: { displayOrder: 'asc' }, include: { blocks: { where: { isArchived: false }, orderBy: { displayOrder: 'asc' } } } } } });
  for (const sourceModule of source) {
    const revisionModule = await client.revisionModule.create({ data: { contentRevisionId: targetRevisionId, stableKey: sourceModule.stableKey, title: sourceModule.title, description: sourceModule.description, displayOrder: sourceModule.displayOrder, isArchived: false } });
    for (const section of sourceModule.sections) {
      const revisionSection = await client.revisionSection.create({ data: { revisionModuleId: revisionModule.id, stableKey: section.stableKey, title: section.title, displayOrder: section.displayOrder, isArchived: false } });
      if (section.blocks.length) await client.revisionBlock.createMany({ data: section.blocks.map((block) => ({ revisionSectionId: revisionSection.id, blockType: block.blockType, schemaVersion: block.schemaVersion, payload: revisionBlockPayload(block.payload), displayOrder: block.displayOrder, assetId: block.assetId, isArchived: false })) });
    }
  }
}

export async function createDraftFromPublished(contentItemId: string, authorId: string) {
  return db.$transaction(async (tx) => {
    const item = await tx.contentItem.findUniqueOrThrow({ where: { id: contentItemId }, include: { publishedRevision: true } });
    if (!item.publishedRevision) throw new Error('A published revision is required.');
    const latest = await tx.contentRevision.findFirst({ where: { contentItemId }, orderBy: { version: 'desc' }, select: { version: true } });
    const draft = await tx.contentRevision.create({ data: { contentItemId, version: (latest?.version ?? 0) + 1, contentJson: item.publishedRevision.contentJson, authorId } });
    await cloneRevisionHierarchy(item.publishedRevision.id, draft.id, tx);
    return draft;
  });
}
