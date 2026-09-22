# Banking BA Knowledge Hub — Codex Project Handoff

**Repository:** `/Users/jonathanta/BA Master`  
**Production:** `https://babanking.vercel.app`  
**Product environments:** Development and Production only  
**Purpose:** Read this file first in every new Codex session so the project can continue without asking the Product Owner to repeat established context.

---

## 1. Session startup rule

At the beginning of every Codex session:

1. Read this file in full.
2. Read `BANKING_JOURNEY_ENHANCEMENT_SKILL.md`.
3. Read `BANKING_JOURNEY_RELEASE_CMS_LESSONS_LEARNED.md`.
4. Read any Journey-specific implementation skill if present.
5. Inspect live repo, git state, requested environment, ContentItem and revision state before mutation.
6. Continue from the established architecture and delivery model. Do not redesign existing foundations.
7. Do not ask the Product Owner to repeat information already recorded here unless live code/data contradicts this handoff.

Priority when information conflicts:

```text
LIVE VERIFIED STATE
>
THIS HANDOFF
>
OLDER SESSION NOTES
```

---

## 2. Product definition

Banking BA Knowledge Hub is a professional banking knowledge-sharing platform, **not an LMS**.

Primary purpose:

- reusable Banking BA knowledge
- Banking Journeys
- business processes
- business rules
- validations
- state models
- risks and controls
- cross-Journey boundaries
- business process diagrams
- governed CMS content
- responsive reading experience

Do not turn the platform into a quiz/LMS or vendor-specific training platform.

---

## 3. Technology baseline

```text
Next.js App Router
TypeScript
TailwindCSS
Neon PostgreSQL
Prisma
Vercel
```

Neon PostgreSQL is the target source of truth.

Static TypeScript content is migration compatibility only; do not redesign the platform around static TS.

---

## 4. Exactly two product environments

Only:

```text
Development
Production
```

Do not introduce Preview/Staging as separate product environments.

Development is used for implementation, CMS Draft, testing and PO verification.

Production is used only after Development is verified and PO confirms the release.

Standard product flow:

```text
Development
→ PO business/visual verification
→ technical release gate
→ Production
```

---

## 5. Environment identity

Never use repository `.env.local` as sole Production identity proof.

Required Development values:

```text
APP_ENV=development
DATABASE_ENVIRONMENT=development
ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
```

Known Development Neon host:

```text
ep-crimson-moon-azxy1ao5-pooler.c-3.ap-southeast-1.aws.neon.tech
```

Required Production values:

```text
APP_ENV=production
DATABASE_ENVIRONMENT=production
ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
```

Known Production Neon host:

```text
ep-quiet-snow-azmaehn4-pooler.c-3.ap-southeast-1.aws.neon.tech
```

Development and Production DBs must remain isolated.

Do not copy Dev DB to Prod or Prod DB to Dev.

For Production identity prefer clean Vercel cloud scope / clean export, not local shadowed values.

---

## 6. Vercel binding

```text
Project: babanking
Project ID: prj_gZaFRjHKk3saktcFyg8X6EYiv4tc
Team: taanhluans-projects
Production branch: main
Canonical alias: https://babanking.vercel.app
```

Verify Production releases by:

```text
Project ID
deployed Git SHA
deployment status=READY
canonical alias
```

A successful `git push` is not sufficient deployment proof.

---

## 7. Core domains and security

Platform domains:

```text
Identity
Membership
Knowledge Content
Knowledge Access
CMS
```

Access path:

```text
Identity
→ Membership
→ Knowledge Package
→ Journey Grant
→ Published Journey
```

The Journey is the security boundary.

Authorization must be server-side before protected Journey content or metadata is queried.

Do not implement UI-only authorization.

Do not create a parallel CMS permission model.

The existing Role Matrix remains authoritative.

---

## 8. CMS authorization

The existing Admin/Contributor Journey CMS must use the current authorization path, including:

```text
requireJourneyCmsAccess()
```

Never:

- fabricate an Admin actor
- impersonate a user locally
- bypass `requireJourneyCmsAccess()`
- direct-write CMS revision tables to avoid auth
- manually update status
- manually update `publishedRevisionId`
- extract or fake masked secrets

