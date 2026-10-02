# Glossary & Regulations — Feature Guide

> Updated: 2026-10-01 · Branch: `develop` · Deployed environment: Development
> Audience: content administrators/editors, reviewers, and engineers continuing the work.

## 1. Purpose

Glossary & Regulations is a **members-only** reference library with two kinds of entry:

| Kind | `kind` | Used for | Examples |
|---|---|---|---|
| Term | `TERM` | Banking concepts, abbreviations, operational vocabulary | KYC, LTV, NAPAS, Escrow, ISO 20022 message |
| Regulation | `REGULATION` | Legal instruments and industry standards, Vietnamese and international | SBV circulars, government decrees, laws; Basel III, PCI DSS, FATF Recommendations |

English text is required and is the only language on `/en` pages; optional Vietnamese text is shown on `/vi` pages, which fall back to English when an entry has none (owner decision 2026-10-01). Aliases and the stored issuer are English; `/vi` shows Vietnamese names for the SBV, Government and National Assembly. Entries can link **term ↔ regulation** and **entry ↔ Banking Journey**. Content follows the same governed editorial workflow (Draft → In Review → Publish) as other governed content.

## 2. Who sees what

| User | Access |
|---|---|
| Anonymous visitor | Nothing; every `/glossary` route redirects to login (307). Not in the sitemap; `robots.txt` disallows `/en/glossary` and `/vi/glossary`. |
| Member with an ACTIVE membership | **Published** entries whose package grants VIEW on scope `BANKING_GLOSSARY`. |
| ADMIN | Create, edit, submit, review, publish, roll back and archive in the CMS. ADMIN may review/publish their own revision (owner decision 2026-10-01). |
| REVIEWER / CONTRIBUTOR | Cannot review or publish their own revision. Reviewers work from `/review` when granted REVIEW/PUBLISH on the scope. |

In Development, `BANKING_GLOSSARY` currently grants VIEW to all three active packages: `PAYMENT_KNOWLEDGE_PACK`, `BANKING_BA_FOUNDATION`, `FULL_KNOWLEDGE_ACCESS`.

Links to other entries or Journeys **never grant access**: the detail page only shows links the reader is independently authorized to view.

## 3. Member pages

### `/glossary` — Index
- Search across the English name, abbreviation, aliases, document number and short definition; on `/vi` also the Vietnamese name and definition (case- and diacritic-insensitive, `dinh danh` matches `Định danh`).
- Filters: kind (Term/Regulation), domain, jurisdiction (only values in use are listed).
- A–Z bar (`#` for entries starting with a digit or other character); letters with no entries are dimmed.
- Regulation cards show the document number, issuer and an in-force status badge.

### `/glossary/[slug]` — Detail
- Name, short definition, domains, aliases, in the page language (content carries the matching `lang` attribute).
- **Details** and **BA notes** (plain text; a blank line separates paragraphs).
- Sources (open in a new tab with `rel="noopener noreferrer nofollow"`).
- For regulations: an information card with status, document number, issuer, jurisdiction, issued and effective dates and "Superseded by", plus the notice *"Reference summary for analysis only. Always confirm against the official legal text."*
- Related terms & regulations, related Journeys, last verified date.

### Inside a Banking Journey
The bottom of `/banking-journeys/[slug]` shows a **"Terms & regulations in this Journey"** panel listing published entries that selected that Journey under Related Journeys.

### Global search
Published entries appear in `/search` with type **Glossary Entry**.

## 4. Data model

- `ContentType.GLOSSARY_ENTRY`: each entry is a `ContentItem` (immutable slug) with versioned `ContentRevision`s.
- `ContentItem.publishedRevisionId` points at the revision members see. `previewJson` is written only on **create** and on **publish/rollback**, never on draft save.
- Each entry has one required `ContentKnowledgeScope` mapping (`PRIMARY`, `isRequired`) to scope `BANKING_GLOSSARY`. Without it, access is denied (fail closed).

### 4.1 Content schema (`schemaVersion: 1`, strict — unknown fields are rejected)

| Field | Required | Limits / rules |
|---|---|---|
| `schemaVersion` | ✔ | Must be `1` |
| `kind` | ✔ | `TERM` \| `REGULATION` |
| `abbreviation` | | ≤ 40 characters |
| `aliases` | | English only; ≤ 20 items, each ≤ 120 characters, unique (case-insensitive) |
| `domains` | ✔ | ≥ 1, unique; values: `PAYMENTS`, `LENDING`, `CARDS`, `DEPOSITS`, `AML_KYC`, `RISK`, `TREASURY`, `TRADE_FINANCE`, `DIGITAL_BANKING`, `DATA_REPORTING`, `SECURITY`, `ACCOUNTING`, `GENERAL` |
| `en` | ✔ | `name` (1–200), `shortDefinition` (10–600), `body` (≤ 20,000), `baNotes` (≤ 5,000) |
| `vi` | | Optional, same fields as `en`; shown only on `/vi`. Omitted when all Vietnamese fields are blank. |
| `regulation` | ✔ for `REGULATION`, forbidden for `TERM` | see 4.2 |
| `relatedEntrySlugs` | | ≤ 30 slugs, unique, must not point to itself |
| `relatedJourneySlugs` | | ≤ 30 Journey slugs, unique |
| `sources` | | ≤ 20; `title` (2–300), `publisher` (≤ 200), `url` must be `https://` |
| `lastVerifiedAt` | | `YYYY-MM-DD` |

