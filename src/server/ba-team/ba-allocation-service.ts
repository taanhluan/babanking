import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getServerEnvironment } from '@/server/env';
import {
  assignmentInputSchema, billableStatuses, catalogNameSchema, fromDateValue, managerAssessmentSchema, projectedPeak, teamProfileSchema,
  toDateValue, type AllocationLike, type AssignmentInput,
} from './ba-allocation-domain';
import {
  canAddCatalogEntry, canCancelAssignment, canCreateAssignmentFor, canManageAssignment, canManageCatalog, canManageTeamProfiles,
  canWriteManagerAssessment,
} from './ba-allocation-policy';
import { canUseBaTeam, type BaTeamActor } from './ba-plan-policy';
import { z } from 'zod';

type Tx = Prisma.TransactionClient;
type EntityType = 'BaAllocation' | 'BaTeamProfile' | 'BaCustomer' | 'BaProject' | 'BaProjectRole';
type MetadataValue = string | number | boolean | null | undefined | Record<string, { from: unknown; to: unknown }>;

/** Tracked assignment fields; their before/after values go to the audit trail (section 16). */
const trackedFields = ['projectId', 'roleId', 'percent', 'billableStatus', 'startDate', 'endDate'] as const;

/** Audit metadata carries identifiers, states and tracked assignment values, never Lead assessments or remarks. */
function auditMetadata(value: Record<string, MetadataValue>) {
  const allowed = new Set(['allocationId', 'subjectUserId', 'projectId', 'customerId', 'roleId', 'targetId', 'changes', 'cancelled', 'isActive', 'moved', 'overAllocationConfirmed']);
  const safe = Object.fromEntries(Object.entries({ environment: getServerEnvironment().APP_ENV, ...value }).filter(([key, entry]) => (key === 'environment' || allowed.has(key)) && entry !== undefined));
  return JSON.stringify(safe);
}

function audit(tx: Tx, actorId: string, action: string, entityType: EntityType, entityId: string, metadata: Record<string, MetadataValue> = {}) {
  return tx.auditLog.create({ data: { actorId, action, entityType, entityId, metadataJson: auditMetadata(metadata) } });
}

function deny(message = 'You are not allowed to perform this action.'): never {
  throw new Error(message);
}

/** Raised when a save would push a BA above capacity and the user has not confirmed it (warn, never block). */
export class OverAllocationWarning extends Error {
  constructor(readonly peak: number, readonly capacity: number) {
    super(`This assignment brings the BA to ${peak}% against a capacity of ${capacity}%. Confirm the over-allocation to save it anyway.`);
  }
}

function toLike(entry: { percent: number; billableStatus: AllocationLike['billableStatus']; startDate: Date; endDate: Date | null; cancelledAt: Date | null; id: string }) {
  return { id: entry.id, percent: entry.percent, billableStatus: entry.billableStatus, startDate: fromDateValue(entry.startDate), endDate: entry.endDate ? fromDateValue(entry.endDate) : null, cancelled: Boolean(entry.cancelledAt) };
}

async function assertNotOverAllocated(userId: string, input: AssignmentInput, confirmed: boolean, replacingId?: string) {
  const [profile, existing] = await Promise.all([
    db.baTeamProfile.findUnique({ where: { userId }, select: { capacityPercent: true } }),
    db.baAllocation.findMany({ where: { userId, deletedAt: null }, select: { id: true, percent: true, billableStatus: true, startDate: true, endDate: true, cancelledAt: true } }),
  ]);
  const capacity = profile?.capacityPercent ?? 100;
  const peak = projectedPeak(existing.map(toLike), { ...input, cancelled: false }, replacingId);
  if (peak > capacity && !confirmed) throw new OverAllocationWarning(peak, capacity);
  return peak > capacity;
}

async function assertTeamMember(userId: string) {
  const user = await db.user.findFirst({ where: { id: userId, isActive: true, accountStatus: 'ACTIVE' }, select: { id: true, role: true, isBaTeamMember: true } });
  if (!user || !canUseBaTeam(user)) throw new Error('Assignments can only be recorded for active BA team members.');
}

