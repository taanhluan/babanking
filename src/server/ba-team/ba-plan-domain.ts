import { z } from 'zod';
import { baLevels } from './ba-allocation-domain';
import type { BaPlanStatus, BaQuarterStatus, KpiComparator } from '@prisma/client';

/** Fixed capability areas of the BA capability framework. Labels live in the UI copy. */
export const capabilityAreas = ['STRUCTURED_SPECIFICATION', 'AI_ASSISTED', 'VALIDATION_CRITICAL_THINKING', 'DOMAIN_UNDERSTANDING', 'COLLABORATION'] as const;
export type CapabilityArea = (typeof capabilityAreas)[number];
export const quarters = [1, 2, 3, 4] as const;
export type Quarter = (typeof quarters)[number];

const text = (max: number) => z.string().trim().max(max).default('');
const byArea = (max: number) => z.object(Object.fromEntries(capabilityAreas.map((area) => [area, text(max)])) as Record<CapabilityArea, ReturnType<typeof text>>);

export const MAX_ANNUAL_GOALS = 5;

/** A few goals for the year (owner decision 2026-10-27); quarterly Objectives point at them by key. */
export const annualGoalSchema = z.object({
  key: z.string().min(1).max(64),
  title: z.string().trim().min(3, 'Give each annual goal a title of at least 3 characters.').max(200),
  measure: z.string().trim().max(300).default(''),
});
export type AnnualGoal = z.infer<typeof annualGoalSchema>;

/**
 * Descriptive sections of the annual plan (schema-versioned JSON in BaPerformancePlan.profileJson).
 * Only `personal` and `annualGoals` are edited now; the other sections are kept for plans written with the earlier template.
 */
export const baPlanProfileSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  personal: z.object({ level: text(1500), primaryDomain: text(1500) }).default({ level: '', primaryDomain: '' }),
  assignment: z.object({ projectStream: text(1500), subScope: text(1500), phase: text(1500), roleType: text(1500), keyResponsibilities: text(1500) }).default({ projectStream: '', subScope: '', phase: '', roleType: '', keyResponsibilities: '' }),
  capacity: z.object({ hoursPerWeek: text(1500), primaryAllocation: text(1500), primaryLoad: text(1500), buffer: text(1500), allocationRisk: text(1500) }).default({ hoursPerWeek: '', primaryAllocation: '', primaryLoad: '', buffer: '', allocationRisk: '' }),
  secondary: z.object({ focus: text(1500), scope: text(1500), developmentGoal: text(1500), duration: text(1500), capacity: text(1500) }).default({ focus: '', scope: '', developmentGoal: '', duration: '', capacity: '' }),
  capabilityFocus: byArea(1500).default(emptyByArea()),
  roadmap: z.object({ q1: text(1500), q2: text(1500), q3: text(1500), q4: text(1500) }).default({ q1: '', q2: '', q3: '', q4: '' }),
  capabilityTarget: z.object({ midYear: text(1500), endYear: text(1500) }).default({ midYear: '', endYear: '' }),
  riskControl: z.object({ contextSwitching: text(1500), burnout: text(1500), knowledgeGrowth: text(1500) }).default({ contextSwitching: '', burnout: '', knowledgeGrowth: '' }),
  expectedOutcomes: byArea(1500).default(emptyByArea()),
  deliveryImpact: z.object({ businessImpact: text(1500) }).default({ businessImpact: '' }),
  annualGoals: z.array(annualGoalSchema).max(MAX_ANNUAL_GOALS).default([]),
}).strict();
export type BaPlanProfile = z.infer<typeof baPlanProfileSchema>;

/** Profile basics a member edits; the level is one of the team levels (blank until chosen). */
export const planPersonalSchema = z.object({
  level: z.union([z.enum(baLevels), z.literal('')]),
  primaryDomain: z.string().trim().max(1500).default(''),
}).strict();

/** One annual goal as entered; the server assigns its key. */
export const annualGoalInputSchema = annualGoalSchema.omit({ key: true });

/** True when the plan still holds content in a section of the earlier, longer template. */
export function hasLegacyProfileContent(profile: BaPlanProfile) {
  return Object.entries(profile)
    .filter(([key]) => !['schemaVersion', 'personal', 'annualGoals'].includes(key))
    .some(([, section]) => Object.values(section as Record<string, string>).some((entry) => entry.trim()));
}

