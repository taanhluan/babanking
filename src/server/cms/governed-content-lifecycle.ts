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
  const blocked = /token|password|secret|authorization|cookie|contentjson|databaseurl|privatekey/i;
  const allowed = new Set(['environment', 'contentItemId', 'revisionId', 'sourceRevisionId', 'knowledgeScopeId', 'plannedSegment', 'slug', 'from', 'to', 'archived']);
  const safe = Object.fromEntries(Object.entries({ environment, ...value }).filter(([key, entry]) => allowed.has(key) && !blocked.test(key) && ['string', 'number', 'boolean'].includes(typeof entry)));
  return JSON.stringify(safe);
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

export function assertGovernedDraftSubmittable(input: RevisionInput, label: string, allowAdmin = false) {
  assertGovernedRolePermission(input.role, 'EDIT', label);
  if ((input.authorId !== input.actorId && !(allowAdmin && input.role === 'ADMIN')) || !canTransition(input.status, 'SUBMIT')) {
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
  if ((input.role !== 'ADMIN' && input.actorId === input.authorId) || !canReviewRevision(input.role, input.actorId, input.authorId) || !canTransition(input.status, 'PUBLISH')) {
    throw new Error(`${label.replace(' permission denied.', '')} revision cannot be published by its author.`);
  }
}

export function assertContentReadBack(expectedJson: string, actualJson: string, operation: string) {
  if (governedContentHash(expectedJson) !== governedContentHash(actualJson)) {
    throw new Error(`${operation} content read-back hash mismatch.`);
  }
}
