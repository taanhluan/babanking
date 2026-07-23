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

Copy `.env.example` to `.env`. Required values are `DATABASE_URL` and an `AUTH_SECRET` of at least 32 characters. `APP_BASE_URL` is used when generating activation links. Admin and development-member seeds run only when their environment variables are supplied; no real credentials are committed.

```bash
npm install
npx prisma validate
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

The seed is idempotent. It imports existing premium content and creates a non-public, zero-price development sample plan. A paid development member and corresponding verified development ledger record are created only when member seed variables are set.

## Vercel production deployment

The application runtime is deployed to Vercel. PostgreSQL is provisioned through
Vercel Marketplace (Neon or Prisma Postgres) and connected through
`DATABASE_URL`; Vercel itself is not the database server.

Configure `AUTH_SECRET`, `APP_BASE_URL`, and
`ACTIVATION_TOKEN_TTL_HOURS` for Production. Then initialize or update the
database before the first production release:

```bash
npm run db:migrate:deploy
npm run db:seed
```

Seed account variables are optional and should be configured only long enough
to create the intended accounts, then removed from the deployment environment.
Never commit production credentials.

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
npx prisma validate
npx prisma generate
npm run db:seed
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
