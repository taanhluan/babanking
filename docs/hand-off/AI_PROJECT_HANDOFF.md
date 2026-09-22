# Banking BA Knowledge Hub — AI Project Handoff

## Payments business flow reader compatibility (2026-09-11)

- Incoming published flows use CODE blocks with payload.code/language=mermaid;
  the previous CODE renderer read only text/content and displayed empty cards.
- Added a lazy Mermaid client renderer with strict security and visible source
  fallback. Existing structured BusinessProcessDiagram rendering is preserved.
- Payment mapping now retains published supporting sections, including Activity
  Flow, Sequence Diagram and State Machine, rather than filtering them out.
- No published JSON, revision, or Production data was changed. Browser visual
  verification remains outstanding; regression coverage includes CODE source
  preservation and supporting-section navigation.

## Payments published JSON verification (2026-09-11)

- Read-only Development verification confirmed v12 published at 10:22:56 local
  time, with all 25 modules matching the user-supplied JSON by normalized hash.
  Preview title/summary also match the new JSON. No data repair was needed.
- Payment portal recognized only 15 of the 17 supplied payment capabilities.
  Added Scheduled Payment and Standing Order to the existing alias list, with
  a regression test. Other portal behavior remains unchanged.

## Journey ADMIN submission enhancement (2026-09-11)

- User explicitly authorized ADMIN submission of any Journey draft without
  transferring authorship. Journey policy now opts into the existing shared
  submission guard's admin allowance; DRAFT/CHANGES_REQUESTED transition checks
  still apply. Other governed content retains author-only submission by default.
- Editor Submit visibility and permission copy match this rule. Review/publish
  independence, content validation, transactional writes and audits are unchanged.
- No database mutation, ownership transfer, deployment, or architecture change.

## Journey large draft request fix (2026-09-11)

- Subsequent `?error=permission` investigation found the editor offered Submit
  to non-author ADMINs although the lifecycle requires the actual draft author.
  Submit visibility now matches author ownership, with an explanatory message
  for admins editing another user's draft. Payments v12 retains its cloned
  author; no ownership transfer or workflow transition was performed.
- Follow-up read-only verification confirmed Payments & Transfers v12 remains
  DRAFT with successful `JOURNEY_DRAFT_UPDATED` audits through 10:05:05 local
  time. The editor rendered an old error query parameter even after successful
  saves. Successful Journey mutations now redirect to the clean editor URL
  after revalidation, clearing stale error banners.
- Development logs confirmed `Body exceeded 1 MB limit` from the Journey
  editor Save Draft request; the user identified Payments & Transfers.
- `next.config.mjs` now sets `experimental.serverActions.bodySizeLimit` to
  `10mb`, allowing larger JSON requests to reach existing authorization and
  content validation. This is an application-wide Server Actions limit.
- Next configuration loader confirmed 10mb; all six editor save tests passed.
  Actual user JSON has not been resubmitted or verified persisted.
- No database mutation or Preview/Production deployment was performed.

## Development admin access restored (2026-09-11)

- Follow-up: changed both admin passwords at the user's explicit request to
  satisfy the login form/server minimum of 12 characters. Conditional updates
  and `DEVELOPMENT_ADMIN_PASSWORD_CHANGED` audits committed in one Serializable
  transaction. Both passed loginSchema validation and bcrypt read-back checks.
- Explicitly authorized creation of `insceta@gmail.com` and `taanhluan@gmail.com`
  as active ADMIN accounts in Development after confirming both were absent.
- Creation and one `DEVELOPMENT_ADMIN_CREATED` AuditLog per account committed
  in one Serializable transaction, with an absence precondition.
- Read-back confirmed ADMIN, ACTIVE, isActive=true, matching bcrypt password
  verification, and one audit per account. No credentials are recorded here.
- Existing anonymized users were preserved. Production and Preview were untouched.

> Last verified: 2026-07-26, Asia/Ho_Chi_Minh
> Current working environment: Development only
> Purpose: Give the next engineer or AI agent enough verified context to continue safely without reconstructing the project history from chat.

## BA Documentation Approved Foundation (2026-08-23)

- `BA_DOCUMENT` is first-class Knowledge Content backed by existing
  `ContentItem` and independently governed `ContentRevision` records.
- Each BA Document has exactly one authoritative Primary Journey through
  `ContentItem.primaryJourneyContentItemId`; the Journey remains the security
  boundary and the existing Role/Knowledge Access matrices are reused.
- Journeys own canonical Banking knowledge. BA Documents own project analysis,
  requirements, acceptance criteria, data/process specifications, and UAT
  specifications. Documents reference rather than duplicate Journey truth.
