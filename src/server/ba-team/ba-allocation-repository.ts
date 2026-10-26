import 'server-only';
import { db } from '@/lib/db';
import { fromDateValue } from './ba-allocation-domain';

/**
 * Read models for resource allocation. Callers must authorize first:
 * member-scoped reads take the viewer id; team-wide reads are for the Lead only.
 * Soft-deleted assignments are never returned outside the audit history.
 */

const assignmentSelect = {
  id: true, userId: true, percent: true, billableStatus: true, startDate: true, endDate: true, cancelledAt: true,
  performance: true, risk: true, managerRemark: true, projectId: true, roleId: true, updatedAt: true,
  project: { select: { id: true, name: true, customer: { select: { id: true, name: true, isInternal: true } } } },
  role: { select: { id: true, name: true } },
} as const;

type RawAssignment = {
  startDate: Date; endDate: Date | null; cancelledAt: Date | null;
} & Record<string, unknown>;

/** Converts storage dates to `YYYY-MM-DD` and exposes the cancelled flag the domain rules expect. */
function present<T extends RawAssignment>(entry: T) {
  return { ...entry, startDate: fromDateValue(entry.startDate), endDate: entry.endDate ? fromDateValue(entry.endDate) : null, cancelled: Boolean(entry.cancelledAt) };
}

async function listAssignments(where: { userId?: string | { in: string[] } }) {
  const rows = await db.baAllocation.findMany({ where: { ...where, deletedAt: null }, orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }], select: assignmentSelect });
  return rows.map(present);
}

export type BaAssignmentView = Awaited<ReturnType<typeof listAssignments>>[number];

export const BaAllocationRepository = {
  listForUser(userId: string) {
    return listAssignments({ userId });
  },

  async getAssignment(allocationId: string) {
    const row = await db.baAllocation.findFirst({ where: { id: allocationId, deletedAt: null }, select: { ...assignmentSelect, user: { select: { id: true, name: true } } } });
    return row ? present(row) : null;
  },

  async capacityFor(userId: string) {
    const profile = await db.baTeamProfile.findUnique({ where: { userId }, select: { level: true, capacityPercent: true, hoursPerWeek: true } });
    return { level: profile?.level ?? null, capacityPercent: profile?.capacityPercent ?? 100, hoursPerWeek: profile?.hoursPerWeek ?? 40 };
  },

  /** Lead only: every active team member (or anyone holding assignments) with profile and assignments. */
  async teamAllocation() {
    const members = await db.user.findMany({
      where: { isActive: true, accountStatus: 'ACTIVE', OR: [{ isBaTeamMember: true }, { baAllocations: { some: { deletedAt: null } } }] },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, baTeamProfile: { select: { level: true, capacityPercent: true, hoursPerWeek: true } } },
    });
    const assignments = await listAssignments({ userId: { in: members.map((member) => member.id) } });
    return members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      level: member.baTeamProfile?.level ?? null,
      capacity: member.baTeamProfile?.capacityPercent ?? 100,
      hoursPerWeek: member.baTeamProfile?.hoursPerWeek ?? 40,
      assignments: assignments.filter((entry) => entry.userId === member.id),
    }));
  },

  /** Active catalogue for pickers; `all` includes inactive entries for the Lead settings page. */
  async catalog(options: { all?: boolean } = {}) {
    const active = options.all ? {} : { isActive: true };
    const [customers, roles] = await Promise.all([
      db.baCustomer.findMany({ where: active, orderBy: [{ isInternal: 'desc' }, { name: 'asc' }], select: { id: true, name: true, isInternal: true, isActive: true, projects: { where: active, orderBy: { name: 'asc' }, select: { id: true, name: true, defaultBillableStatus: true, isActive: true, _count: { select: { allocations: { where: { deletedAt: null } } } } } } } }),
      db.baProjectRole.findMany({ where: active, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, sortOrder: true, isActive: true } }),
    ]);
    return { customers, roles };
  },

  /** Audit history of assignments, including soft-deleted ones (section 14). */
  async history(where: { userId?: string; allocationId?: string }) {
    const ids = where.allocationId
      ? [where.allocationId]
      : (await db.baAllocation.findMany({ where: where.userId ? { userId: where.userId } : {}, select: { id: true } })).map((entry) => entry.id);
    if (!ids.length) return [];
    return db.auditLog.findMany({ where: { entityType: 'BaAllocation', entityId: { in: ids } }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, action: true, entityId: true, createdAt: true, metadataJson: true, actor: { select: { name: true } } } });
  },

  /** Lookup of catalogue names so the history can show project and role names instead of ids. */
  async catalogNames() {
    const [projects, roles] = await Promise.all([
      db.baProject.findMany({ select: { id: true, name: true, customer: { select: { name: true } } } }),
      db.baProjectRole.findMany({ select: { id: true, name: true } }),
    ]);
    return { projects: Object.fromEntries(projects.map((project) => [project.id, `${project.customer.name} · ${project.name}`])), roles: Object.fromEntries(roles.map((role) => [role.id, role.name])) };
  },

  /** Lead only: team members for the "assign" picker and profile settings. */
  listTeamMembers() {
    return db.user.findMany({ where: { isActive: true, accountStatus: 'ACTIVE', OR: [{ isBaTeamMember: true }, { role: 'ADMIN' }] }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true, isBaTeamMember: true, baTeamProfile: { select: { level: true, capacityPercent: true, hoursPerWeek: true } } } });
  },
};
