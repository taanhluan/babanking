# Banking BA Knowledge Hub — Journey Release, CMS & Production Lessons Learned

**Status:** Active project-wide delivery standard  
**Updated:** 2026-08-15  
**Applies to:** All Banking Journey features and future Journey enhancements  
**Platform:** Banking BA Knowledge Hub  
**Environments:** Development and Production only

---

## 1. Purpose

This document consolidates the implementation, CMS, release, troubleshooting, security, environment-isolation, content-integrity, and rollback lessons learned across Banking Journey delivery.

It is intended to be reused for **all current and future Journey features**, including:

- Customer Onboarding
- Payments
- Deposits
- Cards
- Lending
- Customer Service
- Notification & Engagement
- Personal Finance
- Security & Access
- Wealth & Investment
- future Banking Journeys

This document is not a replacement for Journey-specific business requirements. It defines the **safe engineering and release method** that every Journey must follow.

---

# 2. Current Closed Scope — Notification & Engagement

## 2.1 Scope status

**Notification & Engagement is CLOSED.**

Product Owner has completed Production validation and confirmed the Production Journey is working correctly.

The approved canonical artifact is:

```text
notification-engagement-full-business-journey.json
```

Approved canonical content hash:

```text
475be69a858d7a34b76060ce33172fd0696d5ce5a6a79cdd763deef1ac1b801b
```

Approved content structure:

```text
Stages:      13
Sections:    107
Blocks:      107

RICH_TEXT:   13
TABLE:       76
CHECKLIST:   17
DIAGRAM:     1

BPMN:
Lanes:       7
Nodes:       46
Edges:       52

Business Rules:       32
Validations:          23
Risks / Controls:     20

State domains:
Engagement/Campaign:  9
Message/Notification: 7
Delivery:             6
Response/Outcome:     8
Service Handoff:      9
```

Canonical metadata requirement:

```text
metadata.journeyReader=canonical
```

## 2.2 Notification & Engagement business scope

The final Journey covers the full generic Engagement Banking lifecycle:

```text
Event / Trigger
→ Customer & Context
→ Eligibility
→ Segment
→ Audience
→ Targeting
→ Campaign / Engagement Orchestration
→ Consent
→ Preference
→ Contactability
→ Suppression
→ Content / Message
→ Conditional Offer
→ Personalization
→ Channel Selection
→ Delivery
→ Failure / Recovery
→ Customer Response
→ Engagement Outcome
→ Analytics / History
→ Authorized Customer Service Handoff
```

The Journey remains vendor-neutral and must not be interpreted as proof that every capability is technically implemented by a specific bank or vendor.

## 2.3 Security boundary

The following security boundary remains mandatory:

```text
CUSTOMER_SERVICE
!=
NOTIFICATION_ENGAGEMENT
```

Notification & Engagement may exchange authorized context with Customer Service, but it must not own or duplicate:

- service request lifecycle
- complaint lifecycle
- case lifecycle
- task lifecycle
- assignment
- escalation
- back-office servicing
- service recovery
- case closure

Customer Service remains authoritative for those capabilities.

---

# 3. Core Architecture Invariants

The Banking BA Knowledge Hub is a **banking knowledge-sharing platform**, not an LMS.

The current architectural baseline must be preserved unless an explicit architecture change is approved.

## 3.1 Technology baseline

```text
Next.js App Router
TypeScript
TailwindCSS
Neon PostgreSQL
Prisma
Vercel
```

## 3.2 Domain boundaries

```text
Identity
Membership
Knowledge Content
Knowledge Access
CMS
```

## 3.3 Authorization chain

The access model is:

```text
Identity
→ Membership
→ Knowledge Package
→ Journey Grant
→ Published Journey
```

The Journey is the security boundary.

Authorization must happen server-side **before protected Journey content or metadata is queried**.

Do not implement UI-only authorization.

## 3.4 Canonical runtime architecture

The expected canonical content path is:

