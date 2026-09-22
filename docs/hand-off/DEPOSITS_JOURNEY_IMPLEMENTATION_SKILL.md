# Deposits Journey Implementation Skill
## Banking BA Knowledge Hub — Deposit Domain Playbook

**Repository:** `/Users/jonathanta/BA Master`  
**Primary domain:** Deposits  
**Architecture model:** Shared canonical Banking Journey architecture  
**Environment model:** Development / Production  
**Status baseline:** Development Deposits v2 is published and technically verified. Production promotion is content-only unless a new generic capability gap is proven.

---

# 1. Purpose

This skill captures the Deposits-specific business architecture, implementation structure, validation method, known constraints, and promotion approach established after applying the shared Banking Journey architecture to the Deposits domain.

Use this file together with:

```text
BANKING_JOURNEY_ENHANCEMENT_SKILL.md
```

The general skill defines the reusable platform architecture and delivery discipline.

This Deposits skill defines:

```text
same architecture
+
Deposits-specific business context
+
approved Development baseline
+
Deposit-specific future enhancement rules
```

---

# 2. Architectural Rule

Do not build a separate Deposits platform architecture.

Deposits must continue to reuse:

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
BusinessProcessDiagram
```

Also reuse:

- existing CMS lifecycle
- existing Role Matrix
- existing Journey authorization
- existing Knowledge grants
- existing environment isolation
- existing EN/VI repository behavior
- existing responsive readable/wide layout
- existing generic DIAGRAM renderer
- existing generic BPMN metadata preservation

Do not create:

```text
DepositsJourneyReader
DepositsNavigator
DepositsBpmnRenderer
DepositsPermissionModel
DepositsCMS
Deposits-specific DB schema
Deposits-specific generic infrastructure forks
```

unless an audited capability gap proves that the existing shared architecture cannot support the requirement.

---

# 3. Current Deposits Identity

Development reference:

```text
Title:
Deposits

Slug:
deposits

ContentItem:
cmrxkfne9000crggkppmn52ny

Type:
BANKING_JOURNEY

Access mode:
ANY_SCOPE

Scope:
PRIMARY / required / DEPOSITS
```

Original Development published revision:

```text
Revision:
cmrxkfng2000erggk33o5mb4x

Version:
v1

Status:
PUBLISHED
```

Original v1 was legacy flat JSON:

```text
modules = 0
sections = 0
blocks = 0
BPMN = 0
```

Legacy placeholder counts:

```text
"Typical step" = 5
"Illustrative rule" = 2
```

---

# 4. Approved Development v2 Baseline

Approved Development revision:

```text
Revision:
cmspjiuyk0001rgghxdgic4eg

Version:
v2

