# Banking BA Knowledge Hub

Banking BA Knowledge Hub is a bilingual, controlled-access knowledge platform for
banking business analysts. It combines curated banking journeys, BA practice,
case studies, career guidance, editorial review, and paid-membership
administration without exposing premium content to unauthorised visitors.

## Technology stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Prisma ORM with PostgreSQL
- Signed HTTP-only sessions with `jose` and password hashing with `bcryptjs`
- Zod validation, Vitest unit tests, and runtime E2E checks

## Main features

- English and Vietnamese locale routing
- Server-enforced paid membership and role-based access
- Banking knowledge libraries, search, bookmarks, and reading history
- Contributor, reviewer, and administrator workflows
- Access requests, activation, membership, renewal, and payment administration
- Translation-aware editorial revisions and locale-specific publication state

## English and Vietnamese locales

The platform supports technical locale codes `en` and `vi`; the interface labels are `ENG` and `VNI`. Public and protected URLs are locale-prefixed, for example `/en/login`, `/vi/request-access`, `/en/workspace`, and `/vi/admin`. `/` and legacy unprefixed URLs redirect to the cookie/browser preference, defaulting to English.

`src/proxy.ts` validates locale prefixes and rewrites them to the existing server routes. This preserves the original page-level authentication, membership, role, and ownership checks. Locale is never an authorization input. The `bba_locale` cookie contains only `en` or `vi`; authenticated language changes also update `User.preferredLocale`.

UI translations live in small server dictionaries under `src/i18n/dictionaries`. Locale utilities and formatting are centralized in `src/i18n`. The switcher preserves the current pathname and safe query string. HTML `lang`, public metadata, public sitemap alternates, dates, and currencies are locale-aware.

Editorial translations use `ContentTranslation` and `TranslationRevision`. Each content identity has independent locale routing, draft/review state, published revision, version history, owner, and status (`NOT_STARTED`, `DRAFT`, `IN_REVIEW`, `CHANGES_REQUESTED`, `PUBLISHED`, `OUTDATED`). Plan copy uses `MembershipPlanTranslation`; commercial price, currency, and duration remain language-independent. Access requests store the visitor’s preferred communication locale. Audit logs continue storing stable action codes.

English published content is migrated into English translation revisions. Vietnamese translation records begin as `NOT_STARTED` until human translation and review. Vietnamese premium routes never silently serialize or display the English body; missing published translations show an explicit Vietnamese availability notice and link to the English locale. Automated translation is not published.

Admin translation coverage is available at `/en/admin/content/translations` and `/vi/admin/content/translations`.

Terminology follows the shared glossary: Banking Journey → Hành trình nghiệp vụ ngân hàng, Business Rule → Quy tắc nghiệp vụ, Requirement Analysis → Phân tích yêu cầu, Gap Analysis → Phân tích khoảng cách, Membership → Gói thành viên, Workspace → Không gian làm việc. Recognized terms such as KYC, AML, BRD, User Story, Product Owner, and Core Banking remain in English where natural.

## Phase 5 access architecture

This Next.js 16 application is a controlled paid-membership knowledge platform. Authentication uses signed HTTP-only sessions, Prisma/PostgreSQL, bcrypt, and server actions. Use distributed rate limiting for production.

There is no public registration. Public routes are `/`, `/login`, `/request-access`, `/activate/[token]`, `/privacy`, `/terms`, and `/membership-terms`. Banking Journeys, BA Practice, Case Studies, Career Roadmap, search, workspace, contributor, and reviewer routes are premium. Admin routes require `ADMIN`.

Authorization is evaluated from the database on every protected request:

- the account must be active;
- a non-admin must have an `ACTIVE` membership whose start and expiry window includes the request time;
- contributors and reviewers also need their required role;
- `ADMIN` bypass is centralized for administration and quality control.

Every premium page performs authorization before reading params, querying Prisma, or accessing the static development fallback. This page-level check is deliberate: Next.js can render layouts and pages concurrently, so a layout-only redirect is insufficient. Premium routes are dynamic, no-store/noindex, excluded from the sitemap, and have generic metadata. Premium client components do not import the static content repository.

## Membership workflow

1. A visitor submits `/request-access`; the form is server-validated and has an email-based 15-minute duplicate cooldown.
2. An admin reviews the request and marks it contacted/payment pending.
3. Payment happens externally. The admin records a provider-neutral ledger entry and is the only role allowed to verify it.
4. A standard paid account can be converted only when a linked plan payment is `PAID`.
5. Conversion creates an `INVITED` account, active paid membership, and a one-time activation link.
6. The activation token is SHA-256 hashed in the database, expires after 24–72 hours (48 by default), and becomes unusable after password setup.
7. Expired or suspended members can still sign in and use account/membership/renewal pages, but premium data remains server-blocked.

Renewal requests never extend access automatically. Internal and complimentary entitlements must be explicit administrator records with audit reasons. Membership, access-request, and payment state transitions are allow-listed server-side.

## Admin membership areas