function emptyByArea() {
  return Object.fromEntries(capabilityAreas.map((area) => [area, ''])) as Record<CapabilityArea, string>;
}

export function emptyPlanProfile(): BaPlanProfile {
  return baPlanProfileSchema.parse({});
}

export function parsePlanProfile(json: string | null | undefined): BaPlanProfile {
  if (!json) return emptyPlanProfile();
  try {
    const parsed = baPlanProfileSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : emptyPlanProfile();
  } catch {
    return emptyPlanProfile();
  }
}

export const managerNotesSchema = z.object({ recommendation: text(1500), reviewPoint: text(300), promotionReadiness: text(300) }).strict();
export type ManagerNotes = z.infer<typeof managerNotesSchema>;

export function parseManagerNotes(json: string | null | undefined): ManagerNotes {
  if (!json) return managerNotesSchema.parse({});
  try {
    const parsed = managerNotesSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : managerNotesSchema.parse({});
  } catch {
    return managerNotesSchema.parse({});
  }
}

const finiteNumber = z.coerce.number().finite().min(-1_000_000).max(1_000_000);
const optionalUrl = z.string().trim().max(500).url().refine((value) => /^https?:\/\//i.test(value), 'Use an http(s) link.').optional();

/** ≥, ≤ and = compare the actual with the target; DONE is a milestone whose actual is 1 (done) or 0 (not done). */
export const kpiComparators = ['GTE', 'LTE', 'EQ', 'DONE'] as const;
/** A milestone KPI always targets "done"; its unit is not shown. */
export const MILESTONE_TARGET = 1;

export const kpiDefinitionSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
  capabilityArea: z.enum(capabilityAreas).optional(),
  comparator: z.enum(kpiComparators),
  targetValue: finiteNumber,
  unitLabel: z.string().trim().min(1).max(60),
  templateId: z.string().cuid().optional(),
  objectiveId: z.string().cuid().optional(),
});
export type KpiDefinition = z.infer<typeof kpiDefinitionSchema>;

/** Milestone KPIs carry a fixed target and no meaningful unit, whatever the form sent. */
export function normalizeKpiInput<T extends { comparator?: unknown; targetValue?: unknown; unitLabel?: unknown }>(input: T): T {
  return input.comparator === 'DONE' ? { ...input, targetValue: MILESTONE_TARGET, unitLabel: '✓' } : input;
}

/**
 * OKR Objective of a quarter, written as a SMART goal. Measurable is satisfied by the linked KPIs
 * (Key Results) and Time-bound by the quarter end, so only Specific, Achievable and Relevant are entered.
 */
export const objectiveSchema = z.object({
  title: z.string().trim().min(5, 'Give the Objective a title of at least 5 characters.').max(200),
  annualGoalKey: z.string().min(1).max(64).optional(),
  specific: z.string().trim().max(1000).default(''),
  achievable: z.string().trim().max(1000).default(''),
  relevant: z.string().trim().max(1000).default(''),
});
export type ObjectiveInput = z.infer<typeof objectiveSchema>;

export const smartFields = ['specific', 'achievable', 'relevant'] as const;
export type SmartGap =
  | { kind: 'NO_OBJECTIVES' }
  | { kind: 'MISSING_SMART'; objectiveId: string; title: string; fields: Array<(typeof smartFields)[number]> }
  | { kind: 'NO_KEY_RESULTS'; objectiveId: string; title: string }
  | { kind: 'KPI_WITHOUT_OBJECTIVE'; count: number };

