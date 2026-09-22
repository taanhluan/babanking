# BANKING PROJECT RELEASE & TROUBLESHOOTING SKILL

**Project:** Banking BA Knowledge Hub  
**Repository:** `/Users/jonathanta/BA Master`  
**Purpose:** Reusable operational skill for auditing, implementing, promoting, verifying, troubleshooting, and rolling back Banking Journey changes safely across Development and Production.

---

## 1. Purpose and scope

This skill consolidates the operational lessons learned while enhancing and releasing Customer Onboarding, Deposits, Cards, Lending, and Customer Service / Digital Assist. It should be read before future Banking Journey implementation or Production promotion work.

The main goal is to prevent repeated failures around environment isolation, Vercel resolution, Neon database identity, CMS revision workflow, canonical hash drift, mapper metadata loss, BPMN integrity, authorization regression, cross-Journey scope leakage, unexpected code deployment, dirty worktrees, and unverifiable runtime claims.

This is project-specific. It does not replace the core `BANKING_JOURNEY_ENHANCEMENT_SKILL.md`; it complements that skill with release operations, failure handling, and troubleshooting experience.

---

## 2. Architecture baseline

The Banking BA Knowledge Hub is a Banking knowledge-sharing platform, not an LMS.

Technology baseline:

- Next.js App Router
- TypeScript
- TailwindCSS
- Neon PostgreSQL
- Prisma
- Vercel

Core domains:

- Identity
- Membership
- Knowledge Content
- Knowledge Access
- CMS

Authorization flow:

```text
Identity
→ Membership
→ Knowledge Package
→ Journey Grant
→ Published Journey
```

The Journey is the security boundary. Authorization must be enforced server-side before protected Journey content or metadata is returned.

Canonical Journey rendering pipeline:

```text
ContentRevision.contentJson
→ ContentRepository
→ Canonical Journey Mapper
→ CanonicalJourney
→ SharedJourneyReader
→ JourneyNavigator
→ JourneyBlockRenderer
→ BusinessProcessDiagram
```

Default rule: extend content, not architecture. Do not create domain-specific readers, navigators, renderers, CMS layers, permission models, schemas, or mapper branches unless a real generic capability gap is proven.

---

## 3. Environment model — exactly two product environments

The project has exactly:

```text
Development
Production
```

Do not introduce Preview or Staging as product environments. Vercel may use provider terminology such as preview deployment, but the project release model remains Development and Production.

Expected environment identity:

### Development

```text
APP_ENV=development
DATABASE_ENVIRONMENT=development
ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
```

### Production

```text
APP_ENV=production
DATABASE_ENVIRONMENT=production
ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
```

`ALLOW_PRODUCTION_DATABASE_OPERATIONS=false` must remain false during normal work. Governed CMS business writes are allowed; destructive technical database operations remain denied.

---

## 4. Critical incident: `.env.local` shadowed Production Vercel values

### Symptom

A Production promotion was stopped after:

```bash
npx vercel env run -e production
```

appeared to resolve:

```text
APP_ENV=development
DATABASE_ENVIRONMENT=development
ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
```

The release correctly stopped because the result did not satisfy the Production safety gate.

### Actual root cause

Vercel Production variables were already correct. Repository `.env.local` contained Development values and shadowed the remotely downloaded Production variables during the local CLI invocation.

Direct cloud-scope inspection and clean-directory resolution showed:

```text
Development: development / development / false
Production:  production  / production  / false
```

### Correct diagnostic procedure

Do not use repository-local `npx vercel env run -e production` as the sole Production proof when `.env.local` exists.

Use one of:

1. Direct Vercel cloud-scope inspection.
2. A clean temporary directory linked to the same Vercel project without repository `.env.local`.
3. Another remote-scope method that is independent from local dotenv precedence.

### Correct fix

In this incident:

```text
Vercel variable changes: NO
.env.local changes: NO
redeploy: NO
```

The issue was diagnostic, not configurational.

### Preventive rule

Never change Production environment variables simply because a local command shows `development`. First establish whether the value came from Vercel cloud scope or local dotenv shadowing.

---

## 5. Vercel project binding gate

Known project identity at the time this skill was created:

```text
Project: babanking
Project ID: prj_gZaFRjHKk3saktcFyg8X6EYiv4tc
Team/account: taanhluans-projects
Production branch: main
Canonical Production alias: https://babanking.vercel.app
```

A local `.vercel/project.json` may contain a stale cached project name. Project ID is stronger evidence than the cached display name.

Before Production work:

```text
local linked project ID
=
actual babanking project ID
```

If not:

```text
STOP: VERCEL_PROJECT_BINDING_MISMATCH
```