- `/admin/memberships/requests`: review, filter, transition, reject, and convert requests.
- `/admin/memberships/payments`: provider-neutral administrative payment ledger and verification.
- `/admin/memberships/members`: membership history, suspension/resume/cancellation, and activation links.
- `/admin/memberships/plans`: database-configured price, currency, period, duration, features, display order, activation, and public visibility.

The payment ledger is not a checkout, tax invoice, or accounting system. Phase 5A does not integrate Stripe, VNPay, MoMo, PayPal, or another gateway.

## Environment and setup

Copy `.env.example` to `.env.local`, then replace every placeholder with credentials for the Neon **development** branch. Never use the production Neon connection string locally. `AUTH_SECRET` must contain at least 32 characters and `APP_BASE_URL` is used when generating activation links.

```bash
npm install
npm run db:check-env
npx prisma validate
npx prisma generate
npm run db:migrate:dev
npm run db:seed:dev
npm run dev
```

The safety check must report a matching `development` application and database label before migration or seed commands are run. The development seed is idempotent and is blocked for Preview and Production.

## Database Environment Isolation

### Architecture

```text
Local feature branch → .env.local → Neon development branch
Vercel Preview      → Preview variables → Neon preview branch
Vercel Production   → Production variables → Neon production branch
```

`DATABASE_URL` must be different in all three environments. `DATABASE_ENVIRONMENT` is an explicit safety label; it is not inferred from a Neon hostname. `APP_ENV` takes precedence over validated `VERCEL_ENV`. Conflicting or unknown values fail closed because Vercel Preview normally uses `NODE_ENV=production`.

Prisma uses the pooled `DATABASE_URL` for application traffic and the non-pooled `DIRECT_URL` for migrations. Connection strings and secrets are never stored in source control or shown by the Admin diagnostics page.

### Local development

Create `.env.local` with development-only values:

```dotenv
APP_ENV="development"
DATABASE_ENVIRONMENT="development"
DATABASE_URL="<NEON_DEVELOPMENT_POOLED_CONNECTION_STRING>"
DIRECT_URL="<NEON_DEVELOPMENT_DIRECT_CONNECTION_STRING>"
APP_BASE_URL="http://localhost:3000"
AUTH_SECRET="<LOCAL_SECRET_AT_LEAST_32_CHARACTERS>"
ALLOW_PRODUCTION_DATABASE_OPERATIONS="false"
ENABLE_STATIC_CONTENT_FALLBACK="false"
```

Run `npm run db:check-env` before any database-changing command. The application also validates the environment before its first database access and refuses a development-to-production mismatch.

### Neon branch setup

Perform these steps manually; do not rename or delete an existing branch:

1. Open **Neon Console → Project → Branches**.
2. Identify the branch currently used by the live site. Preserve its current name and designate its role as Production.
3. Create a `development` branch from that production branch.
4. Create a separate `preview` branch from that production branch.
5. For each branch, obtain its pooled connection string and its direct connection string.
6. Put only the development strings in local `.env.local`. Never paste connection strings into this README, an issue, a commit, or a browser-visible variable.

A Neon hostname is not a reliable human-readable branch identity. The explicit label is mandatory. A database marker table can be added in a later reviewed migration, but this safety phase does not create one.

### Vercel environment setup

Open **Vercel Project → Settings → Environment Variables** and scope each value explicitly:

| Variable | Preview | Production |
|---|---|---|
| `APP_ENV` | `preview` | `production` |
| `DATABASE_ENVIRONMENT` | `preview` | `production` |
| `DATABASE_URL` | `<NEON_PREVIEW_POOLED_CONNECTION_STRING>` | `<NEON_PRODUCTION_POOLED_CONNECTION_STRING>` |
| `DIRECT_URL` | `<NEON_PREVIEW_DIRECT_CONNECTION_STRING>` | `<NEON_PRODUCTION_DIRECT_CONNECTION_STRING>` |
| `APP_BASE_URL` | Omit to derive from `VERCEL_BRANCH_URL` | `<PRODUCTION_SITE_URL>` |
| `ALLOW_PRODUCTION_DATABASE_OPERATIONS` | `false` | `false` |
| `ENABLE_STATIC_CONTENT_FALLBACK` | `false` | `false` |

Configure `AUTH_SECRET` and other secrets independently for Preview and Production. Do not copy Production secrets into Preview automatically. Remove the Preview and Development scopes from any database variable that contains the Production connection string, then redeploy each environment after saving its correct values.

Preview derives its origin from Vercel's system-provided `VERCEL_BRANCH_URL`
(falling back to `VERCEL_URL`) when `APP_BASE_URL` is not explicitly set. This
prevents Preview activation links from using the Production domain.

Verify **Vercel Project → Settings → Environments → Production → Branch Tracking**. The expected branch for this repository is `main`; preserve a different configured branch and investigate before changing it. Feature branches and pull requests must create Preview deployments.

### Safe Prisma commands

