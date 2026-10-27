# 8. Risk Assessment

> Digital Lending Onboarding — module 8 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Previous: Document Upload](07-document-upload.md) · [Next: Decision Engine](09-decision-engine.md)

## Contents

- [8.1 Business Definition](#81-business-definition)
- [8.2 Business Responsibilities](#82-business-responsibilities)
- [8.3 Relationship with Other Domains](#83-relationship-with-other-domains)
- [8.4 Business Purpose](#84-business-purpose)
- [8.5 Assessment Stages](#85-assessment-stages)
- [8.6 Assessment Inputs and Controls](#86-assessment-inputs-and-controls)
- [8.7 Typical Outcomes Across the Four-Step Flow](#87-typical-outcomes-across-the-four-step-flow)
- [8.8 Key Business Concepts](#88-key-business-concepts)

## 8.1 Business Definition

The Risk Assessment Domain manages the business capability that evaluates the level, pattern, and acceptability of risk presented by a retail lending application based on customer information, verified data, internal policies, and available external evidence.

Risk Assessment does not itself:
- Make the final lending decision record
- Define pricing, loan amount, or offer terms
- Disburse funds
- Manage post-approval servicing or collections

Instead, it produces a structured risk view that downstream domains can consume.

## 8.2 Business Responsibilities

- Collect risk-relevant inputs from customer, application, internal, and external sources
- Validate whether assessment inputs are complete, current, usable, and policy-permitted
- Apply hard-rule risk checks using internal and external evidence
- Apply scoring logic to cases that pass hard-rule rejection
- Assign a risk grade based on score bands
- Record reason information, triggered rules, model versions, and assessment history
- Support reassessment when material data changes

## 8.3 Relationship with Other Domains

The Risk Assessment Domain operates as part of the wider digital lending journey. It receives customer, application, and evidence context; analyzes risk; and produces an assessment outcome for downstream use without itself making the lending decision.

| Business Domain | Relationship to Risk Assessment | What Is Exchanged |
|---|---|---|
| Retail Lending Customer Portal | Provides customer-declared and journey-captured inputs | Application details, customer-entered data, and updates Refer to 1. Registration & Onboarding for detailed handling of this step. |
| Customer Data | Provides profile and relationship context | Existing customer profile, tenure, and internal conduct indicators |
| Credit and Bureau Services | Provides external credit evidence | Credit history, obligations, delinquency data, bureau scores, and inquiry data |
| Identity Verification | Provides identity confidence context | Identity match outcomes, anomalies, and trust indicators |
| Income & Affordability | Provides adjacent financial-capacity context | Affordability status, obligation patterns, and evidence readiness Refer to 5. Income & Affordability for detailed handling of this step. |
| Document Upload and Verification | Provides supporting evidence status and validated facts | Document availability, review outcomes, and verified data points Refer to 7. Document Upload for detailed handling of this step. |
| Application Management | Provides case and stage context | Application identifier, applicant structure, product context, and stage |
| Employee Portal / Review Workflow | Supports specialist review when needed | Assessment summary, triggered indicators, missing inputs, and exceptions |
| Decision Engine | Consumes assessment outputs | Hard-rule result, score result, grade, and supporting reasons |

## 8.4 Business Purpose

The Risk Assessment Domain provides a structured, policy-aligned understanding of the risk posed by a retail lending application during assessment.

This domain serves five core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Consistent Risk Evaluation | Applies the same risk logic, segmentation, and assessment standards across similar applications -> Reduces inconsistency in understanding application risk. |
| Early Risk Identification | Detects adverse patterns, weak repayment indicators, overexposure, or concerning data early in the lending journey. |
| Explainable Assessment | Produces a risk outcome supported by traceable inputs, indicators, and reasons that can be reviewed and understood. |
| Operational Efficiency | Automates straightforward risk assessments and flags unclear, unusual, or incomplete cases for specialist review. |
| Policy Alignment | Ensures risk evaluation uses approved data sources, model logic, and business rules suited to the product and customer context. |

## 8.5 Assessment Stages

| Step | Objective | Possible Outcome |
|---|---|---|
| 1. Internal Risk Assessment | Evaluate internal conduct, repayment behavior, and known relationship risk | Reject by hard rule, or continue |
| 2. External Risk Assessment | Evaluate bureau, third-party, and identity-related external risk evidence | Reject by hard rule, or continue |
| 3. Scoring | Score the case using detailed attributes if not already rejected | Reject by score cut-off, or continue |
| 4. Grading | Assign a grade from Platinum to Bronze based on score band | Final assessment grade |

STEP 1: INTERNAL RISK ASSESSMENT

This step evaluates risk using information already available within the current financial institution. It is typically the first substantive risk gate because internal data is often highly trusted, directly relevant, and immediately available.

▸ Purpose
To determine whether the customer presents unacceptable risk based on internal relationship, conduct, and repayment information.

▸ Common internal information sources
- Existing and prior loan repayment history
- Internal delinquency and arrears records
- Write-off, restructure, or recovery history
- Current internal exposure and utilization
- Deposit account conduct and payment behavior
- Relationship tenure and stability indicators
- Internal fraud or inconsistency flags where relevant to credit risk assessment

▸ Smaller steps within Step 1
- Assemble internal customer context: Gather the customer’s existing profile, account relationships, prior borrowing history, and application context.
- Validate internal data usability: Check that the required internal data is present, linked to the correct customer, and sufficiently current for assessment.
- Evaluate repayment and conduct indicators: Review patterns such as missed payments, persistent arrears, unstable conduct, repeated excess usage, or adverse servicing history.
- Apply internal hard rules: Test policy-defined conditions that may make the case unacceptable at this stage.
- Produce internal assessment result: Either stop the case due to hard-rule failure or mark it as passed for the next step with supporting reasons recorded.

▸ Typical internal hard-rule themes
- Serious internal delinquency history
- Recent write-off or charge-off relationship
- Policy-prohibited internal restructuring patterns
- Unacceptable internal exposure concentration
- Severe adverse repayment behavior with the institution

Assessment outcome at this step If the customer fails internal hard rules, the application may be rejected from further risk assessment flow. The detailed rejection treatment belongs to the separate decisioning page.

STEP 2: EXTERNAL RISK ASSESSMENT

If the customer is not rejected using internal information, the domain evaluates external evidence. This expands the risk view beyond the current institution and helps identify broader borrowing, identity, and adverse-history concerns.

▸ Purpose
To determine whether the customer presents unacceptable risk based on trusted external information sources.

▸ Common external information sources
- Credit bureau lending history
- External delinquency and default records
- Current external obligations and exposure data
- Bureau inquiries and overextension indicators
- Public-record adverse signals where permitted
- Digital identity assessment services
- Third-party trust, match, or inconsistency indicators relevant to risk evaluation

▸ Smaller steps within Step 2
- Request or retrieve external evidence: Obtain bureau and third-party assessment results permitted for the product and customer type.
- Validate freshness and completeness: Check whether the external data is current, successfully matched, and sufficient for policy use.
- Normalize external data: Map obligations, adverse events, identity confidence results, and bureau indicators into a policy-usable structure.
- Apply external hard rules: Test conditions that independently disqualify the case from continuing.
- Produce external assessment result: Either stop the case due to hard-rule failure or mark it as passed for scoring.

▸ Typical external hard-rule themes
- Severe adverse bureau history
- Recent default or bankruptcy indicators where policy prohibits continuation
- Unacceptable current debt burden or exposure signals under hard-rule policy
- Critical identity-risk or inconsistency outcomes from digital identity assessment services
- Policy-prohibited external fraud or impersonation concerns where relevant to credit risk treatment

Assessment outcome at this step If the customer fails external hard rules, the application may be rejected from further risk assessment flow. The detailed rejection treatment belongs to the separate decisioning page.

STEP 3: SCORING

If the customer is not rejected by internal or external hard rules, the domain assigns a risk score. This step uses a broader set of detailed attributes to quantify the customer’s risk profile in a structured and repeatable way.

▸ Purpose
To translate the customer’s risk characteristics into a score that supports consistent classification and downstream treatment.

▸ What scoring considers
- Internal repayment behavior
- Internal relationship conduct
- External credit history
- Current exposure and utilization
- Delinquency patterns
- Inquiry behavior
- Application characteristics
- Customer profile features
- Verified consistency of information across sources

▸ Smaller steps within Step 3
- Select the correct scoring logic: Choose the policy-approved scorecard, segmentation logic, and model version for the product and applicant type.
- Prepare scoring attributes: Transform validated internal and external inputs into the variables required by the score logic.
- Assign attribute-level points or weighted contributions: Evaluate each relevant detail of the customer’s information according to policy-defined scoring treatment.
- Calculate total score: Combine the detailed contributions into a final score.
- Apply score cut-off: Compare the total score to the minimum threshold required to proceed.
- Produce scoring result: Either stop the case due to cut-off failure or pass the case into grading.

▸ Typical scoring outputs
- Total score
- Contributing risk factors
- Reason indicators
- Model or scorecard version used
- Score cut-off pass or fail result

Important distinction Hard-rule rejection and score cut-off rejection are different assessment mechanisms. Hard rules stop the case because a specific policy condition is unacceptable. Score cut-off stops the case because the overall quantified risk profile is below the acceptable threshold.

Assessment outcome at this step If the customer does not meet the score cut-off, the application may be rejected from further risk assessment flow. The detailed rejection treatment belongs to the separate decisioning page.

STEP 4: GRADING

If the customer passes the score cut-off, the domain assigns a grade based on the score band. This produces a simple, reusable classification for downstream consumers.

▸ Purpose
To convert the numeric score into a business-friendly risk grade for consistent use by downstream domains.

▸ Grade scale
- Platinum: – strongest score band
- Gold: – strong score band
- Silver: – acceptable mid-range score band
- Bronze: – lowest passing score band

▸ Smaller steps within Step 4
- Confirm score eligibility for grading: Ensure the case passed hard-rule screening and score cut-off.
- Map score to grade band: Apply the policy-defined score range mapping.
- Attach supporting classification details: Record the score, grade, scorecard version, and key reasons or indicators.
- Publish assessment output: Make the final risk grade available to permitted downstream users and systems.

### Smaller steps within Step 4

| Grade | General Meaning | Assessment Interpretation |
|---|---|---|
| Platinum | Highest passing tier | Very strong assessed risk profile relative to policy bands |
| Gold | Strong passing tier | Strong assessed risk profile with limited concern indicators |
| Silver | Standard passing tier | Acceptable assessed risk profile within normal policy tolerance |
| Bronze | Lowest passing tier | Passed assessment but in the weakest acceptable score band |

Assessment outcome at this step The domain produces a final structured risk assessment result for downstream consumption, including pass status, score, and grade where applicable.

## 8.6 Assessment Inputs and Controls

The four-step flow depends on reliable and policy-appropriate data. Before and across the steps, the domain should maintain the following controls:

- Use only approved internal and external data sources
- Check completeness, consistency, and freshness before applying rules or scoring
- Resolve or flag conflicts between declared, internal, and external data
- Use the correct model, rules, and segmentation logic for the application context
- Trigger reassessment when key application or evidence inputs change
- Retain timestamps, versions, references, and audit history for traceability

## 8.7 Typical Outcomes Across the Four-Step Flow

| Assessment State | Category | Description |
|---|---|---|
| Rejected at Internal Assessment | NEGATIVE | The case failed policy hard rules based on internal information sources |
| Rejected at External Assessment | NEGATIVE | The case failed policy hard rules based on external information sources |
| Rejected at Score Cut-off | NEGATIVE | The case passed hard rules but the total score did not meet the minimum acceptable threshold |
| Passed and Graded Platinum | USABLE | The case passed assessment and falls into the highest score band |
| Passed and Graded Gold | USABLE | The case passed assessment and falls into a strong score band |
| Passed and Graded Silver | USABLE | The case passed assessment and falls into a standard acceptable score band |
| Passed and Graded Bronze | USABLE | The case passed assessment and falls into the lowest acceptable score band |

## 8.8 Key Business Concepts

| Concept | Definition |
|---|---|
| Internal Risk Assessment | Risk evaluation based on information held by the current financial institution |
| External Risk Assessment | Risk evaluation based on bureau and third-party evidence outside the institution |
| Hard Rule | A policy-defined condition that can stop a case immediately without relying on total score |
| Risk Score | A structured numeric result derived from detailed risk attributes |
| Score Cut-off | The minimum score required for the case to continue to grading |
| Risk Grade | The banded classification assigned after a case passes score cut-off |
| Reason Information | Supporting indicators and explanations showing why a rule, score, or grade outcome was produced |
| Reassessment | A repeat of the risk assessment when material information changes |

FAQ

Does this page define final approval or decline rules? No. This page defines assessment-stage risk evaluation only. Detailed approval, decline handling, and downstream decision outcomes are addressed separately in the decisioning domain.

Can a customer be rejected before scoring? Yes. A customer may be rejected during internal or external assessment if they fail hard-rule policy checks. Only cases that pass those gates proceed to scoring.

What is the difference between score and grade? Grading categorizes customers by score, assigning the same policies and offers to those within the same grade.

---

[← Digital Lending Onboarding](README.md) · [Previous: Document Upload](07-document-upload.md) · [Next: Decision Engine](09-decision-engine.md)
