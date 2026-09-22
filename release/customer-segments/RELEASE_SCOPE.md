# Customer Segment release scope

This manifest isolates the Customer Segment feature from the currently dirty working tree. Review these paths as one release unit; do not assume unrelated modified/untracked paths belong to this release.

## Database and release tooling

- `prisma/schema.prisma` — `ContentType.CUSTOMER_SEGMENT` only
- `prisma/migrations/20260919090000_add_customer_segment/migration.sql`
- `release/customer-segments/customer-segments-2026-09-19-v1.json`
- `release/customer-segments/RELEASE_SCOPE.md`
- `scripts/promote-customer-segments.ts`
- `scripts/run-deployment-migrations.ts` — exact Production release hook after migration
- `package.json` — three `release:customer-segments:*` scripts only

## CMS and domain

- `src/server/customer-segment/**`
- `src/server/journey-segments.ts`
- `src/server/review/generic-review-workflow.ts`
- `src/server/review/generic-review-workflow.test.ts`
- `src/server/cms/governed-content-lifecycle.ts` — Admin submit compatibility used by Customer Segment
- `src/app/admin/customer-segments/**`
- `src/app/admin/admin-navigation.ts`
- `src/app/admin/admin-navigation.test.ts`
- `src/app/admin/contributor/page.tsx`
- `src/app/actions.ts` — Customer Segment review/publish dispatch
- `src/app/review/page.tsx`
- `src/app/review/[revisionId]/page.tsx`

## Public landing and compatibility maps

- `src/app/banking-journeys/page.tsx`
- `src/app/banking-journeys/segments/**`
- `src/components/journeys/SegmentWelcome.tsx`
- `src/components/journeys/SegmentWelcome.test.tsx`
- `src/lib/repository.ts`
- `src/lib/repository-member-home.test.ts`
- `src/app/contributor/page.tsx`
- `src/components/content/DatabaseContent.tsx`
- `src/components/member/KnowledgeActions.tsx`
- `src/components/member/MemberHome.tsx`
- `src/components/search/GlobalSearch.tsx`
- `src/data/content.ts`

## Static media

- `public/images/segments/retail-banking.svg`
- `public/images/segments/sme.svg`
- `public/images/segments/enterprise-banking.svg`
- `public/images/segments/retail-banking-orchestration.png`
- `public/images/segments/sme-banking-orchestration.png`
- `public/images/segments/enterprise-banking-orchestration.png`

## Documentation

- `docs/hand-off/CHANGE_REQUEST_CUSTOMER_SEGMENTED_BANKING_JOURNEYS.md`
- `docs/hand-off/CUSTOMER_SEGMENT_PRODUCTION_RELEASE_RUNBOOK.md`
- Customer Segment sections in `docs/hand-off/AI_PROJECT_HANDOFF.md`

Before commit or deployment, review overlapping files line-by-line because some existed with other owner changes before this feature. The full repository validation passes, but this manifest is not a substitute for a scoped diff/commit review.
