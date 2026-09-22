# Customer Segment Production Release Runbook

**Release ID:** `customer-segments-2026-09-19-v1`  
**Status:** Release v1 deployed on 2026-09-20; SME/Enterprise media enhancement deployed on 2026-09-21; no application scroll patch remains pending.  
**Approved content included:** Retail Banking Development published revision v2 only. SME and Enterprise have no CMS-published Development revision and therefore continue using reviewed static fallback content.

## Release objective

Deploy the Customer Segment code, schema migration, local media, and the exact Development-approved Retail landing content without manually re-entering or re-reviewing the landing page in Production.

The promotion is a controlled release operation, not a new editorial review. It preserves two distinct Production identities for author and reviewer, records the Development revision/hash in `AuditLog`, and verifies the final Production published read-back hash.

## Immutable approved source

- Artifact: `release/customer-segments/customer-segments-2026-09-19-v1.json`
- Development source: `retail-banking` revision `cmu8d2mah0001rg0oanmxuamu`, v2, Published
- Canonical SHA-256: `2e7811e638e5857c5f1bbc1485b4aaa9761fc44fd20368084d5137356bce9b7f`
- Local image: `public/images/segments/retail-banking-orchestration.png`, 1536×1024
- Development verification: artifact hash = Development published read-back hash

Do not edit the artifact during release. Any content change requires a new Development revision, approval, release ID, and checksum.

## Required release order

1. Review and isolate the Customer Segment code diff. The current working tree contains other owner changes; do not deploy the entire dirty workspace without subsystem review.
2. Deploy the approved code and static media.
3. Allow deployment migration `20260919090000_add_customer_segment` to complete before serving the new code.
4. Verify Production environment/database identity and migration status.
5. Run the read-only release verification. Before promotion, Retail may report `matches: false` or no published revision.
6. Set the three release-specific variables before deployment. The Vercel Production build runs the guarded promotion immediately after the additive migration and before compiling the app.
7. Run verification again; `expectedHash`, `publishedHash`, and `matches: true` are required.
8. Verify EN/VI Overview, orchestration image, `Overview / Journeys` navigation, authorized Journey cards, and a restricted member.

## Commands

Run only in a shell where genuine Production secrets are injected. Do not source or relabel `.env.local`.

```bash
npm run db:migrate:status
npm run release:customer-segments:verify
```

For exact promotion in Vercel Production build:

```bash
export CUSTOMER_SEGMENT_RELEASE_CONFIRM=customer-segments-2026-09-19-v1
export CUSTOMER_SEGMENT_PROMOTION_AUTHOR_EMAIL='<active-production-admin>'
export CUSTOMER_SEGMENT_PROMOTION_REVIEWER_EMAIL='<different-active-production-reviewer-or-admin>'
npm run release:customer-segments:apply
npm run release:customer-segments:verify
```

`scripts/run-deployment-migrations.ts` invokes the apply command automatically only when `APP_ENV=production` and `CUSTOMER_SEGMENT_RELEASE_CONFIRM` is present. Remove the three release-specific variables after successful verification; future builds then run migrations only.

Production safety variables must already resolve to:

```text
APP_ENV=production
DATABASE_ENVIRONMENT=production
ALLOW_PRODUCTION_DATABASE_OPERATIONS may remain false; this narrowly scoped promotion requires the exact release confirmation instead of opening the global destructive-operation gate.
```

The apply command fails closed when the release ID, environment, migration, actors, Journey references, duplicate assignments, active revisions, or hashes are invalid. Re-running after a successful identical promotion is a no-op.

## Rollback

Rollback restores the exact previous published pointer recorded by the promotion audit. If Retail did not exist before promotion, it restores no published pointer and public rendering returns to static fallback. It does not delete revisions or audit history.

```bash
export CUSTOMER_SEGMENT_ROLLBACK_CONFIRM=customer-segments-2026-09-19-v1
export CUSTOMER_SEGMENT_ROLLBACK_ACTOR_EMAIL='<active-production-admin>'
npm run release:customer-segments:rollback
```

Rollback fails if the published pointer changed after this release, preventing accidental overwrite of a newer publication.

## Production acceptance gates

- Migration is applied successfully.
- Promotion command returns `matches: true` for Retail.
- Published DB read-back hash equals `2e7811e638e5857c5f1bbc1485b4aaa9761fc44fd20368084d5137356bce9b7f`.
- `/en/banking-journeys/segments/retail-banking` renders the approved English landing.
- `/vi/banking-journeys/segments/retail-banking` renders the approved Vietnamese landing.
- The orchestration PNG appears only in the final landing section; hero SVG remains unchanged.
- `/segments/retail-banking/journeys` shows only server-authorized published Journeys.
- Existing direct Journey URLs, CMS review flows, access controls, search, bookmarks, and history remain operational.
- SME and Enterprise remain static fallback until independently published in Development and promoted under a later release.

## Current preflight limitation

A local read-only Production migration check was attempted on 2026-09-19. Vercel CLI could not pull 14 Production secrets and attempted to retain Development `.env.local`; the environment conflict gate blocked execution before database access. Do not bypass this guard. Run Production checks only inside the authenticated Production runtime/CI environment.

## Production deployment outcome — 2026-09-20

- Deployment `dpl_46X5Fa7PwHCJd1s8tsKoznywbHxn` reached `READY` and was aliased to `https://babanking.vercel.app`.
- Migration `20260919090000_add_customer_segment` is applied.
- Production Retail revision `cmu8dyar10003gm7dnshiuol5`, v1, read back with the approved canonical hash and `matches: true`.
- EN/VI protected routes returned the expected membership guard without an authenticated CLI session; the orchestration asset returned HTTP 200.
- Release-specific promotion environment variables were removed after deployment.
- Development A/B tests changed scroll behavior, navbar compositing, image paint styling, and build mode, but a no-JavaScript static baseline reproduced the same latency. All experimental CSS changes were reverted; there is no related application patch to deploy.

## SME/Enterprise media enhancement — 2026-09-21

- Scope: add `sme-banking-orchestration.png` and `enterprise-banking-orchestration.png` and map the already-approved CMS asset keys `sme` and `enterprise-banking` to those files.
- No migration or Production CMS write is required. Retail content/media, hero SVGs, routes, access controls, review workflow, and published pointers remain unchanged.
- CMS requirement: the published segment JSON must contain an `IMAGE` section with `assetKey: "sme"` or `assetKey: "enterprise-banking"`; deploying media alone does not publish editorial content.
- Release method: clean isolated tree based on Git HEAD plus the Customer Segment release scope. Never deploy the dirty workspace.
- Status: deployed successfully to Production.
- Deployment `dpl_EN2EXLF1KQFVT6obLVP83KFjWCX7` reached `READY` and was aliased to `https://babanking.vercel.app`.
- Vercel build passed TypeScript and Next.js compilation; database migration reported `No pending migrations to apply`.
- Production downloads match the approved SHA-256 checksums for both PNGs exactly.
- The three one-time Retail promotion variables were found lingering from the prior release, caused the first attempt to fail closed before deployment, and were removed. A final Production environment check confirms they are absent.
