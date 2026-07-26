# Membership, Payment, Conversion, and Activation

## Workflow

```text
AccessRequest:
NEW → CONTACTED → PAYMENT_PENDING → PAYMENT_CONFIRMED → CONVERTED

Payment:
PENDING → PAID → REFUNDED

Account:
INVITED → activation → ACTIVE
```

Other allow-listed transitions remain in `src/lib/membership-workflow.ts`.

## Authorization

- Only ADMIN records/verifies administrative payment state and converts requests.
- Re-authorize in every Server Action.
- UI state is advisory; server validation is authoritative.
- Never hard-code an account email or ADMIN identity.

## Authoritative Plan Resolution

Use `src/server/membership/access-request-plan.ts`.

Eligible payment:

```text
status = PAID
verifiedAt != null
verifiedById != null
planId != null
plan.isActive = true
accessRequestId = target request
```

Rules:

- Existing request plan must be active and consistent.
- A null request plan can resolve only from exactly one distinct eligible plan.
- Duplicate eligible payments for the same plan are acceptable.
- Zero eligible plans fail.
- Multiple distinct plans fail as ambiguous.
- PENDING, FAILED, CANCELLED, REFUNDED, or unverified payments do not qualify.
- Never use a client-provided plan ID.
- Never choose the first payment arbitrarily.

## Payment Verification

Inside one transaction:

1. Re-read payment and linked request.
2. Validate relationship and active plan.
3. Mark payment verified `PAID`.
4. Resolve authoritative plan.
5. Conditionally synchronize null `requestedPlanId`.
6. Reject a conflicting existing plan.
7. Transition request when allowed.
8. Write AuditLog.

All writes must roll back together.

## Conversion

Inside a serializable transaction:

1. Re-read request, requested plan, and payments.
2. Require `PAYMENT_CONFIRMED` and null `convertedUserId`.
3. Enforce workflow transition.
4. Resolve plan server-side.
5. Reject an existing incompatible user.
6. Conditionally claim the request.
7. Create one invited User.
8. Create one active paid Membership.
9. Link eligible payments.
10. Set `convertedUserId`.
11. Create one ActivationToken hash.
12. Write account, membership, and activation audits.

Return the raw token only after commit. Store only its hash. Repeat/concurrent conversion must reject safely.

## Known Product Gaps

- No automated payment gateway.
- Amount/currency is not reconciled by the plan resolver.
- Refund does not automatically revoke membership.
- No email delivery.
- No distributed rate limiting.
- Tax, invoice, chargeback, and reconciliation are future business decisions.

## Primary Files

- `src/app/membership-actions.ts`
- `src/app/admin/memberships/requests/page.tsx`
- `src/app/admin/memberships/payments/page.tsx`
- `src/lib/membership-workflow.ts`
- `src/lib/activation.ts`
- `src/server/membership/access-request-plan.ts`
- `prisma/schema.prisma`
