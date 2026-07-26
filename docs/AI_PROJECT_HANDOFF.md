# Banking BA Knowledge Hub — AI Project Handoff

> Last verified: 2026-07-26, Asia/Ho_Chi_Minh
> Current working environment: Development only
> Purpose: Give the next engineer or AI agent enough verified context to continue safely without reconstructing the project history from chat.

## Project Skill

The repository includes a dedicated Codex project skill:

```text
.agents/skills/banking-ba-project/SKILL.md
```

Invoke it explicitly when starting or resuming project work:

```text
$banking-ba-project
```

Example:

```text
Use $banking-ba-project to audit the current Development blocker and continue from docs/AI_PROJECT_HANDOFF.md.
```

The skill is the operational playbook. This document is the detailed project-state handoff. A new AI agent should load both before making changes.

## 1. Read This First

This repository is a production-grade, bilingual Banking BA knowledge platform. The current working tree contains substantial **uncommitted Development work** for:

- environment and database isolation;
- knowledge access enforcement;
- a controlled Journey CMS;
- generic Journey rendering;
- legacy content-creation restrictions;
- membership payment-to-plan resolution and conversion hardening.

Do not reset, clean, checkout, overwrite, or discard the working tree. Do not assume that untracked files are disposable.

Before any database command:

```bash
npm run db:check-env
```

The command must report:

```text
Application environment: development
Expected database environment: development
Safety check passed.
```

Never print, copy, or commit database URLs, credentials, auth secrets, activation tokens, or password hashes.

## 2. Non-Negotiable Safety Rules

1. Work only against the Development application and Development database unless a new, explicit, separately approved release task says otherwise.
2. Do not connect to, query, migrate, seed, modify, deploy, or publish Preview or Production.
3. Preserve environment isolation and all existing Production protection.
4. Do not run `prisma migrate reset`, `prisma db push`, destructive SQL, or development seeds outside Development.
5. Do not hard-code user emails, request IDs, payment IDs, Journey slugs, plan IDs, or roles into authorization logic.
6. Continue using the existing Role Matrix and Knowledge Access Matrix.
7. ADMIN does not bypass editorial independence: authors cannot review or publish their own revision.
8. Public Journey content must continue to load through:

   ```text
   ContentItem.publishedRevisionId
   → ContentRevision.contentJson
   ```

9. Draft edits must never mutate a published revision.
10. Publish and rollback must remain transactional, audited, and revision-preserving.
11. Activation tokens must remain one-time, expiring, and hash-only at rest.
12. Server actions must remain authoritative; UI visibility is not authorization.

## 3. Product Scope

The application currently covers:

- locale-prefixed English and Vietnamese routes;
- signed HTTP-only authentication;
- account roles: `MEMBER`, `CONTRIBUTOR`, `REVIEWER`, `ADMIN`;
- paid, internal, and complimentary memberships;
- access requests and administrative payment verification;
- invited-account activation;
- knowledge scopes and package/content permissions;
- Banking Journeys, BA Practice, Case Studies, and Career Levels;
- contributor and reviewer workflows;
- Journey publication history and rollback;
- public and protected Journey reading;
- bookmarks and reading activity;
- environment diagnostics and database-operation guards.

The canonical architecture and setup documentation remains `README.md`.

## 4. Work Completed Across the Project

### Phase A — Production Baseline and Environment Isolation

Completed:

- PostgreSQL/Prisma runtime established.
- Development, Preview, and Production environment labels introduced.
- Runtime database access fails closed on application/database label mismatch.
- Safe Prisma wrapper commands added.
- Development-only migration, seed, import, and Studio operations enforced.
- Admin environment diagnostics added without exposing credentials.
- Static-content fallback is blocked in Production.

Key files:

- `src/server/environment-core.ts`
- `src/server/env.ts`
- `src/lib/db.ts`
- `src/server/database/database-environment-core.ts`
- `scripts/check-database-environment.ts`
- `scripts/run-safe-prisma-command.ts`
- `README.md`

### Phase B — Knowledge Access Matrix

Completed:

- Knowledge scopes and package permissions are database-driven.
- Public `VIEW` queries filter unpublished content.
- Workflow permissions can still evaluate unpublished revisions.
- Role, membership, package, Journey grant, and content grant behavior remains centralized.

