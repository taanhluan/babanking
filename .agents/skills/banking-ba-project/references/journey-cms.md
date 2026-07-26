# Journey CMS and Public Reader

## Canonical Contract

```text
ContentItem.publishedRevisionId
→ ContentRevision.contentJson
→ public Journey renderer
```

Keep public URLs stable:

```text
/[locale]/banking-journeys/[slug]
```

Keep controlled editing under:

```text
/[locale]/admin/contributor/journeys
/[locale]/admin/contributor/journeys/[slug]
```

## Identity and Revision Rules

- Reuse the existing `ContentItem`.
- Treat `ContentItem.slug` as immutable stable identity.
- Never modify a published revision.
- Create a new Draft from the current published revision.
- Save only the active Draft.
- Preserve revision history.
- Do not create a replacement ContentItem to edit an existing Journey.
- Archive mistaken duplicates; do not casually delete historical records.

## Workflow

```text
Published
→ create Draft clone
→ Save Draft
→ IN_REVIEW
→ independent Review
→ independent Publish
```

Author cannot review or publish their own revision. ADMIN does not bypass this rule.

Publish must transactionally:

- validate role, permission, ownership, state, content, and stable slug;
- conditionally update `publishedRevisionId`;
- mark the revision published;
- synchronize `previewJson` title and summary;
- write AuditLog;
- preserve previous revisions;
- invalidate CMS list/editor and public Journey caches.

Rollback repoints publication transactionally and keeps history.

## Content JSON

Support:

- legacy Journey JSON;
- generic `modules → sections → blocks`.

Do not hard-code Journey-specific fields in the renderer. Do not render arbitrary raw HTML. Validate with Zod and reject privileged metadata such as status, version, author, reviewer, schema version, publication pointer, or preview metadata.

## Existing Development Snapshot

Ten canonical active Journey slugs:

- `cards`
- `customer-onboarding`
- `customer-service`
- `deposits`
- `lending`
- `notification-and-engagement`
- `payments-and-transfers`
- `personal-finance-management`
- `security-and-access`
- `wealth-and-investment`

`payments-and-transfers` currently publishes v3. `paymentsandtransfers` is an archived mistaken duplicate.

Always re-read the database before relying on this snapshot.

## Legacy Creation Boundary

`/contributor/content/new` supports non-Journey content only. Existing Journeys are edited through Journey CMS. A new Banking Journey requires a future controlled creation flow; do not restore generic Journey creation.

## Primary Files

- `src/server/cms/`
- `src/app/admin/contributor/journeys/`
- `src/components/content/DatabaseContent.tsx`
- `src/app/contributor/content/new/page.tsx`
- `src/lib/validation.ts`