- V1 is validated, schema-versioned JSON with stable artifact IDs and
  same-document reference validation. Normalized traceability is deferred.
- Development and Production are the governed product environments. Vercel
  Preview remains an isolated deployment/provider validation context, not a
  third product content environment; existing runtime safety labels remain.
- Closed Journey identities, revisions, published pointers, JSON, URLs, access,
  translations, and CMS behavior must remain unchanged.

### Phase 2 server foundation

- Shared governed-content policy primitives now centralize Role Matrix checks,
  editorial independence, workflow transitions, SHA-256 content integrity, and
  persistence read-back checks. Existing Journey CMS exports remain stable.
- BA Document authorization resolves only the document ID and database
  `primaryJourneyContentItemId`, authorizes that Primary Journey through the
  existing Knowledge Access Matrix, and only then permits protected repository
  reads. JSON Journey references and related slugs never grant access.
- The BA Document service foundation supports governed creation, draft cloning,
  conditional save, submit, review, publish, rollback, and archive operations
  using `ContentItem`, `ContentRevision`, and `AuditLog`. There is no BA UI or
  route wiring yet, and no permanent BA Document records were created.

### Phase 3 library, reader, and initial CMS

- Members have a server-filtered `/ba-documents` library and protected
  `/ba-documents/[slug]` reader. Listings are restricted in SQL to published,
  non-archived documents whose database Primary Journey is accessible.
- The BA Document reader reuses responsive Journey navigation and block
  rendering, and adds artifact catalogues, canonical Journey reference cards,
  and a clearly scoped same-document RTM.
- Admin → Contributor now includes BA Document creation, authorized Primary
  Journey selection, five templates, metadata/structured JSON authoring, draft
  preview, persistence-verified save, submit, history, review, and publish.
- The unified review queue recognizes BA Documents and dispatches their review
  and publication through the governed BA Document service. No schema change,
  pilot content, Production data, global search, export, or Phase 4 capability
  was added.

### Phase 3 remediation — Advanced JSON and review feedback

- `CHANGES_REQUESTED` and rejected BA Document revisions now show persisted,
  read-only review feedback with reviewer and review date near the editor.
- Advanced JSON has a separate, no-write validation control and grouped,
  UI-safe issues for JSON syntax, schema, artifact IDs, references, and required
  business fields. Common non-canonical block shapes are explained but never
  transformed or saved automatically.
- Invalid Save requests return structured validation before authorization,
  service invocation, database mutation, or audit creation. The canonical
  `BaDocumentContentV1` contract and persistence hash/read-back gates remain
  unchanged.

### Phase 4 reader remediation — semantic artifacts and traceability

- The protected member BA Document reader uses semantic presentations for
  requirements, rules, validations, processes, data, acceptance criteria, UAT,
  and decisions instead of a generic schema-property table.
- Known nested structures such as requirement sources, process steps, actors,
  preconditions, outcomes, and UAT steps are rendered as business-readable
  fields, lists, cards, or contained tables; the member artifact reader no
  longer serializes these structures as JSON.
- Imported conversion diagnostics remain persisted for governance but are
  presented to members only as `Needs BA confirmation`. No missing business
  rationale, source, purpose, or decision was fabricated.
- A pure in-memory same-document reference index resolves stable IDs to titles,
  supplies anchored navigation, and safely derives reverse Requirement links
  from explicit AC, UAT, Rule, Validation, and Process references. It does not
  query or infer cross-document relationships.
- No Prisma migration or Production change was required. Primary Journey
  authorization remains before protected BA Document content queries.

### Phase 4 revision UX remediation

- Contributor BA Document cards now represent one logical `ContentItem` and
  distinguish the latest published version from an optional working revision.
- `Create New Revision` is available only inside an existing published BA
  Document. It authorizes EDIT through the immutable Primary Journey, clones
  the current published canonical JSON into the next `ContentRevision`, and
  never creates another `ContentItem`.
- If a DRAFT, CHANGES_REQUESTED, or IN_REVIEW revision already exists, revision
  creation returns that revision without inserting another working version.
- Contributor actions and history are state-specific. Member library and global
  search continue to query one ContentItem and only its current
  `publishedRevision`; drafts cannot become additional member cards.
- Development consolidation confirmed `customer-ob-02` (`BRD-02`) as the
  authoritative logical document. It retains published v1 and its existing v2
  DRAFT on the same ContentItem with unchanged Primary Journey, stable IDs,
  content, and revision hash.
