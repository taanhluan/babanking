import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    baAllocation: { create: vi.fn(), updateMany: vi.fn() },
    baTeamProfile: { upsert: vi.fn() },
    baCustomer: { create: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    baProject: { create: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    baProjectRole: { create: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    userFindFirst: vi.fn(),
    allocationFindFirst: vi.fn(),
    allocationFindMany: vi.fn(),
    profileFindUnique: vi.fn(),
    projectFindUnique: vi.fn(),
    roleFindUnique: vi.fn(),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/server/env', () => ({ getServerEnvironment: () => ({ APP_ENV: 'development', DATABASE_ENVIRONMENT: 'development' }) }));
vi.mock('@/lib/db', () => ({
  db: {
    user: { findFirst: mocks.userFindFirst },
    baAllocation: { findFirst: mocks.allocationFindFirst, findMany: mocks.allocationFindMany },
    baTeamProfile: { findUnique: mocks.profileFindUnique },
    baProject: { findUnique: mocks.projectFindUnique },
    baProjectRole: { findUnique: mocks.roleFindUnique },
    $transaction: (callback: (tx: typeof mocks.tx) => unknown) => callback(mocks.tx),
  },
}));

import {
  OverAllocationWarning, createAssignment, deleteAssignment, diffAssignment, mergeCustomer, saveManagerAssessment, saveTeamProfile,
  setAssignmentCancelled, updateAssignment,
} from './ba-allocation-service';

const lead = { id: 'lead', role: 'ADMIN' as const, isBaTeamMember: false };
const owner = { id: 'owner', role: 'MEMBER' as const, isBaTeamMember: true };
const peer = { id: 'peer', role: 'MEMBER' as const, isBaTeamMember: true };
const outsider = { id: 'outsider', role: 'CONTRIBUTOR' as const, isBaTeamMember: false };

const projectId = 'cjld2cjxh0000qzrmn831i7rn';
const roleId = 'cjld2cyuq0000t3rmniod1foy';
const input = { projectId, roleId, percent: '30', billableStatus: 'BILLABLE', startDate: '2026-11-01', endDate: '2026-12-31' };
const updatedAt = new Date('2026-10-20T00:00:00Z');
const stored = (overrides: Record<string, unknown> = {}) => ({ id: 'alloc-1', userId: 'owner', projectId, roleId, percent: 30, billableStatus: 'BILLABLE', startDate: new Date('2026-11-01'), endDate: new Date('2026-12-31'), cancelledAt: null, updatedAt, ...overrides });
const existing = (percent: number) => ({ id: 'other', percent, billableStatus: 'BILLABLE', startDate: new Date('2026-01-01'), endDate: null, cancelledAt: null });
const auditCalls = () => mocks.tx.auditLog.create.mock.calls.map((call) => call[0].data);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userFindFirst.mockImplementation(({ where }: { where: { id: string } }) => Promise.resolve([owner, peer, lead].find((user) => user.id === where.id) ?? null));
  mocks.projectFindUnique.mockResolvedValue({ isActive: true, customer: { isActive: true } });
  mocks.roleFindUnique.mockResolvedValue({ isActive: true });
  mocks.profileFindUnique.mockResolvedValue({ capacityPercent: 100 });
  mocks.allocationFindMany.mockResolvedValue([existing(80)]);
  mocks.tx.baAllocation.create.mockResolvedValue({ id: 'alloc-new' });
  mocks.tx.baAllocation.updateMany.mockResolvedValue({ count: 1 });
});

describe('who may manage assignments', () => {
  it('lets members add only their own assignments', async () => {
    await expect(createAssignment('peer', input, true, owner)).rejects.toThrow(/only add assignments for yourself/);
    await expect(createAssignment('owner', input, true, outsider)).rejects.toThrow();
    await createAssignment('owner', input, true, owner);
    expect(mocks.tx.baAllocation.create).toHaveBeenCalledOnce();
  });

  it('lets the Lead assign any team member but not outsiders', async () => {
    await createAssignment('peer', input, true, lead);
    mocks.userFindFirst.mockResolvedValueOnce({ id: 'outsider', role: 'CONTRIBUTOR', isBaTeamMember: false });
    await expect(createAssignment('outsider', input, true, lead)).rejects.toThrow(/BA team members/);
  });

  it('hides another member\'s assignment', async () => {
    mocks.allocationFindFirst.mockResolvedValue(stored());
    await expect(updateAssignment('alloc-1', input, true, peer)).rejects.toThrow('Assignment not found.');
    await expect(deleteAssignment('alloc-1', peer)).rejects.toThrow('Assignment not found.');
  });

  it('keeps cancel and manager assessment Lead-only', async () => {
    mocks.allocationFindFirst.mockResolvedValue(stored());
    await expect(setAssignmentCancelled('alloc-1', true, owner)).rejects.toThrow(/Only the Lead/);
    await expect(saveManagerAssessment('alloc-1', { performance: 'GOOD', risk: 'LOW', managerRemark: 'x' }, owner)).rejects.toThrow(/Only the Lead/);
    await expect(saveTeamProfile('owner', { level: 'SENIOR', capacityPercent: 100, hoursPerWeek: 40 }, owner)).rejects.toThrow(/Only the Lead/);
  });
});

describe('over-allocation warning', () => {
  it('warns without blocking: unconfirmed saves are refused, confirmed saves are audited', async () => {
    await expect(createAssignment('owner', input, false, owner)).rejects.toBeInstanceOf(OverAllocationWarning);
    expect(mocks.tx.baAllocation.create).not.toHaveBeenCalled();
    await createAssignment('owner', input, true, owner);
    expect(JSON.parse(auditCalls()[0].metadataJson)).toMatchObject({ overAllocationConfirmed: true, subjectUserId: 'owner' });
  });

  it('does not warn when the BA stays within capacity', async () => {
    mocks.allocationFindMany.mockResolvedValue([existing(70)]);
    await createAssignment('owner', input, false, owner);
    expect(JSON.parse(auditCalls()[0].metadataJson).overAllocationConfirmed).toBeUndefined();
  });

  it('replaces the edited assignment when projecting', async () => {
    mocks.allocationFindFirst.mockResolvedValue(stored({ id: 'other', percent: 80, startDate: new Date('2026-01-01'), endDate: null }));
    await updateAssignment('other', { ...input, percent: '90' }, false, owner);
    expect(mocks.tx.baAllocation.updateMany).toHaveBeenCalledOnce();
  });
});

describe('history and safety', () => {
  it('records field-level before/after values for changed fields only', async () => {
    mocks.allocationFindFirst.mockResolvedValue(stored());
    mocks.allocationFindMany.mockResolvedValue([]);
    await updateAssignment('alloc-1', { ...input, percent: '50', endDate: null }, false, owner);
    const metadata = JSON.parse(auditCalls()[0].metadataJson);
    expect(metadata.changes).toEqual({ percent: { from: 30, to: 50 }, endDate: { from: '2026-12-31', to: null } });
  });

  it('skips no-op updates', async () => {
    mocks.allocationFindFirst.mockResolvedValue(stored());
    mocks.allocationFindMany.mockResolvedValue([]);
    await updateAssignment('alloc-1', input, false, owner);
    expect(mocks.tx.baAllocation.updateMany).not.toHaveBeenCalled();
  });

  it('rejects stale updates', async () => {
    mocks.allocationFindFirst.mockResolvedValue(stored());
    mocks.allocationFindMany.mockResolvedValue([]);
    mocks.tx.baAllocation.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateAssignment('alloc-1', { ...input, percent: '40' }, false, owner)).rejects.toThrow(/changed before/);
  });

  it('soft-deletes and audits', async () => {
    mocks.allocationFindFirst.mockResolvedValue(stored());
    await deleteAssignment('alloc-1', owner);
    expect(mocks.tx.baAllocation.updateMany.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
    expect(auditCalls()[0].action).toBe('BA_ALLOCATION_DELETED');
  });

  it('never writes manager remarks into the audit trail', async () => {
    mocks.allocationFindFirst.mockResolvedValue(stored());
    await saveManagerAssessment('alloc-1', { performance: 'GOOD', risk: 'HIGH', managerRemark: 'Confidential remark' }, lead);
    expect(auditCalls()[0].metadataJson).not.toContain('Confidential');
    expect(auditCalls()[0].metadataJson).not.toContain('HIGH');
  });

  it('refuses a customer merge with clashing project names', async () => {
    mocks.tx.baCustomer.findUnique.mockResolvedValueOnce({ projects: [{ name: 'Core' }] }).mockResolvedValueOnce({ projects: [{ name: 'Core' }] });
    await expect(mergeCustomer('cust-a', 'cust-b', lead)).rejects.toThrow(/Core/);
  });

  it('diffs a new assignment against nothing', () => {
    expect(Object.keys(diffAssignment(null, { projectId, roleId, percent: 1, billableStatus: 'BILLABLE', startDate: '2026-01-01', endDate: null }))).toHaveLength(6);
  });
});
