# Banking Journey Enhancement Skill
## Reusing Shared Journey Architecture Across Payment, Onboarding, and Future Banking Domains

**Purpose:**  
This skill captures the architecture, implementation approach, lessons learned, failure modes, and reusable delivery method established while enhancing the Banking BA Knowledge Hub from the Payments journey into the Customer Onboarding journey.

Use this file as the first implementation reference before asking Codex to enhance another banking journey.

---

# 1. Core Principle

The platform is a **Banking Knowledge Hub**, not an LMS.

The architecture must remain shared and reusable across banking domains.

The correct design principle is:

```text
Shared Architecture
        +
Domain-Specific Business Context
        =
Reusable Banking Journey
```

Do **not** create a new architecture for every journey.

Examples:

```text
Payments & Transfers
Customer Onboarding
Cards
Lending
AML / Screening
Customer Servicing
Deposits
Trade Finance
```

may have different business processes, actors, rules, validations, systems, and states, but they should reuse the same:

- content hierarchy
- CMS lifecycle
- authorization model
- repository pattern
- canonical mapper
- shared Journey Reader
- navigation model
- generic block renderer
- BPMN business-process renderer
- environment separation
- Production governance

---

# 2. Architecture Baseline

## 2.1 Technology Stack

```text
Next.js App Router
TypeScript
TailwindCSS
Neon PostgreSQL
Prisma
Vercel
```

Environment model:

```text
Development
Production
```

Do not introduce a separate product concept such as Staging or Preview merely because a deployment provider labels a non-Production deployment as "preview".

## 2.2 Domain Boundaries

The platform is organized around:

```text
Identity
Membership
Knowledge Content
Knowledge Access
CMS
```

Canonical access chain:

```text
Identity
   ↓
Membership
   ↓
Knowledge Package
   ↓
Journey Grant
   ↓
Published Journey
```

**Journey is the security boundary.**

Authorization must occur server-side before protected Journey content or metadata is queried.

Never replace this with:

- client-side hiding
- URL obscurity
- UI-only authorization
- journey-specific permission shortcuts

---

# 3. Shared Journey Content Architecture

Generic hierarchy:

```text
Journey
  └── Module / Stage
       └── Section
            └── Block
```

A Journey should not require a custom renderer merely because the business domain is different.

The preferred architecture is:

```text
ContentRevision.contentJson
        ↓
ContentRepository
        ↓
Canonical Journey Mapper
        ↓
CanonicalJourney
        ↓
SharedJourneyReader
        ↓
JourneyNavigator
        ↓
JourneyBlockRenderer
        ↓
Generic specialized block renderer
```

For business workflows:

```text
JourneyBlockRenderer
        ↓
BusinessProcessDiagram
```

---

# 4. Canonical Journey Model

The reusable normalized model is:

```text
CanonicalJourney
  → CanonicalStage[]
      → CanonicalState[]
          → CanonicalBlock[]
```

The canonical mapper must be:

- deterministic
- server-safe
- business-domain-neutral
- backward compatible
- Unicode safe
- stable in generated IDs
- capable of preserving unknown-but-approved structured block payload where required

Avoid logic such as:

```ts
if (slug === "customer-onboarding") { ... }
```

or:

```ts
if (paymentType === "internal-transfer") { ... }
```

inside generic infrastructure unless the architecture explicitly requires domain dispatch at that layer.

Domain-specific logic belongs in:

- domain adapter
- domain business content JSON
- domain-specific selector/input mapping

not in the generic renderer.

---

# 5. Shared Reader Architecture

The reusable Journey Reader accepts canonical content.

Conceptual contract:

```ts
{
  journey: CanonicalJourney;
  activeStageId?: string;
  navigation: JourneyNavigationConfig;
  afterStage?: ReactNode;
}
```

Generic navigation configuration:

```ts
{
  basePath,
  preservedQueryParams?,
  stageQueryKey?
}
```

The reader owns:

- stage navigation
- previous / next
- section navigation
- mobile stage drawer
- desktop Journey Navigator
- local search
- anchor navigation
- back-to-top
- readable/wide block layout
- responsive containment

