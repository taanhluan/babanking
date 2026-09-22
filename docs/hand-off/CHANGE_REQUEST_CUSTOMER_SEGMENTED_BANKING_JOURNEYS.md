# Change Request — Customer-Segmented Banking Journeys

**Status:** Phase 3 detailed SME/Enterprise Journey drafts implemented in Development — pending independent business review  
**Date:** 2026-09-19  
**Scope:** Development implementation authorized 2026-09-19; no Production mutation or deployment authorized

## 1. Request captured

When a user selects **Banking Journeys**, show three Customer Segment choices:

1. Retail Banking
2. SME
3. Enterprise Banking

All currently published Banking Journeys are initially grouped under **Retail Banking**. SME and Enterprise Banking are valid empty categories until separately approved content exists.

## 2. Proposed architecture

Use a navigation/catalog taxonomy above the existing Journey content model:

```text
/[locale]/banking-journeys
  → Customer Segment selector

/[locale]/banking-journeys/segments/[segmentSlug]
  → segment Welcome Page + authorized Journey cards

/[locale]/banking-journeys/[journeySlug]
  → existing protected Journey reader; URL remains stable
```

Phase 1 should use a typed server-side segment catalog, for example:

```text
retail-banking
sme
enterprise-banking
```

The catalog maps stable Journey slugs to segments. It must not create a new content type, Journey identity, reader, renderer, permission model, or database table.

Initial mapping: every currently published canonical Journey belongs to `retail-banking`. Future SME/Enterprise classification is an explicit content/catalog decision, not an inference from title or JSON.

The existing `/[locale]/banking-journeys/[slug]` route remains the only Journey detail route. The `segments/` namespace avoids collision with existing stable Journey slugs.

Each segment Welcome Page contains:

1. Breadcrumb and segment identity.
2. Hero image or approved visual asset.
3. Segment title: Retail Banking, SME, or Enterprise Banking.
4. General description explaining the segment's business context and boundaries.
5. Authorized Journey collection for that segment.
6. Empty state for SME/Enterprise until approved Journeys are assigned.

The `/[locale]/banking-journeys` page remains the three-segment entry point. Selecting a segment opens its Welcome Page rather than jumping directly to a Journey.

The segment catalog carries presentation fields, not business authorization:

```text
segmentSlug
title.en / title.vi
generalDescription.en / generalDescription.vi
imageAsset
imageAlt.en / imageAlt.vi
journeySlugs
```

## 3. CMS impact

Phase 1:

- No schema migration.
- No ContentItem or ContentRevision mutation.
- No change to `contentJson`, `previewJson`, stable slugs, revision status, published pointers, or audit history.
- Existing CMS editor and review/publish lifecycle remain unchanged.
- Admin/contributor views may show the computed segment as read-only context only if useful.
- Segment changes are source-controlled catalog changes and require normal code review/tests.
- Welcome copy and image references are source-controlled curated metadata; they are not stored inside Journey `contentJson`.

Phase 2, only if needed:

- Design a governed ContentItem classification field/model.
- Define who may change segment classification, audit behavior, migration/backfill, and rollback.
- Reuse the existing CMS authorization and workflow; never allow segment metadata to bypass Journey authorization.
- Add governed segment Welcome Page editing and media management only after storage, file validation, ownership, audit, and rollback requirements are approved.

## 3A. Image strategy

Recommended Development implementation:

- Use reviewed PNG/JPEG/WebP assets under a dedicated `public` segment asset path.
- Store only asset references and alt text in the typed segment catalog.
- Do not store base64 images in Journey JSON or database revisions.
- Do not accept arbitrary remote image URLs in the catalog.

If Admin upload is required later, treat it as a separate media capability:

- use approved object storage rather than database blobs;
- allow only PNG/JPEG/WebP initially, with size and dimension limits;
- reject executable content and unsafe SVG by default;
- generate safe deterministic object keys;
- authorize upload/update/delete through the existing Admin path;
- audit media changes and support replacement/rollback;
- serve protected media only after the relevant authorization check;
- never use an image URL or media key as an access grant.

The first Welcome Page visuals should be non-sensitive, so versioned static assets are the lowest-risk option.

## 4. Access control

Customer Segment is presentation/catalog metadata, never an authorization input.

The server flow must remain:

```text
requirePremiumAccess
→ getAccessibleContentIds(user, VIEW)
→ list published, non-archived ContentItems
→ group/filter authorized previews by segment
```

