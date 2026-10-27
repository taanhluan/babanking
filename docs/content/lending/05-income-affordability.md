# 5. Income & Affordability

> Digital Lending Onboarding — module 5 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Previous: Credit Assessment](04-credit-assessment.md) · [Next: Loan Product & Simulation](06-loan-product-simulation.md)

## Contents

- [5.1 Business Definition](#51-business-definition)
- [5.2 Business Responsibilities](#52-business-responsibilities)
- [5.3 Relationship with Other Domains](#53-relationship-with-other-domains)
- [5.4 Business Purpose](#54-business-purpose)
- [5.5 Assessment Stages](#55-assessment-stages)
- [5.6 Assessment Inputs and Controls](#56-assessment-inputs-and-controls)
- [5.7 Typical Outcomes Across the Four-Stage Flow](#57-typical-outcomes-across-the-four-stage-flow)
- [5.8 Overview: Collecting Income & Affordability Data](#58-overview-collecting-income--affordability-data)
- [5.9 Common Data Collected](#59-common-data-collected)
- [5.10 Collection Methods](#510-collection-methods)
- [5.11 Business Rules](#511-business-rules)
- [5.12 Overview: How Income & Affordability Is Used for Decision Making](#512-overview-how-income--affordability-is-used-for-decision-making)
- [5.13 Decision Uses](#513-decision-uses)
- [5.14 Typical Decision Logic Patterns](#514-typical-decision-logic-patterns)
- [5.15 Example Scenarios](#515-example-scenarios)
- [5.16 Key Business Concepts](#516-key-business-concepts)

## 5.1 Business Definition

The Income & Affordability Domain manages the business capability that evaluates whether a retail lending application appears financially supportable based on:
- Customer-declared information
- Verified evidence
- Product parameters
- Internal policies
- And available external financial data where permitted.

Income & Affordability does not itself:
- Make the final lending decision record
- Define pricing, loan amount, or offer terms
- Disburse funds
- Manage post-approval servicing or collections

Instead, it produces a structured affordability view that downstream domains can consume.

## 5.2 Business Responsibilities

- Collect affordability-relevant inputs from customer, application, internal, and external sources where permitted
- Validate whether affordability inputs are complete, current, usable, and policy-permitted
- Apply product and policy rules to determine usable income, obligations, and expenses
- Normalize financial inputs into a policy-usable assessment structure
- Calculate affordability measures using approved formulas and thresholds
- Assign an affordability outcome with supporting reasons and evidence status
- Record calculation logic, evidence references, policy treatment, and assessment history
- Support reassessment when material customer, evidence, or loan-request information changes

## 5.3 Relationship with Other Domains

The Income & Affordability Domain operates as part of the wider digital lending journey. It receives customer, application, and evidence context; analyzes repayment capacity; and produces an assessment outcome for downstream use without itself making the lending decision.

| Business Domain | Relationship to Income & Affordability | What Is Exchanged |
|---|---|---|
| Retail Lending Customer Portal | Provides customer-declared and journey-captured financial inputs | Income details; Employment information; Expenses; Obligations; And uploaded financial evidence. |
| Customer Data | Provides profile and relationship context | Existing customer profile; Occupation; Employer details; And known relationship information. |
| Credit and Bureau Services | Provides external debt and commitment context | External obligations; Credit exposure; Repayment history; And other financial commitments. |
| Identity Verification | Provides identity confidence context | Identity match outcomes; Anomalies; And trust indicators. That may affect confidence in declared financial information |
| Document Upload and Verification | Provides supporting evidence status and validated facts | Document availability; Review outcomes; Extracted values; And verified financial data points. |
| Product and Pricing | Provides product parameters and policy thresholds | Requested amount; Requested term; Indicative installment; Product thresholds; And affordability policy rules. |
| Application Management | Provides case and stage context | Application identifier; Applicant structure; Product context; And lifecycle stage. |
| Employee Portal / Review Workflow | Supports specialist review when needed | Assessment summary; Evidence gaps; Triggered rules; Calculation outputs; And exceptions. |
| Decision Engine | Consumes assessment outputs | Affordability result; Supporting reasons; Evidence readiness; And next-step suitability. |

## 5.4 Business Purpose

The Income & Affordability Domain provides a structured, policy-aligned understanding of whether a retail lending application appears financially supportable during assessment.

This domain serves five core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Responsible Lending Control | Helps prevent lending that appears unaffordable for the customer and supports policy compliance |
| Consistent Financial Assessment | Applies the same affordability logic, financial treatment, and thresholds across similar applications |
| Explainable Assessment | Produces an affordability outcome supported by traceable inputs, evidence, calculations, and reasons that can be reviewed and understood |
| Operational Efficiency | Automates straightforward affordability assessments and flags unclear, unusual, or incomplete cases for specialist review |
| Policy Alignment | Ensures affordability evaluation uses approved data sources, formulas, treatment rules, and assessment controls suited to the product and customer context |

## 5.5 Assessment Stages

| # | Stage | Objective | Possible Outcome |
|---|---|---|---|
| 1 | Financial Data Capture | Gather customer-declared and retrieved affordability-relevant information | Input set assembled, or additional information required |
| 2 | Validation and Normalization | Check data completeness, freshness, usability, and convert inputs into policy-usable structure | Validated data set, exception flagged, or additional information required |
| 3 | Affordability Calculation | Measure repayment capacity using approved affordability formulas and thresholds | Insufficient, borderline, or acceptable affordability result |
| 4 | Classification and Publication | Assign the affordability outcome and publish it for downstream consumption | Acceptable, Borderline, Insufficient, Pending Additional Information, or Refer for Manual Review |

STAGE 1: FINANCIAL DATA CAPTURE

This stage gathers the financial information needed to assess whether the requested borrowing appears supportable. It is typically the first affordability activity because it establishes the customer’s declared financial position and the evidence available to support it.

▸ Purpose
To assemble the income, employment, expense, obligation, and requested-loan information required for affordability assessment.

▸ Common information sources
- Customer-declared income and employment details
- Customer-declared living expenses and recurring commitments
- Customer-declared or retrieved external obligations
- Requested product amount, term, and indicative repayment
- Uploaded evidence such as payslips, bank statements, tax records, or employer documents
- Existing customer profile and known relationship information

▸ Smaller steps within Stage 1
- Assemble customer financial context: Gather declared income, expenses, obligations, employment details, and loan-request context.
- Request supporting evidence: Collect the documents or connected-source results needed for the product and customer type.
- Check minimum capture completeness: Confirm that mandatory fields and evidence requests have been satisfied enough to continue.
- Record source and timing context: Store when information was provided, where it came from, and which applicant it relates to.
- Produce capture result: Mark the case as ready for validation or identify missing information for follow-up.

STAGE 2: VALIDATION AND NORMALIZATION

Once information is captured, the domain checks whether the data is sufficiently complete, current, credible, and policy-usable. It then converts raw financial inputs into a consistent structure for calculation.

▸ Purpose
To ensure affordability calculations run only on usable and policy-appropriate financial inputs.

▸ What this stage commonly reviews
- Whether required fields are present
- Whether evidence is current enough for policy use
- Whether declared and evidenced values can be reconciled
- Whether income sources are eligible and to what treatment value
- Whether expenses and obligations are categorized consistently
- Whether payment frequency and amounts need conversion to monthly values

▸ Smaller steps within Stage 2
- Validate completeness: Check whether mandatory financial information and evidence are present.
- Validate usability and freshness: Confirm the information is current, legible, correctly linked, and acceptable for policy use.
- Reconcile declared and evidenced values: Identify material mismatches between customer-entered data and trusted evidence.
- Apply policy treatment rules: Determine which income, expense, and obligation items are includable and at what value.
- Normalize financial inputs: Convert values into a policy-usable monthly or standard structure for calculation.
- Produce validation result: Either pass the case to calculation or flag it as pending or referable with supporting reasons.

STAGE 3: AFFORDABILITY CALCULATION

If the information is validated and normalized, the domain calculates whether the requested borrowing appears financially supportable. This stage uses policy-defined formulas and thresholds rather than a single raw income number.

▸ Purpose
To translate the customer’s financial situation into a structured affordability result that can be applied consistently across similar cases.

▸ What calculation commonly considers
- Usable primary and secondary income
- Employment and income stability
- Declared and verified living expenses
- Existing debt and recurring commitments
- Indicative repayment for the requested facility
- Product-specific thresholds and policy formulas

▸ Smaller steps within Stage 3
- Select the correct affordability logic: Choose the approved policy treatment and calculation method for the product and applicant type.
- Prepare calculation inputs: Load normalized income, expense, obligation, and repayment values into the affordability formula.
- Calculate affordability measures: Produce repayment-capacity outputs such as installment-to-income, debt burden, and disposable-income adequacy.
- Apply affordability thresholds: Compare calculated results against policy-defined limits and treatment rules.
- Produce calculation result: Determine whether the case appears acceptable, borderline, or insufficient from an affordability perspective.

▸ DSR/DTI threshold guidelines
Note: this is just an example for visualization purpose. The actual guideline depends on the bank/financial institution.

### DSR/DTI threshold guidelines

| Metric | Guideline Band | Typical Treatment | Decision Engine / Risk Assessment Use |
|---|---|---|---|
| DSR / PTI — new installment as % of usable monthly income | ≤ 30% | Generally acceptable where income is verified, stable, and other risk indicators are within policy | Can support a USABLE affordability signal for straight-through processing if other hard rules pass |
| DSR / PTI — new installment as % of usable monthly income | > 30% to 40% | Borderline range requiring stronger evidence, stable income, or compensating factors | May contribute to REVIEW or REFERRED outcome depending on credit risk, bureau obligations, and policy tolerance |
| DSR / PTI — new installment as % of usable monthly income | > 40% | High repayment burden; normally outside standard affordability tolerance unless explicitly permitted by product policy | May trigger NEGATIVE affordability reason, reduced amount, longer term, or manual review exception |
| DTI — total monthly debt obligations including requested facility as % of usable monthly income | ≤ 45% | Generally acceptable total debt burden for standard cases | Can support positive affordability scoring where bureau and internal obligation data are consistent |
| DTI — total monthly debt obligations including requested facility as % of usable monthly income | > 45% to 55% | Elevated total debt burden; should be reviewed with expense adequacy, income stability, and customer segment | May increase risk score contribution and route the case to REVIEW or REFERRED if combined with weaker risk indicators |
| DTI — total monthly debt obligations including requested facility as % of usable monthly income | > 55% | Material over-indebtedness concern; typically not acceptable without approved exception logic | May trigger hard-rule decline, negative affordability classification, or requested-loan restructuring |
| Residual disposable income after expenses, obligations, and requested installment | Positive and above policy minimum buffer | Supports repayment capacity after household and debt commitments are considered | Used as a compensating factor alongside DSR/DTI in scoring and referral logic |
| Residual disposable income after expenses, obligations, and requested installment | Positive but below buffer, or negative | Indicates weak affordability even if DSR/DTI appears near threshold | May override ratio-based pass signals and produce REVIEW, REFERRED, or NEGATIVE outcome |

These guideline bands are illustrative policy controls. Final thresholds should be configured by product, customer segment, income type, regulatory requirement, and bank risk appetite, and should be versioned so the Decision Engine can apply the correct rule set at assessment time.

STAGE 4: CLASSIFICATION AND PUBLICATION

Once the calculations are complete, the domain assigns a business-friendly affordability outcome. This creates a reusable classification for downstream decisioning and review processes.

▸ Purpose
To convert calculation outputs into a clear affordability assessment result for permitted downstream consumers.

▸ Typical smaller steps
- Confirm assessment readiness: Ensure the case has sufficient validated data to receive an affordability outcome.
- Map calculation results to outcome class: Apply policy-defined classification logic.
- Attach supporting details: Record calculations, evidence status, reasons, policy version, and key exceptions.
- Publish assessment output: Make the final affordability result available to permitted downstream users and systems.

## 5.6 Assessment Inputs and Controls

The four-stage flow depends on reliable and policy-appropriate data. Before and across the stages, the domain should maintain the following controls:

- Use only approved internal and external data sources
- Check completeness, consistency, and freshness before calculation
- Resolve or flag conflicts between declared, evidenced, internal, and external financial data
- Use the correct affordability logic, thresholds, and treatment rules for the application context
- Trigger reassessment when key application, evidence, or customer financial inputs change
- Retain timestamps, versions, references, and audit history for traceability

## 5.7 Typical Outcomes Across the Four-Stage Flow

| Assessment State | Category | Description |
|---|---|---|
| Pending Additional Information | WAITING | The case cannot be completed because required financial information or evidence is missing, stale, or unusable |
| Refer for Manual Review | REFERRED | The case requires specialist review because the income pattern, evidence, or affordability profile is not suitable for straight-through assessment |
| Insufficient | NEGATIVE | The customer’s apparent repayment capacity does not meet the minimum affordability requirement |
| Borderline | REVIEW | The case is close to threshold and may require judgment, adjusted loan terms, or additional evidence |
| Acceptable | USABLE | Income and financial capacity appear sufficient under policy for the requested borrowing |

## 5.8 Overview: Collecting Income & Affordability Data

In digital lending, income and affordability data is usually collected progressively through the customer portal as part of the application journey. The aim is to gather enough financial information to evaluate repayment capacity without creating unnecessary friction.

Collection design typically balances three needs: customer simplicity, evidence quality, and decision usefulness. Straightforward salaried cases may need only structured declarations and basic proof, while self-employed or irregular-income cases often require richer evidence and more manual interpretation.

## 5.9 Common Data Collected

| Data Category | Typical Information Collected |
|---|---|
| Employment Details | Employment status; Employer name; Job title; Industry; Tenure; Contract type; Pay frequency. |
| Primary Income | Base salary; Wages; Business income; Pension; Or other main recurring income source. |
| Secondary Income | Overtime; Commissions; Bonuses; Rental income; Freelance income; Or other eligible supplementary income. |
| Living Expenses | Housing; Utilities; Food; Transport; Education; Other regular household expenses. |
| Existing Obligations | Current loans; Credit cards; Installments; Maintenance payments; And other recurring debt commitments. |
| Supporting Evidence | Payslips; Bank statements; Tax filings; Employer letters; Bills/Invoices; Or business records. |
| Requested Loan Context | Loan amount; Loan term; Product type; Indicative repayment used in the affordability test. |

## 5.10 Collection Methods

- Customer declaration through structured forms: The most common digital method. Customers manually enter income, expense, and obligation information.
- Document upload: Customers provide proof such as payslips, statements, or tax documents to support declared income.
- Profile reuse for existing customers: Known employer, salary crediting patterns, or existing obligations may be reused where permitted.
- Integrated data retrieval: Some journeys may retrieve bureau obligations, account transaction patterns, or verified employment or income data from connected services.
- Assisted completion: Bank staff may help capture or correct financial information for customers in assisted channels.

## 5.11 Business Rules

- Required fields depend on product and customer type: The information required for a salaried employee may differ from that required for a self-employed applicant.
- Evidence requirements are risk-based: Some cases may proceed on declaration plus basic proof, while others require multiple supporting documents.
- Only eligible income counts: Not every declared income source is fully acceptable for affordability purposes. Policy determines what can be included and at what treatment value.
- Declared and evidenced values must be reconcilable: Material mismatches between customer-entered data and supporting documents trigger exceptions.
- Financial data must be current: Income evidence that is too old or no longer representative may require refresh or re-submission.
- Recollection may be required after delay: If the application remains pending for too long, the bank may require affordability to be reassessed with updated information.

## 5.12 Overview: How Income & Affordability Is Used for Decision Making

Once collected and assessed, income and affordability information becomes one of the core inputs into lending decisioning. It helps determine whether the application can move forward automatically, should be referred for review, needs more information, or should stop because the requested borrowing appears unaffordable.

## 5.13 Decision Uses

| Decision Use | How the Assessment Is Used |
|---|---|
| Minimum Eligibility Check | Confirms the customer meets basic income thresholds or minimum financial criteria for the selected product |
| Repayment Capacity Assessment | Evaluates whether the expected installment appears supportable given income, expenses, and existing commitments |
| Loan Amount or Term Suitability | Supports whether the requested amount or tenure is reasonable, or whether an adjusted structure would be more supportable |
| Straight-Through Approval Support | Allows automated decisioning to continue where affordability is clearly within policy tolerance |
| Referral Triggering | Routes borderline, unusual, or weakly evidenced cases to underwriters or operations staff for review |
| Decline Support | Provides a reasoned basis for stopping applications that do not meet affordability policy |
| Conditional Progression | Supports outcomes that depend on additional documents, reduced exposure, or verification of unstable income sources |

## 5.14 Typical Decision Logic Patterns

Although exact policy varies by bank and product, digital lending commonly uses affordability information in patterns such as:
- Pass: Income is sufficient, obligations are acceptable, and calculated repayment burden is within threshold.
- Refer: Income is variable, evidence is incomplete, or the affordability result is close to the permitted limit.
- Conditional path: The customer may proceed if additional documents are supplied or if the requested amount or term is changed.
- Decline: The requested borrowing exceeds policy affordability limits or the available evidence does not support the declared repayment capacity.

Affordability is rarely a single-number test in mature lending journeys. It is usually a combination of income quality, evidence sufficiency, expense burden, existing obligations, and product policy.

## 5.15 Example Scenarios

| Scenario | Assessment Outcome | Likely Decision Impact |
|---|---|---|
| Salaried customer with stable employer, clear payslips, and low existing debt | Acceptable | Supports straight-through progression if other checks also pass. |
| Self-employed customer with irregular monthly income but strong annual evidence | Refer for Manual Review | Requires human assessment of income stability and usable average income. |
| Customer meets minimum income but has high existing installment burden | Borderline or Insufficient | May trigger referral, reduced offer, or decline depending on policy tolerance. |
| Customer declares salary but uploaded documents are inconsistent or incomplete | Pending Additional Information | Application pauses until better evidence is provided. |
| Requested amount creates repayment beyond allowable affordability threshold | Insufficient | Application may be declined or redirected to a lower amount or longer term. |

## 5.16 Key Business Concepts

| Concept | Definition |
|---|---|
| Usable Income | The portion of customer income that policy allows to be included in affordability assessment after evidence and treatment rules are applied |
| Primary Income | The main recurring income source relied upon for affordability assessment, such as salary or core business income |
| Secondary Income | Additional income that may be considered under policy, such as commission, overtime, rental, or freelance earnings |
| Affordability | The assessment of whether a customer appears financially able to support the requested borrowing after considering obligations and expenses |
| Declared Income | Income information entered directly by the customer during the application journey |
| Evidenced Income | Income supported by documentation or trusted data sources such as payslips, bank statements, or tax records |
| Disposable Income | The amount remaining after regular expenses and obligations are considered, used to judge repayment capacity |
| Existing Financial Obligations | The customer’s current debt and recurring commitments that reduce available repayment capacity |
| Affordability Measure | A policy-defined calculation such as installment-to-income, debt burden, or disposable-income adequacy used to evaluate repayment capacity |
| Affordability Outcome | The structured result assigned after calculation, such as Acceptable, Borderline, Insufficient, Pending Additional Information, or Refer for Manual Review |
| Financial Evidence | Documents or verified data used to support or challenge customer-declared financial information |
| Reassessment | A repeat of the affordability assessment when material information changes |

FAQ

Is affordability the same as credit risk? Not exactly. Affordability focuses on whether the customer appears able to repay based on financial capacity. Credit risk is broader and may also include repayment behavior, bureau data, fraud indicators, and policy factors.

Can a customer have high income and still fail affordability? Yes. High income alone is not enough if the customer also has high existing obligations, very high living expenses, unstable earnings, or a requested installment that exceeds policy tolerance.

Why do some cases need manual review? Manual review is often needed when income is irregular, documents are unclear, financial patterns are unusual, or the case sits close to affordability thresholds where judgment is needed.

---

[← Digital Lending Onboarding](README.md) · [Previous: Credit Assessment](04-credit-assessment.md) · [Next: Loan Product & Simulation](06-loan-product-simulation.md)
