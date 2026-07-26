# Authentication and Access Control

## Core Invariants

- Authentication uses signed HTTP-only sessions.
- Non-admin premium access requires an active account and a current active membership.
- ADMIN bypass is centralized for administration, not editorial self-approval.
- Locale is never an authorization input.
- Perform authorization before reading protected content or using fallback data.
- Server pages/actions remain authoritative.

## Matrices

Reuse:

- Role Matrix;
- Knowledge Access Matrix;
- package permissions;
- content/Journey grants;
- workflow policy.

Do not create a parallel CMS permission system or account-specific exceptions.

## Journey Editorial Independence

- Contributor may edit an authorized owned Draft.
- Reviewer/Admin needs review/publish permission.
- Author ID and reviewer/publisher ID must differ.
- ADMIN cannot self-review or self-publish.

## Public and Premium Data

- Do not place premium content in public metadata, sitemap, client bundles, teaser payloads, RSS, downloads, or static fallback.
- Public listings include only published, non-archived content.
- Workflow queries may access unpublished metadata only after authorization.

## Primary Files

- `src/lib/auth.ts`
- `src/lib/permissions.ts`
- `src/lib/access-policy.ts`
- `src/server/access-control/`
- `src/server/cms/journey-cms-authorization.ts`
- `src/server/cms/journey-cms-policy.ts`
- protected page-level loaders
