import 'server-only';
import { db } from '@/lib/db';
import { summarizeEvaluations } from './ba-plan-domain';

/**
 * Read models for the BA team KPI feature. Callers must authorize first:
 * member-scoped reads take the viewer id; team-wide reads are for the Lead only.
 */
export const BaPlanRepository = {
  listPlansForUser(userId: string) {
    return db.baPerformancePlan.findMany({
      where: { userId },
      orderBy: { year: 'desc' },
      select: { id: true, year: true, status: true, reviewNote: true, updatedAt: true, quarters: { orderBy: { quarter: 'asc' }, select: { quarter: true, status: true, returnNote: true } } },
    });
  },

  getPlanDetail(planId: string) {
    return db.baPerformancePlan.findUnique({
      where: { id: planId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { name: true } },
        annualReviewedBy: { select: { name: true } },
        quarters: {
          orderBy: { quarter: 'asc' },
          include: {
            kpiApprovedBy: { select: { name: true } },
            reviewedBy: { select: { name: true } },
            kpis: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { progressLogs: { orderBy: { createdAt: 'desc' }, take: 20, include: { author: { select: { name: true } } } } } },
            objectives: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
            adjustments: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } },
          },
        },
      },
    });
  },

  async listPlanHistory(planId: string) {
    const quarters = await db.baPlanQuarter.findMany({ where: { planId }, select: { id: true, kpis: { select: { id: true } }, objectives: { select: { id: true } } } });
    const entityIds = [planId, ...quarters.flatMap((quarter) => [quarter.id, ...quarter.kpis.map((kpi) => kpi.id), ...quarter.objectives.map((objective) => objective.id)])];
    return db.auditLog.findMany({ where: { entityId: { in: entityIds }, action: { startsWith: 'BA_' } }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, action: true, createdAt: true, metadataJson: true, actor: { select: { name: true } } } });
  },

  /** Lead only: every team member with their plan for the year and per-quarter results. */
  async teamOverview(year: number) {
    const members = await db.user.findMany({
      where: { isActive: true, OR: [{ isBaTeamMember: true }, { role: 'ADMIN', baPlans: { some: { year } } }] },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, email: true, baTeamProfile: { select: { level: true } },
        baPlans: {
          where: { year },
          select: {
            id: true, status: true, profileJson: true, managerNotesJson: true, annualRating: true,
            quarters: { orderBy: { quarter: 'asc' }, select: { quarter: true, status: true, reviewRating: true, kpis: { select: { comparator: true, targetValue: true, actualValue: true, removedAt: true } } } },
          },
        },
      },
    });
    return members.map((member) => {
      const plan = member.baPlans[0];
      return {
        ...member,
        plan: plan ? { ...plan, quarters: plan.quarters.map((quarter) => ({ quarter: quarter.quarter, status: quarter.status, reviewRating: quarter.reviewRating, summary: summarizeEvaluations(quarter.kpis) })) } : null,
      };
    });
  },

  /** Lead only: work waiting for the Lead. */
  async pendingForLead() {
    const [plans, kpiSets, results] = await Promise.all([
      db.baPerformancePlan.findMany({ where: { status: 'PENDING_APPROVAL' }, orderBy: { submittedAt: 'asc' }, select: { id: true, year: true, submittedAt: true, user: { select: { name: true } } } }),
      db.baPlanQuarter.findMany({ where: { status: 'KPI_PENDING', plan: { status: 'APPROVED' } }, orderBy: { kpiSubmittedAt: 'asc' }, select: { quarter: true, kpiSubmittedAt: true, plan: { select: { id: true, year: true, user: { select: { name: true } } } } } }),
      db.baPlanQuarter.findMany({ where: { status: 'RESULTS_SUBMITTED' }, orderBy: { resultsSubmittedAt: 'asc' }, select: { quarter: true, resultsSubmittedAt: true, plan: { select: { id: true, year: true, user: { select: { name: true } } } } } }),
    ]);
    return { plans, kpiSets, results };
  },

  listTemplates(options: { activeOnly?: boolean } = {}) {
    return db.baKpiTemplate.findMany({ where: options.activeOnly ? { isActive: true } : {}, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  },
};

export type BaPlanDetail = NonNullable<Awaited<ReturnType<typeof BaPlanRepository.getPlanDetail>>>;
export type BaPlanQuarterDetail = BaPlanDetail['quarters'][number];