Key files:

- `src/server/access-control/knowledge-access-repository.ts`
- `src/server/access-control/knowledge-access-repository.test.ts`
- related Prisma models in `prisma/schema.prisma`

### Phase C — Journey CMS Audit and Architecture

The old Journey presentation was static/legacy-oriented. The approved architecture keeps the public route stable while moving editable Journey content into versioned CMS records.

Completed:

- Journey CMS merged under Admin → Contributor.
- Journey list and Journey editor routes added.
- Existing `ContentItem` records are reused; editing does not create replacement identities.
- Stable slug is server-controlled and immutable.
- Drafts are created from the current published revision.
- Save Draft, Submit for Review, Review, Reject, Publish, history, rollback, and archive flows exist.
- Existing Role Matrix and Knowledge Access Matrix are reused.
- Self-review and self-publish are prohibited for all roles, including ADMIN.
- Publish transactionally updates `ContentItem.publishedRevisionId`.
- Publish synchronizes `ContentItem.previewJson`.
- Publish and rollback write AuditLog records.
- Publication-pointer races are rejected.
- CMS list/history queries avoid loading unnecessary full content.
- Journey CMS fails closed outside matching Development environments.
- No database schema migration was required; content is stored as validated, schema-versioned JSON.

Primary routes:

```text
/en/admin/contributor
/en/admin/contributor/journeys
/en/admin/contributor/journeys/[slug]
/en/admin/contributor/journeys/[slug]/revisions/[revisionId]
```

Primary files:

- `src/app/admin/contributor/page.tsx`
- `src/app/admin/contributor/journeys/page.tsx`
- `src/app/admin/contributor/journeys/[slug]/page.tsx`
- `src/app/admin/contributor/journeys/[slug]/JourneyBusinessEditor.tsx`
- `src/app/admin/contributor/journeys/[slug]/revisions/[revisionId]/page.tsx`
- `src/app/admin/contributor/journeys/actions.ts`
- `src/server/cms/journey-cms-environment-core.ts`
- `src/server/cms/journey-cms-environment.ts`
- `src/server/cms/journey-cms-authorization.ts`
- `src/server/cms/journey-cms-policy.ts`
- `src/server/cms/journey-cms-repository.ts`
- `src/server/cms/journey-cms-service.ts`
- `src/server/cms/journey-content-schema.ts`
- `src/server/cms/journey-cms.test.ts`

### Phase D — Journey Renderer Compatibility

Completed:

- The public Journey route remains unchanged:

  ```text
  /en/banking-journeys/[slug]
  ```

- The reader continues to load only the revision referenced by `publishedRevisionId`.
- Legacy Journey JSON remains renderable.
- The renderer also supports the approved generic structure:

  ```text
  modules
  → sections
  → blocks
  ```

- Generic rendering does not hard-code `payments-and-transfers` fields.
- Raw HTML is not used for generic blocks.
- Draft changes do not appear publicly before publication.
- Public cache invalidation is called after publish/rollback.

Key files:

- `src/components/content/DatabaseContent.tsx`
- `src/components/content/DatabaseContent.test.ts`
- `src/server/cms/journey-content-schema.ts`
- `src/app/admin/contributor/journeys/actions.ts`

### Phase E — Existing Journey Migration and Identity Repair

Completed in Development:

- The canonical Journey identity uses stable slug `payments-and-transfers`.
- CMS publication updates that existing `ContentItem`.
- The mistaken duplicate slug `paymentsandtransfers` was archived rather than deleted.
- `payments-and-transfers` revision v3 is currently published.
- The public Development reader is expected to render v3.
- Rollback history for earlier published revisions remains available.

### Phase F — Controlled Journey Editing UX

Completed:

- Existing Journey editing automatically loads current content.
- Users edit business content rather than privileged metadata.
- Stable slug, content type, scope, schema version, version, status, author, reviewer, publication pointer, and preview metadata are not manually re-entered.
- A Business Editor is the primary editing experience.
- Advanced JSON remains secondary.
- Legacy `/contributor/content/new` no longer offers `BANKING_JOURNEY`.
- Existing Journeys are edited only through the controlled Journey CMS.
- New Banking Journey creation still requires a future controlled creation flow.

