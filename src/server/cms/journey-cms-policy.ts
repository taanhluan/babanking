import type { KnowledgePermission, RevisionStatus, Role } from '@prisma/client';
import { canEditRevision, canReviewRevision } from '@/lib/permissions';
import { canTransition } from '@/lib/workflow';
import { roleAllowsPermission } from '@/server/access-control/role-permissions';

export function assertRolePermission(role: Role, permission: KnowledgePermission) {
  if (!roleAllowsPermission(role, permission)) {
    throw new Error('Journey CMS permission denied.');
  }
}

export function assertDraftEditable(input: {
  role: Role;
  actorId: string;
  authorId: string | null;
  status: RevisionStatus;
}) {
  assertRolePermission(input.role, 'EDIT');
  if (!canEditRevision(input.role, input.actorId, input.authorId, input.status)) {
    throw new Error('Journey draft is not editable by the current user.');
  }
}

export function assertDraftSubmittable(input: {
  role: Role;
  actorId: string;
  authorId: string | null;
  status: RevisionStatus;
}) {
  assertRolePermission(input.role, 'EDIT');
  if (input.authorId !== input.actorId || !canTransition(input.status, 'SUBMIT')) {
    throw new Error('Journey draft cannot be submitted by the current user.');
  }
}

export function assertRevisionReviewable(input: {
  role: Role;
  actorId: string;
  authorId: string | null;
  status: RevisionStatus;
}) {
  assertRolePermission(input.role, 'REVIEW');
  if (
    !canReviewRevision(input.role, input.actorId, input.authorId)
    || input.status !== 'IN_REVIEW'
  ) {
    throw new Error('Journey revision cannot be reviewed by the current user.');
  }
}

export function assertRevisionPublishable(input: {
  role: Role;
  actorId: string;
  authorId: string | null;
  status: RevisionStatus;
}) {
  assertRolePermission(input.role, 'PUBLISH');
  if (
    input.actorId === input.authorId
    || !canReviewRevision(input.role, input.actorId, input.authorId)
    || !canTransition(input.status, 'PUBLISH')
  ) {
    throw new Error('Journey revision cannot be published by its author.');
  }
}
