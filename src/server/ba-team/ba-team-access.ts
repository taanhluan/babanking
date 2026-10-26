import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUseBaTeam, canViewPlan, isBaTeamLead, type BaTeamActor } from './ba-plan-policy';

/**
 * Internal BA team access. Unlike premium content this does not require a paid membership:
 * an ACTIVE account that is either ADMIN (the Lead) or flagged isBaTeamMember.
 */
export async function getBaTeamActor(callbackPath = '/team'): Promise<BaTeamActor & { name: string }> {
  const user = await requireUser(callbackPath);
  const record = await db.user.findFirst({ where: { id: user.id, isActive: true, accountStatus: 'ACTIVE' }, select: { id: true, name: true, role: true, isBaTeamMember: true } });
  if (!record) redirect('/workspace');
  return record;
}

export async function requireBaTeamMember(callbackPath = '/team') {
  const actor = await getBaTeamActor(callbackPath);
  if (!canUseBaTeam(actor)) redirect('/workspace');
  return actor;
}

export async function requireBaTeamLead(callbackPath = '/team') {
  const actor = await requireBaTeamMember(callbackPath);
  if (!isBaTeamLead(actor)) redirect('/team');
  return actor;
}

/** Page-level guard for one plan: members may only open their own plans; others get a 404. */
export async function requirePlanAccess(planId: string) {
  const actor = await requireBaTeamMember(`/team/plans/${planId}`);
  const plan = await db.baPerformancePlan.findUnique({ where: { id: planId }, select: { id: true, userId: true } });
  if (!plan || !canViewPlan(actor, plan.userId)) notFound();
  return { actor, planId: plan.id };
}