Key files:

- `src/app/admin/contributor/journeys/[slug]/JourneyBusinessEditor.tsx`
- `src/app/contributor/content/new/page.tsx`
- `src/app/contributor/content/new/page.test.ts`
- `src/lib/validation.ts`

### Phase G — Membership Conversion Hot Fix

Root cause:

- An `AccessRequest` could reach `PAYMENT_CONFIRMED`.
- Its linked `PaymentRecord` could be verified `PAID` with a valid plan.
- `AccessRequest.requestedPlanId` could remain null.
- Conversion UI then silently hid the conversion action.

Completed:

- A shared server-side plan resolver was added.
- Only linked, verified `PAID` payments are eligible.
- `PENDING`, `FAILED`, `CANCELLED`, `REFUNDED`, and unverified payments are ignored.
- Missing, inactive, or conflicting plans fail closed.
- Duplicate verified payments for the same plan resolve to one authoritative plan.
- Verification now re-reads payment/request inside one transaction.
- Verification synchronizes a null request plan conditionally.
- Existing matching plans remain idempotent.
- Conflicting plans are rejected without overwrite.
- Payment update, request transition, plan synchronization, and audit are atomic.
- Conversion re-authorizes ADMIN and re-reads all state transactionally.
- Conversion uses `Serializable` isolation and conditionally claims the request.
- Repeat or concurrent conversion safely rejects.
- User, Membership, ActivationToken, payment links, request state, and audits are committed atomically.
- Only the activation-token hash is stored.
- `PAYMENT_CONFIRMED → CONVERTED` is explicit in the workflow matrix.
- Admin UI now exposes conversion readiness/errors instead of silently hiding recoverable requests.

Key files:

- `src/server/membership/access-request-plan.ts`
- `src/server/membership/access-request-plan.test.ts`
- `src/app/membership-actions.ts`
- `src/app/admin/memberships/requests/page.tsx`
- `src/lib/membership-workflow.ts`
- `src/lib/platform.test.ts`

## 5. Current Development Database Snapshot

This section is a point-in-time operational snapshot, not seed data or a migration.

### Canonical Banking Journeys

Ten canonical active Journeys currently exist:

| Stable slug | Current published version | Archived |
|---|---:|---|
| `cards` | v2 | No |
| `customer-onboarding` | v1 | No |
| `customer-service` | v1 | No |
| `deposits` | v1 | No |
| `lending` | v1 | No |
| `notification-and-engagement` | v1 | No |
| `payments-and-transfers` | v3 | No |
| `personal-finance-management` | v1 | No |
| `security-and-access` | v1 | No |
| `wealth-and-investment` | v1 | No |

Mistaken duplicate:

| Slug | State | Required handling |
|---|---|---|
| `paymentsandtransfers` | Archived | Keep archived; do not reuse or delete casually |

`payments-and-transfers` currently has:

- v1: published historical revision;
- v2: published historical revision;
- v3: current published revision;
- current `publishedRevisionId`: v3;
- independent author/reviewer pairing on v3;
- rollback history retained.

### Membership Defect Case

Affected request:

```text
AccessRequest ID: cms0na4u60003rgar1qfbxogz
Email: luan92.it@gmail.com
Plan: DEV_PROFESSIONAL_ANNUAL
```

Final verified Development state:

- request status: `CONVERTED`;
- `requestedPlanId` synchronized;
- one User exists;
- account status: `ACTIVE`;
- one active paid Membership exists;
- PaymentRecord is linked to the User and Membership;
- one activation token was created as a stored hash;
- activation token has been used;
- activation completed successfully;
- repair and conversion audits exist.

The controlled repair only synchronized the plan and wrote an audit. A separate authenticated ADMIN conversion action ran afterward, followed by successful user activation.

Do not generate or expose a new activation link unless the approved reissue action is explicitly requested.

## 6. Validation Results at Handoff

Latest results:

```text
npm run db:check-env
PASS — Development application / Development database

npm test
PASS — 11 test files, 76 tests

npm run lint
PASS

npx tsc --noEmit
PASS

npm run build
PASS
```

Resolved native form action issue:

```text
saveJourneyDraftAction now returns Promise<void>
```

The unused `{ ok: true }` return was removed. Validation, Draft persistence,
AuditLog integration, and cache refresh behavior remain unchanged.

## 7. Immediate Next Step

The current stage is Production readiness verification. No commit, merge, push,
or deployment has occurred yet. Preview and Production remain unchanged.

## 8. Required Manual Smoke Tests After Build Is Green

All tests must use Development.

### Journey CMS End-to-End

Use two independent accounts:

- author: Contributor/Admin with edit rights;
- reviewer/publisher: a different Reviewer/Admin with required permissions.

Test one reusable Journey, preferably create v4 from current `payments-and-transfers` v3:

1. Open `/en/admin/contributor/journeys/payments-and-transfers`.
2. Confirm stable slug is read-only.
3. Create Draft from current published revision.
4. Confirm all current title, summary, modules, sections, and blocks are loaded.
5. Change a small visible field.
6. Save Draft.
7. Reload public `/en/banking-journeys/payments-and-transfers`.
8. Confirm public content is still v3.
9. Submit Draft for review.
10. Confirm author cannot review or publish it.
11. Sign in with an independent reviewer.
12. Review/approve and publish.
13. Reload the public route.
14. Confirm the new revision content is visible.
15. Confirm revision history is preserved.
16. Confirm rollback to v3 is available.
17. Check AuditLog entries and `previewJson`.

Do not perform this test in Preview or Production.

### Membership Regression

1. Create a Development access request with no selected plan.
2. Move it through contact/payment-pending.
3. Record a payment linked to the request and an active plan.
4. Verify payment.
5. Confirm request plan is synchronized and status becomes `PAYMENT_CONFIRMED`.
6. Confirm Admin UI shows `Ready to convert`.
7. Test a conflicting-plan case and confirm verification fails atomically.
8. Test unverified/refunded/inactive-plan cases and confirm conversion is unavailable.
9. Convert only a disposable Development test account.
10. Confirm exactly one User, Membership, token hash, and expected audits exist.

## 9. Known Gaps and Limitations

### Must Fix Before Considering This Branch Complete

- Full manual Journey CMS end-to-end smoke test should be repeated during the controlled release verification.
- The large uncommitted working tree needs a careful review and logical commit plan.
- No Preview validation has been performed for this work yet.
- No Production release has been performed.

### Journey CMS Product Gaps

- Controlled creation of a brand-new Banking Journey is not implemented.
- Existing Journeys must continue to be edited through Admin → Contributor → Journey Content.
- Legacy Create New Content must continue rejecting `BANKING_JOURNEY`.
- Business Editor coverage should be reviewed against all content variants in the ten Journeys.
- Generic renderer support should remain backward compatible with unknown legacy fields.
- Translation-specific Journey editing may require a separately designed workflow; do not infer or auto-publish translations.

### Membership/Product Gaps

- Payments are manually administered; there is no payment gateway or webhook.
- Amount/currency comparison against plan commercial terms is not enforced by the new plan resolver.
- Refund does not automatically revoke an active membership.
- Email delivery is not configured; activation-link handling remains administrative.
- Distributed rate limiting is not implemented.
- Tax, invoice, reconciliation, chargeback, and refund-policy behavior remains out of scope.

### Technical/Operational Gaps

- The CMS page file is highly compact and difficult to review, but formatting/refactoring is not required for the current defect.
- No new database constraints were added for one-conversion-per-request; concurrency is handled transactionally and through existing unique identities.
- No deployment has been performed for the current uncommitted implementation.
- `next-env.d.ts` changed during local Next.js tooling and should be reviewed before commit.
- `tsconfig.tsbuildinfo`, `.next`, and generated output are local artifacts and should not be committed unless already tracked by policy.

## 10. Working Tree Ownership

At handoff, relevant modified/untracked paths include:

```text
src/app/admin/memberships/requests/page.tsx
src/app/admin/page.tsx
src/app/contributor/content/new/page.tsx
src/app/membership-actions.ts
src/components/content/DatabaseContent.tsx
src/lib/membership-workflow.ts
src/lib/platform.test.ts
src/lib/validation.ts
src/server/access-control/knowledge-access-repository.ts
vitest.config.ts
src/app/admin/contributor/
src/app/contributor/content/new/page.test.ts
src/components/content/DatabaseContent.test.ts
src/server/access-control/knowledge-access-repository.test.ts
src/server/cms/
src/server/membership/
```

