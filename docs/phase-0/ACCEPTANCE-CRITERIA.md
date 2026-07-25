# Phase 0 — Acceptance Criteria

Phase 0 is complete when the following are reviewed and approved:

- Product scope and non-goals are explicit.
- Five domain boundaries and responsibilities are consistent.
- High-level flow from Identity to published Journey is documented.
- Journey hierarchy is Journey → Module → Section → Block → Asset reference.
- Membership and Knowledge Access are separated.
- Access is Journey-level, not Section/Block/Asset-level.
- CMS workflow is Draft → Review → Published → Archived.
- Security baseline covers query-before-authorization, deep links, search, downloads, assets, and static leakage.
- Migration includes backfill, shadow read, feature flag, parity validation, and rollback.
- Admin capabilities and boundaries are defined.
- Phase 1 begins detailed ERD, Prisma schema, repositories, services, API contracts, indexes, transactions, caching, and implementation flags.
- No application code, Prisma migration, seed, or Production data mutation is part of Phase 0.

Approval of these documents establishes a Product Architecture Baseline, not an irreversible enterprise technical specification.
