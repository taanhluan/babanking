import 'server-only';
import { db } from '@/lib/db';
import { revisionHierarchySelect } from './revision-hierarchy';

const hierarchy = {
  where: { isArchived: false },
  orderBy: { displayOrder: 'asc' as const },
  select: {
    id: true,
    stableKey: true,
    title: true,
    description: true,
    displayOrder: true,
    sections: {
      where: { isArchived: false }, orderBy: { displayOrder: 'asc' as const },
      select: { id: true, stableKey: true, title: true, displayOrder: true, blocks: {
        where: { isArchived: false }, orderBy: { displayOrder: 'asc' as const },
        select: { id: true, blockType: true, schemaVersion: true, payloadJson: true, displayOrder: true },
      } },
    },
  },
} as const;

export const JourneyCmsRepository = {
  list: (query = '') => db.contentItem.findMany({
    where: { type: 'BANKING_JOURNEY', ...(query ? { OR: [{ slug: { contains: query, mode: 'insensitive' } }, { category: { contains: query, mode: 'insensitive' } }, { publishedRevision: { contentJson: { contains: query } } }] } : {}) },
    orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
    select: { id: true, slug: true, category: true, displayOrder: true, isArchived: true, publishedRevisionId: true, updatedAt: true, publishedRevision: { select: { contentJson: true, status: true } } },
  }),
  get: (id: string) => db.contentItem.findUnique({ where: { id, type: 'BANKING_JOURNEY' }, include: { journeyModules: hierarchy, revisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, status: true, version: true, contentJson: true, revisionModules: revisionHierarchySelect } } } }),
};