These changes span multiple approved tasks. Review diffs by subsystem; do not flatten or delete them as “unrelated local changes.”

Suggested logical review/commit groups, only if the owner explicitly requests commits:

1. Journey CMS environment, policy, repository, service, routes, and tests.
2. Generic public Journey renderer and regression tests.
3. Legacy Journey creation restriction.
4. Knowledge-access publication filtering.
5. Membership plan resolver, workflow, action hardening, UI, and tests.
6. Documentation handoff.

Do not create commits or branches without explicit instruction.

## 11. Authorization and Workflow Invariants

### Journey CMS

- Development-only environment guard runs server-side.
- Authorization occurs before content loading.
- Contributor edits only authorized drafts.
- Reviewer/Admin review requires existing permissions.
- Author and reviewer/publisher must be different users.
- Draft creation clones current published content.
- Stable slug cannot be changed by form data or JSON.
- Privileged metadata is rejected.
- Publication pointer update is conditional and transactional.
- Rollback repoints publication; it does not erase revision history.

### Membership

- Only ADMIN verifies payment or converts an access request.
- Payment must belong to the request.
- Eligible payment means:

  ```text
  status = PAID
  verifiedAt != null
  verifiedById != null
  planId != null
  plan.isActive = true
  ```

- More than one distinct eligible plan is ambiguous and rejected.
- A request plan cannot be overwritten by a conflicting payment plan.
- Conversion requires `PAYMENT_CONFIRMED`, null `convertedUserId`, and an authoritative plan.
- Conversion is transactional and repeat-safe.
- Raw activation token is returned only after successful commit.
- Only token hashes are stored.

## 12. Useful Commands

Read-only/safe checks:

```bash
git status --short
git diff --stat
npm run db:check-env
npm run db:migrate:status
npx prisma validate
npx prisma generate
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Development server:

```bash
npm run dev
```

Database-changing commands require explicit Development verification:

```bash
npm run db:migrate:dev
npm run db:seed:dev
```

Do not run a database-changing command merely because it appears in this document. First determine whether the task actually requires it.

## 13. Definition of Done for the Current Branch

The current branch is ready for owner review when all items below are true:

- [x] Fix `JourneyBusinessEditor.tsx:115` without changing workflow semantics.
- [x] `npm test` passes.
- [x] `npm run lint` passes.
- [x] `npx tsc --noEmit` passes.
- [x] `npm run build` passes.
- [ ] Development Journey CMS manual flow passes with two independent accounts.
- [ ] Public Journey changes only after publication.
- [ ] Rollback remains available and audited.
- [ ] Membership verification conflict scenarios fail atomically.
- [ ] No secrets or raw activation tokens appear in logs or diffs.
- [ ] Working tree diff is reviewed by subsystem.
- [ ] Preview and Production remain untouched.
- [ ] Owner decides whether to commit, open a PR, or continue Development testing.

## 14. Explicitly Out of Scope

Unless separately approved:

- Production deployment;
- Preview deployment or validation;
- Production or Preview database access;
- Production migrations or publishing;
- payment-gateway integration;
- automated email delivery;
- new Banking Journey creation architecture;
- broad UI redesign;
- schema redesign;
- deletion of historical revisions, audit logs, payment records, users, memberships, or activation tokens.

## 15. Handoff Summary

The project has moved from static/legacy Journey editing toward a controlled, Development-only Journey CMS that reuses existing content identities and preserves the public reader contract. The canonical ten Journeys are present, `payments-and-transfers` v3 is published, and the accidental duplicate is archived. Membership conversion now resolves plans safely and the reported paid user has been converted and activated.

The native form action return-type issue is fixed. The current stopping point is
Production readiness verification; no commit, merge, push, or deployment has
occurred yet, and Preview and Production remain unchanged.

For every continuation, start with:

```text
Use $banking-ba-project and read docs/AI_PROJECT_HANDOFF.md before changing code or data.
```