Do not mutate environments or Production content under uncertain project binding.

---

## 6. Database isolation

Development and Production must resolve to distinct Neon targets.

Previously verified endpoints included:

```text
Development:
ep-crimson-moon-azxy1ao5-pooler.c-3.ap-southeast-1.aws.neon.tech

Production:
ep-quiet-snow-azmaehn4-pooler.c-3.ap-southeast-1.aws.neon.tech
```

These are historical evidence only; re-resolve when needed.

Safe identity checks may report provider, host/project identifier, database name, and environment classification. Never print passwords, full connection URLs, tokens, or credentials.

If Production appears to point to Development:

```text
STOP: PRODUCTION_DATABASE_TARGET_MISMATCH
```

Do not repair that situation by changing only `DATABASE_ENVIRONMENT=production`. A label does not make a Development database into Production.

Never use Development→Production DB copy, reset, seed, or clone as a Journey promotion shortcut.

---

## 7. Classify every release before executing

### Content-only release

Typical canonical Journey enhancement:

```text
CONTENT: changed
CMS: new governed revision
SOURCE CODE: none
SCHEMA: none
MIGRATION: none
DEPENDENCY: none
APPLICATION DEPLOYMENT: none
```

This pattern was validated repeatedly with Deposits, Cards, Lending, and Customer Service.

If shared platform capabilities already exist, CMS content changes do not require an application deployment.

### Generic capability release

Only when canonical JSON cannot be represented/rendered by the current shared architecture.

Required before implementation:

```text
Audit
→ Impact Analysis
→ Proposed Solution
→ Risks
→ Rollback Strategy
→ Product Owner approval
```

If a task unexpectedly needs code:

```text
STOP: GENERIC_CAPABILITY_GAP
```

Report current behavior, root cause, affected generic component, why canonical JSON is insufficient, smallest reusable fix, impact, risk, and rollback.

---

## 8. Generic mapper metadata lesson

A shared mapper fix was required to preserve business-process diagram metadata:

```text
scope
businessRules
validationCategories
successOutcome
```

Historical capability fix:

```text
89f27b85e95596e1d4e9fa74ed5736f836d8accc
fix(journeys): preserve business process diagram metadata
```

For future Production promotions, verify the deployed code contains this capability or equivalent descendant behavior. Do not assume the historical SHA remains the current Production SHA.

If Production would lose these fields:

```text
STOP: PRODUCTION_GENERIC_MAPPER_FIX_MISSING
```

Do not publish content that Production will silently degrade.

---

## 9. Canonical Journey marker and legacy-reader troubleshooting

Canonical content must contain:

```json
{
  "metadata": {
    "journeyReader": "canonical"
  }
}
```

Common symptom:

```text
content exists
but JourneyNavigator is absent
BPMN is absent
legacy article layout appears
```

Check in this order:

1. `metadata.journeyReader`
2. structured modules validity
3. canonical mapper output
4. reader dispatch
5. SharedJourneyReader
6. JourneyNavigator
7. JourneyBlockRenderer
8. BusinessProcessDiagram

Do not jump directly to React changes. Many apparent UI failures are content/dispatch failures.

---

## 10. CMS revision lifecycle

Required normal lifecycle:

```text
PUBLISHED
→ DRAFT
→ IN_REVIEW
→ PUBLISHED
```

Other governed states may include:

```text
CHANGES_REQUESTED
ARCHIVED
```

Rules:

- no hard delete
- preserve historical revisions
- no direct status mutation
- no direct `publishedRevisionId` mutation
- no fake reviewer
- no self-approval bypass when prohibited
- Production reads published revisions only
- rollback goes through governed CMS workflow

A release report should record author, independent reviewer, submitted timestamp, published timestamp, new revision ID, version, status, and final `publishedRevisionId`.

---

## 11. Concurrency gate

A baseline audit performed earlier is not enough.

Immediately before any CMS mutation re-read:

```text
ContentItem
publishedRevisionId
active DRAFT
active IN_REVIEW
active CHANGES_REQUESTED
```

If baseline changed:

```text
STOP: <DOMAIN>_DEVELOPMENT_BASELINE_CHANGED
```

or:

```text
STOP: PRODUCTION_<DOMAIN>_BASELINE_CHANGED
```

If an active editable/review revision already exists, do not automatically create a duplicate. Inspect it and continue only if the normal workflow clearly supports doing so safely.

---

## 12. Exact approved content promotion

Once Development is approved, Production should receive the exact approved artifact.

Do not:

- merge legacy Production content
- reconstruct JSON manually
- regenerate BPMN during release
- rename modules
- change IDs
- clean up wording
- normalize states
- add new business scope