Domain-specific query parameters are supplied from the domain layer, not hardcoded into the shared reader.

Example:

```text
Payments may preserve paymentType.
Onboarding does not require paymentType.
```

---

# 6. Generic Block Strategy

Typical supported content blocks:

```text
RICH_TEXT
TEXT
PARAGRAPH
CALLOUT
TABLE
CHECKLIST
CODE
DIAGRAM
FLOW
SEQUENCE
API
```

Layout classification is generic.

Readable content examples:

```text
RICH_TEXT
TEXT
PARAGRAPH
CALLOUT
```

Wide content examples:

```text
TABLE
DIAGRAM
BPMN
FLOW
SEQUENCE
API
CODE
CHECKLIST / structured lists
```

Do not make a journey-specific layout component unless a true generic capability gap exists.

---

# 7. BPMN / Business Process Architecture

The reusable BPMN activation contract is:

```json
{
  "blockType": "DIAGRAM",
  "payload": {
    "diagramType": "business-process"
  }
}
```

A business-process payload may contain:

```text
title
description
orientation
scope
lanes
nodes
edges
businessRules
validationCategories
successOutcome
```

Supported semantic node concepts include:

```text
start-event
end-event
user-task
service-task
decision-gateway
```

The BPMN renderer is expected to support:

- horizontal business progression
- swimlanes
- actor/system responsibility
- start/end events
- tasks
- gateways
- Yes/No and other branch conditions
- cross-lane routing
- forward paths
- backward/rework paths
- branch convergence
- obstacle-aware routing
- accessible summary
- local horizontal scrolling
- large graphs without shrinking content into unreadability

Visual model:

```text
X axis = process chronology / dependency progression
Y axis = responsibility / swimlane
```

---

# 8. Payment → Onboarding Reuse Pattern

The Payments journey established reusable capabilities that were leveraged for Onboarding.

## Payments contributed

- canonical journey architecture
- structured stage navigation
- shared Journey Reader
- generic block rendering
- large structured business-process diagrams
- BPMN-style swimlanes
- gateway branches
- return/rework paths
- wide-block containment
- responsive Journey navigation
- canonical CMS content handling

## Onboarding reused

```text
ContentRepository
Canonical Mapper
SharedJourneyReader
JourneyNavigator
JourneyBlockRenderer
BusinessProcessDiagram
CMS workflow
Role Matrix
Journey authorization
```

Onboarding did **not** require:

- a new CMS
- a new permission model
- a new Journey renderer
- an Onboarding-specific navigator
- a new DB schema
- an Onboarding-specific BPMN renderer

That is the model to follow for future journeys.

---

# 9. Architecture Same, Business Context Different

This is the most important reusable rule.

## Architecture remains the same

```text
CMS
Repository
Canonical Mapping
Shared Reader
Navigation
Generic Renderer
BPMN Renderer
Authorization
Revision Workflow
Environment Governance
```

## Business context changes

Each banking domain defines its own:

- actors
- channels
- systems
- triggers
- preconditions
- inputs
- business process
- rules
- validation rules
- decision points
- states
- exceptions
- controls
- outputs
- data entities
- BA discovery questions
- BA deliverables

Example:

### Payment context

```text
Source Account
Beneficiary
Amount
Currency
Fee
Limit
Payment Rail
Approval
Authorization
Payment Instruction
```

### Onboarding context

```text
Eligibility
Customer Data
Consent
Duplicate Customer
Identity Verification
KYC / CDD
EDD
Screening
Risk Assessment
Approval
Customer Creation
Account Creation
Activation
```

Same architecture; different business model.

---

# 10. Customer Onboarding Reference Structure

The approved Customer Onboarding journey evolved into 11 stages:

```text
1. Overview
2. Initiation & Eligibility
3. Customer Data & Consent
4. Identity & Document Verification
5. KYC / Customer Due Diligence
6. Screening & Risk Assessment
7. Review & Approval
8. Customer & Account Creation
9. Activation & Completion
10. Exception & Rework
11. Business Analysis
```