Slug: lowercase letters, digits and hyphens (`^[a-z0-9]+(-[a-z0-9]+)*$`), 2–120 characters.

### 4.2 Regulation details (`regulation`)

| Field | Required | Notes |
|---|---|---|
| `jurisdiction` | ✔ | Two-letter uppercase ISO code (`VN`, `SG`, `EU`…) or `INTERNATIONAL` |
| `issuer` | ✔ | In English, e.g. State Bank of Vietnam (SBV), Government of Vietnam, National Assembly of Vietnam, BCBS, PCI SSC, FATF |
| `documentNumber` | ✔ | The official identifier in its native format, e.g. `xx/yyyy/TT-NHNN`, `PCI DSS v4.0.1` |
| `issuedDate`, `effectiveDate` | | `YYYY-MM-DD`; effective date cannot precede issued date |
| `status` | ✔ | see below |
| `supersededBySlug` | | Allowed only when `status = SUPERSEDED` |

| `status` | Label EN / VI | When to use |
|---|---|---|
| `IN_FORCE` | In force / Còn hiệu lực | Applies as issued |
| `AMENDED` | Amended / Đã sửa đổi | Still in force but partly amended or supplemented |
| `SUPERSEDED` | Superseded / Đã được thay thế | Replaced by another instrument; set `supersededBySlug` |
| `REPEALED` | Repealed / Hết hiệu lực | Revoked with no direct replacement |

### 4.3 JSON example (Advanced JSON)

> Values below **only illustrate the structure**. The number, dates and status of any real regulation must be verified by the author against the official text before publishing.

```json
{
  "schemaVersion": 1,
  "kind": "TERM",
  "abbreviation": "KYC",
  "aliases": ["Know Your Customer"],
  "domains": ["AML_KYC"],
  "en": {
    "name": "Know Your Customer",
    "shortDefinition": "Process a bank uses to identify and verify a customer before and during the relationship.",
    "body": "Paragraph one.\n\nParagraph two.",
    "baNotes": "Capture which identity evidence each channel accepts."
  },
  "relatedEntrySlugs": ["ekyc-regulation-example"],
  "relatedJourneySlugs": ["customer-onboarding"],
  "sources": [{ "title": "Official text", "publisher": "Issuer name", "url": "https://example.org/document" }],
  "lastVerifiedAt": "2026-10-01"
}
```

```json
{
  "schemaVersion": 1,
  "kind": "REGULATION",
  "aliases": [],
  "domains": ["AML_KYC", "DIGITAL_BANKING"],
  "en": { "name": "eKYC regulation (example)", "shortDefinition": "Example regulation entry showing the required structure.", "body": "", "baNotes": "" },
  "regulation": {
    "jurisdiction": "VN",
    "issuer": "State Bank of Vietnam (SBV)",
    "documentNumber": "xx/yyyy/TT-NHNN",
    "issuedDate": "2020-01-01",
    "effectiveDate": "2020-03-01",
    "status": "IN_FORCE"
  },
  "relatedEntrySlugs": ["kyc"],
  "relatedJourneySlugs": ["customer-onboarding"],
  "sources": [],
  "lastVerifiedAt": "2026-10-01"
}
```

## 5. Editorial workflow (CMS)

Path: **Admin → Contributor → Glossary & Regulations** (`/admin/contributor/glossary`).

1. **Create an entry**: enter the slug (permanent), English name and kind → *Create draft*. The system creates a v1 DRAFT with **placeholder** definitions and regulation details (`TBD`).
2. **Write the content** in the structured form:
   - Type, Abbreviation, Last verified, Aliases (comma- or newline-separated), Domains.
   - English (required, shown on /en) and Tiếng Việt (optional, shown on /vi) columns: Name, Short definition, Details, BA notes.
   - Regulation details (used only when Type = Regulation).
   - Related terms & regulations (slugs, with suggestions from published entries), Related Journeys (checkboxes).
   - Sources: one per line as `Title | Publisher | https://url` (the last two are optional).
   - *Save draft*, or paste the full content in **Advanced JSON**.
3. **Submit for review** → `IN_REVIEW`.
4. **Review** (in the editor or at `/review`):
   - *Publish* — makes this revision visible to members.
   - *Request changes* / *Reject* — a note of at least 10 characters is required; the author sees it in the editor.