```text
ContentRevision.contentJson
→ ContentRepository
→ Canonical / Structured Mapper
→ CanonicalJourney
→ SharedJourneyReader
→ JourneyNavigator
→ JourneyBlockRenderer
→ BusinessProcessDiagram
```

Journey-specific rendering should not be introduced when the shared renderer can support the required content.

## 3.5 CMS lifecycle

The governed workflow is:

```text
Draft
→ Review
→ Published
→ Archived
```

Rules:

- no self-publish or approval bypass
- no hard deletion of history
- rollback must use governed CMS behavior
- Production runtime reads Published revisions
- content revisions remain auditable

---

# 4. Environment Model — Exactly Two Product Environments

The project has only:

```text
Development
Production
```

Do not introduce Preview or Staging as product environments.

A Vercel provider deployment may technically be called a preview deployment, but the product environment remains Development.

## 4.1 Development

Development is used for:

- implementation
- content preparation
- CMS Draft
- integration verification
- canonical mapping checks
- responsive/UI checks
- Product Owner business verification

## 4.2 Production

Production is used only after:

```text
Development implementation complete
→ Development validation PASS
→ Development publish PASS
→ Product Owner visual/business confirmation
→ Production preflight
→ Production promotion
```

---

# 5. Environment Identity Must Be Proven

Never infer environment identity from a repository-local `.env.local`.

A previous incident showed that local environment files can shadow values when running commands intended for another Vercel environment.

Therefore:

## Required environment proof

Development:

```text
APP_ENV=development
DATABASE_ENVIRONMENT=development
ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
```

Production:

```text
APP_ENV=production
DATABASE_ENVIRONMENT=production
ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
```

Development and Production Neon endpoints must be distinct.

Known environment endpoints during the 2026-08 release cycle:

```text
Development:
ep-crimson-moon-azxy1ao5-pooler.c-3.ap-southeast-1.aws.neon.tech

Production:
ep-quiet-snow-azmaehn4-pooler.c-3.ap-southeast-1.aws.neon.tech
```

For Production identity, prefer clean Vercel cloud scope or an equivalent non-shadowed environment proof.

Do not modify Production configuration based solely on output affected by local `.env.local`.

---

# 6. The Most Important Release Lesson — Workflow Success Is Not Content Proof

A successful CMS workflow does **not** prove that the intended JSON was persisted.

The following are insufficient as content-integrity evidence:

```text
Save succeeded
JOURNEY_DRAFT_UPDATED exists
Submit Review succeeded
Review completed
Publish succeeded
publishedRevisionId changed
UI says Saved
```

All of those can happen while the underlying `ContentRevision.contentJson` is stale.

This happened during the Customer Service release.

Therefore, all Journey releases now use direct persisted-content verification.

---

# 7. Mandatory Hash Equality Model

Every Journey release must establish content equality across release stages.

## 7.1 Development

Required:

```text
SOURCE_HASH
=
SAVE_PAYLOAD_HASH
=
PERSISTED_DRAFT_HASH
```

before Submit Review.

After Publish:

```text
SOURCE_HASH
=
SAVE_PAYLOAD_HASH
=
PERSISTED_DRAFT_HASH
=
PUBLISHED_HASH
```

## 7.2 Production

Required before Submit Review:

```text
APPROVED_DEVELOPMENT_SOURCE_HASH
=
PRODUCTION_SAVE_PAYLOAD_HASH
=
PRODUCTION_PERSISTED_DRAFT_HASH
```

After Production Publish:

```text
APPROVED_DEVELOPMENT_SOURCE_HASH
=
PRODUCTION_SAVE_PAYLOAD_HASH
=
PRODUCTION_PERSISTED_DRAFT_HASH
=
PRODUCTION_PUBLISHED_HASH
```

If any equality fails:

```text
STOP
DO NOT SUBMIT REVIEW
DO NOT PUBLISH
```

---

# 8. Direct Database Read-Back Is Mandatory

After every CMS `Save Draft`, read the exact Draft:

```text
ContentRevision.contentJson
```

