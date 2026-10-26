import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    baPerformancePlan: { create: vi.fn(), updateMany: vi.fn() },
    baPlanQuarter: { create: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    baQuarterKpi: { create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
    baKpiProgressLog: { create: vi.fn() },
    baKpiAdjustment: { create: vi.fn() },
    baKpiTemplate: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    user: { updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    planFindUnique: vi.fn(),
    kpiFindUnique: vi.fn(),
    kpiFindMany: vi.fn(),
    kpiCount: vi.fn(),
    templateFindMany: vi.fn(),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/server/env', () => ({ getServerEnvironment: () => ({ APP_ENV: 'development', DATABASE_ENVIRONMENT: 'development' }) }));
vi.mock('@/lib/db', () => ({
  db: {
    baPerformancePlan: { findUnique: mocks.planFindUnique },
    baQuarterKpi: { findUnique: mocks.kpiFindUnique, findMany: mocks.kpiFindMany, count: mocks.kpiCount },
    baKpiTemplate: { findMany: mocks.templateFindMany },
    $transaction: (callback: (tx: typeof mocks.tx) => unknown) => callback(mocks.tx),
  },
}));

import {
  approvePlan, closeYear, createPlan, leadChangeKpi, leadRemoveKpi, openNextQuarter, returnPlan, reviewQuarter, savePlanProfile,
  setBaTeamMembership, submitPlan, updateKpiProgress, updateQuarterKpi,
} from './ba-plan-service';

const lead = { id: 'lead', role: 'ADMIN' as const, isBaTeamMember: false };
const owner = { id: 'owner', role: 'MEMBER' as const, isBaTeamMember: true };
const peer = { id: 'peer', role: 'MEMBER' as const, isBaTeamMember: true };
const outsider = { id: 'outsider', role: 'CONTRIBUTOR' as const, isBaTeamMember: false };

type QuarterState = { id: string; quarter: number; status: string };
const planRecord = (status: string, quarters: QuarterState[] = [{ id: 'q1', quarter: 1, status: 'KPI_DRAFT' }]) => ({ id: 'plan-1', userId: 'owner', year: 2026, status, profileJson: '{"schemaVersion":1}', quarters });
const kpiRecord = (quarterStatus: string, overrides: Record<string, unknown> = {}) => ({
  id: 'kpi-1', lineageKey: 'line-1', name: 'Rework Rate', description: null, capabilityArea: null, comparator: 'LTE', targetValue: 5, unitLabel: '%', actualValue: null, removedAt: null,
  quarter: { id: 'q1', quarter: 1, status: quarterStatus, plan: { id: 'plan-1', userId: 'owner', status: 'APPROVED' } },
  ...overrides,
});
const auditActions = () => mocks.tx.auditLog.create.mock.calls.map((call) => call[0].data.action);

beforeEach(() => {
  vi.clearAllMocks();
  for (const model of [mocks.tx.baPerformancePlan, mocks.tx.baPlanQuarter, mocks.tx.baQuarterKpi, mocks.tx.user]) model.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.baQuarterKpi.deleteMany.mockResolvedValue({ count: 1 });
});

describe('membership and visibility', () => {
  it('rejects users outside the BA team before any read', async () => {
    await expect(savePlanProfile('plan-1', {}, outsider)).rejects.toThrow(/not a member/);
    expect(mocks.planFindUnique).not.toHaveBeenCalled();
  });

  it('hides another member’s plan as not found', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('DRAFT'));
    await expect(savePlanProfile('plan-1', {}, peer)).rejects.toThrow('Plan not found.');
    expect(mocks.tx.baPerformancePlan.updateMany).not.toHaveBeenCalled();
  });

  it('records team membership changes with an audit', async () => {
    await setBaTeamMembership('user-9', true, lead);
    expect(mocks.tx.user.updateMany).toHaveBeenCalledWith({ where: { id: 'user-9', isBaTeamMember: false }, data: { isBaTeamMember: true } });
    expect(auditActions()).toEqual(['BA_TEAM_MEMBERSHIP_CHANGED']);
    await expect(setBaTeamMembership('user-9', true, owner)).rejects.toThrow(/Only the Lead/);
  });
});

describe('annual plan lifecycle', () => {
  it('creates a plan with a Q1 KPI draft seeded from active templates', async () => {
    mocks.planFindUnique.mockResolvedValue(null);
    mocks.templateFindMany.mockResolvedValue([{ id: 'ckt0000000000000000000001', name: 'Rework Rate', description: null, capabilityArea: 'STRUCTURED_SPECIFICATION', comparator: 'LTE', defaultTarget: 5, unitLabel: '%' }]);
    mocks.tx.baPerformancePlan.create.mockResolvedValue({ id: 'plan-1' });
    await createPlan({ year: 2026, source: 'TEMPLATES', templateIds: ['ckt0000000000000000000001'] }, owner);
    const data = mocks.tx.baPerformancePlan.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ userId: 'owner', year: 2026 });
    expect(data.quarters.create.kpis.create).toEqual([expect.objectContaining({ name: 'Rework Rate', comparator: 'LTE', targetValue: 5, templateId: 'ckt0000000000000000000001', sortOrder: 0 })]);
    expect(auditActions()).toEqual(['BA_PLAN_CREATED']);
  });

  it('refuses a second plan for the same year', async () => {
    mocks.planFindUnique.mockResolvedValue({ id: 'existing' });
    await expect(createPlan({ year: 2026, source: 'BLANK' }, owner)).rejects.toThrow(/already have a plan/);
  });

  it('requires at least one Q1 KPI and moves Q1 to pending together with the plan', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('DRAFT'));
    mocks.kpiCount.mockResolvedValue(0);
    await expect(submitPlan('plan-1', owner)).rejects.toThrow(/at least one Q1 KPI/);
    mocks.kpiCount.mockResolvedValue(3);
    await submitPlan('plan-1', owner);
    expect(mocks.tx.baPerformancePlan.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'plan-1', status: 'DRAFT' }, data: { status: 'PENDING_APPROVAL' } });
    expect(mocks.tx.baPlanQuarter.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'q1', status: 'KPI_DRAFT' }, data: { status: 'KPI_PENDING' } });
    expect(auditActions()).toEqual(['BA_PLAN_SUBMITTED']);
  });

  it('lets only the Lead approve, snapshotting the profile and starting Q1', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('PENDING_APPROVAL', [{ id: 'q1', quarter: 1, status: 'KPI_PENDING' }]));
    await expect(approvePlan('plan-1', owner)).rejects.toThrow(/Only the Lead/);
    await approvePlan('plan-1', lead);
    expect(mocks.tx.baPerformancePlan.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'APPROVED', approvedById: 'lead', approvedSnapshotJson: '{"schemaVersion":1}' });
    expect(mocks.tx.baPlanQuarter.updateMany.mock.calls[0][0]).toMatchObject({ where: { status: 'KPI_PENDING' }, data: { status: 'IN_PROGRESS', kpiApprovedById: 'lead' } });
  });

  it('requires a reason to return a plan and returns Q1 to draft', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('PENDING_APPROVAL', [{ id: 'q1', quarter: 1, status: 'KPI_PENDING' }]));
    await expect(returnPlan('plan-1', 'short', lead)).rejects.toThrow();
    await returnPlan('plan-1', 'Please tighten the Q1 targets.', lead);
    expect(mocks.tx.baPlanQuarter.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'KPI_DRAFT', returnNote: 'Please tighten the Q1 targets.' });
  });

  it('fails when the plan changed concurrently', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('DRAFT'));
    mocks.tx.baPerformancePlan.updateMany.mockResolvedValue({ count: 0 });
    await expect(savePlanProfile('plan-1', {}, owner)).rejects.toThrow(/changed/);
    expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe('quarterly cycle', () => {
  it('copies the active KPI set with lineage keys when opening the next quarter', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('APPROVED', [{ id: 'q1', quarter: 1, status: 'RESULTS_SUBMITTED' }]));
    mocks.kpiFindMany.mockResolvedValue([{ lineageKey: 'line-1', templateId: null, capabilityArea: null, name: 'Rework Rate', description: null, comparator: 'LTE', targetValue: 5, unitLabel: '%' }]);
    mocks.tx.baPlanQuarter.create.mockResolvedValue({ id: 'q2' });
    await expect(openNextQuarter('plan-1', owner)).resolves.toEqual({ quarter: 2 });
    const data = mocks.tx.baPlanQuarter.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ planId: 'plan-1', quarter: 2 });
    expect(data.kpis.create[0]).toMatchObject({ lineageKey: 'line-1', targetValue: 5 });
    expect(data.kpis.create[0]).not.toHaveProperty('actualValue');
  });

  it('locks the KPI set for the owner once approved', async () => {
    mocks.kpiFindUnique.mockResolvedValue(kpiRecord('IN_PROGRESS'));
    await expect(updateQuarterKpi('kpi-1', { name: 'Rework', comparator: 'LTE', targetValue: 4, unitLabel: '%' }, owner)).rejects.toThrow(/draft/);
  });

  it('records progress with an append-only log entry', async () => {
    mocks.kpiFindUnique.mockResolvedValue(kpiRecord('IN_PROGRESS', { actualValue: 6 }));
    await updateKpiProgress('kpi-1', { actualValue: '4', note: 'Fewer reopened stories' }, owner);
    expect(mocks.tx.baQuarterKpi.updateMany.mock.calls[0][0].where).toMatchObject({ id: 'kpi-1', actualValue: 6, quarter: { status: 'IN_PROGRESS' } });
    expect(mocks.tx.baKpiProgressLog.create.mock.calls[0][0].data).toMatchObject({ kpiId: 'kpi-1', previousValue: 6, newValue: 4, authorId: 'owner' });
    expect(auditActions()).toEqual(['BA_KPI_PROGRESS_UPDATED']);
  });

  it('rejects progress outside an in-progress quarter', async () => {
    mocks.kpiFindUnique.mockResolvedValue(kpiRecord('RESULTS_SUBMITTED'));
    await expect(updateKpiProgress('kpi-1', { actualValue: 4 }, owner)).rejects.toThrow(/in progress/);
    expect(mocks.tx.baKpiProgressLog.create).not.toHaveBeenCalled();
  });

  it('allows only the Lead to adjust mid-quarter, with a reason and history', async () => {
    mocks.kpiFindUnique.mockResolvedValue(kpiRecord('IN_PROGRESS'));
    const definition = { name: 'Rework Rate', comparator: 'LTE', targetValue: 4, unitLabel: '%' };
    await expect(leadChangeKpi('kpi-1', definition, 'Project scope changed this quarter', owner)).rejects.toThrow(/Only the Lead/);
    await expect(leadChangeKpi('kpi-1', definition, 'too short', lead)).rejects.toThrow();
    await leadChangeKpi('kpi-1', definition, 'Project scope changed this quarter', lead);
    const adjustment = mocks.tx.baKpiAdjustment.create.mock.calls[0][0].data;
    expect(adjustment).toMatchObject({ action: 'CHANGED', lineageKey: 'line-1', actorId: 'lead' });
    expect(JSON.parse(adjustment.beforeJson).targetValue).toBe(5);
    expect(JSON.parse(adjustment.afterJson).targetValue).toBe(4);
  });

  it('soft-removes a KPI mid-quarter so its log is kept', async () => {
    mocks.kpiFindUnique.mockResolvedValue(kpiRecord('IN_PROGRESS', { actualValue: 3 }));
    await leadRemoveKpi('kpi-1', 'No longer relevant after reassignment', lead);
    expect(mocks.tx.baQuarterKpi.updateMany.mock.calls[0][0].data).toHaveProperty('removedAt');
    expect(mocks.tx.baQuarterKpi.deleteMany).not.toHaveBeenCalled();
  });

  it('records a 1–5 quarterly review and per-KPI comments for KPIs of that quarter only', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('APPROVED', [{ id: 'q1', quarter: 1, status: 'RESULTS_SUBMITTED' }]));
    mocks.kpiFindMany.mockResolvedValue([{ id: 'kpi-1' }]);
    await expect(reviewQuarter('plan-1', 1, { rating: 6, assessment: 'Strong quarter overall.', kpiComments: {} }, lead)).rejects.toThrow();
    await reviewQuarter('plan-1', 1, { rating: 4, assessment: 'Strong quarter overall.', kpiComments: { 'kpi-1': 'Good', 'kpi-x': 'Ignored' } }, lead);
    expect(mocks.tx.baPlanQuarter.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'REVIEWED', reviewRating: 4, reviewedById: 'lead' });
    expect(mocks.tx.baQuarterKpi.update).toHaveBeenCalledTimes(1);
    expect(mocks.tx.baQuarterKpi.update).toHaveBeenCalledWith({ where: { id: 'kpi-1' }, data: { leadComment: 'Good' } });
  });
});

