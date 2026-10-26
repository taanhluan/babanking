import { describe, expect, it } from 'vitest';
import {
  addDays, allocationOn, assignmentInputSchema, assignmentStatus, customerReport, forecastStatus, monthBounds, monthCell, monthRange, nextAvailable,
  projectedPeak, shiftMonth, summarizeAllocations, todayInTeamZone, type AllocationLike,
} from './ba-allocation-domain';

const a = (percent: number, startDate: string, endDate: string | null, overrides: Partial<AllocationLike> = {}): AllocationLike => ({ percent, startDate, endDate, billableStatus: 'BILLABLE', cancelled: false, ...overrides });
const today = '2026-10-21';

describe('dates', () => {
  it('handles month and day arithmetic across year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(monthRange('2026-11', 3)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthBounds('2028-02')).toEqual({ first: '2028-02-01', last: '2028-02-29' });
  });

  it('uses the team time zone for today', () => {
    expect(todayInTeamZone(new Date('2026-10-20T18:30:00Z'))).toBe('2026-10-21');
  });
});

describe('assignment status', () => {
  it('derives status from dates and cancellation', () => {
    expect(assignmentStatus(a(50, '2026-11-01', null), today)).toBe('PLANNED');
    expect(assignmentStatus(a(50, '2026-01-01', '2026-10-21'), today)).toBe('ACTIVE');
    expect(assignmentStatus(a(50, '2026-01-01', '2026-10-20'), today)).toBe('ENDED');
    expect(assignmentStatus(a(50, '2026-01-01', null, { cancelled: true }), today)).toBe('CANCELLED');
  });

  it('counts only active, non-cancelled assignments', () => {
    const list = [a(100, '2026-02-23', '2026-12-31'), a(10, '2026-05-30', '2026-12-31'), a(50, '2026-11-01', null), a(30, '2026-01-01', null, { cancelled: true })];
    expect(allocationOn(list, today)).toBe(110);
  });
});

describe('forecast status thresholds', () => {
  const cases: Array<[number, string]> = [[110, 'OVER_ALLOCATED'], [100, 'FULLY_OCCUPIED'], [80, 'NEARLY_FULL'], [79, 'LIMITED'], [50, 'LIMITED'], [49, 'AVAILABLE_NOW'], [1, 'AVAILABLE_NOW']];
  it.each(cases)('%i%% → %s', (percent, expected) => {
    expect(forecastStatus([a(percent, '2026-01-01', null)], 100, today)).toBe(expected);
  });

  it('is Bench without active assignments, even with planned work', () => {
    expect(forecastStatus([a(100, '2026-12-01', null)], 100, today)).toBe('BENCH');
  });

  it('flags rolling off within 30 days, but not later', () => {
    expect(forecastStatus([a(100, '2026-01-01', '2026-11-15')], 100, today)).toBe('AVAILABLE_SOON');
    expect(forecastStatus([a(60, '2026-01-01', addDays(today, 29))], 100, today)).toBe('AVAILABLE_SOON');
    expect(forecastStatus([a(60, '2026-01-01', addDays(today, 30))], 100, today)).toBe('LIMITED');
  });

  it('keeps over-allocation ahead of rolling off', () => {
    expect(forecastStatus([a(100, '2026-01-01', '2026-11-01'), a(20, '2026-01-01', null)], 100, today)).toBe('OVER_ALLOCATED');
  });

  it('is relative to capacity', () => {
    expect(forecastStatus([a(50, '2026-01-01', null)], 50, today)).toBe('FULLY_OCCUPIED');
  });
});

describe('next available and summary', () => {
  it('is today when below capacity', () => {
    expect(nextAvailable([a(80, '2026-01-01', null)], 100, today)).toBe(today);
  });

  it('is the day after enough work ends', () => {
    expect(nextAvailable([a(100, '2026-01-01', '2026-11-15'), a(10, '2026-01-01', '2026-12-31')], 100, today)).toBe('2026-11-16');
  });

  it('is null for open-ended full allocation', () => {
    expect(nextAvailable([a(100, '2026-01-01', null)], 100, today)).toBeNull();
  });

  it('never reports negative availability as a valid number', () => {
    const summary = summarizeAllocations([a(100, '2026-01-01', null), a(10, '2026-01-01', null, { billableStatus: 'NON_BILLABLE' })], 100, today);
    expect(summary).toMatchObject({ allocation: 110, available: -10, overAllocated: true, billable: 100, billableUtilization: 100 });
  });

  it('keeps Partial Billable out of billable utilization', () => {
    const summary = summarizeAllocations([a(40, '2026-01-01', null), a(30, '2026-01-01', null, { billableStatus: 'PARTIAL_BILLABLE' })], 100, today);
    expect(summary).toMatchObject({ billable: 40, partialBillable: 30, billableUtilization: 40 });
  });
});

