import type { RevisionStatus } from '@prisma/client';
export type WorkflowAction = 'SUBMIT' | 'REQUEST_CHANGES' | 'REJECT' | 'PUBLISH';
const transitions: Record<WorkflowAction, RevisionStatus[]> = {
  SUBMIT: ['DRAFT', 'CHANGES_REQUESTED'], REQUEST_CHANGES: ['IN_REVIEW'], REJECT: ['IN_REVIEW'], PUBLISH: ['IN_REVIEW'],
};
export const canTransition = (status: RevisionStatus, action: WorkflowAction) => transitions[action].includes(status);
export const nextStatus = (action: WorkflowAction): RevisionStatus =>
  ({ SUBMIT: 'IN_REVIEW', REQUEST_CHANGES: 'CHANGES_REQUESTED', REJECT: 'REJECTED', PUBLISH: 'PUBLISHED' })[action] as RevisionStatus;