The segment page must never query or expose a Journey merely because its slug is present in the catalog. Unknown, archived, unpublished, or unauthorized slugs are omitted. Direct Journey access continues through the existing `requireContentSlugAccess()` path.

BA Document Primary Journey authorization, Role Matrix, Knowledge Access Matrix, package grants, and direct grants remain unchanged.

## 5. Security requirements

- Do not put premium body content in segment cards, metadata, sitemap, or client bundles.
- Segment cards contain only non-sensitive labels/descriptions and authorized title/summary previews.
- Do not use segment slugs as permission scopes.
- Do not merge Retail, SME, and Enterprise grants.
- Do not use URL obscurity or UI hiding as authorization.
- Locale affects presentation only; `/en` and `/vi` follow the same authorization result.
- Preserve the existing premium route protection, `no-store`/noindex behavior, and audit boundaries.

## 6. UX behavior

- `/banking-journeys` becomes the segment landing page.
- Each segment card shows a count based only on authorized published Journeys.
- Retail Banking initially contains all currently published canonical Journeys.
- SME and Enterprise show a clear empty-state message, not fake content.
- Existing Journey cards and detail links remain unchanged after entering a segment.
- Backward compatibility: existing direct Journey URLs continue to work.
- English and Vietnamese labels/descriptions are added together; no silent English premium-body fallback is introduced.

## 7. Acceptance criteria

- Three segment cards render for both `en` and `vi`.
- All current authorized Journeys appear under Retail Banking.
- SME and Enterprise are empty until content is explicitly assigned.
- Each segment has a dedicated Welcome Page with localized title, General description, image, alt text, and Journey section.
- Welcome-page images are safe curated assets and do not contain premium Journey bodies or secrets.
- Unauthorized Journeys never appear in segment counts or cards.
- Existing Journey detail URLs remain valid.
- Existing Journey reader, Payments portal, BA Documents, search, bookmarks, history, and CMS routes continue to work.
- No ContentItem, ContentRevision, scope, grant, membership, or audit record is changed in Phase 1.
- Tests cover segment mapping, unknown slug omission, authorization-preserving grouping, locale labels, empty states, and stable detail links.
- Tests cover Welcome Page metadata, image references/alt text, locale-specific copy, and missing/invalid asset handling.
- Development validation passes before any release discussion.

## 8. Known release constraint

The 2026-09-19 read-only Development/Production audit found content drift:

- `customer-onboarding`: Development v7 Published / v8 Draft; Production v8 Published / v9 Draft.
- `payments-and-transfers`: both point to v12 with the same revision ID, but Published content hashes and structures differ materially.
- Schema/migrations and access mapping counts matched.

This enhancement must not silently reconcile or overwrite that drift. Any Production promotion requires a separate approved content/code release plan and the established four-way hash/read-back gates.

## 9. Explicit non-goals

- No content migration or reclassification in Production.
- No renaming/deleting/archiving Journey identities.
- No access-control redesign.
- No new SME/Enterprise business content in this change request.
- No separate segment-specific Journey architecture.

## 10. Request history and implementation hand-off — 2026-09-19

- Initial request: show Retail Banking, SME and Enterprise Banking beneath Banking Journeys; move existing Journeys into Retail; preserve Architecture, CMS, Access Controls and Security.
- Follow-up: each segment needs a Welcome Page, General description and imagery.
- Approval: “Ok cho dev trên development phase làm đi”.
- Implemented: selector, three Welcome Pages, EN/VI copy, responsive illustrations, authorized counts/cards, neutral empty states and unchanged localized Journey detail links.
- Implementation variation: authored static SVG illustrations under `public/images/segments/` instead of proposed raster files. These reviewed source assets contain no scripts, external references or uploaded content. Admin upload remains deferred.
- Catalog: `src/server/journey-segments.ts`; presentation: `src/components/journeys/SegmentWelcome.tsx`; routes: `src/app/banking-journeys/page.tsx` and `segments/[segmentSlug]/page.tsx`.
- Existing repository resolves authorization before preview reads. Catalog only filters that authorized result. Segment route also checks premium access before resolving route params.
- Catalog explicitly includes legacy `paymentsandtransfers` to preserve existing authorized visibility; repository archive/publication/access filters remain authoritative. This does not unarchive or grant access to it.
- Unknown catalog slugs are omitted; future Journey creation must explicitly assign a segment in the catalog. Segment membership never grants access.
- Images: replace reviewed asset files or update image paths in the component; retain EN/VI alt text in the catalog. No upload UI exists.
- Validation: 42 test files / 294 tests passed; TypeScript passed; build passed with deployment migrations skipped (`VERCEL=0`). Full lint had one new test-mock warning, then the mock was corrected and focused lint passed.
- Browser verification: existing signed-in Development session; selector displays Retail 10 / SME 0 / Enterprise 0; Retail welcome renders authorized cards at stable URLs; Vietnamese SME welcome/empty state checked at 390px.
- No schema, content, revision, permission or Production changes. Existing Dev/Prod drift remains outside scope.
- Next: PO business/visual review at `http://localhost:3000/en/banking-journeys`; separately authorize any release. Future CMS editing/upload requires its own design.