Development approval establishes the content source of truth. Production promotion is not another design phase.

---

## 13. Four-way hash contract

Required equality:

```text
SOURCE_HASH
=
SAVE_PAYLOAD_HASH
=
PERSISTED_DRAFT_HASH
=
PUBLISHED_HASH
```

### SOURCE_HASH

Canonical hash of the approved local JSON artifact.

### SAVE_PAYLOAD_HASH

Hash of the exact object passed to the CMS save operation.

### PERSISTED_DRAFT_HASH

Hash calculated from the exact saved Draft read back from the environment database.

### PUBLISHED_HASH

Hash of the exact final Published revision read from the database.

### Stop rules

Before save:

```text
SAVE_PAYLOAD_HASH != SOURCE_HASH
→ STOP BEFORE SAVE
```

After save:

```text
PERSISTED_DRAFT_HASH != SOURCE_HASH
→ STOP BEFORE REVIEW
```

After publish:

```text
PUBLISHED_HASH != SOURCE_HASH
→ RELEASE VERIFICATION FAIL
```

A CMS toast or success response is not sufficient release evidence.

---

## 14. Stable hashing methodology

Use the same algorithm for all four boundaries:

1. Parse JSON.
2. Recursively sort object keys.
3. Preserve array order.
4. Serialize consistently.
5. SHA-256 the serialized content.

Do not change hashing methodology between source, save, persisted, and published checks.

---

## 15. Direct database read-back is mandatory

After CMS Save, do not trust only:

- local artifact
- editor state
- HTTP success
- service return object
- toast message
- console output

Read the exact `ContentRevision.contentJson` for the exact new revision from the correct environment database.

Then revalidate structure, block counts, diagram metadata, IDs, and hash.

This is one of the strongest controls in the project.

---

## 16. BPMN / BusinessProcessDiagram integrity gate

For each `DIAGRAM` with `diagramType=business-process`, validate:

```text
duplicate lane IDs = 0
duplicate node IDs = 0
duplicate edge IDs = 0

invalid node lane refs = 0
invalid edge source refs = 0
invalid edge target refs = 0

incoming start edges = 0
outgoing end edges = 0

required gateway branches labelled
meaningful rework routes present

scope present
successOutcome present
businessRules preserved
validationCategories preserved
```

Preferred pattern:

```text
ONE high-level end-to-end BPMN
+
detailed business-process TABLE blocks
```

Do not create one giant BPMN containing every exception, API call, settlement, repayment, dispute, collection, campaign, or notification branch.

---

## 17. Business rules and validations

Use stable domain IDs where useful:

```text
CARD-BR-001
LEND-BR-001
CS-BR-001
...
```

Never fabricate unsupported numerical or vendor-specific rules, including:

- rates
- fees
- percentages
- limits
- thresholds
- SLA durations
- DPD buckets
- collection timelines
- credit score thresholds
- LTV/DTI values
- approval limits
- scheme deadlines
- regulatory timelines
- vendor names
- external registry names

When exact values are not evidenced, use business wording such as:

```text
according to applicable bank policy
according to product configuration
according to applicable approval authority
according to applicable jurisdiction
```

---

## 18. Keep state domains separate

Do not collapse unrelated state machines.

Examples proven in this project:

### Cards

```text
Card lifecycle state
!=
Card transaction state
```

### Lending

```text
Application state
!=
Loan / Facility state
!=
Repayment / Payment state
```

### Customer Service

```text
Interaction state
!=
Request / Case state
!=
Handoff state
```

Mixed state models create invalid transitions and weak business analysis.

---

## 19. Cross-Journey security boundary

Each Journey remains an independent authorization boundary.

Example:

```text
customer-service
scope = CUSTOMER_SERVICE

notification-and-engagement
scope = NOTIFICATION_ENGAGEMENT
```

Cross-Journey interaction may include:

- authorized context
- link/launch
- handoff reference
- status/result
- dependency explanation

Do not:

- copy full target Journey logic
- expose protected target metadata
- bypass target Journey authorization
- merge scopes merely because two Journeys interact

---

## 20. Customer Service vs Engagement lesson

Digital Assist, Engagement Banking, Case Management, and CRM are related but not identical capabilities.

Customer Service may consume limited authorized engagement context, such as notification context, preferences, consent context, or handoff outcome.

Full Engagement capabilities remain separately governed unless explicitly redesigned:

- Segments
- Audiences
- Campaigns
- Personalization
- Offers
- Frequency controls
- Conversion analytics
- Engagement delivery lifecycle

Do not merge `notification-and-engagement` into `customer-service` simply because both participate in a customer experience.