Status:
PUBLISHED
```

Author:

```text
Anh Luan — ADMIN
```

Independent reviewer:

```text
Admin — ADMIN
```

Approved source artifact:

```text
/Users/jonathanta/BA Master/deposits-full-business-journey.json
```

Approved canonical content hash:

```text
c397a121affb682843b7e8295161c6fc9dc20b9fe6fa29b137ae401d2950f471
```

Approved structure:

```text
11 modules
114 sections
114 blocks
```

Block distribution:

```text
RICH_TEXT: 11
TABLE:     88
CHECKLIST: 14
DIAGRAM:    1
```

Approved BPMN:

```text
7 lanes
80 nodes
99 edges
18 businessRules
23 validationCategories
scope present
successOutcome present
```

All of these boundaries matched the same approved source content:

```text
Source Artifact
=
Save Payload
=
Persisted Draft
=
Published Revision
```

---

# 5. Approved Deposits Module Structure

The canonical Deposits Journey contains exactly these 11 top-level modules:

```text
1. Overview
2. Initiation & Product Selection
3. Customer & Account Eligibility
4. Deposit Product Configuration
5. Account / Deposit Setup
6. Funding & Initial Deposit
7. Interest, Tenor & Instructions
8. Deposit Servicing
9. Maturity, Withdrawal & Closure
10. Exception & Rework
11. Business Analysis
```

This is the current approved baseline.

Future enhancements should extend this structure unless Product Owner explicitly approves a lifecycle restructuring.

---

# 6. Product Scope

Deposits is modeled as the full generic banking Deposits domain.

The Journey supports three generic deposit families:

```text
Deposits
├── Transactional / Demand Deposit
├── Savings Deposit
└── Term / Fixed / Time Deposit
```

These are generic banking product families, not bank-specific products.

Do not invent:

- product codes
- specific rates
- minimum balances
- minimum opening amounts
- fees
- penalty percentages
- tax percentages
- tenor values
- maturity periods
- withdrawal thresholds
- regulatory thresholds
- vendor names

When exact behavior is product-dependent, use wording such as:

```text
where supported by applicable product configuration
```

or:

```text
according to applicable bank policy and jurisdiction
```

---

# 7. Transactional / Demand Deposit Context

Typical supported business capabilities:

```text
product selection
customer/account eligibility
account setup
funding
balance servicing
withdrawal
statements
transaction/activity history where supported
interest where applicable
account status
closure
```

Do not force:

```text
tenor
maturity
renewal
early termination
```

into a non-term product route.

---

# 8. Savings Deposit Context

Typical supported business capabilities:

```text
savings-oriented account setup
funding
withdrawal subject to product configuration
balance servicing
statements
interest handling according to product configuration
account status
closure
```

Savings behavior must remain generic unless exact product policy is evidenced.

---

# 9. Term / Fixed / Time Deposit Context

Conditional capabilities include:

```text
placement amount
contractual tenor
value date
maturity date
interest configuration
interest payout instruction
maturity instruction
renewal instruction
principal payout instruction
early withdrawal / premature termination
partial withdrawal where supported
maturity payout
closure
```

All term-specific behavior is conditional on applicable product configuration.

Do not encode numerical policy without evidence.

---

# 10. Module Design Pattern

Lifecycle modules should normally contain business sections such as:

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

Not every section must exist when it adds no business value.

The current Deposits journey retains detailed Business Process tables across the main lifecycle stages.

Do not replace these tables simply because a BPMN exists.

Rule:

```text
BPMN = visual process overview
TABLE = detailed business specification
```

Both should coexist.

---

# 11. Overview Module

The Overview should preserve business content covering:

```text
Business Context
Journey Scope
Customer Outcomes
Business Outcomes
Deposit Product Families
Entry Points / Triggers
Actors & Responsibilities
Channels
Systems & Responsibilities
Core Capabilities
End-to-End Business Process Summary
Business States
Key Risks & Controls Summary
```

The Overview is not a UI landing-page description.

It is the domain-level BA context for Deposits.

---

# 12. Initiation & Product Selection

This stage owns the beginning of the Deposit journey.

Typical responsibilities:

```text
customer initiates Deposit journey
establish customer/channel context
retrieve available Deposit products
select product
resolve product family
present applicable features/terms
capture initial intent
resolve customer/account context
perform initial product/channel eligibility
continue to detailed eligibility
```

Important decisions may include:

```text
Product available?
Customer eligible to initiate?
Selected product supported by channel?
Existing customer/account context resolvable?
Manual/assisted route required?
```

The approved BPMN is placed in this stage.

---

# 13. Deposit BPMN Placement

Canonical location:

```text
Initiation & Product Selection
├── Purpose
├── General Business Process Flow
├── Business Trigger
├── Preconditions
├── Inputs
├── Business Process
├── Business Rules
├── Validation Rules
├── Decision Points
├── Outputs
├── Exceptions
└── Systems / Responsibilities
```

BPMN section:

```text
deposits-general-business-process
```

Block:

```text
blockType = DIAGRAM
payload.diagramType = business-process
orientation = horizontal
```

Approved BPMN characteristics:

```text
7 lanes
80 nodes
99 edges
18 business rules
23 validation categories
scope present
successOutcome present
```

---

# 14. Deposit BPMN Responsibility Model

Approved high-level responsibility model uses seven swimlanes:

```text
1. Customer / Initiating User
2. Digital / Assisted Channel
3. Deposit / Product Service
4. Customer & Account Service
5. Core Banking / Deposit System
6. Product / Interest Rules Service
7. Operations / Approver
```

Future business-flow changes may adjust nodes and edges.

Do not alter lane topology casually.

If changing lanes, first explain:

```text
business ownership reason
system responsibility impact
process topology impact
renderer impact
```

---

# 15. Deposit End-to-End Business Flow

The approved Deposit business model broadly covers:

```text
Customer initiates Deposit journey
        ↓