## 11. CMS implementation — Development only (2026-09-19)

- Approved follow-up: make Customer Segment managed CMS content with the existing draft → review → publish audit lifecycle.
- Added `ContentType.CUSTOMER_SEGMENT` and applied Development migration `20260919090000_add_customer_segment`; no Preview/Production database was accessed.
- Stable catalog identities remain `retail-banking`, `sme`, and `enterprise-banking`. Each public segment reads its own published record independently; an unpublished segment alone falls back to reviewed static content.
- Admin path: `/admin/customer-segments`. Admin creates the initial draft, edits validated EN/VI General content and Journey assignments, then submits. Review uses the existing `/review` queue; reviewer publishes, requests changes, or rejects. A later change starts as a new draft cloned from the current published revision.
- Security boundary: a Segment never grants access. Assignment validates that referenced Journeys are published; public display still starts from server-authorized Journey previews. Cross-segment duplicate published assignments are rejected.
- Current UI intentionally uses reviewed static SVGs. CMS media upload/object storage and a dedicated field editor are separate enhancements; the JSON editor is governed and schema-validated but not a final authoring UX.
- Validation: `npx tsc --noEmit`, focused segment/review tests (6/6), and `VERCEL=0 npm run build` passed. `npm run db:migrate:status` reports Development schema up to date.

## 12. JSON validation correction — Development only (2026-09-19)

- Reported issue: pasting a Journey-shaped JSON into Retail Banking caused a server Zod error. Customer Segment requires `{ schemaVersion, en, vi, journeys }`; `journeys` is an array of Journey slug strings, not Journey objects.
- No invalid data was saved. The editor now redirects back with a safe inline validation message instead of a 500 overlay, documents the required shape beside the editor, and accepts a numeric-string `schemaVersion` by normalizing it to `1`.

## 13. Independent public publish correction — Development only (2026-09-19)

- Corrected the initial all-three-published catalog gate. A published Retail change now appears on the Retail Welcome Page immediately; SME and Enterprise retain their own static fallback until each is independently published.
- This preserves CMS lifecycle, editorial independence, and access-control behavior. Validation: lint, typecheck, and all 42 test files / 294 tests pass.

## 14. Segment landing page expansion — Development only (2026-09-19)

- `/banking-journeys/segments/[segmentSlug]` is now the General landing page. It supports safe CMS `sections` blocks: `TEXT`, `FEATURE_GRID`, and internally approved `IMAGE` asset keys only.
- Authorized Journey cards moved to `/banking-journeys/segments/[segmentSlug]/journeys`, reached by CTA from the landing page. Journey authorization is unchanged and happens only on the collection route.
- Both pages now share an explicit localized `Overview / Journeys` segment navigation with active-page state. The landing also retains hero and closing CTAs; Journey cards use a subtle hover transition. Browser verification confirmed both CTAs and the segment tab resolve to the Retail Journey collection.
- Schema v1 remains readable. CMS schema accepts v1/v2 and normalizes omitted `sections` to an empty list; no database migration was required.
- Retail `IMAGE` sections using approved asset key `retail-banking` now resolve to `public/images/segments/retail-banking-orchestration.png` (1536×1024). The Retail hero remains the lightweight SVG; the orchestration diagram is reserved for the final landing-content section with responsive sizing, alt text and caption support.

## 15. Production release preparation — no Production mutation (2026-09-19)