Typical lifecycle stage structure:

```text
Purpose
Business Trigger
Preconditions
Inputs
Business Process
Business Rules
Validation Rules
Decision Points
Outputs
Exceptions
Systems / Responsibilities
```

Where useful, add:

```text
General Business Process Flow
```

as a DIAGRAM block without deleting the detailed Business Process table.

The diagram is the visual overview.

The table is the detailed business specification.

Both can coexist.

---

# 11. Customer Onboarding BPMN Reference

Approved Onboarding BPMN characteristics:

```text
7 lanes
81 nodes
97 edges
9 business rules
18 validation categories
scope present
successOutcome present
```

Swimlanes:

```text
Customer
Digital / Assisted Channel
Onboarding / CRM
Identity & KYC Services
Compliance / Risk
Operations / Authorized Approver
Core Banking / System of Record
```

Representative business progression:

```text
Customer starts onboarding
        ↓
Initiation Context
        ↓
Eligibility
        ↓
Customer Data & Consent
        ↓
Existing / Duplicate Customer Check
        ↓
Identity Verification
        ↓
KYC / CDD
        ↓
EDD where required
        ↓
Screening
        ↓
Risk Assessment
        ↓
Review / Approval
        ↓
Customer Creation
        ↓
Account / Product Creation
        ↓
Activation
        ↓
Completion / Notification
```

Representative exception outcomes:

```text
Ineligible
Existing Customer Route
Customer Cancels / Expires
Identity Rejected
EDD Rejected
Screening Rejected
Risk Rejected
Approval Rejected
Customer Creation Exception
Account Creation Exception
Rework
Manual Review
```

Do not copy these business steps blindly into another domain. Reuse the architecture and BPMN structure; redesign the business flow for the target domain.

---

# 12. CMS Governance

CMS lifecycle:

```text
Draft
  ↓
Review
  ↓
Published
  ↓
Archived
```

Rules:

- preserve revision history
- no hard delete by default
- no silent mutation of historical revisions
- independent review where Role Matrix requires it
- no self-approval where forbidden
- Production reads Published revision only
- audit history must remain traceable

Normal CMS content operations are business operations.

Technical Production operations are different.

Production policy:

```text
APP_ENV=production
DATABASE_ENVIRONMENT=production
ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
```

Normal authorized CMS workflow:

```text
ALLOW
```

Technical/destructive Production operations:

```text
DENY
```

Do not enable technical Production override just to edit content.

---

# 13. Development → Production Content Rule

Development and Production databases remain isolated.

Never copy an entire database.

Correct promotion model:

```text
Approved Development JSON
        ↓
Validate source hash
        ↓
Production CMS Draft
        ↓
Replace complete target contentJson where approved
        ↓
Save
        ↓
Read persisted Draft from DB
        ↓
Hash comparison
        ↓
Review
        ↓
Publish
        ↓
Read Published revision
        ↓
Runtime verification
```

For Customer Onboarding, Product Owner explicitly approved full content replacement in Production.

That exception applies to the Onboarding content payload only.

It does NOT authorize:

- whole-DB reset
- auth reset
- membership reset
- Role Matrix reset
- other Journey deletion
- environment copying

---

# 14. Why Hash Verification Is Mandatory

A critical issue occurred repeatedly during Journey enhancement:

```text
Updated JSON existed locally
BUT
Published DB revision still contained old content
```

The correct source-of-truth chain is:

```text
Source JSON
→ Actual Save Payload
→ Persisted ContentRevision.contentJson
→ Published ContentRevision.contentJson
→ Repository Output
→ Canonical Mapper
→ Renderer
```

Never assume:

```text
"JSON file updated"
=
"runtime updated"
```

For every important content update calculate a canonical content hash.

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

If equality fails:

```text
STOP
DO NOT SUBMIT
DO NOT PUBLISH
```

---

# 15. Issue #1 — New Revision Published but Content Did Not Change

## Symptom

A new version was successfully created and published, but the runtime still showed the old Journey structure.