Resolve customer/channel context
        ↓
Retrieve available Deposit products
        ↓
Select Deposit product
        ↓
Resolve product family
        ↓
Validate customer eligibility
        ↓
Validate account/product eligibility
        ↓
Capture product configuration
        ↓
Determine funding requirement
        ↓
Select/validate funding source
        ↓
Capture Deposit / funding amount
        ↓
Validate amount/currency/product rules
        ↓
Product-family branch
        ├── Transactional / Savings route
        └── Term / Fixed / Time route
        ↓
Review / approval where required
        ↓
Create Deposit account / placement
        ↓
Fund where required
        ↓
Activate
        ↓
Servicing lifecycle
        ↓
Withdrawal / maturity / renewal / closure
        ↓
Completed business outcome
```

Do not blindly use this textual summary to regenerate the diagram.

For changes, use the current approved JSON as the authoritative BPMN source.

---

# 16. Non-Term Product Route

For Transactional and Savings products, relevant flow may include:

```text
configure account/deposit
determine interest applicability
capture applicable interest/payout instruction
review request
approval where required
create account/deposit
initial funding where required
confirm funding
activate relationship
return account reference
notify customer
```

Do not introduce term-only concepts unless the selected product supports them.

---

# 17. Term Deposit Route

For Term / Fixed / Time Deposit:

```text
capture placement amount
retrieve supported tenor options
select/resolve tenor
derive value date
derive maturity date
resolve interest configuration
capture interest instruction
capture maturity instruction
capture renewal instruction
validate placement
review
approve where required
create deposit instruction
fund placement
activate deposit
return deposit reference
```

Possible generic maturity instructions may include:

```text
payout principal and interest
renew principal
renew principal plus interest
```

only where supported by product configuration.

---

# 18. Deposit Servicing

The Journey covers business servicing at a domain level.

Relevant capabilities may include:

```text
view Deposit/account
balance servicing
statements
transaction/activity history where supported
interest information
status
permitted instruction maintenance
additional funding where supported
withdrawal where supported
restrictions
dormant/restricted/frozen considerations where relevant
```

Do not turn the Journey into a UI feature inventory.

Keep a business lifecycle perspective.

---

# 19. Maturity, Withdrawal & Closure

This stage combines:

```text
normal withdrawal
early withdrawal / premature termination
maturity
renewal
payout
closure
```

Important decisions may include:

```text
Product permits withdrawal?
Partial withdrawal permitted?
Before maturity?
Early termination permitted?
Maturity instruction valid?
Renewal permitted?
Payout destination valid?
Closure conditions satisfied?
```

Possible outcomes:

```text
WITHDRAWAL_COMPLETED
RENEWED
MATURED
CLOSED
REWORK_REQUIRED
REJECTED
```

Do not define penalties numerically.

Use generic applicable-treatment wording.

---

# 20. Exception & Rework

Deposits maintains a structured exception model.

Major categories include:

```text
eligibility
product selection
configuration
funding
creation
interest/instructions
servicing
withdrawal
maturity
renewal
closure
```

Exception catalogue should explain:

```text
Exception
Trigger
Owning Actor/System
Customer Impact
Business State
Required Action
Return Stage
Control / Audit Requirement
```

Prefer meaningful rework routes over excessive terminal failure events.

---

# 21. Business State Model

Candidate states used by the domain include applicable subsets of:

```text
INITIATED
PRODUCT_SELECTED
ELIGIBILITY_PENDING
ELIGIBLE
CONFIGURATION_IN_PROGRESS
READY_FOR_SETUP
SETUP_PENDING
CREATED
FUNDING_PENDING
FUNDED
ACTIVE
SERVICING
WITHDRAWAL_PENDING
MATURITY_PENDING
MATURED
RENEWAL_PENDING
RENEWED
EARLY_TERMINATION_PENDING
CLOSURE_PENDING
CLOSED
MANUAL_REVIEW_REQUIRED
REWORK_REQUIRED
FAILED
REJECTED
CANCELLED
EXPIRED
```

Do not automatically add every candidate state.

A state must represent a meaningful business transition.

Maintain a Business State Transition Reference in Business Analysis.

---

# 22. Business Rules

The approved Journey contains 18 BPMN-level business rules.

Future Deposit rule changes should cover relevant dimensions such as:

```text
product availability
customer eligibility
account eligibility
ownership / entitlement
currency
funding source
Deposit amount
available balance
interest configuration
tenor
maturity instruction
renewal instruction
withdrawal
early termination
closure
duplicate prevention
approval
retry/reconciliation
auditability
```

Use stable IDs for structured rule catalogues, for example:

```text
DEP-BR-001
DEP-BR-002
...
```

Do not hardcode bank-specific thresholds.

---

# 23. Validation Model

Approved BPMN validation categories:

```text
23
```

Relevant Deposit validation dimensions include:

```text
Customer Context
Product Eligibility
Account Eligibility
Ownership / Entitlement
Currency
Funding Source
Available Balance
Deposit Amount
Product Configuration
Interest Configuration
Tenor
Maturity Date
Maturity Instruction
Renewal Instruction
Withdrawal Eligibility
Early Termination
Closure Eligibility
Duplicate Request
Approval Requirement
Operational Retry
Completion
```

Each validation should explain:

```text
what is validated
why it matters
failure/rework outcome
```

without fabricated threshold values.

---

# 24. Data Entities

Deposit domain entities may include:

```text
Customer
Deposit Product
Deposit Product Configuration
Deposit Account
Term Deposit / Placement
Funding Account
Deposit Application / Instruction
Deposit Amount
Currency
Interest Configuration
Interest Instruction
Tenor
Value Date
Maturity Date
Maturity Instruction
Renewal Instruction
Payout Instruction
Withdrawal Instruction
Account Status
Deposit Status
Transaction Reference
Approval Record
Exception / Rework Case
Audit Record
```

Clearly distinguish:

```text
common entities
vs
product-family-specific entities
```

---

# 25. System Responsibility Model

Use generic capability/system ownership.

Candidate responsibilities:

```text
Digital / Assisted Channel
Customer / Party Service
Account Service
Deposit Product Service
Core Banking / Deposit System
Product / Interest Rules Service
Funding / Payment Service
Notification Service
Operations / Approval Portal
```

Do not invent vendor names.

Where exact implementation is unknown, describe responsibility rather than a fake physical service.

---

# 26. Risks & Controls

Relevant Deposit risks include:

```text
incorrect product selection
ineligible Deposit creation
unauthorized account relationship
invalid funding source
insufficient funding
incorrect Deposit amount
duplicate account/deposit creation
duplicate funding
incorrect interest configuration
incorrect tenor
incorrect maturity instruction
incorrect renewal
unauthorized withdrawal
incorrect early termination
incorrect payout destination
creation with uncertain outcome
funding with uncertain outcome
incorrect customer-facing status
manual-control bypass
incomplete audit evidence
```

Each risk should have an appropriate generic business/system control.

---

# 27. BA Knowledge Expectations

Business Analysis content should remain substantial and Deposits-specific.

Expected BA sections:

```text
Business Rule Catalogue
Validation Catalogue
Decision Catalogue
Business State Transition Reference
Data Entities
System Responsibility Matrix
Risks & Controls
Common Exceptions
BA Discovery Questions
BA Outputs
```

Expected BA deliverables may include:

```text
Deposit Journey Map
Product Variant Matrix
Business Process BPMN
Business Rule Catalogue
Validation Matrix
State Transition Model
Data Entity Model
System Responsibility Matrix
Exception Catalogue
Risk & Control Matrix
Integration / Service Interaction Map
Acceptance Criteria
Traceability Matrix
Operational Reconciliation Requirements
```

---

# 28. Canonical JSON Rules

The source artifact must remain canonical.

Required metadata:

```text
metadata.journeyReader = canonical
```

Use existing supported block types:

```text
RICH_TEXT
TABLE
CHECKLIST
CALLOUT
DIAGRAM
```

Do not invent unsupported block structures.

The runtime source of truth is the persisted CMS revision, not merely the local artifact.

---

# 29. BPMN Payload Preservation

The generic canonical mapper has already been fixed to preserve business-process metadata:

```text
scope
businessRules
validationCategories
successOutcome
```

Reference generic mapper fix:

```text
89f27b85e95596e1d4e9fa74ed5736f836d8accc
fix(journeys): preserve business process diagram metadata
```

Deposits must reuse this capability.

Do not reimplement it.

If a future Deposit payload exposes new field loss:

```text
STOP
classify as GENERIC MAPPER GAP
```

Do not add a Deposits-specific allowlist.

---

# 30. Integrity Gates

For every Deposit JSON update, validate:

```text
JSON parse
module count
section count
block count
DIAGRAM count
lane count
node count
edge count
business-rule count
validation-category count
scope presence
successOutcome presence
```

Also validate:

```text
unique module IDs
unique section IDs where required
unique block IDs where required
unique lane IDs
unique node IDs
unique edge IDs

