type PaymentVerificationInput = {
  accessRequestId: string | null;
  userId: string | null;
  planId: string | null;
  plan: { isActive: boolean } | null;
  user: { id: string } | null;
};

export function classifyPaymentVerification(input: PaymentVerificationInput) {
  if (!input.planId || !input.plan?.isActive) {
    throw new Error('The payment must reference an active membership plan.');
  }
  if (input.accessRequestId) return 'ACCESS_REQUEST' as const;
  if (input.userId && input.user?.id === input.userId) return 'USER' as const;
  if (input.userId) throw new Error('The linked payment user was not found.');
  throw new Error('The payment must be linked to an access request or existing user.');
}