Example pattern:

```text
v2 = 6 modules
v3 = 6 modules
hash(v2) == hash(v3)
```

while the intended source contained 11 modules.

## Root Cause

The new JSON never reached the saved revision.

The workflow succeeded, but the content payload was unchanged.

## Exact failure boundary

```text
Expected Source JSON
        ↓
Editor / Save Input
        X
Persisted ContentRevision
        ↓
Repository
        ↓
Mapper
        ↓
UI
```

## Lesson

CMS workflow success does **not** prove content success.

Always inspect persisted `ContentRevision.contentJson`.

---

# 16. Issue #2 — Baseline Revision Changed During Operation

## Symptom

The implementation instruction expected:

```text
Published v4
→ Create v5
```

but the live DB already contained:

```text
Published v5
```

Later another operation expected creation of v6, but an existing v6 had already appeared as:

```text
IN_REVIEW
```

## Correct Behavior

Stop.

Do not create duplicate versions.

Do not invent the next version.

Re-read live DB state.

## Rule

Before every write:

```text
Resolve current published revision
Resolve latest revision
Resolve active Draft / IN_REVIEW revision
Resolve publishedRevisionId
```

If baseline changed:

```text
STOP
REPORT
REAUTHORIZE
```

---

# 17. Issue #3 — Existing IN_REVIEW Revision Contained Wrong Content

## Symptom

Existing v6:

```text
status = IN_REVIEW
content = unchanged old payload
BPMN = absent
```

## Wrong approach

```text
Create v7 immediately
```

## Correct approach

Use governed workflow:

```text
v6 IN_REVIEW
   ↓
Request Changes
   ↓
v6 CHANGES_REQUESTED
   ↓
Edit same v6
   ↓
Save
   ↓
Read-back
   ↓
Resubmit
   ↓
Independent Review
   ↓
Publish v6
```

Preserve the revision workflow instead of creating unnecessary versions.

---

# 18. Issue #4 — Canonical Mapper Stripped BPMN Metadata

## Symptom

The approved BPMN JSON contained:

```text
scope
businessRules
validationCategories
successOutcome
```

but canonical output retained only:

```text
diagramType
orientation
title
description
lanes
nodes
edges
```

The graph still rendered, but important approved business metadata was lost.

## Root Cause

`normalizedBlockPayload()` used an incomplete generic allowlist.

## Correct Fix

Extend the generic DIAGRAM normalization to preserve:

```text
scope
businessRules
validationCategories
successOutcome
```

Do not add:

```text
if customer-onboarding
```

or any domain-specific exception.

## Validation

Test deep semantic equality:

```text
INPUT.scope
=
OUTPUT.scope

INPUT.businessRules
=
OUTPUT.businessRules

INPUT.validationCategories
=
OUTPUT.validationCategories

INPUT.successOutcome
=
OUTPUT.successOutcome
```

## Important distinction

```text
Payload Preservation
≠
Visual Presentation
```

The mapper must preserve approved data even if the BPMN canvas only uses:

```text
lanes
nodes
edges
```

---

# 19. Generic Mapper Fix Reference

Reference Development/Production fix:

```text
Commit:
89f27b85e95596e1d4e9fa74ed5736f836d8accc

Message:
fix(journeys): preserve business process diagram metadata
```

Scope:

```text
src/components/journeys/canonical-journey-mapper.ts
src/components/journeys/canonical-journey-mapper.test.ts
```

Validation achieved:

```text
Focused tests: 6/6 PASS
Full tests: 167/167 PASS
Lint: PASS
TypeScript: PASS
Build: PASS
```

The fix was generic and introduced no Customer-Onboarding-specific branch.

---

# 20. Development Onboarding Final Reference

Approved Development revision:

```text
Version: v6
Revision ID: cmsph6adf0003rgcwp1flsyx7
Status: PUBLISHED
```

Approved JSON hash:

```text
d3503f1832d03dbd8e7c6714c6b92be52b4e8995369ac5f0b1e931fc44d0542d
```

Structure:

```text
11 modules
112 sections
112 blocks
7 BPMN lanes
81 BPMN nodes
97 BPMN edges
9 businessRules
18 validationCategories
scope present
successOutcome present
```

---

# 21. Production Onboarding Final Reference

Production code release:

```text
Old Production SHA:
4a875b729ad39e3f8b9dcdd4f0a6d5e70ec96dbc

New Production SHA:
89f27b85e95596e1d4e9fa74ed5736f836d8accc

Deployment:
dpl_3Ch12iaztPsKuBX3Q89HehzYXRoG

Status:
READY
```

Production Content:

```text
ContentItem:
cmrxkfmdm0002rggkt1g4rpo2

Published revision:
cmspin5n40001rgm8rjofrh3m

Version:
v7

Status:
PUBLISHED
```

Production content hash:

```text
d3503f1832d03dbd8e7c6714c6b92be52b4e8995369ac5f0b1e931fc44d0542d
```

Development and Production approved content are therefore equal.

---

# 22. Implementation Plan for Any Future Journey

Use this implementation sequence.

## Phase 1 — Audit Existing Journey

Identify:

```text
Route
ContentItem
ContentRevision
publishedRevisionId
ContentRepository
current mapper
current renderer
CMS lifecycle
scope/access
current module count
legacy/static fallback
```

Deliver:

```text
AUDIT
IMPACT ANALYSIS
PROPOSED SOLUTION
RISKS
ROLLBACK
```

Do not implement major architecture changes before this gate.

## Phase 2 — Classify the Problem

Determine whether the requirement is:

```text
CONTENT
MAPPER
RENDERER
NAVIGATION
CMS
SECURITY
SCHEMA
```

Preferred classification:

```text
Business rules changed      → Content JSON
Process step changed        → Content JSON
New branch                  → Content JSON
Lane ownership changed      → Content JSON
Edge condition changed      → Content JSON
New supported diagram type  → Generic renderer capability
Payload field stripped      → Generic mapper fix
Routing/layout defect        → Generic renderer fix
Permission issue             → Auth / Role Matrix analysis
```

Avoid source-code changes for pure business-content updates.

## Phase 3 — Normalize Business Content

Build domain content using:

```text
Overview
Lifecycle Stages
Business Analysis
```

For each lifecycle stage consider:

```text
Purpose
Trigger
Preconditions
Inputs
Process
Rules
Validations
Decisions
Outputs
Exceptions
Systems / Responsibilities
```

Use existing block types.

Do not invent a renderer because the business content is richer.

## Phase 4 — Add BPMN Where Valuable

Use:

```json
{
  "blockType": "DIAGRAM",
  "payload": {
    "diagramType": "business-process"
  }
}
```

Design:

```text
lanes
nodes
edges
businessRules
validationCategories
successOutcome
scope
```

Do not remove the detailed process table unless explicitly approved.

Use diagram + detailed tables together.

## Phase 5 — Validate Source Before Save

Verify:

```text
module count
section count
block count
BPMN count
lane count
node count
edge count
duplicate IDs
invalid lane refs
invalid edge refs
```

Validate:

```text
every node.laneId exists
every edge.source exists
every edge.target exists
start event has no invalid incoming process flow
end event has no invalid outgoing process flow
```

Calculate source hash.

## Phase 6 — CMS Draft

Resolve the live DB state first.

Then:

```text
Published
→ Create Draft
```

or, if an active revision exists:

```text
IN_REVIEW
→ Request Changes
→ edit existing revision
```

Never blindly create the "expected" next version.

## Phase 7 — Save + Immediate DB Read-back

Before save:

```text
SAVE_PAYLOAD_HASH
```

After save query:

```text
ContentRevision.contentJson
```

Calculate:

```text
PERSISTED_DRAFT_HASH
```

Gate:

```text
SOURCE_HASH
=
SAVE_PAYLOAD_HASH
=
PERSISTED_DRAFT_HASH
```

Otherwise stop.

## Phase 8 — Mapper Contract

Run actual persisted content through the real mapper.

Verify:

```text
stage count
section presence
block type
diagramType
lanes
nodes
edges
businessRules
validationCategories
scope
successOutcome
```

Do not validate only using the local JSON artifact.

## Phase 9 — Renderer Dispatch

Verify:

```text
DIAGRAM
+
diagramType = business-process
        ↓
BusinessProcessDiagram
```

If dispatch works, do not modify renderer code.

If the graph is visually defective, fix the generic renderer.

Do not create a domain-specific BPMN renderer.

## Phase 10 — Review / Publish

After all technical gates:

```text
DRAFT / CHANGES_REQUESTED
→ IN_REVIEW
→ independent review
→ PUBLISHED
```

Then verify:

```text
ContentItem.publishedRevisionId
```

points to the intended revision.

Calculate Published hash.

## Phase 11 — Runtime Verification

Verify repository resolution:

```text
EN
VI
```

Verify:

```text
stage count
target stage
new section
BPMN dispatch
authorization boundary
```

Unauthenticated redirect is expected where membership protection applies.

Do not weaken authorization for testing.

---

# 23. Production Promotion Sequence

For releases containing both code and content:

```text
1. Promote generic code capability
2. Verify Production deployment READY
3. Verify deployed Git SHA
4. Verify Production mapper capability
5. Apply exact approved content JSON
6. Save
7. Read persisted Draft
8. Compare hash
9. Mapper check
10. Renderer dispatch check
11. Review
12. Publish
13. Verify publishedRevisionId
14. Verify Production hash
15. Verify EN / VI repository/runtime
```

**Code capability must go live before content that depends on it.**

Example:

```text
Mapper fix first
        ↓
BPMN JSON second
```

Otherwise Production may strip approved content.

---

# 24. Production Content Replacement Rule

If Product Owner authorizes full replacement for a specific Journey:

```text
NEW_PROD_CONTENT_JSON
=
EXACT_APPROVED_DEV_JSON
```

Do not:

```text
merge old Prod JSON
reconstruct content
regenerate BPMN
preserve obsolete placeholders
```

Version number is secondary.

Release truth is:

```text
publishedRevisionId
+
content hash
+
runtime output
```

A Production v7 may legitimately contain content equivalent to Development v6.

Version parity is not required.

---

# 25. Hard Reset Guidance

A Journey-specific hard reset may only be considered when explicitly approved and genuinely necessary.

Preferred:

```text
preserve ContentItem
preserve scope
preserve grants
preserve auditability
create/publish new revision
```

Do not hard reset solely to make version numbers cleaner.

Never:

```text
reset entire Production DB
copy Dev DB into Prod
delete unrelated revisions/content
reset Role Matrix
reset membership
reset auth
```

---

# 26. Environment Safety Checklist

Before Development write:

```text
APP_ENV=development
DATABASE_ENVIRONMENT=development
```

Before Production write:

```text
APP_ENV=production
DATABASE_ENVIRONMENT=production
```

If mismatch:

```text
STOP
```

Environment isolation is mandatory.

Source-code parity does not mean DB/content parity.

---

# 27. Git Safety

Before code work:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
```

Never accidentally commit:

```text
next-env.d.ts
.codex-tmp
temporary audit tooling
content JSON artifact
```

unless repository policy explicitly requires the content artifact.

Production integration:

```text
normal fast-forward / controlled integration
no force push
```

---

# 28. Mandatory Technical Gates

For mapper/renderer code changes:

```text
focused tests
full tests
lint
TypeScript
build
```

For content updates:

```text
source structure validation
hash
persisted DB read-back
mapper check
renderer dispatch
repository EN
repository VI
runtime target
```

Never substitute one category for the other.

---

# 29. Root-Cause Decision Tree

When UI shows wrong Journey content:

```text
Is correct JSON source available?
        ↓
YES

Did Save payload contain it?
        ↓
NO → editor/save input problem
YES

Did persisted ContentRevision contain it?
        ↓
NO → persistence/CMS save problem
YES

Does publishedRevisionId point to it?
        ↓
NO → publication pointer/workflow problem
YES

