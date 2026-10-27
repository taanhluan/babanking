import 'server-only';
import { randomUUID } from 'node:crypto';
import type { BaQuarterStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getServerEnvironment } from '@/server/env';
import {
  annualOutcomesSchema, baPlanProfileSchema, emptyPlanProfile, kpiDefinitionSchema, managerNotesSchema, parsePlanProfile,
  planYearSchema, progressUpdateSchema, quarters, ratingSchema, reasonSchema, type BaPlanProfile, type KpiDefinition, type Quarter,
} from './ba-plan-domain';
import {
  canAdjustQuarterKpis, canApprovePlan, canApproveQuarterKpis, canCloseYear, canEditPlanProfile, canEditQuarterKpis,
  canManageTemplates, canOpenRemainingQuarters, canReopenPlan, canReopenResults, canReviewQuarter, canSubmitPlan,
  canSubmitQuarterKpis, canSubmitResults, canUpdateProgress, canUseBaTeam, canWriteManagerNotes, isBaTeamLead, type BaTeamActor,
} from './ba-plan-policy';

const MAX_KPIS_PER_QUARTER = 40;
type Tx = Prisma.TransactionClient;
type EntityType = 'BaPerformancePlan' | 'BaPlanQuarter' | 'BaQuarterKpi' | 'BaKpiTemplate' | 'User';

/** Audit metadata carries identifiers and states only, never plan text or assessments. */
function auditMetadata(value: Record<string, string | number | boolean | undefined>) {
  const allowed = new Set(['planId', 'quarter', 'year', 'kpiId', 'templateId', 'subjectUserId', 'from', 'to', 'isBaTeamMember', 'source']);
  const safe = Object.fromEntries(Object.entries({ environment: getServerEnvironment().APP_ENV, ...value }).filter(([key, entry]) => (key === 'environment' || allowed.has(key)) && entry !== undefined));
  return JSON.stringify(safe);
}

function audit(tx: Tx, actorId: string, action: string, entityType: EntityType, entityId: string, metadata: Record<string, string | number | boolean | undefined> = {}) {
  return tx.auditLog.create({ data: { actorId, action, entityType, entityId, metadataJson: auditMetadata(metadata) } });
}

function assertMember(actor: BaTeamActor) {
  if (!canUseBaTeam(actor)) throw new Error('You are not a member of the BA team.');
}

function deny(message = 'You are not allowed to perform this action.'): never {
  throw new Error(message);
}

async function loadPlan(planId: string, actor: BaTeamActor) {
  assertMember(actor);
  const plan = await db.baPerformancePlan.findUnique({ where: { id: planId }, select: { id: true, userId: true, year: true, status: true, profileJson: true, quarters: { select: { id: true, quarter: true, status: true }, orderBy: { quarter: 'asc' } } } });
  if (!plan || (!isBaTeamLead(actor) && plan.userId !== actor.id)) throw new Error('Plan not found.');
  return plan;
}

async function loadQuarter(planId: string, quarter: Quarter, actor: BaTeamActor) {
  const plan = await loadPlan(planId, actor);
  const entry = plan.quarters.find((item) => item.quarter === quarter);
  if (!entry) throw new Error(`Q${quarter} has not been opened yet.`);
  return { plan, quarter: entry };
}

async function loadKpi(kpiId: string, actor: BaTeamActor) {
  assertMember(actor);
  const kpi = await db.baQuarterKpi.findUnique({ where: { id: kpiId }, select: { id: true, lineageKey: true, name: true, description: true, capabilityArea: true, comparator: true, targetValue: true, unitLabel: true, actualValue: true, removedAt: true, quarter: { select: { id: true, quarter: true, status: true, plan: { select: { id: true, userId: true, status: true } } } } } });
  if (!kpi || (!isBaTeamLead(actor) && kpi.quarter.plan.userId !== actor.id)) throw new Error('KPI not found.');
  return kpi;
}

function kpiData(definition: KpiDefinition) {
  return {
    name: definition.name,
    description: definition.description || null,
    capabilityArea: definition.capabilityArea ?? null,
    comparator: definition.comparator,
    targetValue: definition.targetValue,
    unitLabel: definition.unitLabel,
    templateId: definition.templateId ?? null,
  };
}