If no legitimate authenticated Admin/Contributor session exists:

```text
STOP AT AUTHENTICATION BOUNDARY
```

A human authenticated operator can perform the UI step; Codex may then continue with read-only verification.

---

## 9. CMS lifecycle

Governed lifecycle:

```text
Draft
→ Review
→ Published
→ Archived
```

Rules:

- no self-approval bypass
- no self-publish bypass
- no hard delete
- preserve revision history
- Production reads Published revisions
- opening a Draft must not silently modify content

Before creating a Draft, re-read:

```text
publishedRevisionId
revision history
active DRAFT
active IN_REVIEW
active CHANGES_REQUESTED
```

If one legitimate active Draft exists, reuse it.

If multiple unexpected active revisions exist:

```text
STOP:
ACTIVE_REVISION_CONFLICT
```

---

## 10. Canonical Journey architecture

Canonical content hierarchy:

```text
JourneyContent
→ modules[]
→ sections[]
→ blocks[]
```

Runtime path:

```text
ContentRevision.contentJson
→ ContentRepository
→ Canonical/Structured Mapper
→ CanonicalJourney
→ SharedJourneyReader
→ JourneyNavigator
→ JourneyBlockRenderer
→ BusinessProcessDiagram
```

Common block types:

```text
RICH_TEXT
TABLE
CHECKLIST
CALLOUT
DIAGRAM
```

Generic business-process DIAGRAM supports:

```text
lanes
nodes
edges
scope
businessRules
validationCategories
successOutcome
```

Mapper metadata preservation is mandatory.

---

## 11. Generic platform rule

Journey content enhancement should normally be content-only.

Expected:

```text
Source code:      NONE
Schema:           NONE
Migration:        NONE
Seed:             NONE
Permission model: NONE
New renderer:     NONE
```

Only change application source if a generic capability gap is proven.

For any significant source/architecture/security change first produce:

```text
Audit
Impact Analysis
Proposed Solution
Risks
Rollback Strategy
```

---

## 12. Advanced JSON save contract

A generic Advanced JSON persistence defect was fixed.

Required behavior:

```text
current Advanced textarea
→ JSON.parse
→ journeyContentSchema validation
→ exact current textarea submitted by Save Draft
```

Required:

```text
Apply JSON required:              NO
Invalid JSON blocks Save:         YES
Schema-invalid JSON blocks Save:  YES
Structured Save unchanged:        YES
```

Fix commit:

```text
1837b99a15f0e149a9a9873c22600823584bea8f
```

Do not reintroduce stale textarea/parent-content state.

---

## 13. Mandatory persisted-content gate

A successful CMS workflow does **not** prove intended content was persisted.

Insufficient proof:

```text
Save success
JOURNEY_DRAFT_UPDATED
Submit Review success
Publish success
publishedRevisionId changed
UI preview
```

After Save, read exact:

```text
ContentRevision.contentJson
```

from the correct environment database.

Before Review:

```text
SOURCE_HASH
=
SAVE_PAYLOAD_HASH
=
PERSISTED_DRAFT_HASH
```

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

If Save payload cannot be independently reconstructed, at minimum require:

```text
SOURCE_HASH
=
PERSISTED_DRAFT_HASH
```

before Review.

If any required equality fails:

```text
STOP
DO NOT SUBMIT REVIEW
DO NOT PUBLISH
```

This rule applies to every Journey in both Development and Production.

---

## 14. Customer Service persistence incident

Customer Service exposed a defect where CMS workflow revisions were successfully created/reviewed/published while the persisted content stayed on the old legacy payload.

Permanent lesson:

```text
CMS workflow success
!=
content persistence proof
```

Permanent release control:

```text
Save
→ direct DB read-back
→ hash equality
→ Review
→ Publish
→ published DB read-back
```

---

## 15. Legacy Journey editor incident

Notification & Engagement exposed a generic legacy-content editor crash.

Root cause:

```text
nodes=[]
selectedNode=undefined
```

`JourneyBusinessEditor` dereferenced:

```text
selectedNode.type
selectedNode.title
```

before safe empty-selection handling.

Correct generic behavior:

- legacy Draft opens without crash
- Advanced JSON remains available
- no placeholder modules/blocks are created
- no automatic conversion
- no automatic Save
- canonical structured editor behavior remains unchanged

Generic fix commit:

```text
5fb7b8478c7965ad0d7e3e8e1f6911312729e90b
```

Production deployment:

```text
dpl_SCkmH2fXGmHt7R4CWKZXy8gzxkD1
```

Fix files:

```text
src/app/admin/contributor/journeys/[slug]/JourneyBusinessEditor.tsx
src/app/admin/contributor/journeys/[slug]/JourneyBusinessEditor.test.tsx
```

Verified before Production deployment:

```text
Focused tests: 13/13 PASS
Full tests: 180/180 PASS
Lint: PASS
TypeScript: PASS
Build: PASS
git diff --check: PASS
```

Do not revert this behavior unless replacing it with an equivalent generic solution.

---

## 16. Legacy → canonical migration

The CMS must be able to open the old content shape before migration.

For legacy content:

```text
no structured node may exist
Advanced JSON must remain usable
opening page must not mutate content
no placeholder canonical structure should be fabricated
```

Migration is explicit:

```text
legacy Draft
→ operator opens Advanced JSON
→ pastes approved canonical artifact
→ Save Draft
→ direct DB read-back
```

---

## 17. Separate source fixes from content promotion

If a release requires a generic source fix and Journey content promotion:

```text
Phase A
Generic source fix
→ tests
→ commit
→ deploy
→ verify

Phase B
Journey CMS content
→ Draft
→ Save
→ DB read-back
→ Review
→ Publish
```

Do not combine unrelated code and business-content changes into one opaque release.

---

## 18. Git/worktree hygiene

Do not stage unrelated files.

Common unrelated/generated files may include:

```text
next-env.d.ts
Journey JSON artifacts
skill/playbook files
temporary scripts
temporary Vercel env exports
debug output
```

Run:

```text
git diff --check
```

before commit.

For each source release report:

```text
commit SHA
changed files
tests
deployment ID
deployed SHA
rollback
```

---

## 19. Business content quality

This is a Banking BA knowledge platform.

Avoid:

```text
Typical Step
Typical Rule
placeholder prose
generic filler
```

Journey content should contain, where applicable:

- business purpose
- business concepts
- business process
- actors/responsibilities
- decision points
- business rules
- validation categories
- state models
- exceptions/rework
- risks/controls
- data concepts
- cross-Journey dependencies
- BA discovery questions
- BA outputs
- acceptance criteria guidance

Use TABLE blocks extensively for structured BA knowledge.

---

## 20. BPMN/business-process standard

Prefer one high-level end-to-end business BPMN plus detailed process tables.

Focus the BPMN on:

```text
lanes / actors
business decisions
exceptions
rework
handoffs
outcomes
```

Do not make the main Journey BPMN a low-level API orchestration unless specifically required.

