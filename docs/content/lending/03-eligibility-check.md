# 3. Eligibility Check

> Digital Lending Onboarding — module 3 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Previous: Profile & Information Collection](02-profile-information-collection.md) · [Next: Credit Assessment](04-credit-assessment.md)

## Contents

- [3.1 Business Definition](#31-business-definition)
- [3.2 Business Responsibilities](#32-business-responsibilities)
- [3.3 Relationship with Other Domains](#33-relationship-with-other-domains)
- [3.4 Business Purpose](#34-business-purpose)
- [3.5 Assessment Stages](#35-assessment-stages)
- [3.6 Typical Eligibility Outcomes](#36-typical-eligibility-outcomes)
- [3.7 Overview: Configuring and Applying Eligibility Rules](#37-overview-configuring-and-applying-eligibility-rules)
- [3.8 Common Eligibility Criteria Evaluated](#38-common-eligibility-criteria-evaluated)
- [3.9 Evaluation Methods](#39-evaluation-methods)
- [3.10 Business Rules](#310-business-rules)
- [3.11 Overview: How Eligibility Check Is Used for Decision Making and Application Routing](#311-overview-how-eligibility-check-is-used-for-decision-making-and-application-routing)
- [3.12 Decision Uses](#312-decision-uses)
- [3.13 Typical Decision Logic Patterns](#313-typical-decision-logic-patterns)
- [3.14 Example Scenarios](#314-example-scenarios)
- [3.15 Key Business Concepts](#315-key-business-concepts)

## 3.1 Business Definition

The Eligibility Check Domain manages the business capability that determines whether a customer and their requested borrowing fall within the bank's own policy criteria for a given lending product.

In a digital lending journey, this domain:
- Determines which product eligibility rule set applies to the application;
- Checks age and residency against the product's permitted bands;
- Tests the declared income figure against the product's minimum criteria;
- Validates the declared employer, sector, and employment status;
- Applies any further policy exclusions the product carries;
- Produces a structured eligibility outcome with reason codes;
- And identifies alternative products where the customer does not fit the one requested.

The domain helps the bank to determine does the bank's own policy allow this product for this customer at all?

Eligibility Check does not itself:
- Establish or verify identity, or perform compliance screening;
- Retrieve credit history, credit score, or existing external borrowing;
- Prove declared income or assess repayment capacity;
- Obtain external confirmation that a declared employment exists: , which is performed by 5. Income & Affordability as part of income verification;
- Select, configure, or price the lending product;
- Collect or validate supporting documents;
- Or make the final lending decision and issue the offer.

Those activities are owned by the Registration & Onboarding, Credit Assessment, Income & Affordability, Loan Product & Simulation, Document Upload, Decision Engine, and Offer & Agreement domains.

Instead, this domain produces the policy eligibility outcome and reason codes those domains use to determine whether, and how, the application proceeds.

## 3.2 Business Responsibilities

| Responsibility | Description |
|---|---|
| Maintain the Product Eligibility Rule Set | Hold and version the criteria each lending product applies, including: Age and residency bands; Income criteria; Employment requirements; Policy exclusions. |
| Determine the Applicable Rule Set | Select the rule set relevant to the requested product, customer type, and channel before evaluation begins. |
| Check Age and Residency | Evaluate: Minimum age at application; Maximum age at application; Maximum age at loan maturity; Residency status and permitted locations. |
| Check Income Criteria | Compare the declared income figure against the product's minimum income requirement, applying the stated basis and period. |
| Validate Employment | Confirm that the declared employment context is acceptable under policy, evaluated against declared values and bank-held employer and sector lists: Employment status; Employer acceptability; Industry or sector restrictions; Minimum tenure. This establishes whether the employment, as declared , is permitted. Confirming that the employment actually exists is performed later by 5. Income & Affordability . |
| Apply Basic Eligibility Rules | Apply the remaining policy criteria a product carries, such as: Customer relationship conditions; Facility count or exposure limits; Product-specific exclusions; Regulatory restrictions. |
| Classify the Eligibility Outcome | Return a structured result such as eligible, not eligible, pending validation, refer for review, or eligible for an alternative product. |
| Produce Reason Codes | Record which criterion produced the outcome, in a form usable for customer communication, review, and reporting. |
| Support Alternative Product Routing | Identify products the customer does meet the criteria for, where they do not fit the one requested. |
| Handle Unavailable External Validation | Manage cases where an external check could not be completed, so that unavailability is treated as an unresolved state rather than a failed criterion. |
| Manage Policy Exceptions | Support the controlled setting aside of discretionary criteria by authorised staff, with a recorded reason. |
| Support Re-evaluation | Re-run eligibility where the requested amount or term changes, where declared information is amended, or where the application is resumed after a delay. |
| Maintain Auditability | Retain the criteria applied, the rule set version in force, the values evaluated, the outcome, and the reason codes for each assessment. |

## 3.3 Relationship with Other Domains

The Eligibility Check Domain sits between information collection and the assessment domains that follow. It receives the applicant profile and product context, applies the bank's own policy criteria, and provides a structured eligibility outcome that determines whether further assessment is warranted.

| Business Domain | Relationship | What Is Exchanged |
|---|---|---|
| Registration & Onboarding | Receives established attributes | Verified identity attributes such as date of birth and residency; Customer type; Consent state. Refer to 1. Registration & Onboarding for detailed handling of this step. |
| Profile & Information Collection | Receives declared attributes | Declared income and its composition; Declared employer and employment status; Address and residency details; Requested amount and term. Refer to 2. Profile & Information Collection for detailed handling of this step. |
| Product and Pricing | Consumes product criteria | Product eligibility rule set; Age, income, employment, and exposure thresholds; Product availability by segment and channel. Refer to 6. Loan Product & Simulation for detailed handling of this step. |
| Customer Data / Core Banking | Receives bank-held context | Existing relationship and product holdings; Internal facility count and exposure; Bank-held employer and sector lists used in employment criteria; Prior application history relevant to policy rules. |
| Credit Assessment | Provides the permitted application | Eligible applications only; Rule set version applied; Any recorded policy exception. Refer to 4. Credit Assessment for detailed handling of this step. |
| Income & Affordability | Provides criterion context, and performs external employment confirmation | The income figure used and its basis; Whether the minimum criterion was met narrowly; Employment context relevant to income stability. External confirmation that a declared employment exists is performed there, not here. Refer to 5. Income & Affordability for detailed handling of this step. |
| Document Upload | Indicates evidence needs | Criteria that could not be settled on declared information; Evidence requirements arising from a conditional outcome. Refer to 7. Document Upload for detailed handling of this step. |
| Retail Lending Decision Engine | Provides eligibility outcome | Eligibility result; Reason codes; Exception records; Rule set version applied. Refer to 9. Decision Engine for detailed handling of this step. |
| Employee Portal / Review Workflow | Supports manual handling | Referred cases; Triggered criteria; Exception requests and approvals. |
| Campaign & Offer Management | Provides eligibility feedback | Ineligibility arising from campaign-sourced applications, used to improve targeting. |
| Notification Services | Triggers customer communication | Outcome messages, alternative product suggestions, and requests for information where a criterion could not be settled. |

## 3.4 Business Purpose

The purpose of the Eligibility Check Domain is to apply the bank's own lending policy consistently to each application, and to do so before the journey incurs the cost of external assessment.

This domain serves five core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Policy Control | Ensures each product is offered only within the boundaries the bank has defined for it. → Keeping lending inside approved policy and regulatory limits. |
| Cost Control | Filters out applications the bank would not proceed with, before paid external checks are performed. → Reducing assessment cost per approved application. |
| Consistent Treatment | Applies the same criteria and thresholds to comparable applications regardless of channel or handler. → Reducing variation in outcome quality. |
| Explainable Outcomes | Produces a named reason for every result. → Supporting customer communication, review, and regulatory defensibility. |
| Operational Efficiency | Automates straightforward eligibility evaluation and routes only unresolved, borderline, or exception cases for manual handling. |

## 3.5 Assessment Stages

The eligibility lifecycle describes how product policy is applied to an individual application and turned into a usable routing outcome.

| # | Stage | Description | Key Business Activity |
|---|---|---|---|
| 1 | Rule Set Selection | The criteria applicable to the requested product, customer type, and channel are identified. | The rule set version in force is selected and bound to the application for later reference. |
| 2 | Age and Residency Check | The customer's age and residency are evaluated against the product's permitted bands. | Age at application and at loan maturity are calculated from established data, and residency is checked against permitted locations. |
| 3 | Basic Eligibility Rule Application | Remaining policy criteria that can be settled on information already held are applied. | Relationship conditions, exposure and facility limits, and product-specific exclusions are evaluated. |
| 4 | Income Criteria Check | The declared income figure is tested against the product's minimum requirement. | The stated basis and period are applied, and results close to the threshold are recorded. |
| 5 | Employment Validation | The declared employment context is evaluated against policy, using declared values and bank-held lists. | Employer acceptability, sector restrictions, employment status, and minimum tenure are evaluated. Whether the employment actually exists is confirmed later, at income verification. |
| 6 | Outcome Classification and Routing | The evaluation result is classified and the application is routed accordingly. | The case is marked eligible, not eligible, pending, referred, exception-approved, or redirected to an alternative product. |

## 3.6 Typical Eligibility Outcomes

Eligibility does not by itself approve or decline a loan. It produces one of several policy outcomes that determine whether, and how, the application proceeds to assessment.

| Outcome | Category | Description |
|---|---|---|
| Eligible | USABLE | The application meets every criterion the product requires, and may proceed to credit and affordability assessment. |
| Eligible with Exception | CONDITIONAL | A discretionary criterion was set aside by an authorised approver, with a recorded reason, and the application proceeds on that basis. |
| Eligible for Alternative Product | REDIRECT | The customer does not meet the criteria for the requested product but does meet those of another, which may be offered instead. |
| Pending Information | WAITING | A criterion could not be settled because a required declared value is missing, or a bank-held source needed to evaluate it was unavailable. |
| Refer for Manual Review | REFERRED | The rule set could not settle the case, and human assessment is required before routing. |
| Not Eligible | NEGATIVE | The application falls outside a criterion the product requires, and cannot proceed for that product. |

## 3.7 Overview: Configuring and Applying Eligibility Rules

In digital lending, eligibility criteria are usually held as a maintained rule set per product rather than embedded in individual journey builds, so that policy can be changed and evidenced without changing the journey itself. Rules are typically expressed as decision tables or equivalent structures owned by credit policy, reviewed by compliance, and versioned.

Evaluation order matters commercially as well as logically. Criteria that can be settled instantly from information already held are generally applied before those that depend on declared values or external services, so that the journey does not incur cost or delay on applications an earlier criterion would have excluded.

## 3.8 Common Eligibility Criteria Evaluated

| Criteria Category | Typical Criteria Applied |
|---|---|
| Age Criteria | Minimum age at application; Maximum age at application; Maximum age at loan maturity, tested against the requested term. |
| Residency and Location | Residency status; Permitted country or region; Length of residence; Address within a serviced area. |
| Income Criteria | Minimum income threshold for the product; Stated basis such as gross or net; Applicable period and currency; Which declared income sources may be counted. |
| Employment Criteria | Acceptable employment status; Employer acceptability; Industry or sector restrictions; Minimum tenure in current employment. |
| Customer Relationship Criteria | New, existing, or returning customer conditions; Minimum relationship duration; Existing product holding requirements; Prior application or arrears conditions held internally. |
| Exposure and Facility Criteria | Maximum number of concurrent facilities; Maximum aggregate internal exposure; Product combination restrictions. |
| Product and Regulatory Exclusions | Product availability by segment or channel; Purpose restrictions; Regulatory or policy prohibitions applicable to the customer or product. |

## 3.9 Evaluation Methods

- Rule-based automated evaluation: The primary method. Criteria are held as decision tables or equivalent rules and applied consistently to each application without manual intervention.
- Evaluation against established data: Criteria such as age and residency are calculated from information already proven during onboarding, rather than from customer-entered values.
- Evaluation against declared data: Criteria such as income are applied to values the customer has declared but which have not yet been verified.
- Evaluation against bank-held records: Relationship, exposure, and facility criteria are applied to internal customer and product records.
- Evaluation against bank-held reference lists: Employer acceptability and sector restrictions are applied using lists the bank maintains, rather than by calling an external service. External confirmation of the employment itself belongs to 5. Income & Affordability.
- Manual assessment: Referred cases and exception requests are handled by authorised staff, whose conclusion is recorded against the application.

## 3.10 Business Rules

- Criteria are product-specific: The rule set applied depends on the requested product, and may also vary by customer type and channel.
- Criteria are evaluated in order of cost and certainty: Rules that can be settled instantly from held information are typically applied before those requiring declared values or external services.
- Established information takes precedence over declared information: Where a value has been proven during onboarding, the proven value is used, and any difference from a declared value is recorded.
- Criteria are classified as mandatory or discretionary: Mandatory criteria reflect boundaries the bank has committed to and are not waived; discretionary criteria may be set aside by an authorised approver within stated limits.
- Every outcome carries a reason: A result is recorded together with the criterion that produced it, in a form usable for communication and review.
- The rule set version in force is bound to the application: The version applied at the point of evaluation is retained, so the outcome can be reconstructed later.
- Rule changes take effect forward only: A change to policy does not alter the outcome of an application already evaluated.
- An unevaluated criterion is not a failed criterion: Where a criterion could not be evaluated because a declared value was missing or a bank-held source was unavailable, the case is held, retried, or referred rather than treated as not eligible.
- This domain makes no outward calls: Every criterion is evaluated on established data, declared data, or bank-held records. Confirmation that a declared employment exists is an income verification activity owned by 5. Income & Affordability, and is not duplicated here.
- Material changes trigger re-evaluation: Amendments to the requested amount or term, or to declared information a criterion relied on, cause the affected criteria to be applied again.

## 3.11 Overview: How Eligibility Check Is Used for Decision Making and Application Routing

Once evaluated, the eligibility outcome determines the immediate path of the application. It establishes whether assessment may begin at all, whether the customer should be offered a different product, whether information is still outstanding, and whether a person needs to look at the case before it moves.

## 3.12 Decision Uses

| Decision Use | How the Outcome Is Used |
|---|---|
| Assessment Gating | Confirms the application may proceed to credit and affordability assessment under the bank's own policy. |
| Cost Avoidance | Prevents paid external checks from being performed on applications policy would not permit. |
| Product Suitability Routing | Identifies where the customer meets the criteria for a different product, allowing an alternative to be offered rather than the application ending. |
| Straight-Through Progression Support | Allows automated progression where every criterion is met without exception or referral. |
| Referral Triggering | Routes cases the rule set could not settle, or that sit close to a threshold, to authorised staff. |
| Exception Handling | Supports controlled progression where a discretionary criterion has been set aside and recorded. |
| Conditional Progression | Supports outcomes that depend on outstanding information, a retried external validation, or a revised amount or term. |
| Outcome Explanation | Provides the named reason used for customer communication, manual review, and reporting. |
| Policy Feedback | Supplies the reason and near-threshold data used to review whether criteria are set at the right level. |

## 3.13 Typical Decision Logic Patterns

Although exact policy varies by bank and product, digital lending commonly uses eligibility information in patterns such as:
- Pass: Every criterion is met, and the application proceeds to credit and affordability assessment.
- Refer: The rule set could not settle the case, or the result sits close to a threshold where judgment is required.
- Redirected path: The customer does not meet the requested product's criteria but does meet another product's, and an alternative is offered.
- Conditional path: The application may proceed once outstanding information is supplied, an external validation is completed, or a discretionary criterion is approved as an exception.
- Stop: The application falls outside a criterion the product requires, and cannot proceed in its current form.

Eligibility is rarely a single threshold test in mature lending journeys. It is a controlled policy boundary applied consistently before costly assessment begins, and much of its commercial value lies in routing customers to a suitable product rather than in exclusion alone.

## 3.14 Example Scenarios

| Scenario | Eligibility Outcome | Likely Decision Impact |
|---|---|---|
| Salaried customer within age bands, above the income threshold, with an acceptable employer | Eligible | Supports straight-through progression to credit and affordability assessment. |
| Customer's age at loan maturity exceeds the product's limit for the requested term | Eligible for Alternative Product | A shorter term or a different product may be offered rather than ending the application. |
| Declared income sits marginally below the product's minimum criterion | Refer for Manual Review | Requires assessment of whether other income sources or a reduced amount would fit policy. |
| Bank-held exposure records are temporarily unavailable, so the facility count criterion cannot be evaluated | Pending Information | Application is held and retried, and is not treated as ineligible on availability grounds. |
| Customer works in a sector the product excludes | Not Eligible | Application cannot proceed for that product, with the excluding criterion recorded as the reason. |
| Existing customer marginally exceeds the internal facility count, approved as an exception | Eligible with Exception | Application proceeds with the exception, approver, and reason retained for audit. |

## 3.15 Key Business Concepts

| Concept | Definition |
|---|---|
| Eligibility | The state of falling within the bank's own defined policy criteria for a requested lending product. |
| Eligibility Rule Set | The maintained collection of criteria a product applies, owned by credit policy and applied consistently to each application. |
| Rule Set Version | The specific version of the criteria in force at the point of evaluation, retained with the application. |
| Decision Table | A structured representation of criteria and their outcomes, used so that policy can be maintained without changing the journey. |
| Mandatory Criterion | A criterion reflecting a boundary the bank has committed to, which is not set aside at any authority level. Corresponds to what 8. Risk Assessment and 9. Decision Engine call a hard rule , applied at a different point and on the bank's own policy rather than on risk evidence. |
| Discretionary Criterion | A policy preference that may be set aside by an authorised approver within stated limits, with a recorded reason. The counterpart of what 8. / 9. handle through score-based rejection , where the overall profile rather than a single condition determines the outcome. |
| Policy Exception | A recorded decision to proceed despite a discretionary criterion not being met, attributed to a named approver. |
| Age at Maturity | The customer's age at the point the final scheduled repayment falls due, tested against the requested term. |
| Income Criterion | A minimum income requirement expressed with its basis, period, and currency, applied to the declared income figure. |
| Income Criterion Basis | The stated definition of the income figure a criterion applies to, such as gross or net, and the period it covers. |
| Employment Validation | Confirmation that the declared employment context is acceptable under policy , evaluated on declared values and bank-held employer and sector lists. Distinct from employment existence confirmation and from income verification, both owned by 5. Income & Affordability . |
| Preliminary Eligibility Check | The lightweight pre-check on declared data performed at onboarding ( 1. ). It indicates early suitability only, and neither binds nor replaces this domain. |
| Offer Eligibility Check | The check performed at 10. Offer & Agreement on whether an already approved case may be presented as an offer. A different question from policy eligibility, at a different point in the journey. |
| Basic Eligibility Rules | The remaining policy criteria a product carries beyond age, income, and employment, such as relationship, exposure, and exclusion rules. |
| Reason Code | The recorded identification of the criterion that produced an eligibility outcome. |
| Near-Threshold Result | An outcome settled narrowly against a criterion, retained as evidence for policy review. |
| Redirect | The routing of a customer to a product whose criteria they do meet, where they do not meet those of the product requested. |
| Referral | The routing of a case to authorised staff because the rule set could not settle it. |
| Unresolved Criterion | A criterion that could not be evaluated because a required declared value was missing or a bank-held source was unavailable. |
| Outcome Category | The controlled token classifying an outcome in this page's 3.2 table. The full vocabulary is defined in 0. Conventions & Domain Register . |
| Re-evaluation | A repeated eligibility assessment triggered by a change to the requested terms, amended declared information, or a resumed application. |

---

[← Digital Lending Onboarding](README.md) · [Previous: Profile & Information Collection](02-profile-information-collection.md) · [Next: Credit Assessment](04-credit-assessment.md)