- `npm run db:check-env` — safe identity inspection; prints host and database name but never credentials or a URL.
- `npm run db:migrate:status` — read-only migration status after validating matching environment labels.
- `npm run db:migrate:dev` — only development application to development database; runs `prisma migrate dev`.
- `npm run db:migrate:deploy` — only matching Preview/Preview or Production/Production; runs `prisma migrate deploy`.
- `npm run db:seed:dev` — development only.
- `BACKFILL_ADMIN_EMAIL="admin@example.com" npm run db:backfill:journeys:dry-run:dev` — validates the ten legacy Banking Journeys without writing data.
- `BACKFILL_ADMIN_EMAIL="admin@example.com" npm run db:backfill:journeys:dev` — idempotently imports the ten legacy Banking Journeys into published CMS revisions on Development only.
- `npm run db:import:sqlite:dev` — development only.
- `npm run db:studio` — development only.

Never run `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, the development seed, or the legacy SQLite import against Production. Production destructive operations remain blocked unless a separately reviewed procedure explicitly enables them. There is no production seed command.

### Migration deployment

Develop and generate migrations locally against Neon development, then run tests. A Feature/PR Preview may apply already-reviewed migrations with `npm run db:migrate:deploy` against Neon preview. After review and merge to `main`, a single controlled release step may run the same deploy command against Neon production.

Do not run migrations during application startup. Do not use `migrate dev`, `db push`, or `migrate reset` in a Vercel build. If migration deployment is later added to CI, serialize the job so concurrent serverless builds cannot race.

### Git workflow

```bash
git checkout main
git pull origin main
git checkout -b feature/knowledge-access-matrix
# develop and validate against Neon development
git push -u origin feature/knowledge-access-matrix
```

The feature branch deploys to Vercel Preview backed by Neon preview. Release only through a reviewed pull request merged to `main`, followed by the controlled Production migration and deployment.

### Admin diagnostics and troubleshooting

Administrators can open `/admin/system/environment`. It shows only the application label, database label, host, database name, Vercel label, fallback state, configuration state, and safety status. It never shows usernames, passwords, query parameters, full URLs, API keys, or authentication secrets. A development banner is visible only inside Admin pages.

If the application reports an environment mismatch:

1. Stop migration, seed, and import commands.
2. Check `APP_ENV`, `DATABASE_ENVIRONMENT`, and `VERCEL_ENV` without logging their secret values.
3. Confirm the selected Neon branch in the Neon Console.
4. Replace the incorrectly scoped environment variable.
5. Run `npm run db:check-env` again and redeploy.

For a suspected credential incident, rotate the affected Neon role password and application secrets, update only the correct local/Vercel scopes, inspect Git history and deployment logs, invalidate exposed credentials, and review database/audit activity. Never rewrite shared Git history automatically; coordinate remediation with repository owners.

## Vercel production deployment

The application runtime is deployed to Vercel. PostgreSQL is provisioned through
Vercel Marketplace (Neon or Prisma Postgres) and connected through
`DATABASE_URL`; Vercel itself is not the database server.

Configure the Production variables listed above and
`ACTIVATION_TOKEN_TTL_HOURS`. Apply reviewed migrations in one controlled
release step before application code depends on them:

```bash
npm run db:migrate:deploy
```

There is no automatic Production seed. Never commit Production credentials.

## Leakage safeguards

- no public premium static generation or `generateStaticParams`;
- authorization before database queries and static fallback reads;
- page-level checks in addition to protected layouts;
- no public premium search index, API, sitemap, RSS, JSON, or download route;
- no full premium data in the landing page, Client Component imports, or CSS-blurred previews;
- public landing uses separate generic teaser copy and aggregate counts only;
- anonymous premium RSC responses were checked for known content markers;
- raw passwords, password hashes, activation tokens, and payment credentials are never logged.

Public branding assets may remain in `/public`. No protected downloads are currently implemented. Future protected files must be stored outside `/public` and served by a membership-checked route handler.

## Validation

```bash
npm run db:check-env
npx prisma validate
npx prisma generate
npm run test
npm run lint
npx tsc --noEmit
npm run build
```

Unit tests cover membership windows, access sources, safe callbacks, activation hashing/single-use/expiry behavior, and allow-listed request/payment/membership transitions.

## Known limitations and Phase 5B

- Payment is administratively verified; there is no automated gateway, invoice engine, tax handling, refund automation, or fake checkout.
- Email delivery is not configured; admins securely copy one-time activation links.
- The cooldown is database-backed per email but is not a full distributed abuse-prevention system. Production needs IP/device-aware distributed rate limiting for login, request, and activation attempts.
- Production database migrations must be applied before deploying application code that depends on them.
- The draft Privacy, Platform Terms, and Membership Terms require legal review. Refund policy, legal entity, receiving jurisdiction, currency, invoice requirements, privacy retention, and contact process remain business decisions.

Phase 5B should begin only after selecting the payment provider and confirming the receiving legal entity, supported currency, invoice/tax obligations, chargeback handling, webhook verification, reconciliation, and approved refund policy. Integrate the provider behind the existing payment service/ledger rather than weakening membership authorization.