- Field-level comparison found that legacy `customer-onboarding-brd` (`BRD-01`)
  had no unique requirement, rule, validation, process, data, acceptance, UAT,
  decision, module, block, reference, or other business content. Differences
  were limited to document-identifying metadata and search tags; BRD-02 has the
  intended newer, more detailed metadata.
- The legacy ContentItem was conditionally archived in Development with an
  AuditLog. Its published v1 and history were preserved; no ContentItem or
  revision was deleted or created. Member library/search now have one active
  published Customer Onboarding BA Document.

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

## 16. Proposed Change Request — Customer-Segmented Banking Journeys (2026-09-19)

The Product Owner requested that Banking Journeys open into three Customer Segments:
Retail Banking, SME, and Enterprise Banking. All currently published Journeys are initially grouped under Retail Banking; SME and Enterprise remain explicit empty categories until approved content exists.

The design and request history are recorded in [`CHANGE_REQUEST_CUSTOMER_SEGMENTED_BANKING_JOURNEYS.md`](./CHANGE_REQUEST_CUSTOMER_SEGMENTED_BANKING_JOURNEYS.md). Phase 1 was authorized and implemented locally on 2026-09-19; Product Owner visual review is next.

Phase 1 must be a navigation/catalog enhancement only:

- `/[locale]/banking-journeys` becomes the segment selector.
- `/[locale]/banking-journeys/segments/[segmentSlug]` becomes a segment Welcome Page with localized General description, curated image/alt text, and authorized Journey previews.
- Existing `/[locale]/banking-journeys/[journeySlug]` detail URLs remain unchanged.
- Use a typed server-side segment catalog; do not add a new content type, schema, revision model, reader, renderer, or permission system.
- Phase 1 ships authored static SVG illustrations (no scripts or external references). Admin media upload remains a separate future capability; the proposed raster upload restrictions are unchanged.
- Segment classification is not authorization. Existing server-side Knowledge Access evaluation remains authoritative before grouping or displaying previews.
- No ContentItem, ContentRevision, published pointer, scope, grant, membership, or Production data changes are authorized for Phase 1.

Before implementation, preserve the current Development/Production drift finding: schema/access counts match, but Customer Onboarding and Payments & Transfers Published content do not. Do not reconcile that drift as part of this navigation request.

Implementation hand-off: catalog in `src/server/journey-segments.ts`, reusable server-rendered presentation in `src/components/journeys/SegmentWelcome.tsx`, static illustrations in `public/images/segments/`. Both locales and all three segment routes exist. Existing authorized previews are filtered by the explicit catalog; future Journeys require explicit catalog assignment. Legacy duplicate visibility is left to existing repository filters.

Checks: 294 tests across 42 files, typecheck and local build passed; migration runner explicitly skipped. Lint warning in new test mock was corrected. Signed-in browser verified selector (10/0/0), Retail welcome and Vietnamese SME mobile welcome. No database mutation or Production access in this implementation turn. Local development server started on port 3000 for review. Full release and restricted-member manual regression remain separate follow-up work.

## 17. Customer Segment CMS — Development implementation (2026-09-19)

The approved CMS follow-up is implemented on Development only. `CUSTOMER_SEGMENT` was added to the Prisma ContentType enum and migration `20260919090000_add_customer_segment` was applied after `db:check-env` confirmed both application and database environment were `development`. No segment records were auto-created, and no Preview/Production access occurred.

Use `/admin/customer-segments` as Admin to create the three initial governed drafts. Content includes EN/VI welcome metadata and Journey slug assignments; schema validation, published-Journey validation, duplicate assignment prevention, immutable slug, audit logs, drafts, review queue handling, publish, and clone-from-published draft are in place. Each public segment consumes its own published CMS record independently; an unpublished segment retains its audited static fallback.

The segment remains catalog metadata only: it is never a Knowledge Scope, grant, entitlement, or direct content-access path. Existing authorized Journey retrieval remains authoritative. Static reviewed SVG assets remain in use. CMS media upload and a field-based authoring UX are explicitly deferred.

Verification in this change: lint, typecheck, all 42 test files / 294 tests, `VERCEL=0 npm run build`, and `npm run db:migrate:status` passed. Next owner action: create, submit, review and publish each segment as needed, then manually verify an authorized and a restricted user. Release remains a separate explicit authorization.

## 18. Segment landing and Journey navigation — Development status (2026-09-19)

