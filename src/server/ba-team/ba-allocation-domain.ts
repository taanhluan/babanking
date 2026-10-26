import { z } from 'zod';

/**
 * Pure resource-allocation rules (proposal Part B, sections 15.2–15.5). Nothing here is stored:
 * statuses, availability, forecast and timeline are always derived from the assignments on read.
 * Dates are calendar dates as `YYYY-MM-DD` strings, compared lexicographically.
 */

export const baLevels = ['FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'PRINCIPAL'] as const;
export const billableStatuses = ['BILLABLE', 'PARTIAL_BILLABLE', 'NON_BILLABLE'] as const;
export const performanceRatings = ['OUTSTANDING', 'EXCELLENT', 'GOOD', 'NEEDS_IMPROVEMENT', 'UNDERPERFORMING'] as const;
export const riskLevels = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const forecastStatuses = ['OVER_ALLOCATED', 'FULLY_OCCUPIED', 'NEARLY_FULL', 'LIMITED', 'AVAILABLE_SOON', 'AVAILABLE_NOW', 'BENCH'] as const;

export type BillableStatus = (typeof billableStatuses)[number];
export type ForecastStatus = (typeof forecastStatuses)[number];
export type AssignmentStatus = 'PLANNED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

export const ROLLING_OFF_DAYS = 30;
export const TEAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export type AllocationLike = { percent: number; billableStatus: BillableStatus; startDate: string; endDate: string | null; cancelled: boolean };

// ---------- Dates ----------

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const dateSchema = z.string().regex(isoDate, 'Use the YYYY-MM-DD date format.').refine((value) => toDateValue(value).toISOString().startsWith(value), 'Invalid date.');

export function toDateValue(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function fromDateValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function todayInTeamZone(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TEAM_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(date: string, days: number) {
  const value = toDateValue(date);
  value.setUTCDate(value.getUTCDate() + days);
  return fromDateValue(value);
}

/** `YYYY-MM` keys for `count` months starting at `start` (a `YYYY-MM` key). */
export function monthRange(start: string, count: number) {
  const [year, month] = start.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(Date.UTC(year, month - 1 + index, 1));
    return value.toISOString().slice(0, 7);
  });
}

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export function shiftMonth(month: string, offset: number) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function monthBounds(month: string) {
  return { first: `${month}-01`, last: addDays(`${shiftMonth(month, 1)}-01`, -1) };
}

// ---------- Assignment status and totals ----------

export function assignmentStatus(allocation: AllocationLike, today: string): AssignmentStatus {
  if (allocation.cancelled) return 'CANCELLED';
  if (allocation.startDate > today) return 'PLANNED';
  if (allocation.endDate && allocation.endDate < today) return 'ENDED';
  return 'ACTIVE';
}

export function isActiveOn(allocation: AllocationLike, date: string) {
  return !allocation.cancelled && allocation.startDate <= date && (!allocation.endDate || allocation.endDate >= date);
}

export function allocationOn(allocations: readonly AllocationLike[], date: string, billable?: BillableStatus) {
  return allocations.filter((entry) => isActiveOn(entry, date) && (!billable || entry.billableStatus === billable)).reduce((sum, entry) => sum + entry.percent, 0);
}

/** Dates on which the total can drop: today and the day after each end date. */
function releaseDates(allocations: readonly AllocationLike[], from: string) {
  const dates = new Set([from]);
  for (const entry of allocations) if (!entry.cancelled && entry.endDate && addDays(entry.endDate, 1) > from) dates.add(addDays(entry.endDate, 1));
  return [...dates].sort();
}

/** Earliest date from `today` on which total allocation is below capacity; null when it never drops (open-ended work). */
export function nextAvailable(allocations: readonly AllocationLike[], capacity: number, today: string) {
  return releaseDates(allocations, today).find((date) => allocationOn(allocations, date) < capacity) ?? null;
}

function bandFor(allocation: number, capacity: number): Exclude<ForecastStatus, 'AVAILABLE_SOON'> {
  if (allocation <= 0) return 'BENCH';
  const ratio = capacity > 0 ? (allocation / capacity) * 100 : Number.POSITIVE_INFINITY;
  if (ratio > 100) return 'OVER_ALLOCATED';
  if (ratio === 100) return 'FULLY_OCCUPIED';
  if (ratio >= 80) return 'NEARLY_FULL';
  if (ratio >= 50) return 'LIMITED';
  return 'AVAILABLE_NOW';
}

/** True when a BA currently at ≥ 50% of capacity drops below 50% within the rolling-off window. */
export function isRollingOff(allocations: readonly AllocationLike[], capacity: number, today: string) {
  const threshold = capacity / 2;
  if (allocationOn(allocations, today) < threshold) return false;
  const horizon = addDays(today, ROLLING_OFF_DAYS);
  return releaseDates(allocations, today).some((date) => date > today && date <= horizon && allocationOn(allocations, date) < threshold);
}

/**
 * Forecast status (section 15.4, thresholds approved 2026-10-21). Over-allocation always wins;
 * otherwise a BA at 50–100% who rolls off within 30 days is shown as Available Soon.
 */
export function forecastStatus(allocations: readonly AllocationLike[], capacity: number, today: string): ForecastStatus {
  const band = bandFor(allocationOn(allocations, today), capacity);
  if (band === 'OVER_ALLOCATED' || band === 'BENCH' || band === 'AVAILABLE_NOW') return band;
  return isRollingOff(allocations, capacity, today) ? 'AVAILABLE_SOON' : band;
}

export type AllocationSummary = {
  capacity: number;
  allocation: number;
  available: number;
  overAllocated: boolean;
  billable: number;
  partialBillable: number;
  billableUtilization: number;
  forecast: ForecastStatus;
  nextAvailable: string | null;
};

export function summarizeAllocations(allocations: readonly AllocationLike[], capacity: number, date: string): AllocationSummary {
  const allocation = allocationOn(allocations, date);
  const billable = allocationOn(allocations, date, 'BILLABLE');
  return {
    capacity,
    allocation,
    available: capacity - allocation,
    overAllocated: allocation > capacity,
    billable,
    // Partial Billable has no counting rule yet (decision 9): shown separately, never added to utilization.
    partialBillable: allocationOn(allocations, date, 'PARTIAL_BILLABLE'),
    billableUtilization: capacity > 0 ? Math.round((billable / capacity) * 100) : 0,
    forecast: forecastStatus(allocations, capacity, date),
    nextAvailable: nextAvailable(allocations, capacity, date),
  };
}

/** Highest total allocation over a date range; the total only rises on a start date, so those are the candidates. */
export function peakAllocation<T extends AllocationLike>(allocations: readonly T[], first: string, last: string) {
  const candidates = new Set([first]);
  for (const entry of allocations) if (!entry.cancelled && entry.startDate > first && entry.startDate <= last) candidates.add(entry.startDate);
  let peak = { value: 0, date: first, contributors: [] as T[] };
  for (const date of [...candidates].sort()) {
    const contributors = allocations.filter((entry) => isActiveOn(entry, date));
    const value = contributors.reduce((sum, entry) => sum + entry.percent, 0);
    if (value > peak.value) peak = { value, date, contributors };
  }
  return peak;
}

/** Timeline cell (section 15.5): peak allocation in the month, coloured by the forecast bands. */
export function monthCell<T extends AllocationLike>(allocations: readonly T[], capacity: number, month: string) {
  const { first, last } = monthBounds(month);
  const peak = peakAllocation(allocations, first, last);
  return { month, peak: peak.value, band: bandFor(peak.value, capacity), contributors: peak.contributors };
}

/** Projected peak if `candidate` replaces `replacingId` in the BA's set; used for the over-allocation warning. */
export function projectedPeak<T extends AllocationLike & { id?: string }>(existing: readonly T[], candidate: AllocationLike, replacingId?: string) {
  const others = existing.filter((entry) => entry.id !== replacingId);
  const last = candidate.endDate ?? addDays(candidate.startDate, 365 * 5);
  return peakAllocation([...others, candidate], candidate.startDate, last).value;
}

// ---------- Input schemas ----------

const id = z.string().cuid();

export const assignmentInputSchema = z.object({
  projectId: id,
  roleId: id,
  percent: z.coerce.number().int('Allocation must be a whole number.').min(1).max(100),
  billableStatus: z.enum(billableStatuses),
  startDate: dateSchema,
  endDate: dateSchema.nullable(),
}).refine((value) => !value.endDate || value.endDate >= value.startDate, { message: 'End date must be on or after the start date.', path: ['endDate'] });

export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export const managerAssessmentSchema = z.object({
  performance: z.enum(performanceRatings).nullable(),
  risk: z.enum(riskLevels).nullable(),
  managerRemark: z.string().trim().max(1000).nullable(),
});

export const teamProfileSchema = z.object({
  level: z.enum(baLevels).nullable(),
  capacityPercent: z.coerce.number().int().min(0).max(100),
  hoursPerWeek: z.coerce.number().int().min(0).max(80),
});

export const catalogNameSchema = z.string().trim().min(2, 'Name is too short.').max(120);

// ---------- Customer / project report (section 17) ----------

type ReportAssignment = AllocationLike & { id: string; project: { id: string; name: string; customer: { id: string; name: string; isInternal: boolean } }; role: { name: string } };
type ReportMember<L> = { id: string; name: string; level: L; capacity: number; assignments: readonly ReportAssignment[] };

const fte = (percent: number) => Math.round(percent) / 100;

/** Active assignments at `date` grouped Customer → Project, with FTE totals and a team summary row. */
export function customerReport<L>(members: readonly ReportMember<L>[], date: string) {
  type Line = { memberId: string; memberName: string; level: L; role: string; percent: number; billableStatus: BillableStatus; endDate: string | null };
  const customers = new Map<string, { id: string; name: string; isInternal: boolean; projects: Map<string, { id: string; name: string; lines: Line[] }> }>();
  for (const member of members) {
    for (const entry of member.assignments) {
      if (!isActiveOn(entry, date)) continue;
      const customer = customers.get(entry.project.customer.id) ?? { ...entry.project.customer, projects: new Map() };
      const project = customer.projects.get(entry.project.id) ?? { id: entry.project.id, name: entry.project.name, lines: [] };
      project.lines.push({ memberId: member.id, memberName: member.name, level: member.level, role: entry.role.name, percent: entry.percent, billableStatus: entry.billableStatus, endDate: entry.endDate });
      customer.projects.set(project.id, project);
      customers.set(customer.id, customer);
    }
  }
  const totals = (lines: Line[]) => ({
    baCount: new Set(lines.map((line) => line.memberId)).size,
    fte: fte(lines.reduce((sum, line) => sum + line.percent, 0)),
    billableFte: fte(lines.filter((line) => line.billableStatus === 'BILLABLE').reduce((sum, line) => sum + line.percent, 0)),
    partialFte: fte(lines.filter((line) => line.billableStatus === 'PARTIAL_BILLABLE').reduce((sum, line) => sum + line.percent, 0)),
  });
  const groups = [...customers.values()].sort((a, b) => a.name.localeCompare(b.name)).map((customer) => {
    const projects = [...customer.projects.values()].sort((a, b) => a.name.localeCompare(b.name)).map((project) => ({ ...project, ...totals(project.lines) }));
    return { id: customer.id, name: customer.name, isInternal: customer.isInternal, projects, ...totals(projects.flatMap((project) => project.lines)) };
  });
  const capacity = members.reduce((sum, member) => sum + member.capacity, 0);
  const allocation = members.reduce((sum, member) => sum + allocationOn(member.assignments, date), 0);
  const billable = members.reduce((sum, member) => sum + allocationOn(member.assignments, date, 'BILLABLE'), 0);
  const team = {
    capacity: fte(capacity),
    allocation: fte(allocation),
    utilization: capacity ? Math.round((allocation / capacity) * 100) : 0,
    billableUtilization: capacity ? Math.round((billable / capacity) * 100) : 0,
    bench: members.filter((member) => allocationOn(member.assignments, date) === 0).length,
    rollingOff: members.filter((member) => isRollingOff(member.assignments, member.capacity, date)).length,
  };
  return { customers: groups, team };
}
