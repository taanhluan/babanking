# Phase 0 — Knowledge Access Model

## Entitlement flow

```text
User
  ↓
Membership status
  ↓
Knowledge Package assignment
  ↓
Package includes Journey
  ↓
Journey has Published Revision
```

Membership answers commercial eligibility. Package mapping answers what the user may read.

## Product matrix

| Actor/state | Published entitled Journey | Non-entitled Journey | CMS operations |
|---|---:|---:|---:|
| Guest | No | No | No |
| Pending/expired/suspended membership | No | No | No |
| Active member | Yes, if package includes it | No | No |
| Contributor | According to membership/package | No | Draft operations only when assigned |
| Reviewer | According to membership/package | No | Review operations when assigned |
| Admin | Operational bypass for administration | Operational bypass | Full CMS |

## Invariants

- Access is granted only at Journey level.
- No Section, Module, Block, API, or Asset grant exists in this phase.
- Missing entitlement returns a controlled 403/access-denied result.
- Access is checked before protected content query, render, search result, or download URL generation.