function kpiSnapshot(kpi: { name: string; comparator: string; targetValue: number; unitLabel: string; capabilityArea?: string | null }) {
  return JSON.stringify({ name: kpi.name, comparator: kpi.comparator, targetValue: kpi.targetValue, unitLabel: kpi.unitLabel, capabilityArea: kpi.capabilityArea ?? null });
}

async function moveQuarter(tx: Tx, quarterId: string, from: BaQuarterStatus, data: Prisma.BaPlanQuarterUncheckedUpdateManyInput) {
  const updated = await tx.baPlanQuarter.updateMany({ where: { id: quarterId, status: from }, data });
  if (updated.count !== 1) throw new Error('The quarter changed before this action completed. Reload and try again.');
}

// ---------- Annual plan ----------

export type CreatePlanInput = { year: number; source: 'TEMPLATES' | 'PREVIOUS_YEAR' | 'BLANK'; templateIds?: string[] };

export async function createPlan(input: CreatePlanInput, actor: BaTeamActor) {
  assertMember(actor);
  const year = planYearSchema.parse(input.year);
  if (await db.baPerformancePlan.findUnique({ where: { userId_year: { userId: actor.id, year } }, select: { id: true } })) throw new Error(`You already have a plan for ${year}.`);
  let profile: BaPlanProfile = emptyPlanProfile();
  let kpis: Array<Omit<Prisma.BaQuarterKpiUncheckedCreateWithoutQuarterInput, 'id'>> = [];
  if (input.source === 'TEMPLATES') {
    const ids = [...new Set(input.templateIds ?? [])].slice(0, MAX_KPIS_PER_QUARTER);
    const templates = ids.length ? await db.baKpiTemplate.findMany({ where: { id: { in: ids }, isActive: true }, orderBy: { sortOrder: 'asc' } }) : [];
    kpis = templates.map((template, index) => ({ ...kpiData({ name: template.name, description: template.description ?? undefined, capabilityArea: kpiDefinitionSchema.shape.capabilityArea.parse(template.capabilityArea), comparator: template.comparator, targetValue: template.defaultTarget, unitLabel: template.unitLabel, templateId: template.id }), lineageKey: randomUUID(), sortOrder: index }));
  } else if (input.source === 'PREVIOUS_YEAR') {
    const previous = await db.baPerformancePlan.findUnique({ where: { userId_year: { userId: actor.id, year: year - 1 } }, select: { profileJson: true, quarters: { orderBy: { quarter: 'desc' }, take: 1, select: { kpis: { where: { removedAt: null }, orderBy: { sortOrder: 'asc' } } } } } });
    if (!previous) throw new Error(`There is no ${year - 1} plan to copy.`);
    profile = parsePlanProfile(previous.profileJson);
    kpis = (previous.quarters[0]?.kpis ?? []).map((kpi, index) => ({ name: kpi.name, description: kpi.description, capabilityArea: kpi.capabilityArea, comparator: kpi.comparator, targetValue: kpi.targetValue, unitLabel: kpi.unitLabel, templateId: kpi.templateId, lineageKey: kpi.lineageKey, sortOrder: index }));
  }
  return db.$transaction(async (tx) => {
    // All four quarters open as drafts with the same starting KPI set (owner decision 2026-10-27).
    const quarterDrafts = quarters.map((quarter) => ({ quarter, kpis: { create: kpis } }));
    const plan = await tx.baPerformancePlan.create({ data: { userId: actor.id, year, profileJson: JSON.stringify(profile), quarters: { create: quarterDrafts } }, select: { id: true } });
    await audit(tx, actor.id, 'BA_PLAN_CREATED', 'BaPerformancePlan', plan.id, { year, source: input.source });
    return plan;
  });
}

