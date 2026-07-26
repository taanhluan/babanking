import { describe, expect, it } from 'vitest';
import { classifyPaymentVerification } from './payment-verification';

const base = {
  accessRequestId: null,
  userId: null,
  planId: 'plan-id',
  plan: { isActive: true },
  user: null,
};

describe('payment verification subject', () => {
  it('uses the linked AccessRequest when present', () => {
    expect(classifyPaymentVerification({ ...base, accessRequestId: 'request-id' }))
      .toBe('ACCESS_REQUEST');
  });

  it('preserves existing-user-linked payment verification', () => {
    expect(classifyPaymentVerification({
      ...base,
      userId: 'user-id',
      user: { id: 'user-id' },
    })).toBe('USER');
  });

  it('rejects an inactive plan for a user-linked payment', () => {
    expect(() => classifyPaymentVerification({
      ...base,
      userId: 'user-id',
      user: { id: 'user-id' },
      plan: { isActive: false },
    })).toThrow(/active membership plan/);
  });

  it('rejects an orphan payment', () => {
    expect(() => classifyPaymentVerification(base)).toThrow(/linked/);
  });

  it('rejects a missing or crafted user relationship', () => {
    expect(() => classifyPaymentVerification({
      ...base,
      userId: 'crafted-user-id',
      user: null,
    })).toThrow(/user was not found/);
  });
});