async function assertCatalogUsable(input: AssignmentInput, current?: { projectId: string; roleId: string }) {
  const [project, role] = await Promise.all([
    db.baProject.findUnique({ where: { id: input.projectId }, select: { isActive: true, customer: { select: { isActive: true } } } }),
    db.baProjectRole.findUnique({ where: { id: input.roleId }, select: { isActive: true } }),
  ]);
  if (!project || (current?.projectId !== input.projectId && (!project.isActive || !project.customer.isActive))) throw new Error('Choose an active project.');
  if (!role || (current?.roleId !== input.roleId && !role.isActive)) throw new Error('Choose an active project role.');
}

function assignmentData(input: AssignmentInput) {
  return { projectId: input.projectId, roleId: input.roleId, percent: input.percent, billableStatus: input.billableStatus, startDate: toDateValue(input.startDate), endDate: input.endDate ? toDateValue(input.endDate) : null };
}

function snapshot(entry: { projectId: string; roleId: string; percent: number; billableStatus: string; startDate: Date; endDate: Date | null }) {
  return { projectId: entry.projectId, roleId: entry.roleId, percent: entry.percent, billableStatus: entry.billableStatus, startDate: fromDateValue(entry.startDate), endDate: entry.endDate ? fromDateValue(entry.endDate) : null };
}

/** Field-level before/after of the tracked assignment fields; only changed fields are kept. */
export function diffAssignment(before: Record<(typeof trackedFields)[number], unknown> | null, after: Record<(typeof trackedFields)[number], unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of trackedFields) if (!before || before[field] !== after[field]) changes[field] = { from: before ? before[field] : null, to: after[field] };
  return changes;
}

async function loadAssignment(allocationId: string, actor: BaTeamActor) {
  const entry = await db.baAllocation.findFirst({ where: { id: allocationId, deletedAt: null }, select: { id: true, userId: true, projectId: true, roleId: true, percent: true, billableStatus: true, startDate: true, endDate: true, cancelledAt: true, updatedAt: true } });
  if (!entry || !canManageAssignment(actor, entry.userId)) throw new Error('Assignment not found.');
  return entry;
}

function stale(count: number) {
  if (count !== 1) throw new Error('The assignment changed before this action completed. Reload and try again.');
}

// ---------- Assignments ----------

export async function createAssignment(userId: string, value: unknown, confirmOverAllocation: boolean, actor: BaTeamActor) {
  if (!canCreateAssignmentFor(actor, userId)) deny('You can only add assignments for yourself.');
  const input = assignmentInputSchema.parse(value);
  await assertTeamMember(userId);
  await assertCatalogUsable(input);
  const over = await assertNotOverAllocated(userId, input, confirmOverAllocation);
  return db.$transaction(async (tx) => {
    const created = await tx.baAllocation.create({ data: { userId, ...assignmentData(input), createdById: actor.id }, select: { id: true } });
    await audit(tx, actor.id, 'BA_ALLOCATION_CREATED', 'BaAllocation', created.id, { allocationId: created.id, subjectUserId: userId, changes: diffAssignment(null, { ...input }), overAllocationConfirmed: over || undefined });
    return created;
  });
}

export async function updateAssignment(allocationId: string, value: unknown, confirmOverAllocation: boolean, actor: BaTeamActor) {
  const current = await loadAssignment(allocationId, actor);
  const input = assignmentInputSchema.parse(value);
  await assertCatalogUsable(input, current);
  const over = current.cancelledAt ? false : await assertNotOverAllocated(current.userId, input, confirmOverAllocation, current.id);
  const changes = diffAssignment(snapshot(current), { ...input });
  if (!Object.keys(changes).length) return;
  await db.$transaction(async (tx) => {
    const updated = await tx.baAllocation.updateMany({ where: { id: current.id, deletedAt: null, updatedAt: current.updatedAt }, data: { ...assignmentData(input), updatedById: actor.id } });
    stale(updated.count);
    await audit(tx, actor.id, 'BA_ALLOCATION_UPDATED', 'BaAllocation', current.id, { allocationId: current.id, subjectUserId: current.userId, changes, overAllocationConfirmed: over || undefined });
  });
}

/** Soft delete for mistaken entries: hidden and excluded from every total, kept in the history. */
export async function deleteAssignment(allocationId: string, actor: BaTeamActor) {
  const current = await loadAssignment(allocationId, actor);
  await db.$transaction(async (tx) => {
    const updated = await tx.baAllocation.updateMany({ where: { id: current.id, deletedAt: null }, data: { deletedAt: new Date(), updatedById: actor.id } });
    stale(updated.count);
    await audit(tx, actor.id, 'BA_ALLOCATION_DELETED', 'BaAllocation', current.id, { allocationId: current.id, subjectUserId: current.userId });
  });
}