/** A KPI set is ready for approval when every Objective is SMART with at least one Key Result and every KPI belongs to one. */
export function smartGaps(
  objectives: Array<{ id: string; title: string; specific: string; achievable: string; relevant: string }>,
  kpis: Array<{ objectiveId: string | null; removedAt?: Date | null }>,
): SmartGap[] {
  const active = kpis.filter((kpi) => !kpi.removedAt);
  if (!objectives.length) return [{ kind: 'NO_OBJECTIVES' }];
  const gaps: SmartGap[] = [];
  for (const objective of objectives) {
    const fields = smartFields.filter((field) => !objective[field].trim());
    if (fields.length) gaps.push({ kind: 'MISSING_SMART', objectiveId: objective.id, title: objective.title, fields });
    if (!active.some((kpi) => kpi.objectiveId === objective.id)) gaps.push({ kind: 'NO_KEY_RESULTS', objectiveId: objective.id, title: objective.title });
  }
  const orphans = active.filter((kpi) => !kpi.objectiveId || !objectives.some((objective) => objective.id === kpi.objectiveId)).length;
  if (orphans) gaps.push({ kind: 'KPI_WITHOUT_OBJECTIVE', count: orphans });
  return gaps;
}

export function describeSmartGaps(gaps: SmartGap[]) {
  return gaps.map((gap) => {
    switch (gap.kind) {
      case 'NO_OBJECTIVES': return 'Add at least one Objective.';
      case 'MISSING_SMART': return `Objective "${gap.title}" is missing: ${gap.fields.join(', ')}.`;
      case 'NO_KEY_RESULTS': return `Objective "${gap.title}" has no Key Result (KPI).`;
      case 'KPI_WITHOUT_OBJECTIVE': return `${gap.count} KPI(s) are not linked to an Objective.`;
    }
  }).join(' ');
}

export const progressUpdateSchema = z.object({
  actualValue: finiteNumber,
  note: z.string().trim().max(1000).optional(),
  evidenceUrl: optionalUrl,
});

export const ratingSchema = z.coerce.number().int().min(1).max(5);
export const reasonSchema = z.string().trim().min(10, 'Give a reason of at least 10 characters.').max(1000);

export const annualOutcomes = ['ACHIEVED', 'NOT_ACHIEVED'] as const;
export const annualOutcomesSchema = z.record(z.string().min(1).max(64), z.object({ outcome: z.enum(annualOutcomes), comment: z.string().trim().max(500).default('') }));
export type AnnualOutcomes = z.infer<typeof annualOutcomesSchema>;

export function parseAnnualOutcomes(json: string | null | undefined): AnnualOutcomes {
  if (!json) return {};
  try {
    const parsed = annualOutcomesSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export const planYearSchema = z.coerce.number().int().min(2020).max(2100);
export const quarterSchema = z.coerce.number().int().min(1).max(4).transform((value) => value as Quarter);

/** Calendar-year quarters: Q1 = January–March, … Q4 = October–December. */
export function quarterOfDate(date: Date): Quarter {
  return (Math.floor(date.getMonth() / 3) + 1) as Quarter;
}

/**
 * The quarter whose KPI set goes for approval together with the plan: the current quarter for this year's plan
 * (quarters already past are skipped), Q1 for any other year.
 */
export function planEntryQuarter(year: number, now = new Date()): Quarter {
  return year === now.getFullYear() ? quarterOfDate(now) : 1;
}

export function quarterRange(year: number, quarter: Quarter) {
  return { start: new Date(year, (quarter - 1) * 3, 1), end: new Date(year, quarter * 3, 0, 23, 59, 59, 999) };
}

export type KpiEvaluation = 'ACHIEVED' | 'NOT_ACHIEVED' | 'NOT_REPORTED';

export function evaluateKpi(comparator: KpiComparator, target: number, actual: number | null | undefined): KpiEvaluation {
  if (actual === null || actual === undefined || !Number.isFinite(actual)) return 'NOT_REPORTED';
  const met = comparator === 'GTE' ? actual >= target
    : comparator === 'LTE' ? actual <= target
      : comparator === 'EQ' ? actual === target
        : actual >= MILESTONE_TARGET;
  return met ? 'ACHIEVED' : 'NOT_ACHIEVED';
}

export function summarizeEvaluations(kpis: Array<{ comparator: KpiComparator; targetValue: number; actualValue: number | null; removedAt?: Date | null }>) {
  const active = kpis.filter((kpi) => !kpi.removedAt);
  const results = active.map((kpi) => evaluateKpi(kpi.comparator, kpi.targetValue, kpi.actualValue));
  return {
    total: active.length,
    achieved: results.filter((result) => result === 'ACHIEVED').length,
    notAchieved: results.filter((result) => result === 'NOT_ACHIEVED').length,
    notReported: results.filter((result) => result === 'NOT_REPORTED').length,
  };
}

const planTransitions: Record<BaPlanStatus, readonly BaPlanStatus[]> = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'CHANGES_REQUESTED'],
  CHANGES_REQUESTED: ['PENDING_APPROVAL'],
  APPROVED: ['DRAFT', 'CLOSED'],
  CLOSED: [],
};

