'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { z } from 'zod';
import { kpiDefinitionSchema, planYearSchema, quarterSchema, type Quarter } from '@/server/ba-team/ba-plan-domain';
import { annualOutcomesFromForm, kpiFromForm, managerNotesFromForm, prefixedEntries, profileFromForm, progressFromForm } from '@/server/ba-team/ba-plan-form';
import type { BaTeamActor } from '@/server/ba-team/ba-plan-policy';
import { BaPlanRepository } from '@/server/ba-team/ba-plan-repository';
import {
  addQuarterKpi, approvePlan, approveQuarterKpis, closeYear, createPlan, deleteQuarterKpi, leadAddKpi, leadChangeKpi, leadRemoveKpi,
  openRemainingQuarters, reopenPlan, reopenQuarterResults, returnPlan, returnQuarterKpis, reviewQuarter, saveKpiTemplate, saveManagerNotes,
  savePlanProfile, setBaTeamMembership, submitPlan, submitQuarterKpis, submitQuarterResults, updateKpiProgress, updateQuarterKpi,
} from '@/server/ba-team/ba-plan-service';
import { requireBaTeamLead, requireBaTeamMember } from '@/server/ba-team/ba-team-access';

const idSchema = z.string().cuid();
const tabSchema = z.enum(['plan', 'q1', 'q2', 'q3', 'q4', 'year', 'notes', 'history']).catch('plan');