- Prepared immutable release `customer-segments-2026-09-19-v1` from the exact Development-published Retail v2 read-back. Canonical artifact hash and Development published hash both equal `2e7811e638e5857c5f1bbc1485b4aaa9761fc44fd20368084d5137356bce9b7f`.
- SME and Enterprise are excluded because they have no Development CMS-published revisions; their static fallback remains unchanged.
- Added guarded verify/apply/rollback tooling. Promotion requires matching Production identity, explicit release confirmation, completed migration, two distinct active Production actors, valid published Journey references, no assignment collision or active draft, transactional publication, audit metadata, and final hash read-back.
- Runbook: `CUSTOMER_SEGMENT_PRODUCTION_RELEASE_RUNBOOK.md`.
- No Production deployment, migration, content write, or publish occurred. Local Production preflight was safely blocked because Vercel CLI could not retrieve Production secrets and Development `.env.local` conflicted with Production identity.
- Deployment attempt later applied the additive Production migration but correctly stopped before content promotion because the broad Production DB-operation flag was false. The release tool was then narrowed to require matching Production identity plus the exact immutable release confirmation, avoiding any need to enable the global destructive-operation flag.

## 16. Scroll responsiveness follow-up — Development only (2026-09-20)

- Reported symptom: continuous light latency while scrolling the Retail landing, including after closing competing tabs.
- Runtime inspection found no landing scroll listener, animation, filter, backdrop blur, large DOM, CMS request, or React rerender loop. The final orchestration image can cause a one-time lazy decode but does not explain continuous latency.
- A/B checks covered native document scrolling, opaque/non-sticky navbar variants, removed image clipping/shadow, and a local optimized Production build. None removed the reported latency.
- A separate static baseline on port 3001 contained no JavaScript, Next.js, CMS, image, sticky element, animation, or filter and still reproduced the latency. This rules out the Customer Segment implementation as root cause.
- The experimental CSS changes were reverted. Architecture, CMS schema/content, access controls, security checks, routes, published records, and established navbar behavior remain unchanged.
- System evidence: built-in display is 60 Hz; Chrome hardware GPU process exists; Low Power Mode is off; no swap is active. WindowServer remained around 41–45% CPU while Chrome's page renderer remained low, indicating display/compositor or browser/input latency outside the application.
- Final isolation: the same local page scrolls smoothly in Safari but remains latent in Chrome. Root cause is Chrome-specific (profile/extensions or Chrome GPU/compositor pipeline), not application code. No Production change is warranted.

## 17. SME and Enterprise orchestration media — Production release (2026-09-21)

- Approved request: add one reviewed orchestration diagram for SME and one for Enterprise, using the same governed `IMAGE` section mechanism as Retail.
- Assets are local and allowlisted only: `assetKey: "sme"` resolves to `sme-banking-orchestration.png`; `assetKey: "enterprise-banking"` resolves to `enterprise-banking-orchestration.png`. External URLs and uploads remain unsupported.
- Both files are 1672×941 PNGs. SHA-256: SME `a222028934e0c9b1e4ad6181908544e011442cd297d8f412710c23c684ee6b71`; Enterprise `620de36128639991c555afb4d8ab825463ee9fee2a5fa2531e2df6d2e48989cf`.
- No database migration, schema change, access-control change, Journey reassignment, or CMS publication is included. A diagram appears only when the segment's published CMS JSON contains a matching `IMAGE` block.
- Release must be assembled from a clean HEAD plus the documented Customer Segment release scope; the dirty workspace must not be deployed.
- Production outcome: clean deployment `dpl_EN2EXLF1KQFVT6obLVP83KFjWCX7` is `READY` at `https://babanking.vercel.app`; both downloaded assets matched their approved checksums. No CMS content or published pointer was changed.

## 18. Journey-to-Segment management foundation — Development Phase 1 (2026-09-21)

- Status: implemented and verified on Development only; Production and Preview were not changed.
- The published Customer Segment revision remains the single source of truth for Journey assignment. No database migration, new entitlement model, or public-route change was introduced.
- Journey CMS now shows Retail, SME, Enterprise, and Unassigned filters, assignment counts, and segment badges. Current Development projection is Retail 10, SME 0, Enterprise 0, Unassigned 1.
- Customer Segment CMS now provides a governed picker for published, non-archived Journeys. Journeys assigned to another published segment are disabled, and server validation still rejects duplicate assignments.
- Admin can create a stable Banking Journey as an unpublished Draft with one active Knowledge Scope and an optional planning-only segment. Planning metadata does not assign the Journey or grant access.
- New Journey drafts use the existing specialist Journey review/publish workflow and access checks. Publication and Customer Segment assignment remain separate reviewed actions.
- Existing Retail content, public Journey URLs, authorized reader behavior, access controls, and security boundaries remain unchanged. SME and Enterprise business Journey content is deferred to later phases.
- Validation: 44 test files / 303 tests, ESLint, TypeScript, diff check, and local production-style build passed.