every node.laneId resolves
every edge.source resolves
every edge.target resolves

no invalid incoming process edge to start event
no invalid outgoing process edge from end event
gateway branch labels where required
meaningful rework/return paths
```

---

# 31. Hash Gate

Never trust a successful CMS action alone.

Required chain:

```text
Deposit Source JSON
        ↓
Actual Save Payload
        ↓
Persisted Draft
        ↓
Published Revision
```

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

Current approved Development v2 hash:

```text
c397a121affb682843b7e8295161c6fc9dc20b9fe6fa29b137ae401d2950f471
```

If hashes differ:

```text
STOP
DO NOT SUBMIT
DO NOT PUBLISH
```

---

# 32. Live Revision Safety

Before every CMS write, re-read:

```text
publishedRevisionId
current published version
latest revision
active DRAFT
active IN_REVIEW
active CHANGES_REQUESTED
```

Never blindly assume the next version.

If state changes during an operation:

```text
STOP
REPORT BASELINE CHANGE
```

Do not create unnecessary revisions.

If an active IN_REVIEW revision contains wrong content, use governed workflow:

```text
IN_REVIEW
→ Request Changes
→ edit same revision
→ resubmit
```

where supported.

---

# 33. Development Workflow

Preferred Development flow:

```text
Audit
        ↓
