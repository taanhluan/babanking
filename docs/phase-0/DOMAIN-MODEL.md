# Phase 0 — Domain Model

## Identity

Owns users, authentication, account status, sessions, and identity lifecycle. It does not decide content access.

## Membership

Owns commercial/account eligibility: `PENDING`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, and `CANCELLED`. It does not own Journey content or editorial workflow.

## Knowledge Content

Owns the catalog of Journeys and their content structure: Module, Section, Block, Translation, Revision, and content metadata.

## Knowledge Access

Owns Knowledge Packages, Package-to-Journey mapping, entitlement evaluation, and denied-access outcomes. Access is granted at Journey level.

## CMS

Owns editorial create/edit/preview/review/publish/archive operations, asset metadata, translation operations, and audit intent.

## Boundary relationships

```text
Identity → Membership eligibility
Membership → Knowledge Package entitlement
Knowledge Package → Journey access
CMS → Published Knowledge Content
Knowledge Access → Published Knowledge Content visibility
```

Package grants access to Journeys; it is not the physical parent of Journey content. One Journey may be included in multiple Packages.
