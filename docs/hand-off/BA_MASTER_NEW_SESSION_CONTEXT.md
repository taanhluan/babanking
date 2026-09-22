# BA MASTER — Context, Experience & Skills for a New Codex / ChatGPT Session

> **Purpose:** the compact, operational starting point for a fresh AI session.
> **Repository:** `BA Master` — Banking BA Knowledge Hub
> **Product model:** a governed, bilingual banking-BA knowledge platform; **not an LMS**.
> **Canonical detailed handoff:** [`AI_PROJECT_HANDOFF.md`](./AI_PROJECT_HANDOFF.md)
> **Rule of precedence:** live verified state > this document > older notes/chat history.

## 1. Start every session this way

Token principle: keep routine replies below 2% request usage when practical and normal task spend within 5% per prompt. Reuse this hand-off, minimize repeated audits/tool output, and remain concise. Correctness, security, authorization, environment safety, and necessary validation take precedence.

1. Read this file, [`README.md`](../README.md), and [`AI_PROJECT_HANDOFF.md`](./AI_PROJECT_HANDOFF.md).
2. Read the core operational skill: [`.agents/skills/banking-ba-project/SKILL.md`](../.agents/skills/banking-ba-project/SKILL.md).
3. Inspect `git status --short`. The working tree is intentionally dirty; all existing edits/untracked files are user-owned until proven otherwise. Never reset, clean, checkout-over, or discard them.
4. Before **any** database command (including reads), run `npm run db:check-env` and confirm both application and database are `development`.
5. Audit the live code/data relevant to the requested scope before proposing a change. Do not ask the Product Owner to repeat information recorded in these files unless it conflicts with live state.

Suggested first prompt:

```text
Use $banking-ba-project. Read docs/BA_MASTER_NEW_SESSION_CONTEXT.md,
docs/AI_PROJECT_HANDOFF.md, README.md, and inspect git status before taking action.
Work in Development only unless I explicitly authorize a controlled release.
```

## 2. Product and technology

- Next.js App Router, React, TypeScript, Tailwind CSS.
- Prisma + Neon PostgreSQL.
- Signed HTTP-only sessions (`jose`), password hashing (`bcryptjs`), Zod, Vitest.
- English (`en`) and Vietnamese (`vi`) locale-prefixed routes. Locale affects presentation/routing only, never authorization.
- Main domains: Identity → Membership → Knowledge Content → Knowledge Access → CMS.

The Journey is the knowledge-security boundary:

```text
Identity → active entitlement → Knowledge Package / grants → Journey → published revision
```

All protected reads and all mutations must authorize server-side. UI visibility, an unguessable URL, related Journey references, or JSON references never grant access.

## 3. Environments and security rules

There are exactly two governed **product** environments: **Development** and **Production**. Vercel Preview is an isolated deployment-validation context, not a third product-content environment.

- Default and current authorized scope: Development only.
- Never access, migrate, seed, publish, deploy, or modify Preview/Production without a new, explicit controlled-release instruction.
- Required local Development identity: `APP_ENV=development`, `DATABASE_ENVIRONMENT=development`, and production operations disabled.
- Never reveal or commit URLs containing credentials, auth secrets, password hashes, raw activation tokens, payment credentials, or masked-secret guesses.
- Do not run `prisma db push`, `prisma migrate reset`, destructive SQL, or ad-hoc production operations.
- Do not run migrations/seeds merely because they appear in a document; first establish they are necessary and permitted.

Safe/normal commands:

```bash
git status --short
git diff --stat
npm run db:check-env
npm run db:migrate:status
npx prisma validate
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Development-only commands, only after the environment gate and only when requested/needed:

```bash
npm run db:migrate:dev
npm run db:seed:dev
npm run db:studio
```

## 4. Non-negotiable workflow invariants

### Journey CMS

- Reuse the existing `ContentItem` identity; stable Journey slugs are server-controlled and immutable.
- Public content must be read through `ContentItem.publishedRevisionId → ContentRevision.contentJson`.
- Draft editing must never mutate a published revision.
- Lifecycle is Draft → Review → Published → Archived; no hard deletion of revision history.
- Author cannot review or publish their own revision, including an `ADMIN` author.
- Create a draft from the current published revision; first detect/reuse a legitimate active revision. Stop on unexpected active-revision conflict or a changed baseline.
- Publish/rollback must be conditional, transactional, audited, revision-preserving, and refresh public cache. Never directly change a revision status or `publishedRevisionId`.
- CMS access must continue through the real authorization path (`requireJourneyCmsAccess()`); do not fabricate actors, bypass auth, or direct-write revision tables.

### Membership and activation

- Only `ADMIN` may verify payment or convert an access request.
- Conversion requires `PAYMENT_CONFIRMED`, an authoritative active plan, and an eligible payment (`PAID`, verified, linked, and plan-resolved).
- Plan conflicts fail closed; conversion is serializable, transactional, audited, and repeat-safe.
- Store only a SHA-256 hash of an activation token. A raw token is one-time, expiring, and may be returned only after a successful committed action.
- Membership/role/UI checks never replace server-side authorization.

### Content, renderer, and localization

- Keep the public Journey route stable: `/[locale]/banking-journeys/[slug]`.
- Preserve backward compatibility for legacy JSON and generic canonical JSON: `modules → sections → blocks`.
- Shared infrastructure must remain domain-neutral. Never branch generic code on a Journey slug or payment/product type.
- Raw HTML is not used for generic content blocks.
- English and Vietnamese translations have independent editorial states. Never silently show English premium bodies in Vietnamese when a Vietnamese publication is absent; show the explicit availability experience instead.

## 5. Canonical architecture

```text
ContentRevision.contentJson
  → content repository
  → canonical Journey mapper
  → CanonicalJourney (stages / states / blocks)
  → shared Journey reader + navigator
  → generic block renderer
  → BusinessProcessDiagram for DIAGRAM/BPMN blocks