const quarterTransitions: Record<BaQuarterStatus, readonly BaQuarterStatus[]> = {
  KPI_DRAFT: ['KPI_PENDING'],
  KPI_PENDING: ['IN_PROGRESS', 'KPI_DRAFT'],
  IN_PROGRESS: ['RESULTS_SUBMITTED'],
  RESULTS_SUBMITTED: ['IN_PROGRESS', 'REVIEWED'],
  REVIEWED: [],
};

export function canTransitionPlan(from: BaPlanStatus, to: BaPlanStatus) {
  return planTransitions[from].includes(to);
}

export function canTransitionQuarter(from: BaQuarterStatus, to: BaQuarterStatus) {
  return quarterTransitions[from].includes(to);
}

export function assertPlanTransition(from: BaPlanStatus, to: BaPlanStatus) {
  if (!canTransitionPlan(from, to)) throw new Error(`A plan cannot move from ${from} to ${to}.`);
}

export function assertQuarterTransition(from: BaQuarterStatus, to: BaQuarterStatus) {
  if (!canTransitionQuarter(from, to)) throw new Error(`A quarter cannot move from ${from} to ${to}.`);
}

export const planProfileEditableStatuses: readonly BaPlanStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];

export type ComparableKpi = { lineageKey: string; name: string; comparator: KpiComparator; targetValue: number; unitLabel: string; removedAt?: Date | null };
export type KpiChange = { lineageKey: string; name: string; change: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED'; previous?: ComparableKpi; current?: ComparableKpi };

/** Compares a quarter's KPI set with the previous quarter's by lineage key. */
export function diffKpiSets(previous: ComparableKpi[], current: ComparableKpi[]): KpiChange[] {
  const before = new Map(previous.filter((kpi) => !kpi.removedAt).map((kpi) => [kpi.lineageKey, kpi]));
  const after = new Map(current.filter((kpi) => !kpi.removedAt).map((kpi) => [kpi.lineageKey, kpi]));
  const changes: KpiChange[] = [];
  for (const [key, kpi] of after) {
    const old = before.get(key);
    if (!old) changes.push({ lineageKey: key, name: kpi.name, change: 'ADDED', current: kpi });
    else {
      const changed = old.name !== kpi.name || old.comparator !== kpi.comparator || old.targetValue !== kpi.targetValue || old.unitLabel !== kpi.unitLabel;
      changes.push({ lineageKey: key, name: kpi.name, change: changed ? 'CHANGED' : 'UNCHANGED', previous: old, current: kpi });
    }
  }
  for (const [key, kpi] of before) if (!after.has(key)) changes.push({ lineageKey: key, name: kpi.name, change: 'REMOVED', previous: kpi });
  return changes;
}

const comparatorSymbols: Record<Exclude<KpiComparator, 'DONE'>, string> = { GTE: '≥', LTE: '≤', EQ: '=' };
const milestoneLabels = {
  en: { target: 'Complete', done: 'Done', notDone: 'Not done' },
  vi: { target: 'Hoàn thành', done: 'Đã hoàn thành', notDone: 'Chưa hoàn thành' },
} as const;
type Locale = keyof typeof milestoneLabels;

export function formatTarget(comparator: KpiComparator, target: number, unit: string, locale: Locale = 'en') {
  if (comparator === 'DONE') return milestoneLabels[locale].target;
  return `${comparatorSymbols[comparator]} ${formatNumber(target)} ${unit}`.trim();
}

/** The reported value with its unit; milestones read as done / not done. */
export function formatActual(comparator: KpiComparator, actual: number | null | undefined, unit: string, locale: Locale = 'en') {
  if (actual === null || actual === undefined) return '—';
  if (comparator === 'DONE') return actual >= MILESTONE_TARGET ? milestoneLabels[locale].done : milestoneLabels[locale].notDone;
  return `${formatNumber(actual)} ${unit}`.trim();
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}