- Status: implementation complete locally on Development; release is not authorized.
- General content stays at `/[locale]/banking-journeys/segments/[segmentSlug]`; authorized Journey cards are at the child `/journeys` route.
- Landing content supports backward-compatible CMS schema v1 plus optional v2 `TEXT`, `FEATURE_GRID`, and approved internal `IMAGE` sections. No database migration was needed.
- Shared localized `Overview / Journeys` tabs, hero CTA, closing CTA, active-page state, breadcrumbs, and Journey card transitions connect both pages clearly.
- Direct browser verification on the signed-in Retail page confirmed the `Explore journeys` link navigates to `/en/banking-journeys/segments/retail-banking/journeys`, shows ten authorized Journey cards, and links back to the General Retail overview.
- Remaining owner checks: inspect desktop/mobile visuals for EN/VI and exercise restricted-member behavior. Preview/Production remain untouched.
- Retail landing media update: `assetKey: "retail-banking"` inside a CMS `IMAGE` section resolves to the owner-provided `retail-banking-orchestration.png` diagram at the end of General content. It does not replace the hero SVG. The image remains code-reviewed local media; no upload capability or external URL was introduced.

## 19. Customer Segment Production release preparation (2026-09-19)

Release `customer-segments-2026-09-19-v1` is prepared but not deployed. The immutable artifact under `release/customer-segments/` contains only Retail Banking Development published v2 because SME and Enterprise have no CMS-published Development revisions. Artifact and direct Development DB read-back canonical hashes match: `2e7811e638e5857c5f1bbc1485b4aaa9761fc44fd20368084d5137356bce9b7f`.

`scripts/promote-customer-segments.ts` provides read-only verification plus guarded, idempotent Production apply and audited pointer rollback. It permits no manual content reconstruction and requires two distinct Production actor identities. See `CUSTOMER_SEGMENT_PRODUCTION_RELEASE_RUNBOOK.md` for exact order and gates.

Validation after packaging: lint passed, TypeScript passed, 43 test files / 298 tests passed, build passed, and Development release verification returned `matches: true`. A local Production preflight did not access Production: unavailable Vercel secrets caused Development `.env.local` to conflict with Production identity, and the safety gate stopped execution. Production/Preview remain unchanged.

## 20. Customer Segment Production release and scroll follow-up (2026-09-20)

- Release v1 is live at `https://babanking.vercel.app` through deployment `dpl_46X5Fa7PwHCJd1s8tsKoznywbHxn`. Production Retail revision `cmu8dyar10003gm7dnshiuol5` matched canonical hash `2e7811e638e5857c5f1bbc1485b4aaa9761fc44fd20368084d5137356bce9b7f`.
- A reported continuous light scroll latency was not caused by CMS/database work, React scroll listeners, or authorization. A large final image remains a possible one-time decode cost only.
- Development A/B checks tried native document scrolling, alternate navbar compositing, reduced image paint work, and an optimized local Production build; none removed the latency.
- A no-JavaScript static HTML baseline reproduced the same latency, ruling out Customer Segment, React, Next.js, CMS, database, and access control. Experimental CSS changes were reverted, so no scroll patch remains to deploy.
- System evidence points outside the application: the built-in panel is 60 Hz, Chrome GPU acceleration is active, Low Power Mode is off, memory is not swapping, and WindowServer showed sustained high compositor CPU while the Chrome page renderer stayed low.
- Safari rendered the same local page smoothly while Chrome retained the latency, completing isolation to Chrome/profile/extensions or its GPU compositor. Do not change or deploy application code for this symptom.

## 21. SME and Enterprise orchestration media (2026-09-21)

- Owner approved a Production media enhancement adding one local 1672×941 PNG to SME and one to Enterprise.
- `SegmentWelcome` now maps the existing safe CMS keys `sme` and `enterprise-banking` to the new local files; Retail mapping and all hero SVGs remain unchanged.
- No CMS record is created, edited, submitted, reviewed, or published by this release. Published content must include the corresponding `IMAGE` section for the diagram to render.
- Focused component tests, TypeScript, lint, clean build, Production deployment, and HTTP asset smoke tests are the release gates. Deployment outcome is recorded in the Production runbook.
- Outcome: deployment `dpl_EN2EXLF1KQFVT6obLVP83KFjWCX7` is live on the Production alias. Remote build passed, no migration was pending, and both public asset checksums match local approved files.
- The prior one-time Retail promotion variables had remained configured and correctly caused the first media deployment attempt to fail closed; all three were removed before the successful retry and verified absent afterward.

## 22. Journey-to-Segment management — Phase 1 complete on Development (2026-09-21)