from the correct environment database.

Compute its canonical SHA-256 hash.

The database value is authoritative.

Do not use the UI textarea, browser preview, audit event, or Save response as persistence proof.

This gate applies to:

- Development
- Production
- every Journey
- every future full-content replacement
- every Advanced JSON operation

---

# 9. Customer Service Incident — Advanced JSON Stale Save

## 9.1 What happened

Customer Service canonical JSON had been prepared and approved, but Production CMS workflow revisions were created, reviewed, and published while the persisted content remained the old legacy payload.

The CMS audit trail looked successful, but the content hash had not changed.

## 9.2 Root cause

The Advanced JSON editor maintained its own textarea state while Save serialized a different parent content state.

Before the fix, the operator effectively needed to apply JSON into the parent state before saving.

This allowed:

```text
new JSON visible in textarea
+
successful Save workflow
+
old content persisted
```

## 9.3 Generic fix

Commit:

```text
1837b99a15f0e149a9a9873c22600823584bea8f
```

Behavior after the fix:

```text
current Advanced textarea
→ JSON.parse
→ journeyContentSchema validation
→ exact current textarea submitted by Save Draft
```

Required behavior:

```text
Apply JSON required:              NO
Invalid JSON blocks Save:         YES
Schema-invalid JSON blocks Save:  YES
Structured Save unchanged:        YES
```

## 9.4 Project-wide lesson

Never trust UI state and workflow state to prove JSON persistence.

Always use:

```text
Save
→ Direct DB Read-back
→ Hash Equality
→ Review
```

---

# 10. Notification & Engagement Incident — Legacy CMS Editor Crash

## 10.1 Symptom

After creating a Draft from legacy content, the CMS crashed with:

```text
TypeError:
Cannot read properties of undefined (reading 'type')
```

Component:

```text
JourneyBusinessEditor
```

## 10.2 Root cause

Legacy flat content produced:

```text
nodes=[]
selectedNode=undefined
```

The surrounding editor context dereferenced:

```text
selectedNode.type
selectedNode.title
```

before the workspace-level empty selection handling could run.

## 10.3 Correct generic behavior

The CMS must support both:

```text
legacy Journey content
canonical Journey content
```

For legacy content:

- editor must not crash
- no structured node may be assumed
- Advanced JSON must remain available
- no placeholder canonical structures should be fabricated
- opening the page must not mutate content
- no automatic conversion should occur

For canonical content:

- the structured editor remains unchanged

## 10.4 Generic fix

Production fix commit:

```text
5fb7b8478c7965ad0d7e3e8e1f6911312729e90b
```

Production deployment:

```text
dpl_SCkmH2fXGmHt7R4CWKZXy8gzxkD1
```

The fix included only:

```text
JourneyBusinessEditor.tsx
JourneyBusinessEditor.test.tsx
```

The fix passed:

```text
Focused tests: 13/13
Full tests:    180/180
Lint:          PASS
TypeScript:    PASS
Build:         PASS
git diff:      PASS
```

## 10.5 Project-wide lesson

A CMS migration path must be able to open the **old content shape** before the new content is pasted.

Never design an editor that assumes the data is already migrated.

---

# 11. Authentication Boundary Is a Required Control

Local tooling must not fabricate an authenticated actor.

If a CMS action is guarded by:

```text
requireJourneyCmsAccess()
```

and no legitimate authenticated browser/session is available, automated tooling must stop.

Forbidden:

- constructing an Admin actor locally
- bypassing `requireJourneyCmsAccess()`
- extracting secrets to impersonate users
- direct status changes
- direct `publishedRevisionId` mutation
- direct DB writes replacing CMS workflow

Correct fallback:

```text
tool performs read-only preflight
→ authenticated Product Owner/Admin performs UI action
→ tool performs DB read-back verification
```

The authentication boundary is not an inconvenience to remove; it is part of the release control.

---

# 12. Sensitive Environment Variables Must Not Be Faked

Clean Vercel exports may mask sensitive variables, for example:

```text
AUTH_SECRET=[SENSITIVE]
```

If local execution cannot initialize the real authenticated CMS service because secrets are unavailable:

Do not:

- invent a secret
- reuse Development secret in Production
- extract secret from another environment
- weaken validation
- bypass authentication

Use the authenticated Production UI instead.

---

# 13. Canonical Content Is a Data Migration, Not a Renderer Rewrite

When a Journey is legacy but the shared platform already supports:

```text
Canonical Mapper
SharedJourneyReader
JourneyNavigator
JourneyBlockRenderer
BusinessProcessDiagram
TABLE
CHECKLIST
CALLOUT
DIAGRAM
```

the correct solution is normally:

```text
replace business content with canonical JSON
```

not:

```text
create Journey-specific renderer
change schema
add permission model
build duplicate navigation
```

Only modify application source when a **generic platform capability gap** is proven.

---

# 14. Required Audit Before Any Major Journey Enhancement

Before implementation, perform a read-only audit.

Minimum audit:

```text
Environment identity
ContentItem identity
Scope
Access mode
Published revision
Revision history
Active Draft
Active Review
Current hash
Content shape
Canonical/legacy detection
Runtime path
Authorization path
Translation status
Related Journey boundaries
Generic platform capabilities
```

Business audit should classify capabilities:

```text
PRESENT
PARTIAL
ABSENT
UNCONFIRMED
```

Do not convert `ABSENT` or `UNCONFIRMED` into a claim that the bank already supports the capability.

If Product Owner approves it as target knowledge scope, clearly distinguish:

```text
target business knowledge
!=
existing technical implementation
```

---

# 15. Business Content Quality Standard

A canonical Journey should not be a thin wrapper around legacy placeholders.

Avoid:

```text
Typical Step
Typical Rule
generic generated filler
```

Each Journey should contain meaningful combinations of:

- business purpose
- business concepts
- process steps
- actors and responsibilities
- decisions
- business rules
- validation categories
- states
- exceptions and rework
- risks and controls
- data concepts
- cross-Journey dependencies
- BA discovery questions
- BA deliverables

Use TABLE blocks heavily when structured business analysis is required.

---

# 16. BPMN / Business Process Standard

Prefer **one high-level generic BPMN** for the full Journey, supported by detailed process tables.

The BPMN should focus on:

```text
business responsibilities
business decisions
rework paths
exception paths
handoffs
```

Avoid creating a giant technical API orchestration diagram unless the Journey is specifically about technical integration.

Required integrity checks:

```text
duplicate lane IDs = 0
duplicate node IDs = 0
duplicate edge IDs = 0
invalid lane refs = 0
invalid source refs = 0
invalid target refs = 0
incoming Start edges = 0
outgoing End edges = 0
gateway branches labelled
meaningful rework routes present
```

---

# 17. State Models Must Remain Domain-Specific

Do not collapse unrelated lifecycle concepts into one `Status` list.

For example, Notification & Engagement correctly separates:

```text
Engagement/Campaign State
Message/Notification State
Delivery State
Customer Response/Outcome State
Service Handoff State
```

The same principle applies to other Journeys.

Examples:

Payments:

```text
Payment Initiation
Authorization
Execution
Settlement
Failure / Reversal
```

Cards:

```text
Card Lifecycle
Transaction Lifecycle
Dispute / Exception
```

Lending:

```text
Application
Assessment
Approval
Disbursement
Loan
Repayment
```

State models should represent real business domains, not UI status labels.

---

# 18. Cross-Journey Boundaries

Related Journeys may exchange authorized context, but they remain separately governed.

Example:

```text
Notification & Engagement
→ may hand off context to Customer Service

Customer Service
→ owns Case / Task / Complaint workflows
```

Potential domain Journeys may produce events or receive outcomes, but do not invent technical contracts when none are evidenced.

Do not assume access to Journey A grants access to Journey B.

---

# 19. Translation Rules

A Journey base-language canonical release does not require a translation to be created automatically.

