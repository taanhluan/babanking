# 6. Loan Product & Simulation

> Digital Lending Onboarding — module 6 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Previous: Income & Affordability](05-income-affordability.md) · [Next: Document Upload](07-document-upload.md)

## Contents

- [6.1 Business Definition](#61-business-definition)
- [6.2 Business Responsibilities](#62-business-responsibilities)
- [6.3 Relationship with Other Domains](#63-relationship-with-other-domains)
- [6.4 Business Purpose](#64-business-purpose)
- [6.5 Simulation Stages](#65-simulation-stages)
- [6.6 Typical Simulation Outcomes](#66-typical-simulation-outcomes)
- [6.7 Overview: Configuring Loan Products and Running Simulation](#67-overview-configuring-loan-products-and-running-simulation)
- [6.8 Common Product Data Configured](#68-common-product-data-configured)
- [6.9 Simulation Methods](#69-simulation-methods)
- [6.10 Business Rules](#610-business-rules)
- [6.11 Overview: How Loan Product & Simulation Is Used for Decision Making and Offer Shaping](#611-overview-how-loan-product--simulation-is-used-for-decision-making-and-offer-shaping)
- [6.12 Decision Uses](#612-decision-uses)
- [6.13 Typical Decision Logic Patterns](#613-typical-decision-logic-patterns)
- [6.14 Example Scenarios](#614-example-scenarios)
- [6.15 Key Business Concepts](#615-key-business-concepts)

## 6.1 Business Definition

The Loan Product & Simulation Domain manages the business capability that defines what lending products the bank can offer and how those products are translated into customer-specific borrowing scenarios during the digital lending journey.

In a digital lending journey, this domain:

| Task | Description / details |
|---|---|
| Defines supported product structures | Such as: New-customer products; Repeating-customer products; Credit loans (unsecured); Collateral loans (secured). |
| Maintains product rules | For: Base amount ranges and grade-based caps; Term ranges and allowable frequency combinations; Risk-adjusted interest rate matrices; Fees and charges (origination, processing, service, collateral); Repayment methods (amortized, flat, reducing balance); Collateral and LTV constraints where applicable. |
| Determines available products and parameter ranges | For: A given customer profile, segment, and channel; The specific decision status and risk grade assigned by the Decision Engine. |
| Generates simulations of repayment plans and applicable charges | Based on: Product catalog rules; Customer category (new vs. repeating); Risk Assessment score (0–1000) and grade (Platinum, Gold, Silver, Bronze); Decision Engine routing outcomes and affordability limits. |
| Provides structured product and simulation outputs | For downstream use by: Customer Portal (indicative and final simulation display); Employee Portal / Review Workflow (assisted structuring); Decision Engine & Affordability (repayment obligations); Offer & Agreement (formal commercial terms). |

The domain helps the bank answer whether a valid product structure and repayment scenario can be constructed for this customer, this request, and this assessed risk position.

Loan Product & Simulation does not itself:
- Execute hard-rule screening or calculate credit risk scores (owned by 8. Risk Assessment)
- Make the final lending decision record or assign rejection codes (owned by 9. Decision Engine)
- Capture legal agreement signing or accept binding offers (owned by 10. Offer & Agreement)
- Disburse funds or manage loan accounting (owned by Core Lending / Loan Origination)

Instead, this domain produces the product eligibility view, pricing structure, simulation result, repayment plan illustration, and fee breakdown used by those domains.

## 6.2 Business Responsibilities

| Responsibility | Description |
|---|---|
| Define Product Catalog | Maintain lending products such as: New-customer products; Repeating-customer products; Credit loans (unsecured); Collateral loans (secured); Other policy-supported product variants. |
| Configure Customer Segmentation Rules | Define which products or product variants are available based on: New versus repeating customer status; Customer profile and relationship tenure; Distribution channel (digital portal vs. assisted branch); Risk grade treatment (Platinum, Gold, Silver, Bronze); Policy-defined eligibility criteria. |
| Configure Secured and Unsecured Structures | Maintain whether a product is: Credit loan (unsecured); Collateral loan (secured). Along with applicable Loan-to-Value (LTV) limits, valuation requirements, and collateral security constraints. |
| Configure Amount and Term Ranges | Maintain allowed borrowing boundaries: Minimum and maximum loan amounts per product and risk grade; Minimum and maximum tenors/terms per product and risk grade; Step increments and allowable amount-term combinations. |
| Configure Pricing and Charges | Maintain product-level pricing elements such as: Base interest rates and risk-based margin grids by risk grade; Flat or tiered pricing logic; Origination or processing fees; Insurance or service fees where applicable; Other policy-approved charges. |
| Generate Loan Simulation | Create customer-specific repayment scenarios showing: Periodic installment amount (principal + interest); Complete amortization schedule; Total payable amount and total finance charge; Itemized fee breakdown; Applicable annual percentage rate (APR) or effective rate. |
| Apply Grade-Based Product Treatment | Consume risk grade (Platinum, Gold, Silver, Bronze) and Decision Engine outcomes to dynamically determine: Eligible pricing band / rate discount or loading; Maximum allowable loan exposure cap; Allowable tenor options (e.g., restricted terms for Bronze); Collateral or guarantor requirements where mandated by policy. |
| Validate Product-Simulation Consistency | Verify that the simulated plan strictly adheres to: Product catalog constraints; Risk-adjusted pricing rules; Decision Engine status and exposure limits; Verified debt-to-income and affordability boundaries; Current policy version. |
| Support Re-simulation | Automatically re-run simulation when: Requested amount or term is modified; Selected product or security type changes; Reassessment alters the Risk Score (0–1000) or Risk Grade; Decision Engine modifies routing or exposure limits. |
| Maintain Auditability | Retain full snapshot records of: Product catalog version; Pricing matrix and fee configurations applied; Risk grade and Decision Engine inputs used; Simulation calculation assumptions and output schedules; Timestamps and execution history for auditability. |

## 6.3 Relationship with Other Domains

The Loan Product & Simulation Domain operates as part of the wider digital lending journey. It receives customer, product, and decision context; generates valid borrowing scenarios; and provides structured product and repayment outputs for downstream consumption.

| Business Domain | Relationship to Loan Product & Simulation | What Is Exchanged |
|---|---|---|
| Retail Lending Customer Portal | Provides product discovery and interactive simulation experience | Available products and product variants; Selectable amount and term sliders/ranges; Indicative/estimated installments and fee breakdowns; Real-time simulation summary. |
| Application Management | Provides application case and request context | Application identifier and lifecycle stage; Requested product type; Requested amount and requested term; Applicant structure and channel context. |
| Customer Data | Provides customer relationship and segmentation context | New vs. repeating customer classification; Relationship tenure and profile data; Existing internal loan holdings and exposure. |
| Income & Affordability | Interacts on serviceability and repayment capacity | Indicative installment sent to Affordability for DSR/DTI testing; Maximum supportable installment and capacity limits returned to constrain simulation. |
| Document Upload | Supports collateral and fee evidence readiness | Collateral ownership and valuation documents; Supporting fee, income, or valuation validation status. |
| Risk Assessment | Provides structured risk scoring and grading outputs | Risk Assessment outcome (Pass / Hard-rule Reject / Score Cut-off Reject); Numeric Risk Score (0–1000); Assigned Risk Grade (Platinum, Gold, Silver, Bronze); Risk reason indicators and factor contributions. |
| Decision Engine | Provides automated policy decisions, rejection codes, and commercial constraints | Decision status (Continue, Reject, Refer) Rejection codes (e.g., INTERNAL_HARD_RULE, EXTERNAL_HARD_RULE, SCORING); Grade-based exposure caps and maximum permitted loan amounts; Allowed offer path and product restrictions. |
| Offer & Agreement | Consumes validated simulation to construct formal customer offer | Selected product structure and variant; Approved loan amount, tenor, and repayment frequency; Detailed repayment schedule and payment dates; Risk-adjusted interest rate, APR, and itemized fees; Offer-ready commercial and contractual terms. |
| Employee Portal / Review Workflow | Supports assisted structuring, manual adjustments, and exception handling | Simulation summary and schedule breakdown; Product rule or affordability exceptions; Counter-offer scenarios and alternative structures; Parameter override reasons and logs. |

## 6.4 Business Purpose

The purpose of the Loan Product & Simulation Domain is to ensure that lending products are configured in a controlled, policy-aligned way and that customer-specific repayment scenarios can be generated clearly and consistently before final offer commitment.

This domain serves five core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Product Control | Ensures that each lending product has defined, version-controlled rules for: Customer eligibility and segmentation; Secured (collateral) vs. unsecured (credit) structure; Allowable amount, term, pricing, and fees. |
| Explainable Commercial Structuring | Provides a transparent, mathematically rigorous basis for how: Repayment schedules and installments; Interest charges and effective rates; Upfront and ongoing fees. Are calculated and presented to the customer. |
| Decision- & Risk-Aligned Treatment | Directly integrates with Risk Assessment (0–1000 score, Platinum–Bronze grades) and Decision Engine policies to dynamically set: Risk-based interest rates and fee discounts/surcharges; Maximum exposure caps and tenor restrictions; Policy-compliant simulation boundaries. |
| Customer Transparency | Enables customers and lending officers to explore: Realistic, binding or indicative installments; Total repayment obligations and breakdown of charges; Multiple tenor/amount options before formal agreement commitment. |
| Operational Efficiency & Straight-Through Processing | Automates product filtering, pricing lookups, and repayment calculations for standard passing applications; Surfaces policy mismatches, out-of-range requests, or affordability breaches early to prevent downstream rework. |

## 6.5 Simulation Stages

The product and simulation lifecycle describes how product rules are selected, how customer and decision context is applied, and how a usable repayment scenario is generated for downstream lending steps.

| # | Stage | Description | Key Business Activity |
|---|---|---|---|
| 1 | Product Context Identification | Identifies eligible product families based on customer and journey characteristics: New customer vs. repeating customer; Unsecured credit loan vs. secured collateral loan; Application channel. | Filters product catalog using: Applicant status; Declared borrowing purpose; And customer profile data. |
| 2 | Base Rule & Pricing Retrieval | Retrieves configured catalog rules and standard parameter ranges for the selected product. | Loads: Base amount boundaries; Tenor limits; Repayment frequencies; Default pricing formulas; Fee tables; And collateral requirements. |
| 3 | Risk & Decision Alignment | Evaluates upstream outcomes from Risk Assessment (Steps 1–4) and Decision Engine. | If Decision Engine status is Reject (e.g., hard-rule breach or score < 500), simulation is halted; If status is Continue or Refer, the assigned Risk Grade (Platinum, Gold, Silver, Bronze) is mapped to the risk-pricing matrix and grade exposure caps. |
| 4 | Repayment & Fee Calculation | Generates the detailed financial amortization plan for requested or adjusted terms. | Calculates periodic installment (principal + interest); Applies risk-adjusted rate and fee schedules; Computes total finance charge, total payable, and APR; Checks installment against Income & Affordability limits. |
| 5 | Simulation Validation | Validates the generated plan against: Policy rules; Exposure caps; And affordability boundaries. | Verifies amount ≤ grade cap and term ≤ grade limit; Confirms installment satisfies serviceability thresholds; Adjusts parameters or routes to exception workflow if limits are exceeded. |
| 6 | Simulation Publication | Publishes structured simulation output to portals, underwriting, and offer systems. | Delivers: Full commercial summary; Repayment schedule; Fee breakdown; And rule audit metadata. For: Customer display; Employee review; And Offer & Agreement construction. |

## 6.6 Typical Simulation Outcomes

The simulation process does not by itself approve or decline a loan. It produces one of several commercial and repayment outcomes that inform the next step.

| Outcome | Category | Description |
|---|---|---|
| Simulation Available | USABLE | A valid repayment scenario was successfully generated within all standard product rules, grade-based pricing bands, and affordability limits. |
| Simulation Available with Adjusted Terms | USABLE | A scenario was generated, but requested amount, tenor, interest rate, or fees were modified (e.g., amount reduced to grade exposure cap, or tenor shortened to meet policy/affordability constraints). |
| Simulation Not Available | NEGATIVE | No valid simulation could be produced because the request violates product boundaries, or Decision Engine issued an upstream rejection ( INTERNAL_HARD_RULE , EXTERNAL_HARD_RULE , SCORING ). |
| Pending Upstream Outcome | WAITING | Simulation cannot be finalized because required upstream inputs (such as Risk Assessment scoring/grading, Decision Engine routing, or collateral valuation) are pending completion. |
| Refer for Manual Review | REFERRED | The requested structure requires underwriter/specialist review due to policy exceptions, borderline affordability, collateral verification requirements, or non-standard pricing overrides. |

## 6.7 Overview: Configuring Loan Products and Running Simulation

In digital lending, product configuration and simulation work together: configuration establishes lending parameters and risk-aligned rules, while simulation translates those rules into individualized customer loan scenarios. The goal is to allow customers and lending officers to explore borrowing options while strictly enforcing risk appetite, pricing discipline, and regulatory policy.

Configuration balances commercial flexibility with credit risk controls:

- Unsecured Credit Loans: Rely heavily on Risk Assessment scorecards (0–1000) and Decision Engine grades (Platinum to Bronze) to determine maximum unsecured exposure, risk margin, and allowable tenor.
- Secured Collateral Loans: Combine applicant risk grading with collateral valuation and maximum LTV limits, incorporating asset-specific fee structures and documentation checks.
- Repeating Customers: May unlock preferential pricing matrices, higher maximum loan amounts, and streamlined simulation paths based on established internal repayment history.

## 6.8 Common Product Data Configured

| Data Category | Typical Information Configured |
|---|---|
| Customer Segment | Salaried vs. self-employed eligibility; Distribution channel (online self-service, mobile app, assisted branch); New customer vs. repeating customer. |
| Product Structure | Credit loan (unsecured personal loan); Collateral loan (secured personal or auto loan); Sub-product variants and permitted lending purposes. |
| Amount Rules | Minimum loan amount and maximum absolute catalog cap; Step increments (e.g., increments of 1,000,000 VND / $500); Maximum loan caps tiered by Risk Grade (Platinum, Gold, Silver, Bronze); Maximum unsecured exposure limits per customer. |
| Term Rules | Minimum and maximum tenor (e.g., 6 to 60 months); Permitted repayment frequencies (monthly, bi-weekly); Maximum allowed tenor restricted by Risk Grade (e.g., Bronze capped at 24 months); Maturity age rules (applicant age + tenor ≤ max maturity age). |
| Pricing Rules & Risk Grids | Base benchmark rate (cost of funds + base margin); Risk-based margin matrix mapped to Risk Grades:; Platinum (850–1000): Lowest risk margin / preferred rate; Gold (700–849): Standard competitive rate; Silver (600–699): Moderate risk margin; Bronze (500–599): Conservative pricing / higher risk margin; Promotional rate discounts and relationship-based concessions. |
| Fee Rules | Origination / processing fee (flat amount or % of loan principal); Monthly account maintenance / administration fee; Credit insurance / protection premium calculations; Collateral appraisal and pledge registration fees (for secured loans); Early repayment and late payment fee formulas. |
| Repayment Configuration | Calculation method: Equal Monthly Installment (reducing balance), flat interest, or bullet principal; Day-count convention (e.g., Actual/365 or 30/360); First installment due date calculation rules (grace period handling). |
| Decision- & Risk-Aligned Treatment | Minimum required score (aligned with 500 score cut-off); Grade-specific product eligibility matrices; Mandatory collateral or guarantor triggers based on score factor reasons; Maximum supportable installment constrained by verified Debt Service Ratio (DSR). |

## 6.9 Simulation Methods

- Customer-led exploratory simulation (Pre-Assessment): Customer adjusts amount and term sliders in the digital portal. Generates an indicative repayment schedule using standard benchmark pricing before full credit checks.
- Decision-aligned simulation (Post-Assessment): System recalculates the loan scenario using the exact Risk Score (0–1000), assigned Risk Grade (Platinum–Bronze), and Decision Engine exposure limits.
- Staff-assisted simulation: Lending officers or underwriters simulate customized structures, explore alternative tenors, or structure counter-offers within approved policy matrices.
- Affordability-constrained simulation: Simulation dynamically caps the maximum loan amount or adjusts tenor based on maximum allowable installment feedback from Income & Affordability.
- Re-simulation after lifecycle change: Automatic recalculation triggered whenever customer requested terms change, refreshed bureau data alters the risk score, or an underwriter applies an approved policy override.

## 6.10 Business Rules

- Segmentation gating: Product variants must strictly match applicant classification (e.g., repeating customer products cannot be selected by first-time applicants).
- Upstream decision dependency: Formal offer simulation cannot proceed if Decision Engine outputs a Reject status or if Risk Assessment identifies a disqualifying hard rule.
- Grade-based cap enforcement: Loan amount and tenor must not exceed the maximum parameters assigned to the customer's specific Risk Grade (Platinum, Gold, Silver, Bronze).
- Pricing discipline: Interest rates and fees must be derived directly from the approved risk pricing matrix; arbitrary or unconfigured pricing is strictly prohibited.
- Secured product prerequisites: Collateral loan simulations must incorporate validated collateral values and respect configured maximum LTV ratios.
- Serviceability alignment: The simulated installment must not breach maximum DSR/DTI thresholds validated by the Income & Affordability domain.
- Explainability and transparency: Every simulated output must clearly display principal installment, interest charge, itemized fees, APR, and total payable amount.
- Re-simulation consistency: Any material update to applicant income, risk grade, requested amount, or product configuration must trigger an immediate re-simulation to ensure data integrity.

## 6.11 Overview: How Loan Product & Simulation Is Used for Decision Making and Offer Shaping

After configuration and calculation, product and simulation outputs feed directly into the core decisioning and offer generation processes. Simulation is the vital bridge connecting product policy and credit risk assessment with customer-facing commercial offers.

+------------------------------------+ +-----------------------------------------+ | 8. Risk Assessment | | 9. Decision Engine | | - Internal & External Hard Rules | ---> | - Evaluates Hard Rules & Score (>= 500) | | - Scoring: 0 - 1000 | | - Status: Continue / Reject / Refer | | - Grading: Platinum, Gold, Silver, | | - Rejection Code if rejected | | Bronze | | - Sets Grade-Based Policy Limits | +------------------------------------+ +-----------------------------------------+ | | +----------------------+-----------------------+ | v +------------------------------------------+ | 6. Loan Product & Simulation | | - Maps Grade to Risk-Pricing Matrix | | - Applies Grade Amount & Tenor Caps | | - Calculates Installments & Schedules | | - Produces Usable / Adjusted Simulation | +------------------------------------------+ | v +------------------------------------------+ | Offer & Agreement | | - Formal Binding Commercial Offer | | - Contract Generation & E-Signing | +------------------------------------------+

## 6.12 Decision Uses

| Decision Use | How the Product or Simulation Is Used |
|---|---|
| Product Eligibility Validation | Confirms whether the applicant meets all catalog-level prerequisites (customer type, age, geography, secured vs. unsecured structure). |
| Risk Grade Integration | Ingests the Risk Grade (Platinum, Gold, Silver, Bronze) from Risk Assessment / Decision Engine to apply the corresponding pricing grid, fee structure, and exposure limit. |
| Affordability & DSR Verification | Provides the calculated monthly installment to Income & Affordability to verify that the applicant's total debt service ratio remains within policy thresholds. |
| Counter-Offer & Term Adjustment | When requested terms exceed risk grade caps or DSR limits, simulation calculates viable alternative structures (e.g., lower loan amount or extended tenor) for counter-offer generation. |
| Upstream Rejection Alignment | Halts commercial scenario generation and logs rejection rationale when Decision Engine returns a Reject outcome (e.g., INTERNAL_HARD_RULE , EXTERNAL_HARD_RULE , or SCORING cut-off failure). |
| Formal Offer Construction | Delivers the validated financial parameters (approved principal, term, interest rate, amortization schedule, itemized fees) directly into Offer & Agreement for customer acceptance. |
| Underwriting Exception Review | Supplies credit underwriters with side-by-side comparison of requested vs. simulated terms, rule breach flags, and pricing breakdown to support manual review. |

## 6.13 Typical Decision Logic Patterns

In a mature digital lending journey, product simulation follows four distinct operational patterns:

- Pass (Standard Path): The customer passes all Risk Assessment gates (score ≥ 500, graded Platinum to Bronze), Decision Engine returns Continue, and the requested amount and term fit within grade limits. Simulation outputs Simulation Available with risk-banded pricing.
- Adjusted Path (Counter-Offer): The applicant is creditworthy (passing grade), but requested amount or term exceeds grade exposure caps or DSR limits. Simulation recalculates maximum allowable terms, outputting Simulation Available with Adjusted Terms.
- Conditional / Referred Path: The application requires additional evidence (e.g., collateral appraisal for secured loans, or manual underwriting for Silver/Bronze edge cases). Simulation outputs Pending Upstream Outcome or Refer for Manual Review.
- Stop (Rejection Path): Upstream Risk Assessment fails internal/external hard rules or scores below 500 (SCORING cut-off), or the request fundamentally breaches product eligibility. Decision Engine returns Reject, and simulation outputs Simulation Not Available.

## 6.14 Example Scenarios

| Scenario | Risk & Decision Context | Simulation Outcome | Likely Decision & Offer Impact |
|---|---|---|---|
| New customer applies for unsecured credit loan of $5,000 for 24 months; clean bureau, stable income. | Risk Score: 920 Grade: Platinum Decision: Continue | Simulation Available | Qualifies for lowest interest rate band and standard zero-fee promotion. Full requested amount and term approved; moves directly to Offer & Agreement. |
| Repeating customer requests $15,000 credit loan for 36 months; solid repayment track record. | Risk Score: 780 Grade: Gold Decision: Continue | Simulation Available | Qualifies for preferred repeating-customer rate band and high exposure cap. Approved as requested. |
| Customer requests $10,000 for 36 months; passing score but elevated revolving utilization. | Risk Score: 640 Grade: Silver Decision: Continue | Simulation Available | Receives standard interest rate band and standard processing fee. Installment verified against DSR; approved as requested. |
| Customer requests $8,000 for 36 months; multiple recent inquiries and high debt burden. | Risk Score: 530 Grade: Bronze Decision: Continue | Simulation Available with Adjusted Terms | Bronze policy caps unsecured exposure at $4,000 and max tenor at 24 months with higher risk margin. Simulation outputs adjusted counter-offer scenario. |
| Customer has active 45-day delinquency on internal credit card. | Step 1 Hard Rule: Active internal arrears Decision: Reject | Simulation Not Available | Decision Engine assigns rejection code INTERNAL_HARD_RULE . Simulation is blocked; customer notified of ineligibility. |
| Customer has clean internal record, but credit bureau returns 2 active accounts >60 DPD. | Step 2 Hard Rule: Active severe delinquency Decision: Reject | Simulation Not Available | Decision Engine assigns rejection code EXTERNAL_HARD_RULE . Commercial simulation halted immediately. |
| Customer passes hard rules, but total factor score aggregates to 440 (below 500 cut-off). | Step 3 Scoring: Score = 440 (< 500) Decision: Reject | Simulation Not Available | Decision Engine assigns rejection code SCORING . No grade assigned; simulation not produced. |
| Customer applies for $25,000 collateral auto loan; credit assessment passes, vehicle appraisal pending. | Risk Score: 720 Grade: Gold Decision: Refer (Collateral) | Pending Upstream Outcome | Indicative simulation generated; final binding simulation and LTV validation held until valuation document is verified. |

## 6.15 Key Business Concepts

| Concept | Definition |
|---|---|
| Loan Product | A configured retail lending offering with defined, policy-approved rules for applicant eligibility, security structure, amount/tenor ranges, pricing, fees, and repayment methods. |
| Product Variant | A specialized configuration of a product tailored for a distinct segment (e.g., new customer, repeating customer, unsecured credit loan, secured collateral loan). |
| Simulation | The algorithmic calculation of an individualized loan scenario—including installment amounts, amortization schedule, interest charges, and fees—based on product configuration and customer risk inputs. |
| Repayment Plan | The detailed periodic schedule specifying installment amounts, principal-interest breakdown, due dates, and total payable amount across the loan life. |
| Risk-Adjusted Pricing Matrix | The configured pricing schedule that maps Decision Engine Risk Grades (Platinum, Gold, Silver, Bronze) to corresponding interest rate margins and fee structures. |
| Grade Exposure Cap | The maximum permitted borrowing amount and tenor defined by credit policy for each respective Risk Grade. |
| Decision-Aligned Simulation | A simulation generated strictly within the constraints, risk grade, and status provided by the Decision Engine. |
| Indicative Simulation | A pre-assessment repayment estimate generated for customer exploration prior to formal risk evaluation and grading. |
| Re-simulation | The automatic recalculation of repayment schedules and terms triggered by changes in customer request, risk score/grade, affordability inputs, or product configuration. |
| Counter-Offer Structuring | The automatic generation of an adjusted simulation (reduced amount, modified tenor, or secured variant) when the customer's original request exceeds risk grade or affordability limits. |
| Collateral Loan | A lending product secured by pledged assets (e.g., vehicle, property) subject to specific LTV constraints, valuation checks, and asset-related fees. |

FAQ

Is simulation the same as the final offer? No. Simulation generates a calculated commercial scenario and repayment schedule based on current product rules and risk inputs. The final binding offer is created and executed later in the Offer & Agreement domain once all credit, affordability, and verification checks are formally approved.

Can two customers selecting the same product receive different simulation results? Yes. Simulation dynamically applies risk-based pricing and parameter limits. A customer graded Platinum (Score 850–1000) will receive the lowest interest margin and highest loan cap, whereas a customer graded Bronze (Score 500–599) will receive a higher risk margin and more restricted amount/tenor limits. Results also differ based on customer status (new vs. repeating) and collateral structure.

How does Decision Engine rejection impact simulation? If the Decision Engine issues a Reject decision—whether from Step 1 Internal Hard Rules, Step 2 External Hard Rules, or Step 3 Scoring Cut-off (< 500)—the simulation engine immediately returns Simulation Not Available and blocks the generation of customer-facing commercial terms.

Why would a requested amount or term be adjusted during simulation? A requested amount or term will be adjusted to generate a counter-offer (Simulation Available with Adjusted Terms) if the requested structure exceeds the maximum exposure cap assigned to the customer's Risk Grade, or if the resulting installment breaches maximum Debt Service Ratio (DSR) limits set by Income & Affordability.

When is re-simulation triggered? Re-simulation is triggered whenever there is a change in the applicant's requested parameters (amount/tenor), customer segment, verified income/affordability data, or whenever updated internal/bureau evidence results in a revised Risk Score or Risk Grade.

---

[← Digital Lending Onboarding](README.md) · [Previous: Income & Affordability](05-income-affordability.md) · [Next: Document Upload](07-document-upload.md)