describe('year close', () => {
  const reviewed = [1, 2, 3, 4].map((quarter) => ({ id: `q${quarter}`, quarter, status: 'REVIEWED' }));

  it('requires an annual result for every KPI lineage', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('APPROVED', reviewed));
    mocks.kpiFindMany.mockResolvedValue([{ lineageKey: 'a' }, { lineageKey: 'b' }]);
    await expect(closeYear('plan-1', { rating: 4, assessment: 'Ready for the senior track.', outcomes: { a: { outcome: 'ACHIEVED', comment: '' } } }, lead)).rejects.toThrow(/1 missing/);
  });

  it('stores the Lead assessment and closes the plan', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('APPROVED', reviewed));
    mocks.kpiFindMany.mockResolvedValue([{ lineageKey: 'a' }]);
    await closeYear('plan-1', { rating: '4', assessment: 'Ready for the senior track.', outcomes: { a: { outcome: 'NOT_ACHIEVED', comment: 'Close' } } }, lead);
    expect(mocks.tx.baPerformancePlan.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'CLOSED', annualRating: 4, annualReviewedById: 'lead' });
    expect(auditActions()).toEqual(['BA_PLAN_CLOSED']);
  });

  it('cannot be closed by a member or before Q4 is reviewed', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('APPROVED', reviewed));
    await expect(closeYear('plan-1', { rating: 4, assessment: 'Ready for the senior track.', outcomes: {} }, owner)).rejects.toThrow();
    mocks.planFindUnique.mockResolvedValue(planRecord('APPROVED', reviewed.slice(0, 3)));
    await expect(closeYear('plan-1', { rating: 4, assessment: 'Ready for the senior track.', outcomes: {} }, lead)).rejects.toThrow();
  });
});

describe('audit metadata', () => {
  it('stores identifiers and states only', async () => {
    mocks.planFindUnique.mockResolvedValue(planRecord('PENDING_APPROVAL', [{ id: 'q1', quarter: 1, status: 'KPI_PENDING' }]));
    await returnPlan('plan-1', 'Confidential feedback about performance.', lead);
    const metadata = JSON.parse(mocks.tx.auditLog.create.mock.calls[0][0].data.metadataJson);
    expect(metadata).toEqual({ environment: 'development', from: 'PENDING_APPROVAL', to: 'CHANGES_REQUESTED' });
  });
});
