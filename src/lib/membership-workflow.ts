import type { AccessRequestStatus, MembershipStatus, PaymentStatus } from '@prisma/client';

const accessTransitions: Record<AccessRequestStatus, AccessRequestStatus[]> = {
  NEW: ['CONTACTED', 'REJECTED'],
  CONTACTED: ['PAYMENT_PENDING', 'REJECTED'],
  PAYMENT_PENDING: ['PAYMENT_CONFIRMED', 'REJECTED'],
  PAYMENT_CONFIRMED: ['APPROVED'],
  APPROVED: ['CONVERTED'],
  REJECTED: [],
  CONVERTED: [],
};
const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['PAID', 'FAILED', 'CANCELLED'],
  PAID: ['REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};
const membershipTransitions: Record<MembershipStatus, MembershipStatus[]> = {
  PENDING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['EXPIRED', 'SUSPENDED', 'CANCELLED'],
  EXPIRED: ['ACTIVE', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: [],
};

export const canTransitionAccessRequest = (from: AccessRequestStatus, to: AccessRequestStatus) => accessTransitions[from].includes(to);
export const canTransitionPayment = (from: PaymentStatus, to: PaymentStatus) => paymentTransitions[from].includes(to);
export const canTransitionMembership = (from: MembershipStatus, to: MembershipStatus) => membershipTransitions[from].includes(to);
