# Validation, Current State, and Handoff

## Validation Order

Run focused checks first:

```bash
npm test -- path/to/changed.test.ts
npx eslint path/to/changed.ts
```

Then:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Run `npm run db:check-env` before tests or smoke checks that touch the database.

## Manual Journey Smoke Test

Use Development and two independent accounts:

1. Create Draft from current published Journey.
2. Edit and Save Draft.
3. Confirm public page remains unchanged.
4. Submit for review.
5. Confirm author cannot review/publish.
6. Review/publish with another account.
7. Reload public page and verify visible changes.
8. Confirm `previewJson`, AuditLog, history, and rollback.

## Manual Membership Smoke Test

Use disposable Development records:

1. Create request without plan.
2. Move to payment pending.
3. Record linked payment with active plan.
4. Verify payment.
5. Confirm plan synchronization and readiness.
6. Test conflict, inactive, refunded, and unverified failures.
7. Convert only when explicitly intended.
8. Confirm one User, Membership, token hash, payment links, and audits.

## Current Handoff Source

Read `docs/AI_PROJECT_HANDOFF.md` for:

- completed phases;
- current Development database snapshot;
- modified/untracked paths;
- current build blockers;
- gaps and limitations;
- immediate next step;
- Definition of Done.

Update it after material implementation or database-state changes.

## Reporting

Always distinguish:

- tests that passed;
- checks not run;
- failures introduced by the patch;
- pre-existing unrelated failures;
- database writes performed;
- environment(s) touched;
- remaining manual validation.
