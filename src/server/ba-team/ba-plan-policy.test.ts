import { describe, expect, it } from 'vitest';
import {
  canAdjustQuarterKpis, canApprovePlan, canApproveQuarterKpis, canCloseYear, canEditPlanProfile, canEditQuarterKpis, canManageTemplates,
  canOpenRemainingQuarters, canReopenResults, canReviewQuarter, canSubmitPlan, canSubmitQuarterKpis, canUpdateProgress, canUseBaTeam, canViewPlan,
  canWriteManagerNotes,
} from './ba-plan-policy';

const lead = { id: 'lead', role: 'ADMIN' as const, isBaTeamMember: false };
const owner = { id: 'owner', role: 'MEMBER' as const, isBaTeamMember: true };
const peer = { id: 'peer', role: 'CONTRIBUTOR' as const, isBaTeamMember: true };
const outsider = { id: 'outsider', role: 'REVIEWER' as const, isBaTeamMember: false };
const plan = (status: 'DRAFT' | 'PENDING_APPROVAL' | 'CHANGES_REQUESTED' | 'APPROVED' | 'CLOSED') => ({ userId: 'owner', status });

describe('BA team access', () => {
  it('admits the Lead and flagged members only, regardless of content role', () => {
    expect(canUseBaTeam(lead)).toBe(true);
    expect(canUseBaTeam(owner)).toBe(true);
    expect(canUseBaTeam(outsider)).toBe(false);
  });

  it('lets members see only their own plans and the Lead see all', () => {
    expect(canViewPlan(owner, 'owner')).toBe(true);
    expect(canViewPlan(peer, 'owner')).toBe(false);
    expect(canViewPlan(lead, 'owner')).toBe(true);
    expect(canViewPlan(outsider, 'outsider')).toBe(false);
  });
});

describe('annual plan rules', () => {
  it('allows profile edits only in draft or returned state, by the owner or Lead', () => {
    expect(canEditPlanProfile(owner, plan('DRAFT'))).toBe(true);
    expect(canEditPlanProfile(owner, plan('CHANGES_REQUESTED'))).toBe(true);
    expect(canEditPlanProfile(owner, plan('APPROVED'))).toBe(false);
    expect(canEditPlanProfile(peer, plan('DRAFT'))).toBe(false);
    expect(canSubmitPlan(owner, plan('PENDING_APPROVAL'))).toBe(false);
  });

  it('reserves approval and manager notes for the Lead, including on their own plan', () => {
    expect(canApprovePlan(owner, plan('PENDING_APPROVAL'))).toBe(false);
    expect(canApprovePlan(lead, plan('PENDING_APPROVAL'))).toBe(true);
    expect(canApprovePlan(lead, { status: 'PENDING_APPROVAL' })).toBe(true);
    expect(canWriteManagerNotes(owner, plan('APPROVED'))).toBe(false);
    expect(canWriteManagerNotes(lead, plan('CLOSED'))).toBe(false);
  });

  it('closes the year only when every quarter is reviewed and Q4 exists', () => {
    const reviewed = [1, 2, 3, 4].map((quarter) => ({ quarter, status: 'REVIEWED' as const }));
    expect(canCloseYear(lead, plan('APPROVED'), reviewed)).toBe(true);
    expect(canCloseYear(lead, plan('APPROVED'), reviewed.slice(0, 3))).toBe(false);
    expect(canCloseYear(lead, plan('APPROVED'), [...reviewed.slice(0, 3), { quarter: 4, status: 'RESULTS_SUBMITTED' }])).toBe(false);
    expect(canCloseYear(owner, plan('APPROVED'), reviewed)).toBe(false);
  });
});

describe('quarterly cycle rules', () => {
  it('lets the owner edit KPIs only in a draft set and submit it once the plan is approved', () => {
    expect(canEditQuarterKpis(owner, plan('DRAFT'), { status: 'KPI_DRAFT' })).toBe(true);
    expect(canEditQuarterKpis(owner, plan('APPROVED'), { status: 'IN_PROGRESS' })).toBe(false);
    expect(canSubmitQuarterKpis(owner, plan('APPROVED'), { status: 'KPI_DRAFT' })).toBe(true);
    expect(canSubmitQuarterKpis(owner, plan('DRAFT'), { status: 'KPI_DRAFT' })).toBe(false);
  });

  it('reserves KPI-set approval, mid-quarter adjustment, reopening and review for the Lead', () => {
    expect(canApproveQuarterKpis(owner, plan('APPROVED'), { status: 'KPI_PENDING' })).toBe(false);
    expect(canApproveQuarterKpis(lead, plan('APPROVED'), { status: 'KPI_PENDING' })).toBe(true);
    expect(canAdjustQuarterKpis(owner, plan('APPROVED'), { status: 'IN_PROGRESS' })).toBe(false);
    expect(canAdjustQuarterKpis(lead, plan('APPROVED'), { status: 'IN_PROGRESS' })).toBe(true);
    expect(canAdjustQuarterKpis(lead, plan('APPROVED'), { status: 'RESULTS_SUBMITTED' })).toBe(false);
    expect(canReopenResults(owner, plan('APPROVED'), { status: 'RESULTS_SUBMITTED' })).toBe(false);
    expect(canReviewQuarter(lead, plan('APPROVED'), { status: 'RESULTS_SUBMITTED' })).toBe(true);
  });

  it('accepts progress only while the quarter is in progress and the plan is open', () => {
    expect(canUpdateProgress(owner, plan('APPROVED'), { status: 'IN_PROGRESS' })).toBe(true);
    expect(canUpdateProgress(owner, plan('APPROVED'), { status: 'RESULTS_SUBMITTED' })).toBe(false);
    expect(canUpdateProgress(owner, plan('CLOSED'), { status: 'IN_PROGRESS' })).toBe(false);
    expect(canUpdateProgress(peer, plan('APPROVED'), { status: 'IN_PROGRESS' })).toBe(false);
  });

  it('opens missing quarters for an open plan only while some are missing', () => {
    expect(canOpenRemainingQuarters(owner, plan('DRAFT'), [{ quarter: 1 }])).toBe(true);
    expect(canOpenRemainingQuarters(owner, plan('APPROVED'), [{ quarter: 1 }, { quarter: 2 }])).toBe(true);
    expect(canOpenRemainingQuarters(owner, plan('APPROVED'), [1, 2, 3, 4].map((quarter) => ({ quarter })))).toBe(false);
    expect(canOpenRemainingQuarters(owner, plan('CLOSED'), [{ quarter: 1 }])).toBe(false);
    expect(canOpenRemainingQuarters(peer, plan('DRAFT'), [{ quarter: 1 }])).toBe(false);
  });

  it('limits template management to the Lead', () => {
    expect(canManageTemplates(lead)).toBe(true);
    expect(canManageTemplates(owner)).toBe(false);
  });
});