---

## 21. Authorization verification

Never weaken authorization to make testing easier.

Do not:

- disable route guards
- modify Role Matrix for a test
- create bypass logic
- expose protected content temporarily
- claim a component render proves authorized runtime access

Guest behavior commonly returns an HTTP 307 with membership/premium access protection. Re-read actual current policy rather than hardcoding assumptions.

---

## 22. Authenticated runtime verification when no browser session exists

Local automation/Codex may lack a legitimate authenticated browser session.

Do not fabricate:

```text
HTTP 200 PASS
```

Report:

```text
AUTHENTICATED_RUNTIME = NOT_DIRECTLY_VERIFIED
```

Use the technical chain instead:

```text
ContentRepository
→ Canonical Mapper
→ SharedJourneyReader
→ JourneyNavigator
→ JourneyBlockRenderer
→ BusinessProcessDiagram
+
guest authorization probe
```

Then Product Owner performs manual visual/business verification.

Once PO says the visual/business result is OK, do not invent redundant additional gates.

---

## 23. Translation behavior

Several Journeys currently use base-content locale fallback:

```text
EN = base canonical content
VI = same base canonical content through repository fallback
```

If VI translation is `NOT_STARTED`, do not create a fake Vietnamese translation just to make the locale appear complete.

Translation should be a separate approved scope.

---

## 24. Standard Development → Production flow

```text
1. Audit Development
2. Confirm Product Owner business scope
3. Generate canonical artifact
4. Validate source
5. Calculate SOURCE_HASH
6. Re-read live Development baseline
7. Create governed Draft
8. Save exact artifact
9. Direct DB read-back
10. Verify SOURCE = SAVE = PERSISTED
11. Canonical mapper gate
12. SharedJourneyReader gate
13. JourneyNavigator gate
14. BPMN gate
15. Independent review
16. Publish Development
17. Verify PUBLISHED_HASH
18. Repository/render technical verification
19. Product Owner visual/business verification
20. Production preflight
21. Resolve live Production baseline
22. Snapshot related protected Journeys
23. Create governed Production Draft
24. Save exact approved Development artifact
25. Production DB read-back
26. Verify mapper/reader/navigation/BPMN
27. Independent review
28. Publish Production
29. Verify final publishedRevisionId
30. Verify four-way hash equality
31. Repository/runtime/auth regression
32. Confirm related Journeys unchanged
33. Close release
```

---

## 25. Production preflight checklist

Before any Production mutation:

```text
[ ] Correct Vercel project ID
[ ] Production env verified from cloud/clean scope
[ ] APP_ENV=production
[ ] DATABASE_ENVIRONMENT=production
[ ] ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
[ ] Production DB distinct from Development
[ ] Current Production deployment READY
[ ] Current deployed Git SHA known
[ ] Required generic mapper capability present
[ ] Approved artifact exists
[ ] Approved artifact hash verified
[ ] Production ContentItem resolved by type + slug
[ ] Production scope/access/grants captured
[ ] Production revision history captured
[ ] No unexpected active Draft/Review
[ ] Related Journey snapshots captured where needed
[ ] No code deployment required for content-only release
```

If any critical item is uncertain, stop.

---

## 26. Production version policy

Do not force Development and Production version numbers to match.

Example:

```text
Development v3
Production v6
```

can be valid.

Release truth is:

```text
content hash
+
publishedRevisionId
+
runtime/repository result
```

not version parity.

---

## 27. Final published pointer check

After publish:

```text
ContentItem.publishedRevisionId
=
newly published revision ID
```

Then read that exact revision again and verify status, structure, and hash.

Never assume a successful publish call means the ContentItem pointer is correct.

---

## 28. Related-Journey immutability

When the target interacts with a separate Journey, capture before/after:

```text
ContentItem ID
scope
publishedRevisionId
content hash
revision count
```

Example: a Customer Service promotion should prove Notification & Engagement remained unchanged.

Unexpected collateral modification is a release incident even when the target Journey itself looks correct.

---

## 29. Worktree hygiene

This project may legitimately have a dirty local worktree.

Common pre-existing examples have included:

```text
M next-env.d.ts
?? BANKING_JOURNEY_ENHANCEMENT_SKILL.md
?? DEPOSITS_JOURNEY_IMPLEMENTATION_SKILL.md
?? cards-full-business-journey.json
?? customer-onboarding-full-business-journey-v6.json
?? customer-onboarding-full-business-journey.json
?? customer-service-full-business-journey.json
?? deposits-full-business-journey.json
?? lending-full-business-journey.json
```

Always capture:

```bash
git status --short
```

before and after work.

