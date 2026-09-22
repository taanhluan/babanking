import type { KnowledgePermission, RevisionStatus, Role } from '@prisma/client';
import { assertGovernedDraftEditable, assertGovernedDraftSubmittable, assertGovernedRevisionPublishable, assertGovernedRevisionReviewable, assertGovernedRolePermission } from './governed-content-lifecycle';

export function assertRolePermission(role: Role, permission: KnowledgePermission) {
  assertGovernedRolePermission(role, permission, 'Journey CMS');
}

export function assertDraftEditable(input: {
  role: Role;
  actorId: string;
  authorId: string | null;
  status: RevisionStatus;
}) {
  assertGovernedDraftEditable(input, 'Journey');
}

export function assertDraftSubmittable(input: {
  role: Role;
  actorId: string;
  authorId: string | null;
  status: RevisionStatus;
}) {
  assertGovernedDraftSubmittable(input, 'Journey', true);
}

export function assertRevisionReviewable(input: {
  role: Role;
  actorId: string;
  authorId: string | null;
  status: RevisionStatus;
}) {
  assertGovernedRevisionReviewable(input, 'Journey');
}

export function assertRevisionPublishable(input: {
  role: Role;
  actorId: string;
  authorId: string | null;
  status: RevisionStatus;
}) {
  assertGovernedRevisionPublishable(input, 'Journey');
}
