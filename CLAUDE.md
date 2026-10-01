# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Session start (mandatory)

At the start of every session, before any code or data work, read the project handoff below in full and follow its principles throughout the session. Its "Non-Negotiable Safety Rules", "Authorization and Workflow Invariants", "Working Tree Ownership" (no commits or branches without explicit instruction) and "Explicitly Out of Scope" sections are binding. Newer dated entries at the top override older snapshot sections where they conflict.

@docs/hand-off/AI_PROJECT_HANDOFF.md

## Project

Banking BA Knowledge Hub: a bilingual (`en`/`vi`), paid-membership, controlled-access knowledge platform for banking business analysts. Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 3, Prisma 6 on Neon PostgreSQL, `jose` sessions, `bcryptjs`, Zod 4, Vitest.

Before non-trivial work, read `docs/hand-off/AI_PROJECT_HANDOFF.md`. It is a running log of recent changes, the current Development data state, and open blockers. Update it after material implementation or database changes. Deeper subsystem guidance lives in `.agents/skills/banking-ba-project/references/` (`journey-cms.md`, `access-control.md`, `membership.md`, `environment-safety.md`, `validation-and-handoff.md`); the skill entrypoint is `docs/hand-off/SKILL.md`. (README refers to `docs/AI_PROJECT_HANDOFF.md` and `src/proxy.ts`; the real paths are `docs/hand-off/AI_PROJECT_HANDOFF.md` and `src/middleware.ts`.)

## Commands

```bash
npm run dev                          # next dev on :3000
npm test                             # vitest run (src/**/*.test.ts[x])
npm test -- src/server/cms/journey-cms.test.ts   # single test file
npx vitest run -t "name fragment"    # filter by test name
npm run lint                         # eslint .
npx tsc --noEmit
npm run build                        # runs deployment migrations ONLY when VERCEL=1, then prisma generate + next build
npm run test:e2e                     # scripts/e2e.mjs against a running server (TEST_BASE_URL, default localhost:3000)
```

Validation order: run focused test and eslint on the changed files first, then `npm test && npm run lint && npx tsc --noEmit && npm run build`. `bash .agents/skills/banking-ba-project/scripts/project-check.sh [safety|validate]` wraps git status, env check, and the full suite.

## Database and environment safety (critical)

- Three isolated Neon branches: local → development, Vercel Preview → preview, Vercel Production → production. `APP_ENV` and `DATABASE_ENVIRONMENT` are explicit labels that must match, and conflicts with `VERCEL_ENV` fail closed. The logic lives in `src/server/environment-core.ts` and `src/server/env.ts`. `src/lib/db.ts` asserts the environment before creating the Prisma client.
- Run `npm run db:check-env` before any command that touches the database.
- Always go through the wrappers (`npm run db:migrate:dev`, `db:migrate:status`, `db:migrate:deploy`, `db:seed:dev`, `db:studio`), which route through `scripts/run-safe-prisma-command.ts`. Never run `prisma db push`, `prisma migrate reset`, raw `migrate dev`, seeds, or destructive SQL directly. Never touch Preview or Production without explicit, fresh instruction from the user; Development approval does not carry over.
- `release:*` scripts promote immutable JSON artifacts in `release/` into Production. They are gated by env flags inside `scripts/run-deployment-migrations.ts`. Treat them as controlled release steps.
- `npm run build:cloudflare` (with `CLOUDFLARE_PUBLIC_PREVIEW=1`) aliases `@/lib/db` to `src/lib/db.preview.ts`, a stub that rejects every query. The vinext/wrangler scripts are an experimental alternative deploy target; Vercel is the real one.

## Architecture

**Locale routing.** `src/middleware.ts` strips the `/en` or `/vi` prefix and rewrites to the unprefixed route in `src/app/**`, passing the locale in the `x-bba-locale` header and the `bba_locale` cookie. So `src/app/banking-journeys/[slug]` serves `/{locale}/banking-journeys/[slug]`. Dictionaries live in `src/i18n/dictionaries`. Locale is never an authorization input.

**Layers.**
- `src/app/**`: pages and server actions.
- `src/server/<domain>/`: domain services, repositories, policies, and tests. Domains: `access-control`, `cms`, `ba-document`, `customer-segment`, `membership`, `review`, `contributor`, `database`.
- `src/lib/`: cross-cutting code (`auth`, `db`, `permissions`, legacy `repository.ts`, validation).
- `src/data/`: static development-only fallback content, gated by `ENABLE_STATIC_CONTENT_FALLBACK`.

Reuse the existing services and policy matrices; do not add parallel permission systems.

**Authorization model.**
- Every premium page authorizes at page level, not just in the layout (Next renders them concurrently), before reading params, querying Prisma, or touching static fallback.
- Non-admins need an ACTIVE account plus an ACTIVE membership whose window covers the current time.
- On top of roles sits the Knowledge Access Matrix (`src/server/access-control/`, scopes, packages, and user grants; mode set by `KNOWLEDGE_ACCESS_MATRIX_MODE`).
- Premium content must never reach client component imports, metadata, the sitemap, public APIs, or `/public`. `no-static-premium-imports.test.ts` and the e2e leakage markers enforce this.
- Protected files are served through membership-checked route handlers (`src/app/api/journey-media`, `src/app/api/ba-documents`). Journey media uses private Vercel Blob storage.

**Governed content and editorial workflow.**
- Model chain: `ContentItem` (stable immutable `slug`, `publishedRevisionId`) → `ContentRevision.contentJson` → renderer. Per-locale state lives in `ContentTranslation`/`TranslationRevision`.
- Workflow: create a Draft cloned from the published revision → save → `IN_REVIEW` → independent review/publish. Author and reviewer/publisher must differ, and ADMIN does not bypass this.
- Never mutate a published revision or replace a `ContentItem`.
- Publish transactionally updates the pointer, syncs `previewJson`, writes `AuditLog`, and revalidates caches. Rollback repoints the published revision.
- The Journey content schema is `src/server/cms/journey-content-schema.ts`.
- BA Documents (`ContentType.BA_DOCUMENT`) are schema-versioned JSON. Each has exactly one Primary Journey, which is its security boundary. They export to DOCX and PDF (`src/server/ba-document/`).

**Membership.** There is no public registration: access request → admin records a provider-neutral payment → admin verifies it → conversion creates an INVITED user plus a membership plus a one-time SHA-256-hashed activation token. State transitions are allow-listed server-side.

**Server Actions body limit** is raised to 30 MB in `next.config.mjs` for large Journey JSON and base64 images.