If VI is:

```text
NOT_STARTED
```

preserve that status unless translation is explicitly in scope.

Validate that locale fallback still resolves the correct canonical base Journey.

Do not create translation content as a side effect of a release.

---

# 20. Revision Safety

Before creating a Draft:

1. read current Published pointer
2. list all revisions
3. check active Draft
4. check active IN_REVIEW
5. check CHANGES_REQUESTED
6. compare with expected baseline

If an active Draft already exists:

```text
REUSE it when legitimate
```

Do not create duplicate Drafts just because the UI crashed after the original Create Draft action.

If multiple unexpected active revisions exist:

```text
STOP
ACTIVE_REVISION_CONFLICT
```

---

# 21. Concurrency Gate

Immediately before mutation, re-read the baseline.

Why:

Another user or process may have changed the Journey between audit and execution.

If:

```text
publishedRevisionId changed
revision count changed unexpectedly
new Draft appeared
review state changed
```

then stop and reassess.

Do not blindly continue based on an old audit.

---

# 22. Customer Service / Other Journey Immutability Gate

For any Journey enhancement, snapshot related critical Journeys before mutation.

At minimum record:

```text
ContentItem
scope
publishedRevisionId
published hash
revision count
```

After release, re-read and compare.

Required:

```text
before = after
```

unless the related Journey was explicitly part of the scope.

Pre-existing Drafts in unrelated Journeys are not regressions by themselves.

Never "clean them up" during another Journey release.

---

# 23. Source Change and Content Change Must Be Separated

When both a generic source fix and a content promotion are required, release them separately.

Preferred pattern:

```text
Phase A
Generic application source fix
→ tests
→ commit
→ Production deploy
→ regression verification

Phase B
Journey CMS content promotion
→ Draft
→ Save
→ DB read-back
→ Review
→ Publish
```

This separation was successfully used for Notification & Engagement.

Benefits:

- smaller rollback surface
- easier root cause isolation
- clear distinction between code and content
- safer Production troubleshooting

---

# 24. Git / Worktree Hygiene

Never stage unrelated files into a release commit.

Examples of files that may appear modified but should not be included automatically:

```text
next-env.d.ts
generated Journey JSON artifacts
temporary scripts
skill/playbook files
debug output
environment export files
```

A generic fix commit should contain only the exact source/test files required.

Run:

```text
git diff --check
```

before commit.

Always report:

```text
commit SHA
changed files
test results
deployment ID
deployed SHA
rollback method
```

---

# 25. Production Deployment Verification

A deployment is not complete because `git push` succeeded.

Verify:

```text
Vercel project binding
Production branch
deployed Git SHA
deployment status=READY
canonical alias
```

Known project:

```text
Project:      babanking
Project ID:   prj_gZaFRjHKk3saktcFyg8X6EYiv4tc
Branch:       main
Alias:        https://babanking.vercel.app
```

Project ID is stronger binding evidence than a folder name.

---

# 26. Production Content Promotion Standard

For content-only Production promotion:

```text
Approved Development artifact
→ validate exact hash
→ verify Production baseline
→ snapshot other Journeys
→ Create Draft via authenticated CMS
→ paste exact JSON
→ Save Draft
→ direct Production DB read-back
→ persisted hash equality
→ Submit Review
→ independent reviewer
→ Publish
→ published DB read-back
→ final hash equality
→ runtime verification
```

Do not regenerate the artifact separately in Production.

Production should receive the exact Development-approved artifact.

---

# 27. Product Owner Confirmation

The Product Owner controls the business release decision.

Once Development is:

```text
published
validated
visually tested
business-approved
```

do not introduce unnecessary additional product environments or redundant gates.

However, technical Production safety gates remain mandatory:

- environment identity
- baseline concurrency
- persisted hash
- independent review
- published hash
- runtime verification

---

# 28. Rollback Strategy

## 28.1 Content rollback

Never delete history.

Use governed CMS rollback or republish the previous known-good revision.

Record:

```text
previous published revision
previous hash
new revision
new hash
rollback target
```

## 28.2 Source rollback

For a generic source regression:

```text
revert the exact fix commit
push through normal main branch process
verify Production deployment READY
verify runtime
```

Do not mix source rollback with unrelated CMS data changes.

---

# 29. Mandatory Journey Delivery Workflow

This is the standard workflow for all future Journeys.

## Phase 1 — Audit

```text
read playbooks
verify Development identity
resolve ContentItem
resolve scope/access
read revision history
calculate current hash
classify legacy/canonical
trace runtime architecture
audit business coverage
audit related Journey boundaries
identify generic platform gaps
```

STOP if architecture assumptions are uncertain.

## Phase 2 — Product Owner Decisions

Resolve only genuinely unconfirmed business scope.

Do not fabricate current bank capability.

Distinguish:

```text
existing evidence
vs
PO-approved target business scope
```

## Phase 3 — Build Canonical Artifact

```text
generate JSON
validate schema
validate IDs
validate business content
validate BPMN
calculate SOURCE_HASH
```

No CMS mutation yet.

## Phase 4 — Development CMS

```text
re-read baseline
Create/Reuse Draft
Advanced JSON
Save exact artifact
direct DB read-back
verify SOURCE = SAVE = PERSISTED
canonical pipeline verification
business regression gate
Submit Review
independent Publish
verify PUBLISHED_HASH
```

## Phase 5 — Development PO Check

PO verifies:

- business correctness
- navigation
- responsiveness
- diagrams
- readability
- no obvious regression

## Phase 6 — Production Preflight

```text
Production identity
project binding
source commit prerequisites
current Production baseline
other Journey snapshots
approved artifact hash
```

## Phase 7 — Production Promotion

```text
Create/Reuse Draft
Save exact Development artifact
direct Production DB read-back
hash equality
Review
independent Publish
published hash equality
runtime verification
```

## Phase 8 — Close Scope

Record:

```text
final revision
final hash
deployment if any
structure counts
business counts
security status
related Journey immutability
rollback reference
PO confirmation
```

Then mark the Journey scope closed.

---

# 30. Stop Conditions

Automation or Codex must stop immediately when any of these occur:

```text
environment identity uncertain
wrong database target
Production accessed during Development-only work
baseline unexpectedly changed
multiple unexpected active revisions
source hash changed unexpectedly
Save payload hash mismatch
persisted Draft hash mismatch
schema validation failure
invalid BPMN references
canonical mapper failure
authorization bypass would be required
independent reviewer unavailable where required
unrelated Journey changed
generic platform gap discovered during content-only task
Production deployment SHA mismatch
published hash mismatch
```

Stopping at these boundaries is correct behavior.

---

# 31. What Must Never Be Done

Never:

- direct-write CMS revision tables to avoid authentication
- manually change `publishedRevisionId`
- create fake Admin actors
- bypass `requireJourneyCmsAccess()`
- copy Development DB into Production
- copy Production DB into Development
- run destructive migrations without explicit approval
- seed Production during a content release
- hard-delete revision history
- assume Save success means content changed
- create duplicate Drafts after a browser crash without checking DB
- trust `.env.local` as Production identity proof
- fabricate masked Production secrets
- invent vendor capability
- invent bank policy
- invent regulatory timelines
- automatically change unrelated Journeys
- redesign authorization for a Journey content enhancement

---

# 32. Definition of Done — Any Banking Journey

A Journey is complete only when all applicable gates pass.

## Content

```text
approved artifact exists
schema valid
canonical metadata present
business content complete
no placeholders
IDs unique
BPMN valid
rules/validations valid
states coherent
risks/controls present
```

## Development

```text
Development identity PASS
Draft persisted hash PASS
canonical pipeline PASS
Review PASS
Publish PASS
Published hash PASS
runtime PASS
PO business/visual approval PASS
```

## Production