Do not reset unrelated files, delete approved artifacts, stage everything, commit temporary scripts, or modify `.env.local` merely to make an operational command pass.

---

## 30. Temporary tooling

Temporary scripts are acceptable for:

- artifact generation
- source validation
- hashing
- baseline inspection
- DB read-back
- promotion workflow
- BPMN integrity validation

Keep them in `/tmp` or a clearly temporary project area.

At completion:

```text
remove temporary tooling
preserve final artifact
preserve unrelated worktree changes
```

A temporary-file diff shown by the coding tool is not automatically a repository source-code change if the file was outside the repository and removed afterward.

---

## 31. Common failure modes and fixes

### 31.1 False Production environment mismatch

**Symptom**

```text
Production command prints development/development
```

**Likely cause**  
Repository `.env.local` shadows Vercel values.

**Fix**  
Verify direct cloud scope or clean linked directory.

**Do not**  
Edit Production Vercel variables immediately.

---

### 31.2 Wrong Vercel project

**Symptom**  
Unexpected envs, deployments, domains, or project metadata.

**Fix**  
Verify Vercel project ID.

**Stop code**

```text
VERCEL_PROJECT_BINDING_MISMATCH
```

---

### 31.3 Production DB target mismatch

**Symptom**  
Production connection points to the Development Neon target.

**Fix**  
Stop and investigate environment configuration.

**Stop code**

```text
PRODUCTION_DATABASE_TARGET_MISMATCH
```

Never change only the environment label.

---

### 31.4 Save payload hash mismatch

**Symptom**

```text
SAVE_PAYLOAD_HASH != SOURCE_HASH
```

**Possible causes**

- wrong artifact loaded
- wrapper metadata changed
- object transformed
- content regenerated unexpectedly

**Fix**  
Find the difference before save.

Never save mismatched payload.

---

### 31.5 Persisted Draft hash mismatch

**Symptom**  
Save succeeds but DB read-back hash differs.

**Possible causes**

- CMS transformation
- serialization difference
- wrong revision read
- wrong DB
- stale object

**Fix**  
Compare exact persisted content and identify the first differing path.

Do not submit review.

---

### 31.6 Published hash mismatch

**Symptom**  
Draft was correct but Published differs.

**Possible causes**

- wrong revision published
- concurrent edit
- review changed content
- pointer mismatch

**Fix**  
Inspect revision history and final `publishedRevisionId`.

Do not claim success.

---

### 31.7 Unexpected active Draft

**Symptom**  
Baseline expected no Draft but one exists.

**Cause**  
Parallel work or an incomplete prior release.

**Fix**  
Inspect revision ownership/status. Do not create another Draft blindly.

---

### 31.8 Baseline changed during release

**Symptom**  
`publishedRevisionId` or active revision state differs from preflight.

**Fix**  
Stop and re-audit.

**Stop code**

```text
PRODUCTION_<DOMAIN>_BASELINE_CHANGED
```

---

### 31.9 Canonical content still uses legacy reader

**Symptoms**

- no stage navigation
- old editorial layout
- no JourneyNavigator
- BPMN missing

**Check**

```text
metadata.journeyReader
modules structure
mapper output
reader dispatch
```

Treat this as a content/dispatch issue before assuming renderer failure.

---

### 31.10 BPMN metadata disappears

**Symptom**  
Diagram renders but scope/rules/validations/success outcome are missing.

**Cause**  
Mapper metadata preservation gap.

**Fix**  
Verify current generic mapper capability.

Do not add a domain-specific mapper branch.

---

### 31.11 BPMN graph invalid

**Symptoms**  
Broken routes, disconnected nodes, missing branch labels.

**Fix**  
Validate IDs/references before CMS save. Do not rely only on visual rendering.

---

### 31.12 Authenticated runtime cannot be tested

**Symptom**  
No legitimate browser session.

**Correct result**

```text
NOT_DIRECTLY_VERIFIED
```

Use repository/render pipeline + guest authorization evidence. Never disable auth.

---

### 31.13 VI shows English

This may be expected base-content fallback. Inspect translation state and repository behavior before treating it as a bug.

---

### 31.14 Unexpected Vercel deployment during content release

For a CMS content-only promotion, a new application deployment is unexpected.

Investigate before continuing. Do not normalize it as “part of the release.”

---

### 31.15 Stale local project name

A stale project name in `.vercel/project.json` does not prove wrong binding if the project ID is correct.

Verify IDs before changing project config.

---

## 32. Error triage decision tree