function message(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.slice(0, 5).map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ');
  return error instanceof Error ? error.message.slice(0, 400) : 'The request could not be completed.';
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function withResult(path: string, error?: string) {
  return `${path}${path.includes('?') ? '&' : '?'}${error ? `error=${encodeURIComponent(error)}` : 'saved=1'}` as Route;
}

function planPath(planId: string, tab: string) {
  return `/team/plans/${planId}?tab=${tab}`;
}

/** Re-authorizes the caller, runs one service operation and redirects back with a clean result flag. */
async function run(path: string, operation: (actor: BaTeamActor) => Promise<unknown>) {
  const actor = await requireBaTeamMember();
  let error: string | undefined;
  try {
    await operation(actor);
    revalidatePath('/team', 'layout');
  } catch (caught) {
    error = message(caught);
  }
  redirect(withResult(path, error));
}

function planTarget(formData: FormData) {
  const planId = idSchema.parse(formData.get('planId'));
  return { planId, path: planPath(planId, tabSchema.parse(formData.get('tab'))) };
}

function quarterTarget(formData: FormData) {
  const planId = idSchema.parse(formData.get('planId'));
  const quarter: Quarter = quarterSchema.parse(formData.get('quarter'));
  return { planId, quarter, path: planPath(planId, `q${quarter}`) };
}

// ---------- Annual plan ----------

export async function createPlanAction(formData: FormData) {
  const actor = await requireBaTeamMember();
  let error: string | undefined;
  let planId: string | undefined;
  try {
    const source = z.enum(['TEMPLATES', 'PREVIOUS_YEAR', 'BLANK']).parse(formData.get('source'));
    const templateIds = formData.getAll('templateIds').filter((value): value is string => typeof value === 'string' && idSchema.safeParse(value).success);
    planId = (await createPlan({ year: planYearSchema.parse(formData.get('year')), source, templateIds }, actor)).id;
    revalidatePath('/team', 'layout');
  } catch (caught) {
    error = message(caught);
  }
  redirect(planId ? withResult(planPath(planId, 'plan')) : withResult('/team', error));
}

export async function savePlanProfileAction(formData: FormData) {
  const { planId, path } = planTarget(formData);
  await run(path, (actor) => savePlanProfile(planId, profileFromForm(formData), actor));
}

export async function submitPlanAction(formData: FormData) {
  const { planId, path } = planTarget(formData);
  await run(path, (actor) => submitPlan(planId, actor));
}

export async function approvePlanAction(formData: FormData) {
  const { planId, path } = planTarget(formData);
  await run(path, (actor) => approvePlan(planId, actor));
}

export async function returnPlanAction(formData: FormData) {
  const { planId, path } = planTarget(formData);
  await run(path, (actor) => returnPlan(planId, text(formData, 'note'), actor));
}

export async function reopenPlanAction(formData: FormData) {
  const { planId, path } = planTarget(formData);
  await run(path, (actor) => reopenPlan(planId, actor));
}

export async function saveManagerNotesAction(formData: FormData) {
  const { planId } = planTarget(formData);
  await run(planPath(planId, 'notes'), (actor) => saveManagerNotes(planId, managerNotesFromForm(formData), actor));
}

export async function closeYearAction(formData: FormData) {
  const { planId } = planTarget(formData);
  await run(planPath(planId, 'year'), (actor) => closeYear(planId, { rating: formData.get('rating'), assessment: text(formData, 'assessment'), outcomes: annualOutcomesFromForm(formData) }, actor));
}

// ---------- Quarterly KPI set ----------

export async function openRemainingQuartersAction(formData: FormData) {
  const planId = idSchema.parse(formData.get('planId'));
  const actor = await requireBaTeamMember();
  let error: string | undefined;
  let tab = 'plan';
  try {
    tab = `q${(await openRemainingQuarters(planId, actor)).quarter}`;
    revalidatePath('/team', 'layout');
  } catch (caught) {
    error = message(caught);
  }
  redirect(withResult(planPath(planId, tab), error));
}

/** Members edit a draft KPI set; the Lead's in-progress changes go through the audited adjustment path. */
export async function addKpiAction(formData: FormData) {
  const { planId, quarter, path } = quarterTarget(formData);
  const adjust = formData.get('mode') === 'adjust';
  await run(path, (actor) => adjust ? leadAddKpi(planId, quarter, kpiFromForm(formData), text(formData, 'reason'), actor) : addQuarterKpi(planId, quarter, kpiFromForm(formData), actor));
}

export async function addTemplateKpiAction(formData: FormData) {
  const { planId, quarter, path } = quarterTarget(formData);
  const adjust = formData.get('mode') === 'adjust';
  await run(path, async (actor) => {
    const templateId = idSchema.parse(formData.get('templateId'));
    const template = (await BaPlanRepository.listTemplates({ activeOnly: true })).find((entry) => entry.id === templateId);
    if (!template) throw new Error('Template not found.');
    const definition = kpiDefinitionSchema.parse({ name: template.name, description: template.description ?? undefined, capabilityArea: template.capabilityArea, comparator: template.comparator, targetValue: template.defaultTarget, unitLabel: template.unitLabel, templateId: template.id });
    return adjust ? leadAddKpi(planId, quarter, definition, text(formData, 'reason'), actor) : addQuarterKpi(planId, quarter, definition, actor);
  });
}

export async function updateKpiAction(formData: FormData) {
  const { path } = quarterTarget(formData);
  const kpiId = idSchema.parse(formData.get('kpiId'));
  const adjust = formData.get('mode') === 'adjust';
  await run(path, (actor) => adjust ? leadChangeKpi(kpiId, kpiFromForm(formData), text(formData, 'reason'), actor) : updateQuarterKpi(kpiId, kpiFromForm(formData), actor));
}

export async function removeKpiAction(formData: FormData) {
  const { path } = quarterTarget(formData);
  const kpiId = idSchema.parse(formData.get('kpiId'));
  const adjust = formData.get('mode') === 'adjust';
  await run(path, (actor) => adjust ? leadRemoveKpi(kpiId, text(formData, 'reason'), actor) : deleteQuarterKpi(kpiId, actor));
}

export async function submitQuarterKpisAction(formData: FormData) {
  const { planId, quarter, path } = quarterTarget(formData);
  await run(path, (actor) => submitQuarterKpis(planId, quarter, text(formData, 'changeNote'), actor));
}

export async function approveQuarterKpisAction(formData: FormData) {
  const { planId, quarter, path } = quarterTarget(formData);
  await run(path, (actor) => approveQuarterKpis(planId, quarter, actor));
}

export async function returnQuarterKpisAction(formData: FormData) {
  const { planId, quarter, path } = quarterTarget(formData);
  await run(path, (actor) => returnQuarterKpis(planId, quarter, text(formData, 'note'), actor));
}

// ---------- Progress, results and review ----------

export async function updateProgressAction(formData: FormData) {
  const { path } = quarterTarget(formData);
  const kpiId = idSchema.parse(formData.get('kpiId'));
  await run(path, (actor) => updateKpiProgress(kpiId, progressFromForm(formData), actor));
}

export async function submitResultsAction(formData: FormData) {
  const { planId, quarter, path } = quarterTarget(formData);
  await run(path, (actor) => submitQuarterResults(planId, quarter, actor));
}

export async function reopenResultsAction(formData: FormData) {
  const { planId, quarter, path } = quarterTarget(formData);
  await run(path, (actor) => reopenQuarterResults(planId, quarter, text(formData, 'note'), actor));
}

export async function reviewQuarterAction(formData: FormData) {
  const { planId, quarter, path } = quarterTarget(formData);
  await run(path, (actor) => reviewQuarter(planId, quarter, { rating: formData.get('rating'), assessment: text(formData, 'assessment'), kpiComments: prefixedEntries(formData, 'comment.') }, actor));
}

// ---------- Lead administration ----------

export async function saveTemplateAction(formData: FormData) {
  await requireBaTeamLead();
  const templateId = formData.get('templateId') ? idSchema.parse(formData.get('templateId')) : undefined;
  await run('/team/templates', (actor) => saveKpiTemplate(templateId, kpiFromForm(formData), formData.get('isActive') !== 'false', actor));
}

export async function setTeamMembershipAction(formData: FormData) {
  const actor = await requireBaTeamLead('/admin/users');
  const userId = idSchema.parse(formData.get('userId'));
  let error: string | undefined;
  try {
    await setBaTeamMembership(userId, formData.get('isBaTeamMember') === 'true', actor);
    revalidatePath('/admin/users');
    revalidatePath('/team', 'layout');
  } catch (caught) {
    error = message(caught);
  }
  redirect(withResult('/admin/users', error));
}