- Journey CMS has segment filters/badges for Retail, SME, Enterprise, and Unassigned. Development currently resolves 10 Retail, 0 SME, 0 Enterprise, and 1 unassigned published Journey.
- Customer Segment CMS has a published-Journey assignment picker while retaining the validated JSON landing-content editor. Published Segment revisions remain authoritative; assignment never grants knowledge access.
- Admin can create a new Banking Journey as an unpublished scoped Draft with optional planning-only segment metadata. It becomes public only through the existing specialist Journey review/publish flow, then can be assigned through a separately reviewed Segment revision.
- No migration or Development data mutation was required for the implementation. Existing Retail/public routes/access behavior are preserved, and no SME/Enterprise Journey content was authored.
- Verification passed: 44 test files / 303 tests, ESLint, TypeScript, diff check, local build, and signed-in Development UI checks.
- Production and Preview were not deployed or mutated. Phase 2 content authoring for SME/Enterprise requires separate approval.

## 23. SME and Enterprise Journey portfolios — Phase 2 Development status (2026-09-21)

- Product Owner authorized Phase 2. Development now contains 20 new private Journey identities: 10 planned for SME and 10 for Enterprise Banking.
- All are version 1 `DRAFT`, unpublished and unassigned. Each has one required Primary Knowledge Scope reused from the existing access model and one `SEGMENT_JOURNEY_PHASE2_DRAFT_CREATED` audit record authored by the active Admin selected for this release.
- Drafts cover the same ten capability families as the Retail portfolio but use SME/corporate-specific titles, summaries and lifecycle stages. Initial canonical content contains Overview, Lifecycle, and BA checklist modules plus an explicit pre-publication review warning.
- Journey CMS includes planned, unassigned Drafts in SME/Enterprise filters without presenting them as published assignments. Customer Segment public rendering remains driven only by independently published Segment revisions and authorized published Journeys.
- Guarded release ID: `segment-journey-phase-2-development-v1`; apply script: `npm run db:seed:segment-journey-drafts -- --apply`. A no-flag invocation is read-only verification and currently reports `existing: 20`, `pending: 0`.
- The first transaction timed out before commit and rolled back completely; bounded-timeout retry committed all 20 atomically and read-back validated exact content, status, scope, planning metadata and audit evidence.
- No migration, Retail reassignment, publication, public visibility, Preview access, or Production change occurred. Phase 3 is content review/enrichment and governed publication/assignment, only after separate approval.
- Final gates passed: 45 test files / 305 tests, ESLint, TypeScript, diff check, Development read-back, and local production-style build.

## 24. Detailed Segment Journey content — Phase 3 Development status (2026-09-21)

- Product Owner authorized Phase 3. The 20 SME/Enterprise Journey identities were enriched in place; all remain private version 1 Drafts with their original stable slugs and Knowledge Scopes.
- Each artifact has 13 modules and 65 canonical sections/blocks, including domain-specific lifecycle analysis, business rules, exceptions, systems/data, risks/controls, KPIs, sales discovery and BA deliverables. The structured reader recognizes all artifacts and their five supported block types.
- Apply release: `segment-journey-phase-3-development-v1`; script: `npm run db:enrich:segment-journey-drafts -- --apply`. Read-only verification currently returns `detailed: 20`, `pending: 0` and rejects manual drift, publication, review, scope changes or missing audit evidence.
- Each update has an audited before/after SHA-256. No new ContentItem, revision, scope, grant or assignment was created in Phase 3.
- Content is bank-neutral and intentionally contains no fabricated product limits, pricing, approval authority or local regulatory conclusions. Independent Product, Operations, Risk/Compliance, Architecture and Security validation is still required.
- No submit/review/publish action, Customer Segment assignment, Retail change, Preview access or Production mutation occurred.
- Final gates passed: 46 test files / 306 tests, ESLint, TypeScript, diff check, structured-reader mapping, exact Development read-back, and local production-style build.

## 25. Segment Journey Review submission — Development (2026-09-21)

- All 20 SME/Enterprise Phase 3 revisions are now `IN_REVIEW`; Development read-back reports `inReview: 20`, `pending: 0`.
- Guarded batch release: `segment-journey-phase-3-submit-development-v1`; command: `npm run db:submit:segment-journey-drafts -- --apply`. It validates exact governed content and authorship before writing standard `JOURNEY_SUBMITTED_FOR_REVIEW` audit records.
- No review, publication or Customer Segment assignment occurred. The reviewer/publisher must be a distinct authorized actor from the author, preserving editorial independence.
- Production, Preview, Retail assignments and public visibility remain unchanged.