## 19. SME and Enterprise Journey portfolio — Development Phase 2 (2026-09-21)

- Created 20 governed Development-only Journey Drafts: 10 SME and 10 Enterprise. Every identity has a segment-prefixed stable slug, one existing required Primary Knowledge Scope, version 1 Draft content, planning-only segment metadata, and an audit record.
- The two portfolios cover onboarding, accounts/deposits, payments/collections, liquidity, lending, trade finance, cards/expense, service/relationship management, security/access, and notifications. Enterprise naming and lifecycle context are corporate-specific; SME content is business/working-capital focused.
- Each initial Draft uses the existing canonical reader schema with `Overview & Scope`, `Lifecycle Stages`, and `Business Analysis`. It is a governed starting artifact, not approved bank-specific policy or final publishable business content.
- No Draft was submitted, reviewed, published, or assigned to a Customer Segment. Retail's ten published assignments and all public routes/access behavior remain unchanged.
- Journey CMS segment filters include unassigned Drafts by their planning segment, while their badge continues to state `Unassigned · planned ...`; published assignment remains the only public source of truth.
- Added guarded, idempotent Development script `db:seed:segment-journey-drafts`. It verifies environment identity, exact release confirmation, active Admin author, required scopes, content, Draft status, scope mapping, planning metadata, and audit evidence. The first apply exceeded Prisma's default interactive transaction timeout and rolled back fully; the retry used an explicit bounded timeout and committed all 20 atomically.
- Production and Preview were not accessed or changed. Phase 3 requires Product Owner/SME review, content enrichment, independent review/publish, then separately reviewed Customer Segment assignment.
- Validation passed: 45 test files / 305 tests, ESLint, TypeScript, diff check, exact Development read-back, and local production-style build.

## 20. Detailed SME and Enterprise Journey content — Development Phase 3 (2026-09-21)

- Enriched all 20 Phase 2 identities in place without changing slug, ContentItem, version, scope, owner, status or public assignment. Every item remains version 1 `DRAFT`.
- Each Journey now contains 13 canonical modules and 65 rendered sections/blocks: overview/scope, actors/channels, systems/data, six lifecycle stages, business rules/decisions, risk/compliance/controls, operating model/KPIs, and Sales/BA toolkit.
- Domain-specific templates cover onboarding, accounts/deposits, payments, liquidity, lending, trade finance, cards, service, security and notifications. SME and Enterprise retain distinct customer context, channels and operating language.
- Every lifecycle includes purpose, triggers/preconditions, inputs/evidence, process activities, rules/decisions, outputs/exit criteria, exceptions/controls and a business-process diagram. Content explicitly avoids inventing bank-specific products, limits, pricing, delegated authority or regulatory interpretation.
- Added deterministic schema/reader tests for all artifacts, unique IDs and supported block types (`RICH_TEXT`, `TABLE`, `CHECKLIST`, `CALLOUT`, `DIAGRAM`).
- Guarded Development release `segment-journey-phase-3-development-v1` updated all Drafts atomically and wrote `SEGMENT_JOURNEY_PHASE3_CONTENT_ENRICHED` audit records with before/after hashes and content metrics. Exact read-back reports `detailed: 20`, `pending: 0`.
- No Draft was submitted, reviewed, published or assigned. Independent Product/Operations/Risk/Architecture/Security review remains mandatory before CMS submission; Retail, Preview and Production remain unchanged.
- Validation passed: 46 test files / 306 tests, ESLint, TypeScript, diff check, canonical-reader compatibility, exact Development read-back, and local production-style build.

## 21. Phase 3 submission to Review Queue — Development (2026-09-21)

- Product Owner authorized submission. All 20 SME/Enterprise version 1 revisions moved atomically from `DRAFT` to `IN_REVIEW` under release `segment-journey-phase-3-submit-development-v1`.
- Exact preflight and read-back verified authored Phase 3 content, stable identities, no publication, no reviewer state, and one `JOURNEY_SUBMITTED_FOR_REVIEW` audit record per revision. Final state: `inReview: 20`, `pending: 0`.
- Submission actor is the Draft author. The existing independent-review rule remains enforced: a distinct authorized reviewer must review and publish each revision.
- No revision was reviewed, published or assigned; Retail, public routes, Preview and Production remain unchanged.
