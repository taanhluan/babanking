import type { Prisma } from '@prisma/client';
import { db } from '../../lib/db';
import type { ContributorListParams, ContributorSort } from './contributor-list-params';
export type { ContributorListParams } from './contributor-list-params';

const revisionSelect = {
  id: true,
  contentItemId: true,
  version: true,
  status: true,
  reviewNote: true,
  createdAt: true,
  updatedAt: true,
  contentItem: { select: { id: true, type: true, slug: true } },
} satisfies Prisma.ContentRevisionSelect;

function orderByFor(sort: ContributorSort): Prisma.ContentRevisionOrderByWithRelationInput[] {
  switch (sort) {
    case 'updated-asc': return [{ updatedAt: 'asc' }, { id: 'asc' }];
    case 'title-asc': return [{ contentItem: { slug: 'asc' } }, { updatedAt: 'desc' }, { id: 'desc' }];
    case 'title-desc': return [{ contentItem: { slug: 'desc' } }, { updatedAt: 'desc' }, { id: 'desc' }];
    case 'version-desc': return [{ version: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }];
    case 'version-asc': return [{ version: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }];
    default: return [{ updatedAt: 'desc' }, { id: 'desc' }];
  }
}

export async function listContributorRevisions({ actorId, isAdmin, page, pageSize, query, status, sort }: ContributorListParams & { actorId: string; isAdmin: boolean }) {
  const where: Prisma.ContentRevisionWhereInput = {
    ...(isAdmin ? {} : { authorId: actorId }),
    ...(status ? { status } : {}),
    ...(query ? { contentItem: { OR: [{ slug: { contains: query, mode: 'insensitive' } }, { type: { equals: query.toUpperCase().replaceAll('-', '_') as never } }] } } : {}),
  };
  const [total, items] = await Promise.all([
    db.contentRevision.count({ where }),
    db.contentRevision.findMany({ where, select: revisionSelect, orderBy: orderByFor(sort), skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