```text
Release failed
│
├── Environment gate?
│   ├── local .env shadow?
│   │   └── verify cloud / clean scope
│   ├── wrong Vercel project?
│   │   └── STOP
│   └── wrong Production DB?
│       └── STOP
│
├── Source validation?
│   ├── invalid JSON
│   ├── wrong counts
│   ├── missing canonical marker
│   └── wrong approved hash
│       └── fix source before CMS
│
├── CMS baseline?
│   ├── active Draft/Review
│   └── baseline changed
│       └── STOP and re-audit
│
├── Save/persistence?
│   ├── save hash mismatch
│   └── persisted hash mismatch
│       └── STOP before review
│
├── Mapper/reader?
│   ├── legacy reader
│   ├── metadata loss
│   └── generic capability gap
│       └── STOP; architecture analysis
│
├── BPMN?
│   ├── invalid refs
│   ├── duplicate IDs
│   └── dispatch failure
│       └── isolate content vs renderer cause
│
├── Review/publish?
│   ├── reviewer unauthorized
│   ├── wrong revision published
│   └── pointer mismatch
│       └── STOP
│
└── Runtime?
    ├── guest protected correctly
    ├── authenticated session unavailable
    │   └── NOT_DIRECTLY_VERIFIED
    └── canonical content not selected
        └── trace Repository → Mapper → Reader
```

---

## 33. Recommended explicit stop codes

```text
GENERIC_CAPABILITY_GAP
GENERIC_RENDERER_GAP
VERCEL_PROJECT_BINDING_MISMATCH
PRODUCTION_DATABASE_TARGET_MISMATCH
PRODUCTION_GENERIC_MAPPER_FIX_MISSING
<DOMAIN>_DEVELOPMENT_BASELINE_CHANGED
PRODUCTION_<DOMAIN>_BASELINE_CHANGED
PRODUCTION_<DOMAIN>_BPMN_DISPATCH_FAILURE
NOTIFICATION_ENGAGEMENT_UNEXPECTED_CHANGE
```

Named stop conditions make Codex behavior safer and easier to review.

---

## 34. Rollback — content release

### Before publish

If Draft or Review fails, leave the current Published revision untouched.

### After publish

If a Production business/content issue is discovered:

1. Identify the last known-good revision.
2. Use governed CMS rollback/republication workflow.
3. Restore the published pointer through the approved service.
4. Verify runtime.
5. Verify scope/grants unchanged.
6. Preserve the failed revision for audit.

Never hard-delete the bad revision.

For pure content releases, application-code rollback should not be necessary.

---

## 35. Rollback — environment incident

If a Vercel environment value was genuinely changed incorrectly:

1. Stop CMS/business operations.
2. Restore only the incorrectly scoped variable.
3. Verify Development identity.
4. Verify Production identity.
5. Verify DB targets.
6. Determine if redeploy is actually required.
7. Do not redeploy automatically.
8. Record before/after values without exposing secrets.

If no Vercel value actually changed, do not create a fake “repair.”

---

## 36. Historical Production deployment reference

A verified Production deployment during these releases was:

```text
Deployment ID: dpl_3Ch12iaztPsKuBX3Q89HehzYXRoG
Git SHA: 89f27b85e95596e1d4e9fa74ed5736f836d8accc
Alias: https://babanking.vercel.app
```

It included the generic mapper metadata-preservation capability.

This is historical evidence only. Re-resolve the current Production deployment before every future release.

---

## 37. Journey-specific lessons

### Customer Onboarding

- Full content replacement may be valid only when explicitly approved.
- Preserve scope, grants, authentication, membership, and Journey authorization.
- Do not extrapolate one Journey’s replacement approval to another Journey.

### Deposits

- Generic domain coverage can be broad without inventing bank-specific rates, fees, tenors, or thresholds.
- Content-only Production promotion does not require application deployment when shared architecture already supports the content.
- If a promotion attempt does not complete, re-read DB state before retrying; never assume partial success.

### Cards

- Keep Card lifecycle states separate from Card transaction states.
- Credit billing can coexist with Debit/Prepaid only when conditional applicability is explicit.
- Keep Cards-specific clearing/settlement context while reusing Payments concepts instead of duplicating Payments Journey logic.
- One lifecycle BPMN + detailed tables is better than an oversized authorization/settlement/dispute graph.

### Lending

- Keep Application, Loan/Facility, and Repayment/Payment state models separate.
- Collateral is conditional, not universal.
- Foreclosure/repossession are conditional recovery paths.
- Automated/manual/committee underwriting can be modeled without fabricating policy thresholds.
- Payments and Onboarding are dependencies, not duplicated knowledge.

### Customer Service / Digital Assist