export async function setAssignmentCancelled(allocationId: string, cancelled: boolean, actor: BaTeamActor) {
  if (!canCancelAssignment(actor)) deny('Only the Lead can cancel an assignment.');
  const current = await loadAssignment(allocationId, actor);
  if (Boolean(current.cancelledAt) === cancelled) throw new Error(cancelled ? 'The assignment is already cancelled.' : 'The assignment is not cancelled.');
  await db.$transaction(async (tx) => {
    const updated = await tx.baAllocation.updateMany({ where: { id: current.id, deletedAt: null, cancelledAt: cancelled ? null : { not: null } }, data: { cancelledAt: cancelled ? new Date() : null, updatedById: actor.id } });
    stale(updated.count);
    await audit(tx, actor.id, cancelled ? 'BA_ALLOCATION_CANCELLED' : 'BA_ALLOCATION_RESTORED', 'BaAllocation', current.id, { allocationId: current.id, subjectUserId: current.userId, cancelled });
  });
}

export async function saveManagerAssessment(allocationId: string, value: unknown, actor: BaTeamActor) {
  if (!canWriteManagerAssessment(actor)) deny('Only the Lead can record performance, risk and remarks.');
  const current = await loadAssignment(allocationId, actor);
  const assessment = managerAssessmentSchema.parse(value);
  await db.$transaction(async (tx) => {
    const updated = await tx.baAllocation.updateMany({ where: { id: current.id, deletedAt: null }, data: { performance: assessment.performance, risk: assessment.risk, managerRemark: assessment.managerRemark || null, updatedById: actor.id } });
    stale(updated.count);
    await audit(tx, actor.id, 'BA_ALLOCATION_ASSESSED', 'BaAllocation', current.id, { allocationId: current.id, subjectUserId: current.userId });
  });
}

// ---------- BA profiles ----------

export async function saveTeamProfile(userId: string, value: unknown, actor: BaTeamActor) {
  if (!canManageTeamProfiles(actor)) deny('Only the Lead can change level and capacity.');
  const profile = teamProfileSchema.parse(value);
  await assertTeamMember(userId);
  await db.$transaction(async (tx) => {
    const saved = await tx.baTeamProfile.upsert({ where: { userId }, create: { userId, ...profile }, update: profile, select: { id: true } });
    await audit(tx, actor.id, 'BA_TEAM_PROFILE_UPDATED', 'BaTeamProfile', saved.id, { subjectUserId: userId });
  });
}

// ---------- Catalogue ----------

function uniqueViolation(error: unknown, message: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new Error(message);
  throw error;
}

const customerSchema = z.object({ name: catalogNameSchema, isInternal: z.boolean() });
const projectSchema = z.object({ customerId: z.string().cuid(), name: catalogNameSchema, defaultBillableStatus: z.enum(billableStatuses) });
const roleSchema = z.object({ name: catalogNameSchema, sortOrder: z.coerce.number().int().min(0).max(999), isActive: z.boolean() });

export async function createCustomer(value: unknown, actor: BaTeamActor) {
  if (!canAddCatalogEntry(actor)) deny();
  const input = customerSchema.parse(value);
  try {
    return await db.$transaction(async (tx) => {
      const created = await tx.baCustomer.create({ data: input, select: { id: true } });
      await audit(tx, actor.id, 'BA_CUSTOMER_CREATED', 'BaCustomer', created.id, { customerId: created.id });
      return created;
    });
  } catch (error) {
    uniqueViolation(error, 'A customer with this name already exists.');
  }
}

export async function updateCustomer(customerId: string, value: unknown, actor: BaTeamActor) {
  if (!canManageCatalog(actor)) deny('Only the Lead can rename or deactivate customers.');
  const input = customerSchema.extend({ isActive: z.boolean() }).parse(value);
  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.baCustomer.updateMany({ where: { id: customerId }, data: input });
      if (updated.count !== 1) throw new Error('Customer not found.');
      await audit(tx, actor.id, 'BA_CUSTOMER_UPDATED', 'BaCustomer', customerId, { customerId, isActive: input.isActive });
    });
  } catch (error) {
    uniqueViolation(error, 'A customer with this name already exists.');
  }
}

