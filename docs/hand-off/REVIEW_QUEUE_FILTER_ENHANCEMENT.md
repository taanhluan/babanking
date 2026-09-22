# Review Queue filter enhancement — Development

Date: 2026-09-21

- Default order prioritizes `IN_REVIEW`, followed by `CHANGES_REQUESTED`, `PUBLISHED`, and `REJECTED`; each group remains newest-submitted first.
- Added server-side URL filters for status and content type, including specialized BA Documents.
- Rows have distinct status tones. `IN_REVIEW` is labeled `Needs review`; completed/history rows use `View revision` instead of `Open review`.
- Existing reviewer role, author separation, Knowledge Scope and BA Document Primary Journey checks remain the source of authorization. Filter values only narrow the authorized query.
- No schema, migration, workflow transition, CMS content, or Production change.
- ESLint, TypeScript, and focused review/Journey tests passed (31 tests).
