import { describe, expect, it } from 'vitest';
import {
  baPlanProfileSchema, canTransitionPlan, canTransitionQuarter, diffKpiSets, emptyPlanProfile, evaluateKpi, formatTarget,
  formatActual, kpiDefinitionSchema, normalizeKpiInput, parseAnnualOutcomes, parsePlanProfile, progressUpdateSchema, quarterOfDate, quarterRange, ratingSchema, smartGaps, summarizeEvaluations,
} from './ba-plan-domain';

describe('KPI evaluation', () => {
  it('treats GTE and LTE thresholds inclusively', () => {
    expect(evaluateKpi('GTE', 90, 90)).toBe('ACHIEVED');
    expect(evaluateKpi('GTE', 90, 89.99)).toBe('NOT_ACHIEVED');
    expect(evaluateKpi('LTE', 5, 5)).toBe('ACHIEVED');
    expect(evaluateKpi('LTE', 5, 6)).toBe('NOT_ACHIEVED');
  });

  it('reports a missing actual value as not reported', () => {
    expect(evaluateKpi('GTE', 90, null)).toBe('NOT_REPORTED');
    expect(evaluateKpi('LTE', 5, undefined)).toBe('NOT_REPORTED');
  });

  it('summarizes only KPIs that were not removed', () => {
    const summary = summarizeEvaluations([
      { comparator: 'GTE', targetValue: 90, actualValue: 95 },
      { comparator: 'LTE', targetValue: 5, actualValue: 8 },
      { comparator: 'GTE', targetValue: 1, actualValue: null },
      { comparator: 'GTE', targetValue: 1, actualValue: 0, removedAt: new Date() },
    ]);
    expect(summary).toEqual({ total: 3, achieved: 1, notAchieved: 1, notReported: 1 });
  });

  it('formats targets with the comparator symbol', () => {
    expect(formatTarget('GTE', 4.5, '/ 5')).toBe('≥ 4.5 / 5');
    expect(formatTarget('LTE', 5, '%')).toBe('≤ 5 %');
  });
});