export async function savePlanProfile(planId: string, value: unknown, actor: BaTeamActor) {
  const plan = await loadPlan(planId, actor);
  if (!canEditPlanProfile(actor, plan)) deny('The plan can only be edited while it is a draft or returned for changes.');
  const profile = baPlanProfileSchema.parse(value);
  await db.$transaction(async (tx) => {
    const updated = await tx.baPerformancePlan.updateMany({ where: { id: planId, status: { in: ['DRAFT', 'CHANGES_REQUESTED'] } }, data: { profileJson: JSON.stringify(profile) } });
    if (updated.count !== 1) throw new Error('The plan changed before it could be saved.');
    await audit(tx, actor.id, 'BA_PLAN_UPDATED', 'BaPerformancePlan', planId);
  });
}

export async function submitPlan(planId: string, actor: BaTeamActor) {
  const plan = await loadPlan(planId, actor);
  if (!canSubmitPlan(actor, plan)) deny();
  const q1 = plan.quarters.find((entry) => entry.quarter === 1);
  if (q1?.status === 'KPI_DRAFT' && await db.baQuarterKpi.count({ where: { quarterId: q1.id } }) === 0) throw new Error('Add at least one Q1 KPI before submitting the plan.');
  await db.$transaction(async (tx) => {
    const updated = await tx.baPerformancePlan.updateMany({ where: { id: planId, status: plan.status }, data: { status: 'PENDING_APPROVAL', submittedAt: new Date() } });
    if (updated.count !== 1) throw new Error('The plan changed before it could be submitted.');
    if (q1?.status === 'KPI_DRAFT') await moveQuarter(tx, q1.id, 'KPI_DRAFT', { status: 'KPI_PENDING', kpiSubmittedAt: new Date(), returnNote: null });
    await audit(tx, actor.id, 'BA_PLAN_SUBMITTED', 'BaPerformancePlan', planId, { from: plan.status, to: 'PENDING_APPROVAL' });
  });
}

export async function approvePlan(planId: string, actor: BaTeamActor) {
  const plan = await loadPlan(planId, actor);
  if (!canApprovePlan(actor, plan)) deny('Only the Lead can approve a plan that is pending approval.');
  const q1 = plan.quarters.find((entry) => entry.quarter === 1);
  await db.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.baPerformancePlan.updateMany({ where: { id: planId, status: 'PENDING_APPROVAL', profileJson: plan.profileJson }, data: { status: 'APPROVED', approvedAt: now, approvedById: actor.id, approvedSnapshotJson: plan.profileJson, reviewNote: null } });
    if (updated.count !== 1) throw new Error('The plan changed before it could be approved.');
    if (q1?.status === 'KPI_PENDING') await moveQuarter(tx, q1.id, 'KPI_PENDING', { status: 'IN_PROGRESS', kpiApprovedAt: now, kpiApprovedById: actor.id, returnNote: null });
    await audit(tx, actor.id, 'BA_PLAN_APPROVED', 'BaPerformancePlan', planId, { from: 'PENDING_APPROVAL', to: 'APPROVED' });
  });
}

export async function returnPlan(planId: string, note: string, actor: BaTeamActor) {
  const plan = await loadPlan(planId, actor);
  if (!canApprovePlan(actor, plan)) deny('Only the Lead can return a plan that is pending approval.');
  const reason = reasonSchema.parse(note);
  const q1 = plan.quarters.find((entry) => entry.quarter === 1);
  await db.$transaction(async (tx) => {
    const updated = await tx.baPerformancePlan.updateMany({ where: { id: planId, status: 'PENDING_APPROVAL' }, data: { status: 'CHANGES_REQUESTED', reviewNote: reason } });
    if (updated.count !== 1) throw new Error('The plan changed before it could be returned.');
    if (q1?.status === 'KPI_PENDING') await moveQuarter(tx, q1.id, 'KPI_PENDING', { status: 'KPI_DRAFT', returnNote: reason });
    await audit(tx, actor.id, 'BA_PLAN_CHANGES_REQUESTED', 'BaPerformancePlan', planId, { from: 'PENDING_APPROVAL', to: 'CHANGES_REQUESTED' });
  });
}