```text
Production identity PASS
baseline concurrency PASS
approved source hash PASS
Draft persisted hash PASS
Review PASS
independent Publish PASS
Published hash PASS
runtime PASS
security regression PASS
related Journey immutability PASS
```

## Equality

Preferred final evidence:

```text
DEVELOPMENT_APPROVED_SOURCE
=
DEVELOPMENT_PERSISTED
=
DEVELOPMENT_PUBLISHED
=
PRODUCTION_SAVE
=
PRODUCTION_PERSISTED
=
PRODUCTION_PUBLISHED
```

---

# 33. Known Successful Journey Release Patterns

## Customer Onboarding

Established the canonical full-Journey pattern and shared reader approach.

Key lesson:

```text
canonical Journey content should flow through the shared runtime,
not a Journey-specific renderer
```

## Deposits

Successfully demonstrated a content-only Production promotion.

Key lesson:

```text
business content can be promoted without application deployment
when the platform already supports the canonical model
```

## Cards

Reinforced separation of business lifecycle models.

Key lesson:

```text
do not collapse card lifecycle and transaction lifecycle into one state model
```

Also showed why mixed environment execution history must not be reused as a template.

## Lending

Confirmed the canonical 13-stage style and governed CMS revision workflow.

Key lesson:

```text
rich business content can remain data-driven while preserving the shared architecture
```

## Customer Service

Exposed the Advanced JSON persistence defect.

Key lesson:

```text
CMS workflow success is not content persistence evidence
```

Resulting permanent control:

```text
direct DB read-back before Review
```

## Notification & Engagement

Exposed the legacy editor selection defect and validated the two-phase source/content Production release model.

Key lessons:

```text
legacy content must be editable before migration
```

and:

```text
generic source fix
!=
Journey content promotion
```

---

# 34. Future Feature Template

For every new Journey, begin with this release contract:

```text
ENVIRONMENT:
Development first

ARCHITECTURE:
reuse shared canonical architecture

SECURITY:
preserve existing Journey scope + Role Matrix

CONTENT:
canonical JSON artifact

CMS:
governed Draft → Review → Publish

SAVE CONTROL:
Advanced current textarea → schema validation → exact Save payload

PERSISTENCE CONTROL:
direct ContentRevision.contentJson read-back

HASH CONTROL:
SOURCE = SAVE = PERSISTED before Review

PRODUCTION:
exact Development-approved artifact only

REGRESSION:
snapshot related Journeys before and after

ROLLBACK:
previous Published revision + source commit rollback where applicable
```

---

# 35. Final Project Principle

The safe Banking Journey delivery model is:

```text
Audit first
→ prove the environment
→ preserve security boundaries
→ build business content as canonical data
→ reuse the shared runtime
→ save through governed CMS
→ verify the database, not the UI
→ review independently
→ publish
→ verify the database again
→ validate runtime
→ preserve unrelated Journeys
→ close scope with evidence
```

The single most important operational rule is:

> **Never treat a successful CMS action as proof that the intended content was persisted. Read the exact revision back from the correct database and verify the hash before Review and again after Publish.**

---

# 36. Notification & Engagement Closure Record

```text
SCOPE:
CLOSED

PRODUCTION PO VALIDATION:
PASS

APPROVED CONTENT HASH:
475be69a858d7a34b76060ce33172fd0696d5ce5a6a79cdd763deef1ac1b801b

GENERIC LEGACY CMS FIX:
5fb7b8478c7965ad0d7e3e8e1f6911312729e90b

PRODUCTION FIX DEPLOYMENT:
dpl_SCkmH2fXGmHt7R4CWKZXy8gzxkD1

AUTHORIZATION:
NOTIFICATION_ENGAGEMENT preserved

CUSTOMER SERVICE:
independently governed and unchanged

SCHEMA:
unchanged

MIGRATION:
none

SEED:
none

ROLE MATRIX:
unchanged

PRODUCTION RESULT:
Product Owner tested and confirmed working correctly.
```

**No further Notification & Engagement enhancement should be started from this release session unless a new scope is explicitly opened.**