describe('workflow transitions', () => {
  it('allows only the approved annual plan transitions', () => {
    expect(canTransitionPlan('DRAFT', 'PENDING_APPROVAL')).toBe(true);
    expect(canTransitionPlan('PENDING_APPROVAL', 'APPROVED')).toBe(true);
    expect(canTransitionPlan('PENDING_APPROVAL', 'CHANGES_REQUESTED')).toBe(true);
    expect(canTransitionPlan('APPROVED', 'DRAFT')).toBe(true);
    expect(canTransitionPlan('APPROVED', 'CLOSED')).toBe(true);
    expect(canTransitionPlan('DRAFT', 'APPROVED')).toBe(false);
    expect(canTransitionPlan('CLOSED', 'DRAFT')).toBe(false);
  });

  it('allows only the quarterly cycle transitions', () => {
    expect(canTransitionQuarter('KPI_DRAFT', 'KPI_PENDING')).toBe(true);
    expect(canTransitionQuarter('KPI_PENDING', 'KPI_DRAFT')).toBe(true);
    expect(canTransitionQuarter('KPI_PENDING', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionQuarter('IN_PROGRESS', 'RESULTS_SUBMITTED')).toBe(true);
    expect(canTransitionQuarter('RESULTS_SUBMITTED', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionQuarter('RESULTS_SUBMITTED', 'REVIEWED')).toBe(true);
    expect(canTransitionQuarter('KPI_DRAFT', 'IN_PROGRESS')).toBe(false);
    expect(canTransitionQuarter('REVIEWED', 'IN_PROGRESS')).toBe(false);
  });
});

describe('quarter KPI comparison', () => {
  const base = { comparator: 'GTE' as const, unitLabel: '%' };
  it('classifies added, removed, changed and unchanged KPIs by lineage', () => {
    const previous = [
      { ...base, lineageKey: 'a', name: 'First-pass approval', targetValue: 90 },
      { ...base, lineageKey: 'b', name: 'Rework', comparator: 'LTE' as const, targetValue: 5 },
      { ...base, lineageKey: 'c', name: 'Mapping accuracy', targetValue: 95 },
    ];
    const current = [
      { ...base, lineageKey: 'a', name: 'First-pass approval', targetValue: 92 },
      { ...base, lineageKey: 'b', name: 'Rework', comparator: 'LTE' as const, targetValue: 5 },
      { ...base, lineageKey: 'd', name: 'Mentoring', targetValue: 2 },
    ];
    const changes = Object.fromEntries(diffKpiSets(previous, current).map((change) => [change.lineageKey, change.change]));
    expect(changes).toEqual({ a: 'CHANGED', b: 'UNCHANGED', c: 'REMOVED', d: 'ADDED' });
  });

  it('ignores KPIs removed mid-quarter', () => {
    const changes = diffKpiSets([{ ...base, lineageKey: 'a', name: 'X', targetValue: 1, removedAt: new Date() }], [{ ...base, lineageKey: 'a', name: 'X', targetValue: 1 }]);
    expect(changes).toEqual([expect.objectContaining({ lineageKey: 'a', change: 'ADDED' })]);
  });
});

describe('calendar quarters', () => {
  it('maps months to calendar-year quarters', () => {
    expect(quarterOfDate(new Date(2026, 0, 15))).toBe(1);
    expect(quarterOfDate(new Date(2026, 5, 30))).toBe(2);
    expect(quarterOfDate(new Date(2026, 9, 1))).toBe(4);
    const q2 = quarterRange(2026, 2);
    expect(q2.start.getMonth()).toBe(3);
    expect(q2.end.getMonth()).toBe(5);
    expect(q2.end.getDate()).toBe(30);
  });
});

describe('schemas', () => {
  it('fills an empty profile and round-trips it', () => {
    const profile = emptyPlanProfile();
    expect(profile.schemaVersion).toBe(1);
    expect(profile.capabilityFocus.DOMAIN_UNDERSTANDING).toBe('');
    expect(parsePlanProfile(JSON.stringify(profile))).toEqual(profile);
  });

  it('rejects unknown top-level profile sections and falls back on invalid JSON', () => {
    expect(() => baPlanProfileSchema.parse({ salary: 'x' })).toThrow();
    expect(parsePlanProfile('{not json')).toEqual(emptyPlanProfile());
  });

  it('validates KPI definitions and progress updates', () => {
    expect(kpiDefinitionSchema.parse({ name: 'Rework Rate', comparator: 'LTE', targetValue: '5', unitLabel: '%' }).targetValue).toBe(5);
    expect(() => kpiDefinitionSchema.parse({ name: 'Rework Rate', comparator: 'NE', targetValue: 5, unitLabel: '%' })).toThrow();
    expect(() => kpiDefinitionSchema.parse({ name: 'Rework Rate', comparator: 'LTE', targetValue: 'abc', unitLabel: '%' })).toThrow();
    expect(() => progressUpdateSchema.parse({ actualValue: 3, evidenceUrl: 'javascript:alert(1)' })).toThrow();
    expect(progressUpdateSchema.parse({ actualValue: '4.5', evidenceUrl: 'https://example.com/doc' }).actualValue).toBe(4.5);
  });

  it('accepts only 1–5 ratings', () => {
    expect(ratingSchema.parse('5')).toBe(5);
    expect(() => ratingSchema.parse(0)).toThrow();
    expect(() => ratingSchema.parse(6)).toThrow();
    expect(() => ratingSchema.parse(3.5)).toThrow();
  });

  it('parses annual outcomes defensively', () => {
    expect(parseAnnualOutcomes(JSON.stringify({ a: { outcome: 'ACHIEVED', comment: '' } }))).toEqual({ a: { outcome: 'ACHIEVED', comment: '' } });
    expect(parseAnnualOutcomes(JSON.stringify({ a: { outcome: 'MAYBE' } }))).toEqual({});
    expect(parseAnnualOutcomes(null)).toEqual({});
  });
});

describe('OKR SMART readiness', () => {
  const objective = { id: 'o1', title: 'Raise specification quality', specific: 'All BRDs', achievable: 'Within capacity', relevant: 'Team goal' };

  it('is ready when every Objective is SMART, has a Key Result and every KPI is linked', () => {
    expect(smartGaps([objective], [{ objectiveId: 'o1' }])).toEqual([]);
  });

  it('reports missing Objectives, SMART fields, Key Results and unlinked KPIs', () => {
    expect(smartGaps([], [{ objectiveId: null }])).toEqual([{ kind: 'NO_OBJECTIVES' }]);
    const gaps = smartGaps([{ ...objective, achievable: ' ' }, { ...objective, id: 'o2', title: 'Second' }], [{ objectiveId: 'o1' }, { objectiveId: null }, { objectiveId: 'o2', removedAt: new Date() }]);
    expect(gaps).toEqual([
      { kind: 'MISSING_SMART', objectiveId: 'o1', title: 'Raise specification quality', fields: ['achievable'] },
      { kind: 'NO_KEY_RESULTS', objectiveId: 'o2', title: 'Second' },
      { kind: 'KPI_WITHOUT_OBJECTIVE', count: 1 },
    ]);
  });
});

describe('KPI comparators', () => {
  it('evaluates =, ≥, ≤ and milestones', () => {
    expect(evaluateKpi('EQ', 0, 0)).toBe('ACHIEVED');
    expect(evaluateKpi('EQ', 0, 1)).toBe('NOT_ACHIEVED');
    expect(evaluateKpi('DONE', 1, 1)).toBe('ACHIEVED');
    expect(evaluateKpi('DONE', 1, 0)).toBe('NOT_ACHIEVED');
    expect(evaluateKpi('DONE', 1, null)).toBe('NOT_REPORTED');
  });

  it('formats milestone targets and results in the page language', () => {
    expect(formatTarget('EQ', 0, 'defects')).toBe('= 0 defects');
    expect(formatTarget('DONE', 1, '✓', 'vi')).toBe('Hoàn thành');
    expect(formatActual('DONE', 1, '✓', 'en')).toBe('Done');
    expect(formatActual('DONE', 0, '✓', 'vi')).toBe('Chưa hoàn thành');
    expect(formatActual('GTE', 4.5, '/ 5')).toBe('4.5 / 5');
  });

  it('fixes the target and unit of a milestone KPI', () => {
    expect(normalizeKpiInput({ comparator: 'DONE', targetValue: '', unitLabel: '' })).toEqual({ comparator: 'DONE', targetValue: 1, unitLabel: '✓' });
    expect(normalizeKpiInput({ comparator: 'GTE', targetValue: '90', unitLabel: '%' })).toEqual({ comparator: 'GTE', targetValue: '90', unitLabel: '%' });
    expect(kpiDefinitionSchema.parse(normalizeKpiInput({ name: 'CBAP certified', comparator: 'DONE', targetValue: '', unitLabel: '' }))).toMatchObject({ comparator: 'DONE', targetValue: 1 });
  });
});