5. **Edit a published entry**: *Create new draft* (copies the published revision into a new version). The published revision is untouched until the new one is published.
6. **Rollback**: in *Revision history*, click *Restore this version* on a previously published revision.
7. **Archive / Restore**: hide an entry from members without deleting its history.

### Publish preconditions

Publishing is rejected when:
- The placeholder definition remains, or `issuer` / `documentNumber` is `TBD`.
- A linked glossary entry **does not exist or is archived** (linked entries may still be drafts), or a linked Journey is **not published** (the error lists each one).
- The entry links to itself.
- The draft changed state, or the publication pointer was changed concurrently by someone else.

Reciprocal links can be published in any order; members only see a link once the target is published and they may view it.

### Content principles

- **Never invent legal content**: document number, issued date, effective date and status must come from the official text, with the source recorded.
- Always update **Last verified** after re-checking a regulation.
- When a regulation is replaced: set `status` to `SUPERSEDED`, set `supersededBySlug`, and keep the old entry.
- `shortDefinition` should be 1–2 self-contained sentences; details and examples go in `body`; the BA angle (requirements, rules, data to capture) goes in `baNotes`.

## 6. Controls & audit

- Every write runs in a transaction with state-conditional updates, a SHA-256 read-back check and an `AuditLog` entry:
  `GLOSSARY_ENTRY_CREATED`, `_DRAFT_CREATED`, `_DRAFT_UPDATED`, `_SUBMITTED`, `_CHANGES_REQUESTED`, `_REJECTED`, `_PUBLISHED`, `_ROLLED_BACK`, `_ARCHIVED`, `_RESTORED`, `_IMPORTED_AS_DRAFT`; scope setup logs `GLOSSARY_SCOPE_CONFIGURED`.
- Writes are allowed only when `APP_ENV` and `DATABASE_ENVIRONMENT` match (development or production), using the same guard as the Journey CMS.

## 7. Operations

| Task | Command / notes |
|---|---|
| Environment check | `npm run db:check-env` (must report Development / Development) |
| Migration | `20261001090000_add_glossary_entry` — adds the enum value only. Applied in Development. Vercel deploys run `migrate deploy`. |
| Scope & package grants | `npm run db:seed:glossary-scope` (read-only) → `npm run db:seed:glossary-scope -- --apply`. Development only, idempotent, audited. Packages activated later need a re-run or a grant in `/admin/access-control`. |
| Starter content | `content/glossary/banking-glossary-starter-v1.json` (38 terms, 17 regulations; English plus Vietnamese text). Validate: `npm run db:import:glossary-drafts` (read-only). Import: `GLOSSARY_IMPORT_AUTHOR_EMAIL=<admin> npm run db:import:glossary-drafts -- --apply`. Creates **v1 DRAFTs** only, skips existing slugs, never submits or publishes. |
| Production | **Not deployed.** Needs separate approval: migration, scope creation, package grants, then content. |

## 8. Code map

| Component | Path |
|---|---|
| Schema, filtering, A–Z | `src/server/glossary/glossary-domain.ts` |
| Reads (access-filtered) | `src/server/glossary/glossary-repository.ts` |
| Governed workflow | `src/server/glossary/glossary-service.ts` |
| Form → content mapping | `src/server/glossary/glossary-form.ts` |
| Starter file validation | `src/server/glossary/glossary-starter.ts` |
| Member pages | `src/app/glossary/` |
| Journey panel | `src/components/glossary/RelatedGlossaryPanel.tsx` |
| Page labels (EN/VI UI chrome) | `src/components/glossary/glossary-copy.ts` |
| CMS | `src/app/admin/contributor/glossary/` |
| Review queue | `src/app/actions.ts` (`reviewRevisionAction`), `src/server/review/generic-review-workflow.ts` |
| Scripts | `scripts/seed-glossary-scope.ts`, `scripts/import-glossary-drafts.ts` |
| Tests | `src/server/glossary/*.test.ts` |

## 9. Current state, limitations and next steps

- Development has 55 imported entries with English and Vietnamese text: `kyc` is published as v3 (v1 bilingual trial, v2 English-only, v3 bilingual — all on 2026-10-01); the other 54 are DRAFTs.
- Development has no active MEMBER accounts, so the member view was verified with repository checks and an ADMIN account, not with a real member session.
- `body` and `baNotes` are plain text (no tables, diagrams or bold/italic).
- Two-way links must be added on both entries.
- The starter content is AI-drafted: **every regulation must be checked against the official text** (number, issued date, effective date, status — especially instruments that may have been amended or replaced after 2024, such as the 2024 Law on Credit Institutions, Decree 13/2023, Decision 2345/2023 and Circular 50/2024), with sources and `lastVerifiedAt` added before publishing.
- Production is not deployed.
