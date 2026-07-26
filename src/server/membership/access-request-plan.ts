import type { PaymentStatus } from '@prisma/client';

export type PlanResolutionCode =
  | 'READY'
  | 'PAYMENT_NOT_VERIFIED'
  | 'MISSING_VERIFIED_PAYMENT_PLAN'
  | 'CONFLICTING_VERIFIED_PAYMENT_PLANS'
  | 'INACTIVE_PLAN';

type Plan = {
  id: string;
  isActive: boolean;
  durationDays: number;
};

type Payment = {
  status: PaymentStatus;
  planId: string | null;
  verifiedAt: Date | null;
  verifiedById: string | null;
  plan: Plan | null;
};

export type AccessRequestPlanResolution =
  | { ok: true; code: 'READY'; plan: Plan }
  | { ok: false; code: Exclude<PlanResolutionCode, 'READY'>; message: string };

export function resolveAccessRequestPlan(input: {
  requestedPlan: Plan | null;
  payments: Payment[];
}): AccessRequestPlanResolution {
  const paidPayments = input.payments.filter((payment) => payment.status === 'PAID');
  const verifiedPaidPayments = paidPayments.filter(
    (payment) => payment.verifiedAt !== null && payment.verifiedById !== null,
  );

  if (verifiedPaidPayments.length === 0) {
    return {
      ok: false,
      code: 'PAYMENT_NOT_VERIFIED',
      message: 'A verified paid payment is required.',
    };
  }

  if (verifiedPaidPayments.some((payment) => !payment.planId || !payment.plan)) {
    return {
      ok: false,
      code: 'MISSING_VERIFIED_PAYMENT_PLAN',
      message: 'A verified payment is missing its membership plan.',
    };
  }

  if (verifiedPaidPayments.some((payment) => !payment.plan?.isActive)) {
    return {
      ok: false,
      code: 'INACTIVE_PLAN',
      message: 'A verified payment references an inactive membership plan.',
    };
  }

  const distinctPlanIds = new Set(verifiedPaidPayments.map((payment) => payment.planId as string));
  if (distinctPlanIds.size > 1) {
    return {
      ok: false,
      code: 'CONFLICTING_VERIFIED_PAYMENT_PLANS',
      message: 'Verified payments reference conflicting membership plans.',
    };
  }

  const paymentPlan = verifiedPaidPayments[0].plan as Plan;
  if (input.requestedPlan) {
    if (!input.requestedPlan.isActive) {
      return {
        ok: false,
        code: 'INACTIVE_PLAN',
        message: 'The requested membership plan is inactive.',
      };
    }
    if (input.requestedPlan.id !== paymentPlan.id) {
      return {
        ok: false,
        code: 'CONFLICTING_VERIFIED_PAYMENT_PLANS',
        message: 'The requested plan conflicts with the verified payment plan.',
      };
    }
    return { ok: true, code: 'READY', plan: input.requestedPlan };
  }

  return { ok: true, code: 'READY', plan: paymentPlan };
}

export function requireResolvedAccessRequestPlan(
  input: Parameters<typeof resolveAccessRequestPlan>[0],
) {
  const resolution = resolveAccessRequestPlan(input);
  if (!resolution.ok) throw new Error(resolution.message);
  return resolution.plan;
}