describe('timeline and projection', () => {
  it('uses the peak within the month, including ended work', () => {
    const list = [a(60, '2026-09-01', '2026-10-10'), a(50, '2026-10-05', null)];
    const cell = monthCell(list, 100, '2026-10');
    expect(cell.peak).toBe(110);
    expect(cell.band).toBe('OVER_ALLOCATED');
    expect(cell.contributors).toHaveLength(2);
    expect(monthCell(list, 100, '2026-11').peak).toBe(50);
    expect(monthCell(list, 100, '2026-08').band).toBe('BENCH');
  });

  it('projects an edit by replacing the original assignment', () => {
    const existing = [{ id: 'x', ...a(80, '2026-01-01', null) }, { id: 'y', ...a(20, '2026-01-01', null) }];
    expect(projectedPeak(existing, a(30, '2026-11-01', null))).toBe(130);
    expect(projectedPeak(existing, a(30, '2026-11-01', null), 'y')).toBe(110);
    expect(projectedPeak(existing, a(20, '2026-11-01', null), 'y')).toBe(100);
  });
});

describe('assignment input', () => {
  const base = { projectId: 'cjld2cjxh0000qzrmn831i7rn', roleId: 'cjld2cyuq0000t3rmniod1foy', percent: '80', billableStatus: 'BILLABLE', startDate: '2026-02-23', endDate: null };
  it('accepts a valid assignment and open end date', () => {
    expect(assignmentInputSchema.parse(base).percent).toBe(80);
  });
  it('rejects bad percentages and reversed dates', () => {
    expect(assignmentInputSchema.safeParse({ ...base, percent: '0' }).success).toBe(false);
    expect(assignmentInputSchema.safeParse({ ...base, percent: '120' }).success).toBe(false);
    expect(assignmentInputSchema.safeParse({ ...base, endDate: '2026-02-22' }).success).toBe(false);
    expect(assignmentInputSchema.safeParse({ ...base, startDate: '2026-02-30' }).success).toBe(false);
  });
});

describe('customer report', () => {
  const project = (id: string, customer: string) => ({ id, name: id, customer: { id: customer, name: customer, isInternal: customer === 'Internal' } });
  const line = (id: string, percent: number, projectId: string, customer: string, overrides: Partial<AllocationLike> = {}) => ({ id, role: { name: 'BA' }, project: project(projectId, customer), ...a(percent, '2026-01-01', null, overrides) });
  const members = [
    { id: 'm1', name: 'BA A', level: 'MIDDLE', capacity: 100, assignments: [line('1', 100, 'P1', 'Customer X'), line('2', 10, 'Knowledge', 'Internal', { billableStatus: 'NON_BILLABLE' })] },
    { id: 'm2', name: 'BA B', level: 'SENIOR', capacity: 100, assignments: [line('3', 60, 'P1', 'Customer X', { endDate: '2026-11-01' }), line('4', 20, 'P2', 'Customer X', { billableStatus: 'PARTIAL_BILLABLE' })] },
    { id: 'm3', name: 'BA C', level: null, capacity: 100, assignments: [line('5', 50, 'P2', 'Customer X', { endDate: '2026-01-31' })] },
  ];

  it('groups active work by customer and project with FTE and separate partial billable', () => {
    const report = customerReport(members, today);
    expect(report.customers.map((customer) => customer.name)).toEqual(['Customer X', 'Internal']);
    const x = report.customers[0];
    expect(x).toMatchObject({ baCount: 2, fte: 1.8, billableFte: 1.6, partialFte: 0.2 });
    expect(x.projects.find((entry) => entry.id === 'P1')).toMatchObject({ baCount: 2, fte: 1.6 });
  });

  it('summarizes the whole team', () => {
    expect(customerReport(members, today).team).toEqual({ capacity: 3, allocation: 1.9, utilization: 63, billableUtilization: 53, bench: 1, rollingOff: 1 });
  });
});