/** Reopening affects the descriptive sections only; quarters, results and the approved snapshot are kept. */
export async function reopenPlan(planId: string, actor: BaTeamActor) {
  const plan = await loadPlan(planId, actor);
  if (!canReopenPlan(actor, plan)) deny();
  await db.$transaction(async (tx) => {
    const updated = await tx.baPerformancePlan.updateMany({ where: { id: planId, status: 'APPROVED' }, data: { status: 'DRAFT' } });
    if (updated.count !== 1) throw new Error('The plan changed before it could be reopened.');
    await audit(tx, actor.id, 'BA_PLAN_REOPENED', 'BaPerformancePlan', planId, { from: 'APPROVED', to: 'DRAFT' });
  });
}

export async function saveManagerNotes(planId: string, value: unknown, actor: BaTeamActor) {
  const plan = await loadPlan(planId, actor);
  if (!canWriteManagerNotes(actor, plan)) deny('Only the Lead can write manager notes.');
  const notes = managerNotesSchema.parse(value);
  await db.$transaction(async (tx) => {
    const updated = await tx.baPerformancePlan.updateMany({ where: { id: planId, status: { not: 'CLOSED' } }, data: { managerNotesJson: JSON.stringify(notes) } });
    if (updated.count !== 1) throw new Error('The plan changed before the notes could be saved.');
    await audit(tx, actor.id, 'BA_PLAN_MANAGER_NOTES_UPDATED', 'BaPerformancePlan', planId);
  });
}

export async function closeYear(planId: string, input: { rating: unknown; assessment: unknown; outcomes: unknown }, actor: BaTeamActor) {
  const plan = await loadPlan(planId, actor);
  if (!canCloseYear(actor, plan, plan.quarters)) deny('The year can be closed by the Lead once all four quarters are reviewed.');
  const rating = ratingSchema.parse(input.rating);
  const assessment = reasonSchema.parse(input.assessment);
  const outcomes = annualOutcomesSchema.parse(input.outcomes);
  const lineages = await db.baQuarterKpi.findMany({ where: { quarter: { planId }, removedAt: null }, select: { lineageKey: true }, distinct: ['lineageKey'] });
  const missing = lineages.filter((entry) => !outcomes[entry.lineageKey]);
  if (missing.length) throw new Error(`Record an annual result for every KPI (${missing.length} missing).`);
  await db.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.baPerformancePlan.updateMany({ where: { id: planId, status: 'APPROVED' }, data: { status: 'CLOSED', annualRating: rating, annualAssessment: assessment, annualOutcomesJson: JSON.stringify(outcomes), annualReviewedAt: now, annualReviewedById: actor.id, closedAt: now } });
    if (updated.count !== 1) throw new Error('The plan changed before the year could be closed.');
    await audit(tx, actor.id, 'BA_PLAN_CLOSED', 'BaPerformancePlan', planId, { from: 'APPROVED', to: 'CLOSED', year: plan.year });
  });
}

// ---------- Quarterly KPI set ----------

/** Plans created before all quarters opened up front get their missing quarters, copied from the latest one. */
export async function openRemainingQuarters(planId: string, actor: BaTeamActor) {
  const plan = await loadPlan(planId, actor);
  if (!canOpenRemainingQuarters(actor, plan, plan.quarters)) deny('Every quarter of this plan is already open.');
  const latest = plan.quarters.at(-1)!;
  const missing = quarters.filter((quarter) => !plan.quarters.some((entry) => entry.quarter === quarter));
  const source = await db.baQuarterKpi.findMany({ where: { quarterId: latest.id, removedAt: null }, orderBy: { sortOrder: 'asc' } });
  return db.$transaction(async (tx) => {
    for (const quarter of missing) {
      const created = await tx.baPlanQuarter.create({
        data: {
          planId,
          quarter,
          kpis: { create: source.map((kpi, index) => ({ lineageKey: kpi.lineageKey, templateId: kpi.templateId, capabilityArea: kpi.capabilityArea, name: kpi.name, description: kpi.description, comparator: kpi.comparator, targetValue: kpi.targetValue, unitLabel: kpi.unitLabel, sortOrder: index })) },
        },
        select: { id: true },
      });
      await audit(tx, actor.id, 'BA_QUARTER_OPENED', 'BaPlanQuarter', created.id, { planId, quarter });
    }
    return { quarter: missing[0] };
  });
}

