# Phase 0 — Security Baseline

## Authorization before data

For a protected Journey request:

```text
Authenticate → check active membership → check package/Journey grant
→ query published content → render
```

No entitlement means no protected content query or render.

## Required protections

- Deep links to non-entitled Journeys return controlled 403/access-denied responses.
- Premium content is not indexed for users without entitlement.
- Draft, review, archived, and unpublished translations are never public.
- Assets are private object-storage objects; direct public URLs are not allowed.
- Downloads generate short-lived signed URLs only after Journey authorization.
- Cache/ISR must not share user-specific authorization results between users.
- Static fallback cannot bypass the database access decision.
- Server actions and route handlers enforce authorization independently of UI visibility.
- CMS changes and denied access events must be auditable at implementation time.
