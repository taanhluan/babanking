# Environment and Database Safety

## Sources of Truth

- `README.md`
- `src/server/environment-core.ts`
- `src/server/env.ts`
- `src/lib/db.ts`
- `scripts/check-database-environment.ts`
- `scripts/run-safe-prisma-command.ts`

## Environment Model

```text
Local Development → Neon development branch
Vercel Preview   → Neon preview branch
Vercel Production → Neon production branch
```

`APP_ENV` and `DATABASE_ENVIRONMENT` must match. `VERCEL_ENV` conflicts fail closed. A hostname is not an environment identity.

## Safe Commands

```bash
npm run db:check-env
npm run db:migrate:status
npx prisma validate
npx prisma generate
```

Development-only:

```bash
npm run db:migrate:dev
npm run db:seed:dev
npm run db:import:sqlite:dev
npm run db:studio
```

Do not bypass wrappers with direct destructive Prisma commands.

## Deployment Boundary

- Do not deploy from an ordinary implementation task.
- Preview/Production migrations use separately reviewed `migrate deploy`.
- Never use `migrate dev`, reset, seed, import, or `db push` in Preview/Production.
- Never infer approval for Production from approval for Development.
- Inspect `.openai/hosting.json` only when deployment is explicitly requested; treat IDs as opaque.

## One-Off Repair Pattern

1. Parse and validate environment.
2. Assert Development/Development.
3. Load exact target and all linked records.
4. Reject missing, changed, ambiguous, or conflicting state.
5. Run conditional update and AuditLog creation in one transaction.
6. Re-read state.
7. Print only non-secret identifiers and statuses.

Never output a full database URL or raw token.