export async function addQuarterKpi(planId: string, quarterNumber: Quarter, value: unknown, actor: BaTeamActor) {
  const { plan, quarter } = await loadQuarter(planId, quarterNumber, actor);
  if (!canEditQuarterKpis(actor, plan, quarter)) deny('KPIs can only be changed while the quarter KPI set is a draft.');
  const definition = kpiDefinitionSchema.parse(value);
  const count = await db.baQuarterKpi.count({ where: { quarterId: quarter.id } });
  if (count >= MAX_KPIS_PER_QUARTER) throw new Error(`A quarter can have at most ${MAX_KPIS_PER_QUARTER} KPIs.`);
  await db.$transaction(async (tx) => {
    const kpi = await tx.baQuarterKpi.create({ data: { ...kpiData(definition), quarterId: quarter.id, lineageKey: randomUUID(), sortOrder: count }, select: { id: true } });
    const still = await tx.baPlanQuarter.count({ where: { id: quarter.id, status: 'KPI_DRAFT' } });
    if (still !== 1) throw new Error('The quarter changed before the KPI could be added.');
    await audit(tx, actor.id, 'BA_KPI_ADDED', 'BaQuarterKpi', kpi.id, { planId, quarter: quarterNumber });
  });
}

export async function updateQuarterKpi(kpiId: string, value: unknown, actor: BaTeamActor) {
  const kpi = await loadKpi(kpiId, actor);
  if (!canEditQuarterKpis(actor, kpi.quarter.plan, kpi.quarter)) deny('KPIs can only be changed while the quarter KPI set is a draft.');
  const definition = kpiDefinitionSchema.parse(value);
  await db.$transaction(async (tx) => {
    const updated = await tx.baQuarterKpi.updateMany({ where: { id: kpiId, quarter: { status: 'KPI_DRAFT' } }, data: kpiData(definition) });
    if (updated.count !== 1) throw new Error('The quarter changed before the KPI could be updated.');
    await audit(tx, actor.id, 'BA_KPI_UPDATED', 'BaQuarterKpi', kpiId, { planId: kpi.quarter.plan.id, quarter: kpi.quarter.quarter });
  });
}

/** Draft KPIs have no results yet, so removing one from a draft set deletes it. */
export async function deleteQuarterKpi(kpiId: string, actor: BaTeamActor) {
  const kpi = await loadKpi(kpiId, actor);
  if (!canEditQuarterKpis(actor, kpi.quarter.plan, kpi.quarter)) deny('KPIs can only be removed while the quarter KPI set is a draft.');
  await db.$transaction(async (tx) => {
    const deleted = await tx.baQuarterKpi.deleteMany({ where: { id: kpiId, actualValue: null, quarter: { status: 'KPI_DRAFT' } } });
    if (deleted.count !== 1) throw new Error('The quarter changed before the KPI could be removed.');
    await audit(tx, actor.id, 'BA_KPI_REMOVED', 'BaQuarterKpi', kpiId, { planId: kpi.quarter.plan.id, quarter: kpi.quarter.quarter });
  });
}

export async function submitQuarterKpis(planId: string, quarterNumber: Quarter, changeNote: string | undefined, actor: BaTeamActor) {
  const { plan, quarter } = await loadQuarter(planId, quarterNumber, actor);
  if (!canSubmitQuarterKpis(actor, plan, quarter)) deny('The KPI set can be submitted once the plan is approved and the set is a draft.');
  if (await db.baQuarterKpi.count({ where: { quarterId: quarter.id } }) === 0) throw new Error('Add at least one KPI before submitting.');
  const note = changeNote?.trim().slice(0, 1000) || null;
  await db.$transaction(async (tx) => {
    await moveQuarter(tx, quarter.id, 'KPI_DRAFT', { status: 'KPI_PENDING', kpiSubmittedAt: new Date(), changeNote: note, returnNote: null });
    await audit(tx, actor.id, 'BA_QUARTER_KPIS_SUBMITTED', 'BaPlanQuarter', quarter.id, { planId, quarter: quarterNumber, from: 'KPI_DRAFT', to: 'KPI_PENDING' });
  });
}