```

Domain-specific banking logic belongs in the content artifact or an explicit domain adapter, not in the generic mapper/renderer. Preserve unknown approved structured fields and BPMN metadata where the contract requires it.

For BA Documentation, `BA_DOCUMENT` is first-class governed content. Each document has exactly one database-backed Primary Journey (`primaryJourneyContentItemId`); that Journey remains the authorization boundary. Documents reference canonical Journey truth rather than duplicating it. V1 uses versioned, validated JSON and stable artifact IDs; requirements normalization/traceability tables are deferred.

## 6. Proven delivery experience / lessons learned

1. **Workflow success is not content proof.** A CMS status transition, a successful publish API response, or a Vercel deploy is insufficient. Verify the actual persisted revision and the final public pointer.
2. **Use a four-way hash gate for major Journey content promotion:** canonical source hash = save payload hash = persisted draft hash = published revision hash. Stop immediately on any mismatch.
3. **Read back from the database after every important save and publish.** Check revision ID, status, canonical structure/counts, hash, `publishedRevisionId`, and audit record.
4. **Separate source-code fixes from content promotion.** A generic mapper/renderer capability release has its own test/review/deployment scope; a content-only promotion must not accidentally deploy unrelated source changes.
5. **The stale advanced-JSON save incident** established that client submission must use the current editor state, and the persisted read-back gate is mandatory.
6. **The legacy editor crash incident** established that canonical content detection and generic handling must be safe for older content shapes; do not force canonical content through legacy-only assumptions.
7. **A mapper once stripped BPMN metadata.** The fix was generic metadata preservation, not a Journey-specific special case. Validate graph structure (lanes, nodes, edges, business rules, validation categories, scope, and outcome) after mapping.
8. **Database/environment identity can be shadowed by local `.env.local`.** For a Production investigation/release, prove target identity from clean Vercel scope, project binding, deployment SHA/status, and canonical alias—not from local values.
9. **Never relax authentication to make a release easier.** If no legitimate CMS actor/session exists, stop at the authentication boundary and let a human operator perform the UI action; continue with read-only verification afterward.
10. **Business quality matters as much as JSON validity.** A Journey needs domain-specific actors, rules, validations, state model, systems, risks/controls, cross-Journey boundaries, and BPMN where it materially clarifies the flow.

## 7. Reusable Journey delivery playbook

1. Audit only the requested Journey: identity, published pointer/history, active revisions, authorization, canonical/legacy shape, public rendering, and related-Journey boundaries.
2. Classify: content-only enhancement vs. proven generic platform capability gap. Do not redesign shared architecture for a domain variation.
3. Get Product Owner decisions for scope, business states, rules, validations, BPMN level, EN/VI behavior, and release target.
4. Build/validate a canonical source artifact. Preserve stable IDs and validate BPMN graph integrity.
5. Use an authorized Development CMS session to create/reuse a Draft from the verified published baseline.
6. Save and immediately perform persisted DB read-back and hash equality checks.
7. Submit, independently review, and publish. Enforce editorial independence.
8. Verify the final pointer, public runtime behavior, audit log, responsive/mobile rendering, access behavior, and translations.
9. For Production, run a separate preflight with correct Vercel project/target/SHA and exact hash evidence. Do not treat a git push as deployment proof.

Stop codes worth using: `ENVIRONMENT_MISMATCH`, `AUTH_BOUNDARY`, `ACTIVE_REVISION_CONFLICT`, `BASELINE_CHANGED`, `SOURCE_HASH_MISMATCH`, `PERSISTED_HASH_MISMATCH`, `PUBLISHED_HASH_MISMATCH`, `VERCEL_PROJECT_MISMATCH`.

## 8. Current known project state

- BA Documents have a server foundation, protected library/reader, contributor CMS and review integration; their UI/JSON remediation and traceability behavior are documented in `AI_PROJECT_HANDOFF.md`.
- The historical Journey CMS + membership branch handoff reports ten canonical active Journey slugs: cards, customer-onboarding, customer-service, deposits, lending, notification-and-engagement, payments-and-transfers, personal-finance-management, security-and-access, wealth-and-investment. The accidental `paymentsandtransfers` identity is archived—retain it; do not reuse/delete it casually.
- Journey delivery handoffs consider Customer Onboarding, Deposits, Cards, Lending, Customer Service, and Notification & Engagement completed. Do not reopen a closed Journey unless the new request explicitly targets it.
- The older handoff’s immediate technical stopping point was Development/Production-readiness verification for a Journey CMS and membership conversion hardening branch. Its reported automated checks passed at that time, but always re-run proportionate checks against the live worktree before relying on this result.
- No commit, merge, deployment, or database mutation is authorized merely by this document.

## 9. Skill and reference map

Read the minimum relevant material below after the core project skill.

| Need | Read |
|---|---|
| Canonical setup, routes, security, commands | [`README.md`](../README.md) |
| Current BA Document/CMS/membership state and blockers | [`AI_PROJECT_HANDOFF.md`](./AI_PROJECT_HANDOFF.md) |
| General project operating rules | [`.agents/skills/banking-ba-project/SKILL.md`](../.agents/skills/banking-ba-project/SKILL.md) |
| Journey architecture and reusable implementation method | [`BANKING_JOURNEY_ENHANCEMENT_SKILL.md`](../.agents/skills/banking-ba-project/BANKING_JOURNEY_ENHANCEMENT_SKILL.md) |
| Journey release experience, incidents, and gates | [`BANKING_JOURNEY_RELEASE_CMS_LESSONS_LEARNED.md`](../.agents/skills/banking-ba-project/BANKING_JOURNEY_RELEASE_CMS_LESSONS_LEARNED.md) |
| Release diagnostics and controlled promotion | [`BANKING_PROJECT_RELEASE_TROUBLESHOOTING_SKILL.md`](../.agents/skills/banking-ba-project/BANKING_PROJECT_RELEASE_TROUBLESHOOTING_SKILL.md) |
| Deposits-specific domain playbook | [`DEPOSITS_JOURNEY_IMPLEMENTATION_SKILL.md`](../.agents/skills/banking-ba-project/DEPOSITS_JOURNEY_IMPLEMENTATION_SKILL.md) |
| Journey CMS task | [`references/journey-cms.md`](../.agents/skills/banking-ba-project/references/journey-cms.md) |
| Membership/payment/activation task | [`references/membership.md`](../.agents/skills/banking-ba-project/references/membership.md) |
| Authorization/roles/grants task | [`references/access-control.md`](../.agents/skills/banking-ba-project/references/access-control.md) |
| Database/Neon/migration/deployment task | [`references/environment-safety.md`](../.agents/skills/banking-ba-project/references/environment-safety.md) |
| Testing, handoff, current blockers | [`references/validation-and-handoff.md`](../.agents/skills/banking-ba-project/references/validation-and-handoff.md) |
| Full historical operational handoff | [`CODEX_PROJECT_HANDOFF .md`](../.agents/skills/banking-ba-project/CODEX_PROJECT_HANDOFF%20.md) |

## 10. Completion/reporting standard

For any change, report: behavior/root cause, files changed, authorization and transaction implications, records/environments touched, focused validation results, remaining gaps, and the exact stopping point. Update `AI_PROJECT_HANDOFF.md` whenever architecture, database state, blockers, or next steps materially change.

Do not commit, branch, push, deploy, publish, migrate, or alter data unless the user explicitly asks and the environment scope is unambiguous.
