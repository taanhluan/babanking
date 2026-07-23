import type { Role, RevisionStatus } from '@prisma/client';
export const roleRank: Record<Role, number> = { MEMBER: 0, CONTRIBUTOR: 1, REVIEWER: 2, ADMIN: 3 };
export const hasRole = (role: Role, minimum: Role) => roleRank[role] >= roleRank[minimum];
export const canContribute = (role: Role) => role === 'CONTRIBUTOR' || role === 'ADMIN';
export const canReview = (role: Role) => role === 'REVIEWER' || role === 'ADMIN';
export const canManageUsers = (role: Role) => role === 'ADMIN';
export const canEditRevision = (role: Role, userId: string, authorId: string | null, status: RevisionStatus) =>
  (role === 'ADMIN' || userId === authorId) && (status === 'DRAFT' || status === 'CHANGES_REQUESTED');
export const canReviewRevision = (role: Role, userId: string, authorId: string | null) => canReview(role) && userId !== authorId;