export async function approveQuarterKpis(planId: string, quarterNumber: Quarter, actor: BaTeamActor) {
  const { plan, quarter } = await loadQuarter(planId, quarterNumber, actor);
  if (!canApproveQuarterKpis(actor, plan, quarter)) deny('Only the Lead can approve a pending KPI set.');
  await db.$transaction(async (tx) => {
    await moveQuarter(tx, quarter.id, 'KPI_PENDING', { status: 'IN_PROGRESS', kpiApprovedAt: new Date(), kpiApprovedById: actor.id, returnNote: null });
    await audit(tx, actor.id, 'BA_QUARTER_KPIS_APPROVED', 'BaPlanQuarter', quarter.id, { planId, quarter: quarterNumber, from: 'KPI_PENDING', to: 'IN_PROGRESS' });
  });
}

export async function returnQuarterKpis(planId: string, quarterNumber: Quarter, note: string, actor: BaTeamActor) {
  const { plan, quarter } = await loadQuarter(planId, quarterNumber, actor);
  if (!canApproveQuarterKpis(actor, plan, quarter)) deny('Only the Lead can return a pending KPI set.');
  const reason = reasonSchema.parse(note);
  await db.$transaction(async (tx) => {
    await moveQuarter(tx, quarter.id, 'KPI_PENDING', { status: 'KPI_DRAFT', returnNote: reason });
    await audit(tx, actor.id, 'BA_QUARTER_KPIS_RETURNED', 'BaPlanQuarter', quarter.id, { planId, quarter: quarterNumber, from: 'KPI_PENDING', to: 'KPI_DRAFT' });
  });
}

// ---------- Lead mid-quarter adjustments ----------

export async function leadAddKpi(planId: string, quarterNumber: Quarter, value: unknown, reasonInput: string, actor: BaTeamActor) {
  const { plan, quarter } = await loadQuarter(planId, quarterNumber, actor);
  if (!canAdjustQuarterKpis(actor, plan, quarter)) deny('Only the Lead can adjust an approved KPI set during the quarter.');
  const definition = kpiDefinitionSchema.parse(value);
  const reason = reasonSchema.parse(reasonInput);
  const count = await db.baQuarterKpi.count({ where: { quarterId: quarter.id } });
  if (count >= MAX_KPIS_PER_QUARTER) throw new Error(`A quarter can have at most ${MAX_KPIS_PER_QUARTER} KPIs.`);
  await db.$transaction(async (tx) => {
    const lineageKey = randomUUID();
    const kpi = await tx.baQuarterKpi.create({ data: { ...kpiData(definition), quarterId: quarter.id, lineageKey, sortOrder: count }, select: { id: true } });
    if (await tx.baPlanQuarter.count({ where: { id: quarter.id, status: 'IN_PROGRESS' } }) !== 1) throw new Error('The quarter changed before the KPI could be added.');
    await tx.baKpiAdjustment.create({ data: { quarterId: quarter.id, lineageKey, action: 'ADDED', afterJson: kpiSnapshot(kpiData(definition)), reason, actorId: actor.id } });
    await audit(tx, actor.id, 'BA_KPI_ADJUSTED', 'BaQuarterKpi', kpi.id, { planId, quarter: quarterNumber, to: 'ADDED' });
  });
}

export async function leadChangeKpi(kpiId: string, value: unknown, reasonInput: string, actor: BaTeamActor) {
  const kpi = await loadKpi(kpiId, actor);
  if (kpi.removedAt || !canAdjustQuarterKpis(actor, kpi.quarter.plan, kpi.quarter)) deny('Only the Lead can adjust an approved KPI set during the quarter.');
  const definition = kpiDefinitionSchema.parse(value);
  const reason = reasonSchema.parse(reasonInput);
  await db.$transaction(async (tx) => {
    const updated = await tx.baQuarterKpi.updateMany({ where: { id: kpiId, removedAt: null, quarter: { status: 'IN_PROGRESS' } }, data: kpiData(definition) });
    if (updated.count !== 1) throw new Error('The quarter changed before the KPI could be adjusted.');
    await tx.baKpiAdjustment.create({ data: { quarterId: kpi.quarter.id, lineageKey: kpi.lineageKey, action: 'CHANGED', beforeJson: kpiSnapshot(kpi), afterJson: kpiSnapshot(kpiData(definition)), reason, actorId: actor.id } });
    await audit(tx, actor.id, 'BA_KPI_ADJUSTED', 'BaQuarterKpi', kpiId, { planId: kpi.quarter.plan.id, quarter: kpi.quarter.quarter, to: 'CHANGED' });
  });
}