Required integrity:

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
meaningful rework paths present
```

---

## 21. State model rule

Do not collapse unrelated lifecycles into one generic Status.

Keep state models domain-specific.

Examples:

Notification & Engagement:

```text
Engagement/Campaign
Message/Notification
Delivery
Response/Outcome
Service Handoff
```

Cards:

```text
Card lifecycle
Transaction lifecycle
```

Lending:

```text
Application
Loan
Payment
```

---

## 22. Cross-Journey boundaries

Related Journeys may link, launch, hand off or consume authorized outcomes without merging ownership.

Important boundary:

```text
CUSTOMER_SERVICE
!=
NOTIFICATION_ENGAGEMENT
```

Notification & Engagement may hand off authorized context.

Customer Service owns:

- service requests
- complaints
- cases
- tasks
- assignment
- escalation
- back-office servicing
- service recovery
- closure

Do not duplicate these inside Notification & Engagement.

Do not assume Journey A access grants Journey B access.

---

## 23. Translation rule

If a translation is:

```text
NOT_STARTED
```

do not create it as a side effect of another release.

Preserve base-content fallback unless translation is explicitly in scope.

---

## 24. Standard Journey delivery workflow

### Phase 1 — Read project context

Read:

```text
CODEX_PROJECT_HANDOFF.md
BANKING_JOURNEY_ENHANCEMENT_SKILL.md
BANKING_JOURNEY_RELEASE_CMS_LESSONS_LEARNED.md
```

Read Journey-specific skill if present.

### Phase 2 — Audit only

Audit live Development:

```text
environment
ContentItem
scope
access mode
revision history
active Draft/Review
current hash
legacy/canonical shape
translation state
runtime path
authorization path
related Journey boundaries
generic platform capability
business coverage
```

Classify capabilities:

```text
PRESENT
PARTIAL
ABSENT
UNCONFIRMED
```

Do not fabricate current bank capability.

### Phase 3 — Product Owner decisions

Ask only for genuinely unresolved business scope.

Do not ask again for established architecture, environments, CMS or security rules.

Distinguish:

```text
current evidenced implementation
vs
PO-approved target business knowledge
```

### Phase 4 — Build canonical artifact

Generate and validate:

```text
schema
modules/stages
sections
blocks
IDs
BPMN
business rules
validations
states
risks/controls
canonical mapper
```

Calculate `SOURCE_HASH`.

No CMS mutation until the source artifact is valid.

### Phase 5 — Development CMS

```text
re-read baseline
Create or reuse Draft
Advanced JSON
Save exact artifact
direct Development DB read-back
SOURCE = SAVE = PERSISTED
canonical pipeline verification
business regression gate
Submit Review
independent Publish
published DB read-back
final hash equality
```

### Phase 6 — PO Development verification

PO checks:

```text
business correctness
visual presentation
navigation
BPMN
responsive layout
no obvious regression
```

### Phase 7 — Production preflight

Verify:

```text
Production identity
Vercel binding
required source commit
live Production baseline
active revisions
related Journey snapshots
approved source hash
```

### Phase 8 — Production promotion

Use the exact Development-approved artifact.

Do not regenerate Production content independently.

```text
Create or reuse Draft
Advanced JSON
Save exact artifact
direct Production DB read-back
hash equality
Submit Review
independent Publish
published DB read-back
final hash equality
runtime verification
```

### Phase 9 — Close scope

Record:

```text
scope status
artifact
hash
revision
deployment if any
structure counts
security status
related Journey immutability
rollback
PO Production validation
```

---

## 25. Stop conditions

Stop when:

```text
environment identity uncertain
wrong DB target
Production accessed during Development-only work
Vercel project mismatch
baseline changed unexpectedly
multiple unexpected active revisions
source hash mismatch
Save payload hash mismatch
persisted Draft hash mismatch
published hash mismatch
schema failure
invalid BPMN references
canonical mapper failure
auth bypass would be required
unrelated Journey changed
generic platform gap discovered during content-only task
Production deployed SHA mismatch
```

Stopping at these boundaries is correct behavior.

---

## 26. Never do

Never:

- bypass `requireJourneyCmsAccess()`
- fabricate Admin identity
- direct-write CMS revision tables
- manually update `publishedRevisionId`
- hard-delete revision history
- fake Production secrets
- copy Dev DB to Prod
- copy Prod DB to Dev
- run destructive migrations without explicit approval
- seed Production during content promotion
- trust UI Save as content proof
- trust Publish as content proof
- create duplicate Draft after UI crash without DB check
- treat `.env.local` as Production identity truth
- merge Journey security scopes
- create Journey-specific renderer without proven generic gap
- redesign Role Matrix during content work
- modify unrelated Journey content
- invent vendor capability
- invent bank policy
- invent regulatory/SLA/retry thresholds

---

## 27. Definition of Done

Content:

```text
canonical artifact exists
schema valid
metadata.journeyReader=canonical
business content substantive
IDs unique
BPMN valid
rules/validations valid
state models coherent
risks/controls present
```

Development:

```text
environment PASS
persisted Draft hash PASS
canonical pipeline PASS
Review PASS
Publish PASS
Published hash PASS
runtime PASS
PO business/visual PASS
```

Production:

```text
environment PASS
baseline concurrency PASS
approved source hash PASS
persisted Draft hash PASS
Review PASS
independent Publish PASS
Published hash PASS
runtime PASS
security regression PASS
related Journey immutability PASS
PO Production validation PASS
```

Preferred final equality:

```text
DEVELOPMENT_SOURCE
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