Business design
        ↓
Complete JSON artifact
        ↓
Source validation
        ↓
Source hash
        ↓
Re-read live DB state
        ↓
Create/edit governed Draft
        ↓
Save exact JSON
        ↓
Direct DB read-back
        ↓
Hash equality
        ↓
Canonical mapper check
        ↓
SharedJourneyReader check
        ↓
BusinessProcessDiagram dispatch
        ↓
Submit
        ↓
Independent Review
        ↓
Publish
        ↓
Published pointer verification
        ↓
EN/VI repository/runtime validation
        ↓
PO visual/business review
```

---

# 34. Production Promotion Rule

For the current Deposits v2 release, Production promotion should be:

```text
CONTENT ONLY
```

because the generic mapper capability required by Deposits is already available in Production.

Before content mutation, verify Production still includes:

```text
89f27b85e95596e1d4e9fa74ed5736f836d8accc
```

or a descendant containing the same generic fix.

If not:

```text
STOP
```

Do not silently perform a code release as part of a content-only Deposits promotion.

---

# 35. Production Promotion Sequence

Preferred sequence:

```text
1. Verify current Production Git SHA includes generic mapper fix
2. Verify APP_ENV=production
3. Verify DATABASE_ENVIRONMENT=production
4. Keep ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
5. Validate approved Deposits source artifact/hash
6. Resolve actual Production Deposits ContentItem
7. Preserve ContentItem identity/access/scope/grants
8. Re-read Production revision state
9. Create governed Draft from current Published revision
10. Replace complete Draft contentJson with approved Dev v2 JSON
11. Verify save-payload hash
12. Save
13. Read exact persisted Production Draft
14. Verify persisted hash
15. Run canonical mapper contract
16. Verify SharedJourneyReader/JourneyNavigator
17. Verify BusinessProcessDiagram dispatch
18. Submit Review
19. Independent Publish
20. Verify publishedRevisionId
21. Verify Published hash
22. Verify EN/VI repository/runtime
```

No application deployment is needed when Production already contains the required generic code.

---

# 36. Production Content Rule

For an explicitly approved Deposits promotion:

```text
NEW_PROD_DEPOSITS_CONTENT
=
EXACT_APPROVED_DEV_DEPOSITS_JSON
```

Do not:

```text
merge old Production legacy Deposit JSON
reconstruct the approved artifact
regenerate BPMN
change IDs during promotion
change product scope during promotion
invent new rules during promotion
```

Version parity is not required.

Example:

```text
Development v2
→ Production v2 / v3 / other valid governed next version
```

Release truth is:

```text
content hash
+
publishedRevisionId
+
runtime output
```

not matching version numbers.

---

# 37. Production Safety

Production target must preserve:

```text
ContentItem identity
slug = deposits
accessMode
DEPOSITS scope
Journey grants
authorization
Role Matrix
membership
authentication
CMS auditability
```

Never:

```text
copy whole Development DB to Production
reset Production DB
delete unrelated Journey revisions
change Payment content
change Onboarding content
change Role Matrix
change grants
change auth
change membership
enable destructive Production override for normal CMS work
```

Production policy should remain:

```text
APP_ENV=production
DATABASE_ENVIRONMENT=production
ALLOW_PRODUCTION_DATABASE_OPERATIONS=false
```

Normal governed CMS business workflow:

```text
ALLOW
```

Technical/destructive Production operations:

```text
DENY
```

---

# 38. Locale Behavior

Current Deposits runtime behavior:

```text
EN → base published canonical content
VI → same base published canonical content
```

No fake Vietnamese translation was created.

Do not alter translation architecture during Deposit content promotion.

If a future project requires actual Vietnamese Deposit content, treat that as a separate translation/content-management scope.

---

# 39. Authorization Behavior

Authorized users can resolve the Journey.

Guest behavior remains protected.

Expected unauthorized/guest behavior:

```text
307
reason=membership_required
```

Do not weaken authorization for verification.

Journey remains the security boundary.

---

# 40. Source-Code Change Policy

For future Deposits enhancements, default expectation:

```text
source-code impact = NONE
```

Use CMS/JSON for:

```text
new business rule
new validation
new process step
new gateway
new exception
new Deposit state
new lane ownership
new BPMN node/edge
new BA content
new product-family business logic expressed as knowledge content
```

Use source code only for a proven generic capability gap.

Before implementing a generic code change return:

```text
Audit
Root Cause
Impact Analysis
Generic Proposed Solution
Risks
Rollback
```

Wait for Product Owner approval.

---

# 41. Root-Cause Decision Tree for Deposits

If Deposits UI is wrong:

```text
Is correct deposits-full-business-journey.json available?
        ↓