export async function createProject(value: unknown, actor: BaTeamActor) {
  if (!canAddCatalogEntry(actor)) deny();
  const input = projectSchema.parse(value);
  const customer = await db.baCustomer.findUnique({ where: { id: input.customerId }, select: { isActive: true } });
  if (!customer?.isActive) throw new Error('Choose an active customer.');
  try {
    return await db.$transaction(async (tx) => {
      const created = await tx.baProject.create({ data: input, select: { id: true } });
      await audit(tx, actor.id, 'BA_PROJECT_CREATED', 'BaProject', created.id, { projectId: created.id, customerId: input.customerId });
      return created;
    });
  } catch (error) {
    uniqueViolation(error, 'This customer already has a project with this name.');
  }
}

export async function updateProject(projectId: string, value: unknown, actor: BaTeamActor) {
  if (!canManageCatalog(actor)) deny('Only the Lead can rename or deactivate projects.');
  const input = projectSchema.extend({ isActive: z.boolean() }).parse(value);
  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.baProject.updateMany({ where: { id: projectId }, data: input });
      if (updated.count !== 1) throw new Error('Project not found.');
      await audit(tx, actor.id, 'BA_PROJECT_UPDATED', 'BaProject', projectId, { projectId, customerId: input.customerId, isActive: input.isActive });
    });
  } catch (error) {
    uniqueViolation(error, 'This customer already has a project with this name.');
  }
}

/** Merges a duplicate project into another: every assignment moves, the source is deactivated. */
export async function mergeProject(sourceId: string, targetId: string, actor: BaTeamActor) {
  if (!canManageCatalog(actor)) deny('Only the Lead can merge projects.');
  if (sourceId === targetId) throw new Error('Choose two different projects.');
  await db.$transaction(async (tx) => {
    const [source, target] = await Promise.all([tx.baProject.findUnique({ where: { id: sourceId }, select: { id: true } }), tx.baProject.findUnique({ where: { id: targetId }, select: { id: true } })]);
    if (!source || !target) throw new Error('Project not found.');
    const moved = await tx.baAllocation.updateMany({ where: { projectId: sourceId }, data: { projectId: targetId } });
    await tx.baProject.update({ where: { id: sourceId }, data: { isActive: false } });
    await audit(tx, actor.id, 'BA_PROJECT_MERGED', 'BaProject', sourceId, { projectId: sourceId, targetId, moved: moved.count });
  });
}

/** Merges a duplicate customer: its projects move unless the target already has one with the same name. */
export async function mergeCustomer(sourceId: string, targetId: string, actor: BaTeamActor) {
  if (!canManageCatalog(actor)) deny('Only the Lead can merge customers.');
  if (sourceId === targetId) throw new Error('Choose two different customers.');
  await db.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.baCustomer.findUnique({ where: { id: sourceId }, select: { projects: { select: { name: true } } } }),
      tx.baCustomer.findUnique({ where: { id: targetId }, select: { projects: { select: { name: true } } } }),
    ]);
    if (!source || !target) throw new Error('Customer not found.');
    const clash = source.projects.find((project) => target.projects.some((entry) => entry.name === project.name));
    if (clash) throw new Error(`Both customers have a project named "${clash.name}". Merge or rename those projects first.`);
    const moved = await tx.baProject.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } });
    await tx.baCustomer.update({ where: { id: sourceId }, data: { isActive: false } });
    await audit(tx, actor.id, 'BA_CUSTOMER_MERGED', 'BaCustomer', sourceId, { customerId: sourceId, targetId, moved: moved.count });
  });
}

export async function saveProjectRole(roleId: string | undefined, value: unknown, actor: BaTeamActor) {
  if (!canManageCatalog(actor)) deny('Only the Lead can manage project roles.');
  const input = roleSchema.parse(value);
  try {
    await db.$transaction(async (tx) => {
      if (roleId) {
        const updated = await tx.baProjectRole.updateMany({ where: { id: roleId }, data: input });
        if (updated.count !== 1) throw new Error('Project role not found.');
        await audit(tx, actor.id, 'BA_PROJECT_ROLE_UPDATED', 'BaProjectRole', roleId, { roleId, isActive: input.isActive });
      } else {
        const created = await tx.baProjectRole.create({ data: input, select: { id: true } });
        await audit(tx, actor.id, 'BA_PROJECT_ROLE_CREATED', 'BaProjectRole', created.id, { roleId: created.id });
      }
    });
  } catch (error) {
    uniqueViolation(error, 'A project role with this name already exists.');
  }
}