- Digital Assist, Engagement Banking, Case Management, and CRM are distinct capability boundaries.
- Agent authority should distinguish view, guide, initiate, authorized service action, submit, and approve.
- Cross-Journey assistance must respect target Journey authorization.
- Customer Service must not absorb the independently scoped Notification & Engagement Journey.
- Lack of authenticated browser tooling does not authorize an auth bypass.

---

## 38. Codex prompt design rules

A safe execution prompt should explicitly define:

```text
Repository
Target Journey
Environment
Task type
Approved artifact
Approved hash
Expected structure
Environment gates
Architecture lock
Business scope
No-code expectation
CMS lifecycle
Hash gates
Mapper gate
Reader gate
BPMN gate
Authorization regression
Related Journey immutability
Final evidence table
Stop conditions
```

Avoid vague instructions such as:

```text
deploy this to prod
```

The prompt should force the coding agent to stop rather than assume.

---

## 39. Audit-first pattern for every new Journey

Start with AUDIT ONLY.

The audit should resolve:

- actual ContentItem identity
- slug/type
- scope/access
- revision history
- active revisions
- current content structure
- runtime path
- locale behavior
- business/product scope evidence
- state models
- actors
- systems
- data entities
- rules
- validations
- risks
- shared architecture reuse
- generic capability gaps
- recommended canonical structure
- unresolved PO decisions

Then:

```text
Product Owner decisions
→ implementation prompt
```

Never design a full Journey from its title alone.

---

## 40. Standard release evidence table

| Boundary | Stages | Sections | Blocks | Lanes | Nodes | Edges | Rules | Validations | Scope | Success | Hash | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|
| Approved Source | | | | | | | | | | | | |
| Save Payload | | | | | | | | | | | | |
| Persisted Draft | | | | | | | | | | | | |
| Published Revision | | | | | | | | | | | | |
| Repository EN | | | | | | | | | | | | |
| Repository VI | | | | | | | | | | | | |
| Canonical Mapper | | | | | | | | | | | | |
| SharedJourneyReader | | | | | | | | | | | | |
| JourneyNavigator | | | | | | | | | | | | |
| BusinessProcessDiagram | | | | | | | | | | | | |

This makes content drift visible immediately.

---

## 41. Standard final release report

### A. Baseline

```text
ContentItem ID
slug
scope/access
previous publishedRevisionId
previous version
previous hash
previous structure
active revision state
```

### B. New revision

```text
new revision ID
version
author
reviewer
submittedAt
publishedAt
status
publishedRevisionId
```

### C. Structure

```text
stage/module count
section count
block count
block distribution
BPMN lane/node/edge counts
business-rule count
validation count
state-model counts
risk/control count
```

### D. Hashes

```text
source
save
persisted
published
four-way equality
```

### E. Architecture

```text
canonical mapper
SharedJourneyReader
JourneyNavigator
BusinessProcessDiagram
metadata preservation
```

### F. Runtime

```text
repository EN
repository VI
authenticated runtime
guest authorization
```

### G. Regression

```text
authentication
membership
Role Matrix
grants
scope
schema
migration
seed
environment variables
other Journeys
related Journeys
```

### H. Technical impact

```text
source code
Git commit
push
Vercel deployment
```

---

## 42. Development Definition of Done

Development enhancement is technically done only when:

```text
[ ] canonical artifact generated
[ ] JSON valid
[ ] source quality gate PASS
[ ] BPMN integrity PASS
[ ] SOURCE_HASH recorded
[ ] live Development baseline re-read
[ ] governed Draft created
[ ] SAVE_PAYLOAD_HASH = SOURCE_HASH
[ ] PERSISTED_DRAFT_HASH = SOURCE_HASH
[ ] canonical mapper PASS
[ ] metadata preservation PASS
[ ] SharedJourneyReader PASS
[ ] JourneyNavigator PASS
[ ] BusinessProcessDiagram PASS
[ ] independent review completed
[ ] revision PUBLISHED
[ ] published pointer correct
[ ] PUBLISHED_HASH = SOURCE_HASH
[ ] repository EN PASS
[ ] repository VI/fallback PASS
[ ] guest authorization preserved
[ ] other Journeys unchanged
[ ] schema/env/security unchanged
[ ] temporary tooling removed
[ ] ready for PO visual/business verification
```

---

## 43. Production Definition of Done

Production content-only promotion is complete only when:

```text
[ ] Vercel project binding verified
[ ] Production env verified from non-shadowed source
[ ] APP_ENV=production
[ ] DATABASE_ENVIRONMENT=production
[ ] ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
[ ] Production DB identity verified
[ ] current Production deployment known
[ ] required generic capability present
[ ] approved artifact hash verified
[ ] live Production baseline captured
[ ] concurrency gate PASS
[ ] related Journey snapshot captured where needed
[ ] governed Draft created
[ ] SAVE_PAYLOAD_HASH = approved source
[ ] direct DB read-back hash = approved source
[ ] canonical mapper PASS
[ ] SharedJourneyReader PASS
[ ] JourneyNavigator PASS
[ ] BPMN dispatch/integrity PASS
[ ] business regression PASS
[ ] authorization regression PASS
[ ] independent review completed
[ ] revision PUBLISHED
[ ] publishedRevisionId correct
[ ] PUBLISHED_HASH = approved source
[ ] four-way hash equality PASS
[ ] repository EN PASS
[ ] repository VI/fallback PASS
[ ] guest protection preserved
[ ] related Journeys unchanged
[ ] no unexpected application deployment
[ ] no source/schema/migration/seed/env changes
[ ] Production still production/production/false
[ ] temporary tooling removed
[ ] PO visual/business verification complete
```

---

## 44. Never-do list

Never:

```text
- bypass Production environment gates
- set ALLOW_PRODUCTION_DATABASE_OPERATIONS=true for a normal release
- copy Development DB into Production
- run prisma migrate during content-only promotion
- run seed on Production
- reset Production DB
- mutate a Published revision directly
- manually change CMS revision status
- manually change publishedRevisionId
- delete revision history
- fake reviewer identity
- bypass Role Matrix
- disable authentication for testing
- expose another Journey through the current Journey scope
- assume Development and Production ContentItem IDs are identical
- assume Production version equals Development version
- assume repository-local env output equals Vercel cloud scope
- assume a cached project name proves Vercel binding
- trust Save without DB read-back
- trust Publish without pointer/hash verification
- regenerate approved content during Production promotion
- add new business scope during Production release
- introduce a domain-specific reader/renderer before proving a generic gap
- claim authenticated HTTP 200 without authenticated evidence
```

---

## 45. Fast troubleshooting checklist

When something looks wrong, answer in this order:

```text
1. Am I in the correct repository?
2. Which environment am I actually resolving?
3. Are local dotenv values shadowing remote values?
4. Is the Vercel project ID correct?
5. Is the DB endpoint correct for the environment?
6. What is the current publishedRevisionId?
7. Is there an active Draft/Review?
8. Does the approved artifact hash still match?
9. Does the exact Save payload hash match?
10. Does direct DB read-back match?
11. Is metadata.journeyReader=canonical?
12. Did the canonical mapper preserve deep metadata?
13. Was SharedJourneyReader selected?
14. Is JourneyNavigator present?
15. Did BusinessProcessDiagram dispatch?
16. Is BPMN graph integrity valid?
17. Was the correct revision independently reviewed?
18. Does publishedRevisionId point to the new revision?
19. Does Published hash equal source?
20. Did another Journey/scope change unexpectedly?
21. Was there an unexpected Vercel deployment?
22. Is guest authorization still protected?
23. If browser auth is unavailable, was that reported honestly?
```

---

## 46. Quick reference — CMS content-only Production release

```text
Approved Development JSON
        ↓
Validate source + approved hash
        ↓
Verify Vercel project / Production env / Production DB
        ↓
Resolve live Production ContentItem
        ↓
Concurrency gate
        ↓
Create governed Draft
        ↓
Save exact JSON
        ↓
Direct DB read-back
        ↓
SOURCE = SAVE = PERSISTED
        ↓
Mapper / Reader / Navigator / BPMN gates
        ↓
Independent review
        ↓
Publish
        ↓
Verify publishedRevisionId
        ↓
SOURCE = SAVE = PERSISTED = PUBLISHED
        ↓
Repository / runtime / auth regression
        ↓
Related Journeys unchanged
        ↓
No code deployment
        ↓
PO verify
        ↓
CLOSE
```

---

## 47. Operational principle

The release principle for this project is:

```text
Audit reality
→ classify the change
→ preserve environment isolation
→ preserve security boundaries
→ use exact approved content
→ verify every persistence boundary
→ publish through governed CMS workflow
→ prove runtime architecture
→ prove no collateral impact
→ close only after PO verification
```

The safest release is the release where assumptions are replaced by verified boundaries.

---

## 48. Maintaining this skill

Update this file whenever a future release exposes a reusable operational lesson.

For each incident add:

```text
Date
Journey/domain
Environment
Symptom
Initial assumption
Actual root cause
Evidence
Correct fix
Incorrect fix to avoid
New preventive gate
Rollback if applicable
```

Do not add one-off implementation trivia unless it improves future release safety.

The goal is simple: every deployment should make the next deployment safer, faster, and less assumption-driven.
