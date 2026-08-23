import { createHash } from 'node:crypto';
import type { KnowledgePermission, RevisionStatus, Role } from '@prisma/client';
import { canEditRevision, canReviewRevision } from '@/lib/permissions';
import { canTransition } from '@/lib/workflow';
import { roleAllowsPermission } from '@/server/access-control/role-permissions';

export type GovernedContentActor = { id: string; role: Role };

export function governedContentHash(contentJson: string) {
  return createHash('sha256').update(contentJson).digest('hex');
}

export function governedAuditMetadata(environment: string, value: Record<string, unknown>) {
  return JSON.stringify({ environment, ...value });
}

export function assertGovernedRolePermission(role: Role, permission: KnowledgePermission, label: string) {
  if (!roleAllowsPermission(role, permission)) throw new Error(`${label} permission denied.`);
}

type RevisionInput = { role: Role; actorId: string; authorId: string | null; status: RevisionStatus };

export function assertGovernedDraftEditable(input: RevisionInput, label: string) {
  assertGovernedRolePermission(input.role, 'EDIT', label);
  if (!canEditRevision(input.role, input.actorId, input.authorId, input.status)) {
    throw new Error(`${label.replace(' permission denied.', '')} draft is not editable by the current user.`);
  }
}

export function assertGovernedDraftSubmittable(input: RevisionInput, label: string) {
  assertGovernedRolePermission(input.role, 'EDIT', label);
  if (input.authorId !== input.actorId || !canTransition(input.status, 'SUBMIT')) {
    throw new Error(`${label.replace(' permission denied.', '')} draft cannot be submitted by the current user.`);
  }
}

export function assertGovernedRevisionReviewable(input: RevisionInput, label: string) {
  assertGovernedRolePermission(input.role, 'REVIEW', label);
  if (!canReviewRevision(input.role, input.actorId, input.authorId) || input.status !== 'IN_REVIEW') {
    throw new Error(`${label.replace(' permission denied.', '')} revision cannot be reviewed by the current user.`);
  }
}

export function assertGovernedRevisionPublishable(input: RevisionInput, label: string) {
  assertGovernedRolePermission(input.role, 'PUBLISH', label);
  if (input.actorId === input.authorId || !canReviewRevision(input.role, input.actorId, input.authorId) || !canTransition(input.status, 'PUBLISH')) {
    throw new Error(`${label.replace(' permission denied.', '')} revision cannot be published by its author.`);
  }
}

export function assertContentReadBack(expectedJson: string, actualJson: string, operation: string) {
  if (governedContentHash(expectedJson) !== governedContentHash(actualJson)) {
    throw new Error(`${operation} content read-back hash mismatch.`);
  }
}
