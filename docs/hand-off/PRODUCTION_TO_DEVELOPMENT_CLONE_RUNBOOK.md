# Production to Development Safe Clone Runbook

## Purpose and threat model

This tooling prepares a **sanitized** representation of Production business state for a future Development replacement. It never permits a raw database clone, raw dump/restore, Production mutation, copied credentials, copied password hashes, activation material, real PII, or payment credentials.

The default mode is dry-run. The current CLI intentionally has no live reader wiring.

## Policy

- Copy: plans, plan translations, knowledge scopes, content-scope mappings, packages, package permissions.
- Sanitize: users, requests, memberships, payments, renewals, content/revisions/translations, grants and assignments.
- Exclude: activation tokens, bookmarks, reading activity, career preferences, audit logs.
- Synthesize: Development-only personas after a separate authorization.

Unknown models or sensitive fields fail closed. Business content is not blindly redacted: a detected issue stops with `CONTENT_SENSITIVITY_REVIEW_REQUIRED`.

## Future source gates

Before any live dry-run, a human operator must prove all of the following independently:

1. Canonical Vercel Production project, alias and deployment SHA.
2. Neon Production branch identity.
3. A dedicated source role has `SELECT` only.
4. Source transaction is `READ ONLY`.
5. Target runtime reports `APP_ENV=development` and `DATABASE_ENVIRONMENT=development` through `npm run db:check-env`.
6. Production operations remain disabled on the target.

Failure is `ENVIRONMENT_MISMATCH`. Hostnames, `.env.local`, and variable names alone are not proof.

## Dry-run procedure

1. Run only a reviewed reader implementation that satisfies `ReadOnlySourceReader`.
2. Verify source proof before reading rows.
3. Stream source rows into the in-memory sanitizer; never write raw rows to disk.
4. Validate forbidden-material counters. Reports contain only model names, paths, categories and counts.
5. Stop on any finding. No Development write occurs in dry-run.

## Sanitization and content stop

Users become `Development User NNNN` and `dev-user-NNNN@example.test`; Production user IDs are remapped only in memory. Production password hashes are never copied. Payment references become deterministic Development references and notes are removed. Activation-token rows and AuditLogs are excluded.

Scan every free-form/JSON value for credentials, private keys, connection strings, real email/phone, payment patterns and Production URLs/callbacks. Do not print matches. Sensitive governed content requires human review, never automatic redaction.

## Future staging and replacement

Only sanitized data may enter a Development staging area. Validate staging before any replacement. Replacement requires all of:

```text
DEVELOPMENT_REPLACEMENT_AUTHORIZED=true
TARGET_IDENTITY_VERIFIED=true
SANITIZED_DATASET_VALID=true
STAGING_VALID=true
SOURCE_READ_ONLY_VERIFIED=true
```

Future load order: users; plans/scopes/packages; translations/permissions; ContentItems with cyclic pointers null; revisions/translations; restore pointers and Primary Journey; mappings; membership/payment/request/renewal; grants/assignments.

## Post-load checks and personas

All FK, unique, published-pointer, translation-pointer, BA Document Primary Journey, membership/payment, grant/package, Journey slug and revision-history error counts must be zero. Create separate Development-only MEMBER, CONTRIBUTOR, REVIEWER and ADMIN personas only after a later authorization. Do not create a universal password or reuse cloned identities.

## Abort conditions

Abort without target write on identity mismatch, missing source proof, sanitizer finding, content sensitivity review, invalid staging, incomplete replacement gate, or non-zero integrity count.