## 28. Completed Journey reference

### Customer Onboarding

Previously verified canonical Development structure:

```text
11 modules
112 sections
112 blocks
BPMN 7 / 81 / 97
Hash:
d3503f1832d03dbd8e7c6714c6b92be52b4e8995369ac5f0b1e931fc44d0542d
```

A separate unrelated Customer Onboarding Draft may exist in Production. Do not touch it during other Journey work.

### Deposits

Previously verified:

```text
11 modules
114 sections
114 blocks
BPMN 7 / 80 / 99
Rules 18
Validations 23
Hash:
c397a121affb682843b7e8295161c6fc9dc20b9fe6fa29b137ae401d2950f471
```

Production promotion was content-only.

### Cards

Previously verified:

```text
13 stages
157 sections
157 blocks
BPMN 7 / 58 / 76
Rules 32
Validations 30
Hash:
482e62212e08695164559f9b9312148a2fa1cc6018ff8f9a6b613482a8b5c380
```

Keep Card lifecycle and transaction lifecycle separate.

### Lending

Previously verified:

```text
13 stages
161 sections
161 blocks
BPMN 7 / 67 / 88
Rules 40
Validations 39
Risks 30
Hash:
03f3375e7812f5ae0d670aea150b05d1eaa3e778f52d415f14f73d2358ceac90
```

Production release completed through governed CMS.

---

## 29. Customer Service — completed

Scope:

```text
CUSTOMER_SERVICE
```

Approved canonical hash:

```text
7123c1c3ebeee04c0a7a65625bc6611917a29dd4eca95eecb80557f828ab21b2
```

Approved structure:

```text
13 stages
107 sections
107 blocks

RICH_TEXT 13
TABLE 78
CHECKLIST 13
CALLOUT 2
DIAGRAM 1

BPMN 7 / 46 / 66

Rules 28
Validations 28
Risks/Controls 25
```

Historical Production release evidence:

```text
ContentItem:
cmrxkfrgu0020rggkt8jefg8n

publishedRevisionId:
cmstzmx580005lb04l5my674o

Version:
5

Published hash:
7123c1c3ebeee04c0a7a65625bc6611917a29dd4eca95eecb80557f828ab21b2

Revision count:
5
```

Treat IDs as historical; re-resolve live state before future mutation.

Customer Service is closed unless a new scope is explicitly opened.

---

## 30. Notification & Engagement — completed and closed

Scope:

```text
NOTIFICATION_ENGAGEMENT
```

ContentItem:

```text
cmrxkfs0o002arggk84la8352
```

Relationship:

```text
PRIMARY
```

Access:

```text
ANY_SCOPE
```

Required:

```text
true
```

Approved artifact:

```text
/Users/jonathanta/BA Master/notification-engagement-full-business-journey.json
```

Approved hash:

```text
475be69a858d7a34b76060ce33172fd0696d5ce5a6a79cdd763deef1ac1b801b
```

Approved structure:

```text
Stages:   13
Sections: 107
Blocks:   107

RICH_TEXT: 13
TABLE:     76
CHECKLIST: 17
DIAGRAM:    1

BPMN:
Lanes: 7
Nodes: 46
Edges: 52

Rules: 32
Validations: 23
Risks/Controls: 20
```

State domains:

```text
Engagement/Campaign:  9
Message/Notification: 7
Delivery:             6
Response/Outcome:     8
Service Handoff:      9
```

Exact top-level stages:

```text
1. Overview & Engagement Scope
2. Event & Trigger Intake
3. Customer & Context Resolution
4. Eligibility, Segment, Audience & Targeting
5. Campaign & Engagement Orchestration
6. Consent, Preference, Contactability & Suppression
7. Content, Message, Offer & Personalization
8. Channel Selection & Delivery Planning
9. Delivery Execution, Failure & Recovery
10. Customer Response, Engagement Outcome & Analytics
11. Service Handoff & Cross-Journey Context
12. Exceptions, Risks, Controls & Audit
13. Business Analysis
```

Business coverage:

```text
Event/Trigger
Customer Context
Eligibility
Segment
Audience
Targeting
Campaign
Consent
Preference
Contactability
Suppression
Message
Offer
Personalization
Channel
Delivery
Recovery
Response/Outcome
Analytics
Service Handoff
Risks/Controls
Business Analysis
```

Segment:

```text
Reusable customer grouping based on approved business characteristics,
behavioral conditions, eligibility attributes, or other criteria.
```

Audience:

```text
Target population for a specific Engagement purpose, potentially derived from
one or more Segments plus eligibility, exclusions, consent, suppression and
targeting criteria.
```

Audience may conceptually be:

```text
STATIC
DYNAMIC
```

Do not invent evaluation frequency.

---

## 31. Notification & Engagement Development release evidence

Development Draft used:

```text
cmsu1fmj00001rghiyxkqsxg7
```

Verified persisted equality:

```text
SOURCE_HASH=
475be69a858d7a34b76060ce33172fd0696d5ce5a6a79cdd763deef1ac1b801b

PERSISTED_DRAFT_HASH=
475be69a858d7a34b76060ce33172fd0696d5ce5a6a79cdd763deef1ac1b801b

SOURCE_CONTENT_EQUALITY=PASS
NOTIFICATION_ENGAGEMENT_PERSISTED_GATE=PASS
```

Canonical pipeline:

```text
Canonical Mapper=PASS
Canonical stages=13
Canonical states=107
SharedJourneyReader=PASS
JourneyNavigator=PASS
JourneyBlockRenderer=PASS
BusinessProcessDiagram=PASS
Legacy reader=NOT SELECTED
```

All 107 mapped blocks rendered in the read-only pipeline verification.

---

## 32. Notification & Engagement Production source release

Generic CMS legacy-editor Production fix:

```text
FIX_COMMIT_SHA=
5fb7b8478c7965ad0d7e3e8e1f6911312729e90b

PROD_FIX_DEPLOYMENT_ID=
dpl_SCkmH2fXGmHt7R4CWKZXy8gzxkD1

PROD_FIX_DEPLOYED_SHA=
5fb7b8478c7965ad0d7e3e8e1f6911312729e90b

DEPLOYMENT_STATUS=
READY
```

Historical pre-content-promotion Production baseline:

```text
publishedRevisionId:
cms2v8q6j0001kz047qc8qxgp

Published version:
2

Published hash:
e6b540dc1bfbd78bb4f63bc29a7085a880805e16496768cbdabcac7e9ef912b5

Revision count:
2

Active Draft:
NONE
```

This is historical baseline only.

The PO subsequently completed the authenticated Production CMS continuation and tested the live Production Journey successfully.

Final status:

```text
NOTIFICATION & ENGAGEMENT:
CLOSED

PRODUCTION RUNTIME:
PO CONFIRMED GOOD

CANONICAL ARTIFACT:
APPROVED

APPROVED HASH:
475be69a858d7a34b76060ce33172fd0696d5ce5a6a79cdd763deef1ac1b801b
```

The exact final Production revision ID after the manual Production content promotion was not captured in the supplied Codex transcript.

Do not guess it.

If a future task needs it:

```text
resolve live Production ContentItem
→ read current publishedRevisionId
→ read exact Published contentJson
→ calculate hash
```

Do not reopen Notification & Engagement unless the PO explicitly opens new scope.

---

## 33. Important historical commits

Useful release anchors:

```text
Full Prod→Dev source baseline:
51b89641254ae356b074fec0653afe110b23a7a5

Member Home Production:
1adb1c6604db0d5b10b14684ff710de56f6369d9

Journey UX HEAD:
d674d6796167cd4ec52d559c8e98b450838214d

Generic mapper metadata fix:
89f27b85e95596e1d4e9fa74ed5736f836d8accc

Advanced JSON current-textarea Save fix:
1837b99a15f0e149a9a9873c22600823584bea8f

Legacy Journey CMS editor fix:
5fb7b8478c7965ad0d7e3e8e1f6911312729e90b
```

These are historical anchors. Always inspect live `git log` and current branch before source mutation.

---

## 34. Project files future Codex should read

Expected repository context files:

```text
CODEX_PROJECT_HANDOFF.md
BANKING_JOURNEY_ENHANCEMENT_SKILL.md
BANKING_JOURNEY_RELEASE_CMS_LESSONS_LEARNED.md
DEPOSITS_JOURNEY_IMPLEMENTATION_SKILL.md
```

If present:

```text
BANKING_PROJECT_RELEASE_TROUBLESHOOTING_ADVANCED_JSON_INCIDENT.md
```

The absence of the incident-specific file must not block work if the implementation and controls documented here can be verified directly.

---

## 35. Responsive/mobile constraint

For responsive web enhancement:

- preserve existing business/product behavior
- improve mobile/responsive usability only
- do not refactor unrelated features
- preserve URLs/SEO/auth/membership/access/CMS

The shared Journey reader architecture remains the default.

---

## 36. Database safety

Do not perform:

- destructive DB reset
- destructive migration
- Production seed during Journey content release
- Dev↔Prod database copy
- direct CMS write outside governed workflow

For Journey releases:

```text
CMS = write path
Database read-back = verification path
```

---

## 37. Runtime verification

After Publish verify through the normal application path.

Check:

```text
correct Journey title
correct canonical content
correct stage navigation
expected blocks
BPMN
responsive layout
authorization
no legacy reader
no unrelated Journey regression
```

If authenticated visual browser access is unavailable, do not claim visual verification.

Return:

```text
AUTHENTICATED_RUNTIME_VISUAL_CHECK=PENDING
```

and let the Product Owner perform it.

---

## 38. What a future Codex session should ask

Do not ask the Product Owner to restate known project architecture.

Ask only if required for:

- genuinely new feature scope
- unresolved business policy
- new Journey boundary
- explicit vendor requirement
- jurisdiction/regulatory requirement
- architecture/schema/security change approval
- destructive operation approval
- Production release confirmation if not already given

Normal continuation:

```text
read context
→ audit live state
→ continue
```

---

## 39. New-session checklist

```text
[ ] Read CODEX_PROJECT_HANDOFF.md
[ ] Read BANKING_JOURNEY_ENHANCEMENT_SKILL.md
[ ] Read BANKING_JOURNEY_RELEASE_CMS_LESSONS_LEARNED.md
[ ] Confirm repo /Users/jonathanta/BA Master
[ ] Inspect git status + branch
[ ] Verify requested environment
[ ] Verify Neon DB target
[ ] Resolve target ContentItem live
[ ] Read Published pointer + active revisions
[ ] Calculate current hash for content work
[ ] Snapshot related Journeys
[ ] Confirm shared canonical architecture
[ ] Audit before implementation
[ ] Preserve Role Matrix/security
[ ] Build canonical artifact if needed
[ ] Save through governed CMS
[ ] Direct DB read-back after Save
[ ] Hash equality before Review
[ ] Independent Publish
[ ] Published hash verification
[ ] Runtime verification
[ ] Related-Journey immutability
[ ] Record rollback
[ ] Close scope only after PO Production confirmation
```

---

## 40. Current continuation state

```text
Customer Onboarding:
completed canonical Journey; preserve unrelated Drafts.

Deposits:
completed.

Cards:
completed.

Lending:
completed.

Customer Service:
completed and Production canonical hash known.

Notification & Engagement:
completed; Production tested and PO-confirmed good.

Next Journey:
not defined in this handoff.
```

When a new Journey is requested:

1. do not reopen closed Journeys
2. audit only the requested Journey
3. preserve completed Journey content/security
4. use the project-wide persistence and release gates
5. continue from the shared architecture

---

## 41. Final operating principle

```text
Read existing context
→ audit live state
→ preserve architecture
→ preserve authorization
→ generate canonical business content
→ validate source
→ save through governed CMS
→ read persisted DB content
→ verify hash
→ independent Review
→ Publish
→ verify Published DB content
→ verify runtime
→ preserve unrelated Journeys
→ close scope
```

Most important rule:

> Never treat successful CMS workflow events as proof that the intended Journey JSON was persisted. Read the exact `ContentRevision.contentJson` from the correct environment and verify the approved hash before Review and again after Publish.

---

**End of Codex project handoff.**
