# Phase 0 — High-Level Architecture

```text
Guest / Member
      ↓
Next.js route and server action
      ↓
Identity authentication
      ↓
Membership eligibility
      ↓
Knowledge Package → Journey entitlement
      ↓
Published-content repository
      ↓
Prisma / Neon metadata and content
      ↓
Object Storage for protected assets
      ↓
Rendered Journey / authorized signed download
```

## Product flow

```text
Guest → Landing → Login / Request Access → Membership Active
      → Package assigned → Open entitled Journey
      → Read published content / download authorized assets
```

## Technology direction

- Next.js/Vercel remains the application layer.
- Neon/PostgreSQL remains the metadata/content database.
- Prisma remains the ORM.
- Object Storage holds binary assets; Neon holds metadata and storage keys.
- Existing development, Preview, and Production isolation remains mandatory.

This is a logical architecture, not a finalized Prisma or deployment design.
