# Phase 0 — Migration Strategy

## Target

Move the ten existing static Banking Journeys into the CMS without changing public slugs or causing downtime.

## Sequence

```text
Static source
  ↓
Content mapping and backfill (development)
  ↓
Preview parity validation
  ↓
Shadow read / compare
  ↓
Feature flag selects CMS reads
  ↓
Production CMS read
  ↓
Remove static fallback after verification
```

## Safety

- Preserve current slugs, locale routes, links, and access behavior.
- Keep static source read-only until CMS parity is proven.
- Use additive, reviewed migration and idempotent backfill.
- Validate content counts, rendered output, translations, access decisions, and asset links.
- Rollback is the feature flag switch back to the static repository while the CMS data remains preserved.
- No destructive Prisma command, production reset, or unreviewed production seed is allowed.
