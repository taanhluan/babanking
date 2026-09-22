# Journey hierarchy v2 — Development Phase 1

Date: 2026-09-21

## Scope

- Added optional `subsections` to each Journey section.
- Maximum 20 sections per module and 20 subsections per section.
- Supported structure: Module → Section → Subsection.
- `schemaVersion` accepts v1 and v2.
- Existing v1 JSON remains valid and is not rewritten.
- Canonical reader maps subsections to existing `children`; no new block renderer or access model was added.

## Revision behavior

- Existing Published revisions are unchanged.
- A new revision may use v2 hierarchy.
- When editing a v2 revision, omitted schema version preserves v2; v1 content remains v1.
- No automatic data migration or mass restructuring was performed.

## Validation

- 34 focused tests passed.
- ESLint passed.
- TypeScript passed.
- Production and Preview were not changed.

## Next phase

Phase 2 and Phase 3 are complete on Development: Reader/sidebar/navigation supports the hierarchy; the Business Editor supports creating, renaming and removing subsections, plus adding/removing blocks within each subsection. No data migration or Production deployment was performed.