/** Mid-quarter removal is soft: the KPI and its progress log are kept but no longer evaluated. */
export async function leadRemoveKpi(kpiId: string, reasonInput: string, actor: BaTeamActor) {
  const kpi = await loadKpi(kpiId, actor);
  if (kpi.removedAt || !canAdjustQuarterKpis(actor, kpi.quarter.plan, kpi.quarter)) deny('Only the Lead can adjust an approved KPI set during the quarter.');
  const reason = reasonSchema.parse(reasonInput);
  await db.$transaction(async (tx) => {
    const updated = await tx.baQuarterKpi.updateMany({ where: { id: kpiId, removedAt: null, quarter: { status: 'IN_PROGRESS' } }, data: { removedAt: new Date() } });
    if (updated.count !== 1) throw new Error('The quarter changed before the KPI could be removed.');
    await tx.baKpiAdjustment.create({ data: { quarterId: kpi.quarter.id, lineageKey: kpi.lineageKey, action: 'REMOVED', beforeJson: kpiSnapshot(kpi), reason, actorId: actor.id } });
    await audit(tx, actor.id, 'BA_KPI_ADJUSTED', 'BaQuarterKpi', kpiId, { planId: kpi.quarter.plan.id, quarter: kpi.quarter.quarter, to: 'REMOVED' });
  });
}

// ---------- Progress, results and quarterly review ----------

export async function updateKpiProgress(kpiId: string, value: unknown, actor: BaTeamActor) {
  const kpi = await loadKpi(kpiId, actor);
  if (kpi.removedAt || !canUpdateProgress(actor, kpi.quarter.plan, kpi.quarter)) deny('Results can only be updated while the quarter is in progress.');
  const input = progressUpdateSchema.parse(value);
  await db.$transaction(async (tx) => {
    const updated = await tx.baQuarterKpi.updateMany({
      where: { id: kpiId, removedAt: null, actualValue: kpi.actualValue, quarter: { status: 'IN_PROGRESS' } },
      data: { actualValue: input.actualValue, memberNote: input.note || null, evidenceUrl: input.evidenceUrl ?? null },
    });
    if (updated.count !== 1) throw new Error('The KPI changed before the result could be saved. Reload and try again.');
    await tx.baKpiProgressLog.create({ data: { kpiId, previousValue: kpi.actualValue, newValue: input.actualValue, note: input.note || null, evidenceUrl: input.evidenceUrl ?? null, authorId: actor.id } });
    await audit(tx, actor.id, 'BA_KPI_PROGRESS_UPDATED', 'BaQuarterKpi', kpiId, { planId: kpi.quarter.plan.id, quarter: kpi.quarter.quarter });
  });
}

export async function submitQuarterResults(planId: string, quarterNumber: Quarter, actor: BaTeamActor) {
  const { plan, quarter } = await loadQuarter(planId, quarterNumber, actor);
  if (!canSubmitResults(actor, plan, quarter)) deny('Results can be submitted while the quarter is in progress.');
  await db.$transaction(async (tx) => {
    await moveQuarter(tx, quarter.id, 'IN_PROGRESS', { status: 'RESULTS_SUBMITTED', resultsSubmittedAt: new Date(), returnNote: null });
    await audit(tx, actor.id, 'BA_QUARTER_RESULTS_SUBMITTED', 'BaPlanQuarter', quarter.id, { planId, quarter: quarterNumber, from: 'IN_PROGRESS', to: 'RESULTS_SUBMITTED' });
  });
}

