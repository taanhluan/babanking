---
name: banking-ba-project
description: Develop, audit, test, and safely continue the Banking BA Knowledge Hub repository. Use when working in this project on Next.js/Prisma code, Development database records, Journey CMS, public Journey rendering, contributor/reviewer workflow, access control, memberships, payments, activation, environment isolation, tests, build failures, handoff documentation, or release-readiness analysis.
---

# Banking BA Project

Operate as the project’s senior engineering workflow. Preserve production safety, existing architecture, revision history, authorization, and the user’s current working tree.

## Start Every Task

1. Read `docs/AI_PROJECT_HANDOFF.md`.
2. Read `README.md` for canonical architecture and environment commands.
3. Inspect `git status --short`; treat existing modifications and untracked files as user-owned work.
4. Read applicable `AGENTS.md` files.
5. Classify the task:
   - Journey CMS or renderer → read `references/journey-cms.md`.
   - Membership, payment, activation → read `references/membership.md`.
   - Database, Neon, migration, deployment → read `references/environment-safety.md`.
   - Access, roles, grants → read `references/access-control.md`.
   - Testing, handoff, current blockers → read `references/validation-and-handoff.md`.
6. Use a plan for multi-step implementation or any database-changing task.

## Enforce Safety

- Default to Development only.
- Before any database read or write, run:

  ```bash
  npm run db:check-env
  ```

- Require matching `APP_ENV=development` and `DATABASE_ENVIRONMENT=development` for Development repair, migration, seed, import, or Studio work.
- Never expose connection strings, credentials, auth secrets, password hashes, or raw activation tokens.
- Never query or modify Preview/Production unless the user gives a new, explicit controlled-release instruction.
- Never weaken environment guards, Role Matrix, Knowledge Access Matrix, editorial independence, or membership authorization.
- Do not run `prisma db push`, `prisma migrate reset`, destructive SQL, or ad-hoc production commands.
- Do not deploy unless explicitly requested and environment scope is unambiguous.

Run the deterministic safety check when useful:

```bash
bash .agents/skills/banking-ba-project/scripts/project-check.sh safety
```

## Work in Existing Code

- Fix root causes with minimal, subsystem-focused changes.
- Reuse existing services, repositories, policies, schemas, and workflow matrices.
- Do not create parallel permission or plan-resolution systems.
- Do not hard-code emails, record IDs, slugs, plan codes, or account-specific authorization.
- Keep stable public URLs and reader contracts unchanged unless explicitly approved.
- Use `apply_patch` for modifications.
- Do not discard unrelated working-tree changes.
- Do not create commits or branches unless explicitly requested.

## Database Change Protocol

For any approved Development data repair:

1. Run the environment safety check.
2. Re-read every affected record and relationship.
3. State preconditions and abort on drift.
4. Resolve authoritative values server-side.
5. Use a conditional, transactional update.
6. Write AuditLog in the same transaction.
7. Re-read and report final state.
8. Do not cascade into conversion, publication, activation, or deletion unless explicitly requested.

Use IDs supplied by the user only in a one-off controlled repair, never in application business logic.

## Validate

Start focused, then broaden:

```bash
npm test -- <focused-test-files>
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Use:

```bash
bash .agents/skills/banking-ba-project/scripts/project-check.sh validate
```

Do not fix unrelated failures automatically. Identify the exact blocking file and distinguish pre-existing failures from regressions caused by the current patch.

## Finish

Report:

- root cause and behavior changed;
- files changed with line references;
- database records affected;
- authorization and transaction behavior;
- tests, lint, typecheck, build, and smoke-test results;
- remaining gaps and risks;
- exact current stopping point;
- explicit confirmation of which environments were touched.

Update `docs/AI_PROJECT_HANDOFF.md` when the task changes architecture, database state, current blockers, completed scope, or next steps.
