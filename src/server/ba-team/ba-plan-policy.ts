import type { BaPlanStatus, BaQuarterStatus, Role } from '@prisma/client';
import { planProfileEditableStatuses } from './ba-plan-domain';

/**
 * Pure authorization rules for the internal BA team KPI feature.
 * The single team Lead is any ADMIN; members are users flagged isBaTeamMember.
 */
export type BaTeamActor = { id: string; role: Role; isBaTeamMember: boolean };

export function isBaTeamLead(actor: Pick<BaTeamActor, 'role'>) {
  return actor.role === 'ADMIN';
}

export function canUseBaTeam(actor: BaTeamActor) {
  return isBaTeamLead(actor) || actor.isBaTeamMember;
}

export function canViewPlan(actor: BaTeamActor, ownerId: string) {
  return canUseBaTeam(actor) && (isBaTeamLead(actor) || actor.id === ownerId);
}

function isOwnerOrLead(actor: BaTeamActor, ownerId: string) {
  return canUseBaTeam(actor) && (actor.id === ownerId || isBaTeamLead(actor));
}

/** Owner (or Lead) edits descriptive sections only while the annual plan is a draft or returned. */
export function canEditPlanProfile(actor: BaTeamActor, plan: { userId: string; status: BaPlanStatus }) {
  return isOwnerOrLead(actor, plan.userId) && planProfileEditableStatuses.includes(plan.status);
}

export function canSubmitPlan(actor: BaTeamActor, plan: { userId: string; status: BaPlanStatus }) {
  return isOwnerOrLead(actor, plan.userId) && (plan.status === 'DRAFT' || plan.status === 'CHANGES_REQUESTED');
}

/** The Lead may approve their own plan (owner decision 2026-10-01 for ADMIN self-approval). */
export function canApprovePlan(actor: BaTeamActor, plan: { status: BaPlanStatus }) {
  return isBaTeamLead(actor) && plan.status === 'PENDING_APPROVAL';
}

export function canReopenPlan(actor: BaTeamActor, plan: { userId: string; status: BaPlanStatus }) {
  return isOwnerOrLead(actor, plan.userId) && plan.status === 'APPROVED';
}

export function canWriteManagerNotes(actor: BaTeamActor, plan: { status: BaPlanStatus }) {
  return isBaTeamLead(actor) && plan.status !== 'CLOSED';
}

/** Owner edits a quarter's KPI set only while that set is a draft. */
export function canEditQuarterKpis(actor: BaTeamActor, plan: { userId: string; status: BaPlanStatus }, quarter: { status: BaQuarterStatus }) {
  return isOwnerOrLead(actor, plan.userId) && plan.status !== 'CLOSED' && quarter.status === 'KPI_DRAFT';
}

export function canSubmitQuarterKpis(actor: BaTeamActor, plan: { userId: string; status: BaPlanStatus }, quarter: { status: BaQuarterStatus }) {
  return isOwnerOrLead(actor, plan.userId) && plan.status === 'APPROVED' && quarter.status === 'KPI_DRAFT';
}

export function canApproveQuarterKpis(actor: BaTeamActor, plan: { status: BaPlanStatus }, quarter: { status: BaQuarterStatus }) {
  return isBaTeamLead(actor) && plan.status === 'APPROVED' && quarter.status === 'KPI_PENDING';
}

/** Lead-only mid-quarter adjustment of an approved KPI set (owner decision 2026-10-21). */
export function canAdjustQuarterKpis(actor: BaTeamActor, plan: { status: BaPlanStatus }, quarter: { status: BaQuarterStatus }) {
  return isBaTeamLead(actor) && plan.status !== 'CLOSED' && quarter.status === 'IN_PROGRESS';
}

export function canUpdateProgress(actor: BaTeamActor, plan: { userId: string; status: BaPlanStatus }, quarter: { status: BaQuarterStatus }) {
  return isOwnerOrLead(actor, plan.userId) && plan.status !== 'CLOSED' && quarter.status === 'IN_PROGRESS';
}

export function canSubmitResults(actor: BaTeamActor, plan: { userId: string; status: BaPlanStatus }, quarter: { status: BaQuarterStatus }) {
  return canUpdateProgress(actor, plan, quarter);
}

export function canReopenResults(actor: BaTeamActor, plan: { status: BaPlanStatus }, quarter: { status: BaQuarterStatus }) {
  return isBaTeamLead(actor) && plan.status !== 'CLOSED' && quarter.status === 'RESULTS_SUBMITTED';
}

export function canReviewQuarter(actor: BaTeamActor, plan: { status: BaPlanStatus }, quarter: { status: BaQuarterStatus }) {
  return canReopenResults(actor, plan, quarter);
}

/** Every quarter opens with the plan; older plans with missing quarters can open the rest at once. */
export function canOpenRemainingQuarters(actor: BaTeamActor, plan: { userId: string; status: BaPlanStatus }, quarters: Array<{ quarter: number }>) {
  return isOwnerOrLead(actor, plan.userId) && plan.status !== 'CLOSED' && quarters.length > 0 && quarters.length < 4;
}

/** The Lead self-assesses the annual result once every quarter has been reviewed (owner decision 2026-10-21). */
export function canCloseYear(actor: BaTeamActor, plan: { status: BaPlanStatus }, quarterStatuses: Array<{ quarter: number; status: BaQuarterStatus }>) {
  const q4 = quarterStatuses.find((entry) => entry.quarter === 4);
  return isBaTeamLead(actor) && plan.status === 'APPROVED' && Boolean(q4) && quarterStatuses.every((entry) => entry.status === 'REVIEWED');
}

export function canManageTemplates(actor: BaTeamActor) {
  return isBaTeamLead(actor);
}
