import { describe, expect, it } from 'vitest';
import { resolveAccessRequestPlan } from './access-request-plan';

const activePlan = { id: 'plan-a', isActive: true, durationDays: 365 };
const verifiedPaid = {
  status: 'PAID' as const,
  planId: activePlan.id,
  verifiedAt: new Date(),
  verifiedById: 'admin',
  plan: activePlan,
};

describe('access request plan resolution', () => {
  it('resolves exactly one active verified paid plan', () => {
    expect(resolveAccessRequestPlan({ requestedPlan: null, payments: [verifiedPaid] }))
      .toEqual({ ok: true, code: 'READY', plan: activePlan });
  });

  it('deduplicates multiple verified payments for the same plan', () => {
    expect(resolveAccessRequestPlan({
      requestedPlan: null,
      payments: [verifiedPaid, { ...verifiedPaid }],
    }).ok).toBe(true);
  });

  it('rejects zero eligible payments', () => {
    expect(resolveAccessRequestPlan({
      requestedPlan: null,
      payments: [{ ...verifiedPaid, status: 'REFUNDED' }],
    })).toMatchObject({ ok: false, code: 'PAYMENT_NOT_VERIFIED' });
  });

  it.each(['PENDING', 'FAILED', 'CANCELLED', 'REFUNDED'] as const)(
    'ignores %s payments',
    (status) => {
      expect(resolveAccessRequestPlan({
        requestedPlan: null,
        payments: [{ ...verifiedPaid, status }],
      }).ok).toBe(false);
    },
  );

  it('rejects unverified paid payments', () => {
    expect(resolveAccessRequestPlan({
      requestedPlan: null,
      payments: [{ ...verifiedPaid, verifiedAt: null }],
    })).toMatchObject({ ok: false, code: 'PAYMENT_NOT_VERIFIED' });
  });

  it('rejects inactive plans', () => {
    expect(resolveAccessRequestPlan({
      requestedPlan: null,
      payments: [{ ...verifiedPaid, plan: { ...activePlan, isActive: false } }],
    })).toMatchObject({ ok: false, code: 'INACTIVE_PLAN' });
  });

  it('rejects multiple distinct verified paid plans', () => {
    expect(resolveAccessRequestPlan({
      requestedPlan: null,
      payments: [
        verifiedPaid,
        { ...verifiedPaid, planId: 'plan-b', plan: { id: 'plan-b', isActive: true, durationDays: 30 } },
      ],
    })).toMatchObject({ ok: false, code: 'CONFLICTING_VERIFIED_PAYMENT_PLANS' });
  });

  it('rejects a requested plan conflict', () => {
    expect(resolveAccessRequestPlan({
      requestedPlan: { id: 'plan-b', isActive: true, durationDays: 30 },
      payments: [verifiedPaid],
    })).toMatchObject({ ok: false, code: 'CONFLICTING_VERIFIED_PAYMENT_PLANS' });
  });
});