Did Save Payload contain it?
        ↓
Did persisted ContentRevision contain it?
        ↓
Does publishedRevisionId point to it?
        ↓
Does ContentRepository return it?
        ↓
Does Canonical Mapper preserve it?
        ↓
Does SharedJourneyReader receive it?
        ↓
Does JourneyBlockRenderer dispatch DIAGRAM correctly?
        ↓
Does BusinessProcessDiagram receive correct payload?
        ↓
Does UI render correctly?
```

Classify failure at the first broken boundary.

Do not randomly modify the renderer.

---

# 42. Deposit Anti-Patterns

Do not:

```text
build a separate Deposits architecture
copy Onboarding BPMN topology
copy Payment BPMN topology
hardcode Product Owner assumptions as bank policy
invent rates/fees/tenors/thresholds
treat every UI function as a BPMN step
remove detailed Business Process tables after adding BPMN
create a new revision without checking active workflow state
trust local JSON without persisted DB read-back
trust version number without hash
modify Production during Development work
deploy code for pure Deposit content changes
create fake VI translations
hardcode slug logic into generic mapper
```

---

# 43. Future Deposit Enhancement Prompt Pattern

Use this starting instruction:

```text
CONTEXT LOCK — BANKING BA KNOWLEDGE HUB ONLY