export async function reopenQuarterResults(planId: string, quarterNumber: Quarter, note: string, actor: BaTeamActor) {
  const { plan, quarter } = await loadQuarter(planId, quarterNumber, actor);
  if (!canReopenResults(actor, plan, quarter)) deny('Only the Lead can reopen submitted results.');
  const reason = reasonSchema.parse(note);
  await db.$transaction(async (tx) => {
    await moveQuarter(tx, quarter.id, 'RESULTS_SUBMITTED', { status: 'IN_PROGRESS', returnNote: reason });
    await audit(tx, actor.id, 'BA_QUARTER_RESULTS_REOPENED', 'BaPlanQuarter', quarter.id, { planId, quarter: quarterNumber, from: 'RESULTS_SUBMITTED', to: 'IN_PROGRESS' });
  });
}

export async function reviewQuarter(planId: string, quarterNumber: Quarter, input: { rating: unknown; assessment: unknown; kpiComments: Record<string, string> }, actor: BaTeamActor) {
  const { plan, quarter } = await loadQuarter(planId, quarterNumber, actor);
  if (!canReviewQuarter(actor, plan, quarter)) deny('Only the Lead can review submitted results.');
  const rating = ratingSchema.parse(input.rating);
  const assessment = reasonSchema.parse(input.assessment);
  const kpis = await db.baQuarterKpi.findMany({ where: { quarterId: quarter.id }, select: { id: true } });
  const ids = new Set(kpis.map((kpi) => kpi.id));
  const comments = Object.entries(input.kpiComments).filter(([id]) => ids.has(id)).map(([id, comment]) => [id, comment.trim().slice(0, 1000)] as const);
  await db.$transaction(async (tx) => {
    await moveQuarter(tx, quarter.id, 'RESULTS_SUBMITTED', { status: 'REVIEWED', reviewRating: rating, reviewAssessment: assessment, reviewedAt: new Date(), reviewedById: actor.id });
    for (const [id, comment] of comments) await tx.baQuarterKpi.update({ where: { id }, data: { leadComment: comment || null } });
    await audit(tx, actor.id, 'BA_QUARTER_REVIEWED', 'BaPlanQuarter', quarter.id, { planId, quarter: quarterNumber, from: 'RESULTS_SUBMITTED', to: 'REVIEWED' });
  });
}

// ---------- Templates and team membership (Lead only) ----------

export async function saveKpiTemplate(templateId: string | undefined, value: unknown, isActive: boolean, actor: BaTeamActor) {
  if (!canManageTemplates(actor)) deny('Only the Lead can manage KPI templates.');
  const definition = kpiDefinitionSchema.required({ capabilityArea: true }).parse(value);
  const data = { name: definition.name, description: definition.description || null, capabilityArea: definition.capabilityArea, comparator: definition.comparator, defaultTarget: definition.targetValue, unitLabel: definition.unitLabel, isActive };
  await db.$transaction(async (tx) => {
    const duplicate = await tx.baKpiTemplate.findFirst({ where: { name: data.name, ...(templateId ? { id: { not: templateId } } : {}) }, select: { id: true } });
    if (duplicate) throw new Error('A template with this name already exists.');
    const saved = templateId
      ? await tx.baKpiTemplate.update({ where: { id: templateId }, data, select: { id: true } })
      : await tx.baKpiTemplate.create({ data: { ...data, sortOrder: await tx.baKpiTemplate.count() }, select: { id: true } });
    await audit(tx, actor.id, templateId ? 'BA_KPI_TEMPLATE_UPDATED' : 'BA_KPI_TEMPLATE_CREATED', 'BaKpiTemplate', saved.id, { templateId: saved.id });
  });
}

export async function setBaTeamMembership(userId: string, isBaTeamMember: boolean, actor: BaTeamActor) {
  if (!isBaTeamLead(actor)) deny('Only the Lead can change BA team membership.');
  await db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({ where: { id: userId, isBaTeamMember: !isBaTeamMember }, data: { isBaTeamMember } });
    if (updated.count !== 1) throw new Error('The user was not found or already has this team setting.');
    await audit(tx, actor.id, 'BA_TEAM_MEMBERSHIP_CHANGED', 'User', userId, { subjectUserId: userId, isBaTeamMember });
  });
}