Does Repository return it?
        ↓
NO → repository/translation/query problem
YES

Does Mapper retain it?
        ↓
NO → mapper normalization problem
YES

Does Renderer receive it?
        ↓
NO → dispatch/mapping problem
YES

Does DOM/UI display correctly?
        ↓
NO → renderer/layout/UI problem
```

This sequence prevents random code changes.

---

# 30. Anti-Patterns

Never do these by default:

```text
Create a new renderer for each Journey
Create a new permission model
Create a new CMS
Hardcode journey slug in generic mapper
Hardcode business rules in UI components
Use static TS as runtime source of truth
Copy whole Development DB to Production
Trust local JSON without DB read-back
Trust version number without content hash
Publish before persisted hash verification
Create new version merely because active revision is inconvenient
Force push Production
Enable Production technical override for normal CMS editing
```

---

# 31. Reusable Codex Instruction Pattern

For future Journey enhancements, begin with:

```text
CONTEXT LOCK — BANKING BA KNOWLEDGE HUB ONLY

Repository:
/Users/jonathanta/BA Master

GOAL:
Enhance <TARGET JOURNEY> using the existing canonical Journey architecture.

ARCHITECTURE RULE:
Reuse existing:
- ContentRepository
- CMS lifecycle
- Role Matrix
- Journey authorization
- Canonical mapper
- SharedJourneyReader
- JourneyNavigator
- JourneyBlockRenderer
- BusinessProcessDiagram

Do not redesign the architecture unless an audited generic capability gap is
proven.

FIRST:
Audit current Journey:
- route
- ContentItem
- publishedRevisionId
- revision history
- mapper
- renderer
- CMS state
- access/scope
- current content structure

RETURN BEFORE IMPLEMENTATION:
1. Audit
2. Impact Analysis
3. Proposed Solution
4. Risks
5. Rollback

CLASSIFY EVERY CHANGE:
CONTENT / MAPPER / RENDERER / NAVIGATION / CMS / SECURITY / SCHEMA

Prefer CMS/JSON for business-process changes.

Use generic source changes only for proven reusable capability gaps.
```

---

# 32. Business Context Template for a New Journey

For a new domain, define this before building JSON:

```text
Journey Name:
Business Domain:
Customer Type:
Entry Points:
Actors:
Channels:
Systems:
Start Trigger:
Success Outcome:
Alternate Outcomes:

Lifecycle Stages:

Stage 1:
Purpose
Trigger
Preconditions
Inputs
Process
Rules
Validations
Decisions
Outputs
Exceptions
Systems

Stage 2:
...

Business States:

Business Rules:

Validation Categories:

Risks & Controls:

Data Entities:

System Responsibility Matrix:

BA Discovery Questions:

BA Outputs:
```

Then map it into the same canonical architecture.

---

# 33. Definition of Done

A Journey enhancement is complete only when all relevant boundaries pass:

```text
Business JSON approved
        ↓
Save payload verified
        ↓
Persisted DB content verified
        ↓
Published pointer verified
        ↓
Repository verified
        ↓
Canonical mapper verified
        ↓
Renderer dispatch verified
        ↓
Runtime verified
        ↓
Authorization preserved
        ↓
Development/Production isolation preserved
```

For exact content promotion:

```text
Approved Development Hash
=
Production Save Hash
=
Production Persisted Hash
=
Production Published Hash
```

---

# 34. Final Architectural Rule

The long-term platform strategy is:

```text
Do not build:
Payment architecture
Onboarding architecture
Card architecture
Lending architecture

Build:
ONE Banking Journey Architecture
        +
domain-specific business content
        +
generic reusable visualization capabilities
```

When another domain exposes a capability gap, ask:

```text
Is this truly unique to the business domain?
```

If NO:

```text
enhance the generic architecture once
reuse everywhere
```

If YES:

```text
contain the domain behavior at the adapter/content layer
without contaminating shared infrastructure
```

This is the pattern established through Payments → Customer Onboarding and should guide all subsequent Banking BA Knowledge Hub journey enhancements.