Repository:
/Users/jonathanta/BA Master

MANDATORY REFERENCES:
1. BANKING_JOURNEY_ENHANCEMENT_SKILL.md
2. DEPOSITS_JOURNEY_IMPLEMENTATION_SKILL.md

TARGET:
Deposits

FIRST:
Read both skills in full.

Then audit the live target environment and current Deposits revision before any
write.

Preserve:
- canonical shared architecture
- Deposits ContentItem identity
- slug
- DEPOSITS scope
- access mode
- grants
- Role Matrix
- authorization
- CMS lifecycle

Classify requested change:
CONTENT / MAPPER / RENDERER / NAVIGATION / CMS / SECURITY / SCHEMA

Prefer CONTENT/CMS JSON.

If a generic source-code gap is proven:
STOP and return Audit / Root Cause / Impact / Proposed Generic Fix / Risk /
Rollback before implementation.

For content updates:
validate source
calculate hash
save
read persisted DB content
compare hash
map persisted content
verify renderer dispatch
review
publish
verify publishedRevisionId
verify EN/VI runtime.
```

---

# 44. Current Definition of Done

A Deposits enhancement is complete only when applicable boundaries pass:

```text
Business content approved
        ↓
Canonical source artifact valid
        ↓
Source hash recorded
        ↓
Live revision state confirmed
        ↓
Save payload hash verified
        ↓
Persisted DB content verified
        ↓
Canonical mapper verified
        ↓
SharedJourneyReader verified
        ↓
JourneyNavigator verified
        ↓
BusinessProcessDiagram verified
        ↓
Independent review completed
        ↓
Published pointer verified
        ↓
Published hash verified
        ↓
EN/VI repository/runtime verified
        ↓
Authorization preserved
        ↓
Environment isolation preserved
```

For exact Development → Production promotion:

```text
APPROVED_DEV_HASH
=
PROD_SAVE_HASH
=
PROD_PERSISTED_HASH
=
PROD_PUBLISHED_HASH
```

For the current approved v2:

```text
c397a121affb682843b7e8295161c6fc9dc20b9fe6fa29b137ae401d2950f471
```

---

# 45. Final Deposit Architecture Principle

Deposits should remain:

```text
ONE Shared Banking Journey Architecture
        +
Deposit Domain Business Model
        +
Generic BPMN Visualization
        +
Governed CMS Content
```

Future requirements should first ask:

```text
Is this Deposit business knowledge?
```

If YES:

```text
implement as canonical CMS content
```

If the limitation is genuinely reusable across domains:

```text
enhance the generic architecture once
```

Do not contaminate shared infrastructure with Deposit-specific business rules.

This is the approved implementation pattern for the Deposits Journey.
