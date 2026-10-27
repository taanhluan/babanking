# 9. Decision Engine

> Digital Lending Onboarding — module 9 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Previous: Risk Assessment](08-risk-assessment.md) · [Next: Offer & Agreement](10-offer-agreement.md)

## Contents

- [9.1 Business Definition](#91-business-definition)
- [9.2 Business Responsibilities](#92-business-responsibilities)
- [9.3 Relationship with Other Domains](#93-relationship-with-other-domains)
- [9.4 Lifecycle Summary](#94-lifecycle-summary)
- [9.5 Step 1: Internal Risk Assessment](#95-step-1-internal-risk-assessment)
- [9.6 Step 2: External Risk Assessment](#96-step-2-external-risk-assessment)
- [9.7 Step 3: Scoring](#97-step-3-scoring)
- [9.8 Step 4: Grading](#98-step-4-grading)
- [9.9 Controls and Design Considerations](#99-controls-and-design-considerations)
- [9.10 Example End-to-End Outcomes](#910-example-end-to-end-outcomes)
- [9.11 Key Business Concepts](#911-key-business-concepts)

## 9.1 Business Definition

The risk assessment lifecycle is a structured sequence used to evaluate whether a retail lending application presents acceptable risk under policy. It starts with high-confidence disqualifying checks, then moves into quantitative scoring, and finally converts the score into a simple grade that downstream domains can use consistently.

The four steps are designed to work together:
- Step 1: Internal Risk Assessment: screens for unacceptable risk using internal relationship and conduct information.
- Step 2: External Risk Assessment: screens for unacceptable risk using bureau and third-party evidence.
- Step 3: Scoring: quantifies the overall risk profile for cases that pass hard-rule gates.
- Step 4: Grading: converts a passing score into a reusable business classification.

Important distinction: Hard-rule rejection and score rejection are different mechanisms. Hard rules stop a case because a specific policy condition is unacceptable on its own. Score rejection stops a case because the overall risk profile, taken together, falls below the minimum acceptable threshold.

## 9.2 Business Responsibilities

- Reject with corresponding rejection code if unacceptable risk was detected from institution-held data via Risk Assessment
- Reject with corresponding rejection code if unacceptable risk was detected from requested data from external sources via Risk Assessment
- Rejected with rejection code = SCORING if final score calculated by Risk Assessment sits below cut-off
- Conduct prioritization for applications with higher gradings from Risk Assessment grading

## 9.3 Relationship with Other Domains

| Business Domain | Relationship to Decision Engine | What Is Exchanged |
|---|---|---|
| Retail Lending Customer Portal | Final application status | Final decision status Refer to 1. Registration & Onboarding for detailed handling of this step. |
| Application Management | Final application status | Final decision status + grading if applicable |
| Employee Portal / Review Workflow | Final application status | Final decision status + grading if applicable |
| Risk Assessment | Consumes assessment outputs | Receive hard-rule result, score result, grade, and supporting reasons |

## 9.4 Lifecycle Summary

| Step | Primary Objective | Main Assessment Logic | Possible Outcome |
|---|---|---|---|
| 1. Internal Risk Assessment | Identify unacceptable risk from institution-held data | Internal conduct and hard-rule screening | Either: Reject; Continue. |
| 2. External Risk Assessment | Identify unacceptable risk from external evidence | Bureau and third-party hard-rule screening | Either: Reject; Continue. |
| 3. Scoring | Measure the overall risk profile numerically | Attribute-based score calculation from 0-1000 | Either: Reject if score < 500; Continue. |
| 4. Grading | Translate a passing score into a risk grade | Map score range to grade band | Either: Platinum; Gold; Silver; Bronze. |

## 9.5 Step 1: Internal Risk Assessment

This step evaluates information already held by the institution. It is typically the earliest substantive gate because internal data is usually trusted, directly linked to the customer, and immediately available without relying on third-party retrieval.

▸ Purpose
- To determine whether the customer presents unacceptable risk based on known profile, internal repayment behavior, conduct patterns, exposure, and relationship history.

▸ What this step commonly reviews
- Existing and closed loan repayment history
- Arrears and delinquency events
- Write-off, recovery, or restructure history
- Current exposure and utilization within the institution
- Deposit account conduct and payment stability
- Relationship tenure and prior product performance
- Internal fraud or material inconsistency indicators relevant to risk treatment

▸ Typical smaller steps
- Assemble internal context: Retrieve customer profile, product relationships, internal liabilities, servicing history, and linked application details.
- Validate data usability: Confirm the records belong to the correct customer, are current enough for policy use, and are complete for assessment.
- Evaluate internal indicators: Review adverse conduct patterns, repayment instability, repeated excess behavior, or problematic prior servicing outcomes.
- Apply internal hard rules: Test policy-defined conditions that independently disqualify the application.
- Produce internal result: Record whether the case is rejected at this stage or passed to external assessment, along with reason information.

▸ Example internal hard rejection rules

### Example internal hard rejection rules

| Example Rule | Illustrative Condition | Assessment Rationale | Example Data Source | Example Decision Output |
|---|---|---|---|---|
| Minimum age eligibility | Applicant is below the minimum legal or product-policy age at application date, for example under 18 years old | Ensures the applicant is legally eligible to enter the credit relationship and meets product eligibility rules | Customer profile, identity document, date of birth verification | Reject: applicant below minimum age |
| Maximum age at maturity | Applicant’s age at scheduled loan maturity exceeds the product maximum, for example older than 65 at final repayment date | Controls lifecycle affordability and policy exposure where income continuity may materially change before maturity | Customer profile, requested tenor, product policy rules | Reject: age at maturity exceeds limit |
| Area eligibility restriction | Applicant’s residential, employment, or collateral address is outside the approved serviceable area for the product | Prevents lending where servicing, collections, legal enforceability, or operational support is outside approved coverage | Address verification, branch coverage table, serviceability rules | Reject: area not eligible |
| Restricted or high-risk location | Applicant is linked to a location that policy excludes, such as a sanctioned, embargoed, or specifically restricted geography | Ensures risk assessment respects regulatory, operational, and policy location restrictions | KYC records, sanctions/geography screening, address intelligence | Reject: restricted geography |
| Citizenship or residency eligibility | Applicant does not hold an eligible citizenship, permanent residency, or valid residency status required for the product | Ensures the customer has the required legal status and reduces enforceability or continuity risk | KYC profile, identity document, immigration or residency verification | Reject: citizenship or residency not eligible |
| Insufficient remaining visa validity | Non-citizen applicant’s visa or work permit expires before the minimum required period, or before the proposed loan maturity | Controls repayment continuity and recoverability where the customer’s right to remain or work may end during the facility term | Visa record, work permit, document verification, requested tenor | Reject: insufficient residency validity |
| Employment status not eligible | Applicant is unemployed, retired without acceptable income, on unpaid leave, or otherwise outside the employment statuses allowed by product policy | Prevents continuation where the declared employment position does not support the required income stability assumptions | Application form, payroll verification, employer confirmation, income documents | Reject: employment status not eligible |
| Minimum employment tenure not met | Applicant has been in current employment or business for less than the required minimum period, for example under 3 months for salaried applicants or under 12 months for self-employed applicants | Ensures income source has demonstrated minimum stability before credit risk is assessed further | Employment verification, payroll history, business registration, tax records | Reject: insufficient employment tenure |
| Occupation prohibited by policy | Applicant’s declared or verified occupation is on a product-specific prohibited occupation list | Excludes occupations that policy treats as outside risk appetite due to income volatility, legal restrictions, reputational concerns, or verification limitations | Application form, employer industry classification, occupation policy table | Reject: prohibited occupation |
| Occupation cannot be verified | Applicant’s occupation or employer cannot be reasonably verified using approved evidence, and policy requires verification before assessment can continue | Prevents reliance on unverified employment or income information where occupation is material to risk treatment | Employer verification, payslip validation, tax/social insurance records, third-party employment database | Reject or refer: occupation not verified |
| Recent severe internal delinquency | Customer had any internal lending account more than 90 days past due within the last 12 months | Indicates recent serious repayment stress with the same institution | Loan servicing system, collections history | Reject: internal severe delinquency |
| Current internal arrears | Customer has any active internal facility currently 30 or more days past due | Prevents new exposure while existing repayment obligations are already overdue | Core lending platform | Reject: active internal arrears |
| Recent write-off relationship | Customer has any internal write-off or charge-off recorded within the last 24 months | Shows a recent loss event that policy may treat as unacceptable | Recovery system, general ledger loss marker | Reject: recent internal loss event |
| Unsettled recovery balance | Customer has an outstanding recovery, settlement, or charged-off balance that remains unpaid | Indicates unresolved prior credit loss before considering additional credit | Collections and recovery platform | Reject: unresolved recovery exposure |
| Policy-prohibited restructure history | Customer has more than 1 internally restructured lending facility within the last 18 months | Suggests repeated inability to maintain original repayment terms | Loan modification records | Reject: repeated restructure history |
| Recent hardship program exit | Customer exited a hardship, forbearance, or payment relief arrangement within the last 6 months | May indicate repayment capacity has not yet stabilized after assistance | Servicing notes, hardship workflow | Reject or refer according to policy |
| Excess internal exposure | Total internal outstanding debt exceeds the product-specific exposure cap after including the requested facility | Prevents concentration beyond approved internal risk appetite | Customer exposure aggregation, product limits | Reject: exposure cap exceeded |
| High unsecured concentration | Customer’s unsecured internal exposure would exceed the allowed unsecured concentration limit | Controls risk where repayment depends mainly on customer cash flow rather than collateral | Exposure engine, collateral registry | Reject: unsecured concentration limit |
| Material internal conduct instability | Customer has 6 or more consecutive months of persistent excess balance, returned payment, or failed debit events on core accounts | Signals unstable conduct that may correlate with repayment difficulty | Deposit account transaction history | Reject: unstable internal conduct |
| Repeated failed repayment attempts | Customer has 3 or more failed automatic repayment debits across internal products within the last 90 days | Indicates possible cash-flow stress or unreliable repayment setup | Payment processing records | Reject: repeated failed repayments |
| Short relationship with adverse conduct | Customer tenure is less than 3 months and internal account conduct includes returned payments, negative balances, or unresolved documentation issues | Combines limited relationship evidence with early adverse indicators | Customer master record, account conduct history | Reject: insufficient stable internal history |
| Internal fraud or misuse marker | Customer has an active internal fraud, confirmed misuse, or serious investigation marker permitted for credit risk use | Prevents continuation where internal trust and conduct concerns are unresolved | Fraud case management system | Reject: active internal risk marker |

Illustrative only: The example rules above are sample policy patterns for design exploration. Actual thresholds, lookback periods, and product applicability must be defined by approved credit policy.

## 9.6 Step 2: External Risk Assessment

If the case passes internal hard-rule screening, the next step evaluates external evidence. This broadens the risk view to include obligations, adverse history, and identity-related concerns outside the current institution.

▸ Purpose
- To determine whether the customer presents unacceptable risk based on bureau records and trusted third-party evidence.

▸ What this step commonly reviews
- Credit bureau repayment history
- Current external obligations and utilization
- Default, bankruptcy, or severe delinquency indicators where permitted
- Recent inquiry volume and overextension signs
- Public adverse records where policy allows use
- Identity confidence, match quality, and inconsistency outcomes
- Third-party trust or anomaly signals relevant to risk assessment

▸ Typical smaller steps
- Request or retrieve evidence: Obtain permitted bureau and third-party assessment outputs for the product and customer type.
- Validate freshness and match quality: Check that the data is recent, successfully matched, and complete enough for assessment use.
- Normalize external data: Transform bureau and third-party outputs into a structure usable by policy rules.
- Apply external hard rules: Test disqualifying external conditions.
- Produce external result: Reject the case or pass it forward to scoring with supporting reason information.

▸ Example external hard rejection rules

### Example external hard rejection rules

| Example Rule | Illustrative Condition | Assessment Rationale | Example Data Source | Example Decision Output |
|---|---|---|---|---|
| Recent default on external credit | Bureau shows any defaulted trade line within the last 12 months | Represents recent severe external repayment failure | Credit bureau tradeline file | Reject: recent external default |
| Severe delinquency on active obligations | Bureau shows 2 or more active obligations currently above 60 days past due | Indicates current repayment distress across other lenders | Credit bureau delinquency summary | Reject: active severe delinquency |
| Bankruptcy or legal insolvency marker | Permitted public or bureau source returns an unresolved insolvency-related adverse event | May be prohibited by policy for the product | Public records, bureau adverse event feed | Reject: unresolved insolvency marker |
| Excessive recent bureau inquiries | More than 10 credit inquiries recorded within the last 30 days | May indicate acute credit-seeking and overextension behavior | Credit bureau inquiry history | Reject or refer: excessive inquiries |
| Critical identity inconsistency | Third-party identity assessment returns a high-severity impersonation or mismatch outcome | Prevents continuation where customer identity confidence is unacceptable | Identity verification provider, document verification provider | Reject: critical identity mismatch |
| External fraud or confirmed misuse marker | Permitted external source returns an active confirmed fraud, synthetic identity, mule, or serious misuse marker | Indicates unacceptable trust and conduct risk where policy permits the signal to be used | Fraud consortium, identity network, bureau fraud alert | Reject: external fraud marker |
| Deceased or invalid identity record | Authoritative or permitted third-party source indicates the identity belongs to a deceased person, cancelled ID, or invalid document | Prevents continuation where the applicant identity cannot be accepted as valid | Government identity check, document verification, identity provider | Reject: invalid identity status |
| Age eligibility mismatch | External identity source or bureau date of birth indicates the applicant is below minimum product age or exceeds maximum age-at-maturity policy | Ensures legal and product eligibility is not contradicted by trusted external evidence | Identity provider, bureau identity segment, document verification | Reject: age eligibility not met |
| Citizenship or residency not eligible | Third-party verification indicates the applicant does not hold an eligible citizenship, permanent residency, visa, or right-to-reside status required by product policy | Controls legal eligibility, enforceability, and repayment continuity risks | Immigration verification, KYC provider, identity verification provider | Reject: citizenship or residency not eligible |
| Area or serviceability mismatch | External address verification places the customer outside approved serviceable areas or in a restricted location | Prevents lending where operational servicing, collections, or legal support is outside approved coverage | Address verification provider, bureau address history, geocoding service | Reject: area not eligible |
| Material address inconsistency | Declared address materially conflicts with bureau, utility, or identity-provider address evidence and cannot be reconciled | May indicate identity, stability, serviceability, or misrepresentation risk | Bureau address file, utility data, identity provider, proof-of-address verification | Reject or refer: address inconsistency |
| Employment verification failed | External employment verification cannot confirm declared employer, employment status, or active employment where policy requires verification | Prevents reliance on unverified income stability and employment information | Payroll provider, employer database, tax or social insurance record, employment verification vendor | Reject or refer: employment not verified |
| Ineligible employment status | Third-party source confirms the applicant is unemployed, inactive, on unpaid leave, or otherwise outside accepted employment statuses | Indicates the applicant may not meet product income stability requirements | Payroll provider, employer confirmation, government employment record | Reject: employment status not eligible |
| Prohibited occupation or industry | External employer, industry, or occupation verification maps the applicant to a prohibited occupation or industry category | Excludes customer profiles outside policy risk appetite or regulatory allowance | Employer registry, industry classification data, third-party employment verification | Reject: prohibited occupation or industry |
| High external debt burden | External obligations imply debt service ratio exceeds the maximum permitted threshold before including the requested facility | Indicates limited repayment capacity and elevated affordability risk | Credit bureau obligations, open banking, debt registry | Reject: external debt burden too high |
| Excessive revolving utilization | Bureau shows revolving credit utilization above 95% across active limits for the last 2 reporting cycles | Suggests liquidity pressure and dependence on available credit | Credit bureau revolving utilization data | Reject or refer: excessive utilization |
| Recent external restructuring or hardship | Bureau or lender-contributed data shows a repayment restructure, hardship arrangement, or forbearance status within the last 6 months | May indicate unresolved repayment stress even if accounts are not currently defaulted | Credit bureau special status codes, hardship flags | Reject or refer: recent hardship marker |
| Legal judgment or enforcement action | Permitted public record shows an unresolved credit-related court judgment, enforcement action, garnishment, or similar adverse legal event | Indicates heightened repayment, legal, or recovery risk | Public records, court registry, bureau public adverse file | Reject: unresolved legal adverse event |
| Watchlist or sanctions hit | Screening returns a confirmed sanctions, watchlist, or legally prohibited match under applicable rules | Prevents continuation where regulatory controls prohibit or restrict the relationship | Sanctions screening provider, AML/KYC screening platform | Reject: confirmed restricted-party match |
| Unable to retrieve mandatory bureau file | Required bureau check fails, returns no usable file, or cannot be matched with sufficient confidence and policy requires a usable bureau result | Stops assessment where mandatory external evidence is unavailable or not reliable enough for decisioning | Credit bureau retrieval response, match-quality output | Reject or refer: mandatory external evidence unavailable |

Design principle: External hard rules should be limited to conditions that are serious enough to justify immediate disqualification without needing the balancing effect of a total score.

## 9.7 Step 3: Scoring

If the case passes both internal and external hard-rule screening, the lifecycle moves to scoring. This step measures the applicant’s risk profile numerically using a structured set of factors. In this example design, the score runs from 0 to 1000, and the application is rejected if the final score is below 500.

▸ Purpose
- To create a repeatable and explainable numeric assessment of risk using multiple attributes rather than a single disqualifying condition.

▸ Typical smaller steps
- Select the right score logic: Choose the approved scorecard, segmentation, and model version for the product and applicant profile.
- Prepare scoring attributes: Convert validated internal and external inputs into variables required by the score logic.
- Calculate factor contributions: Assign points or weighted values to each factor according to policy.
- Produce total score: Aggregate all factor contributions into a final result between 0 and 1000.
- Apply score cut-off: Reject if the score is below 500; otherwise continue to grading.
- Record reasons and versioning: Store score factors, major drivers, and scorecard version for traceability.

▸ Example score factor table

### Example score factor table

| Score Component | Customer Factor / Attribute | Condition Observed | Points | Reason Code / Interpretation |
|---|---|---|---|---|
| Internal repayment history | No internal arrears history | No missed or late internal repayments in the last 24 months | 120 | Strong internal repayment conduct |
| Minor historical late payment | 1-2 payments up to 30 days past due in the last 24 months, now cured | 80 | Mostly acceptable internal conduct with minor weakness |  |
| Repeated internal late payment | 3 or more late payments up to 30 days past due in the last 24 months | 35 | Weak internal repayment discipline |  |
| Recent internal arrears, not hard-rejected | Any internal account recently past due but below the hard-rule rejection threshold | 0 | Material internal repayment weakness |  |
| External credit performance | Clean external credit file | No external delinquency, default, restructure, or adverse bureau marker in the last 24 months | 140 | Strong external credit performance |
| Minor cured external delinquency | 1-2 external payments up to 30 days past due, cured and not recent | 90 | Acceptable bureau behavior with limited weakness |  |
| Moderate external delinquency pattern | Several late payments or 1 event above 30 days past due, but below hard-rule threshold | 40 | Elevated external repayment risk |  |
| Thin or no bureau file | No material negative external record, but limited bureau history available | 55 | Limited external evidence; neutral-to-weak contribution |  |
| Debt burden and utilization | Low debt service ratio | Total debt service ratio after requested facility is below 25% | 110 | Strong repayment capacity buffer |
| Moderate debt service ratio | Total debt service ratio after requested facility is 25%-40% | 75 | Acceptable repayment capacity |  |
| High debt service ratio | Total debt service ratio after requested facility is above 40% but below hard-rule maximum | 25 | Limited repayment capacity buffer |  |
| Low revolving utilization | External and internal revolving utilization is below 40% | 70 | Controlled credit usage |  |
| Moderate revolving utilization | External and internal revolving utilization is 40%-75% | 45 | Normal but watchlisted credit usage |  |
| High revolving utilization | External and internal revolving utilization is above 75% but below hard-rule level | 10 | Potential liquidity pressure |  |
| Income and employment stability | Stable salaried employment | Verified salaried employment with current employer tenure of 24 months or more | 85 | Strong income stability |
| Moderate salaried employment tenure | Verified salaried employment with current employer tenure of 6-23 months | 55 | Acceptable income stability |  |
| Short but eligible employment tenure | Verified employment tenure is above minimum eligibility but below 6 months | 20 | Limited employment track record |  |
| Stable self-employment or business income | Verified self-employment or business operation for 24 months or more with consistent income evidence | 70 | Acceptable self-employed stability |  |
| Relationship stability | Long stable relationship | Customer relationship tenure is 36 months or more with consistent account conduct | 60 | Strong relationship evidence |
| Moderate relationship tenure | Customer relationship tenure is 12-35 months with no material conduct concerns | 40 | Acceptable relationship evidence |  |
| New relationship | Customer relationship tenure is below 12 months, but no adverse internal conduct exists | 15 | Limited internal relationship evidence |  |
| Application and profile consistency | High data consistency | Declared information is consistent across application, KYC, internal systems, bureau, and third-party checks | 65 | High confidence in customer profile |
| Minor explainable mismatch | Small mismatch exists, such as address formatting or employer name variation, and is resolved | 40 | Acceptable profile consistency |  |
| Unresolved non-critical mismatch | Mismatch remains unresolved but is below hard-rule severity | 10 | Reduced confidence in declared profile |  |
| Inquiry and credit-seeking behavior | Low recent inquiry activity | 0-2 credit inquiries in the last 90 days | 45 | Normal credit-seeking behavior |
| Moderate recent inquiry activity | 3-5 credit inquiries in the last 90 days | 25 | Some increase in credit demand |  |
| High recent inquiry activity | 6 or more credit inquiries in the last 90 days, but below external hard-rule threshold | 5 | Elevated credit-seeking behavior |  |
| Eligibility and demographic stability | Prime eligible age band | Applicant age is within the preferred policy band, for example 25-55 at application and within maturity rules | 35 | Preferred lifecycle eligibility profile |
| Edge eligible age band | Applicant is eligible but close to minimum age or maximum age-at-maturity limit | 15 | Eligible but less favorable age profile |  |
| Stable serviceable area | Applicant has a verified residential address in an approved serviceable area for 12 months or more | 30 | Stable and serviceable location |  |
| Recent address move | Applicant is in an approved serviceable area but has lived at the current address for less than 12 months | 10 | Limited address stability |  |
| Occupation risk profile | Low-volatility occupation | Verified occupation is in an accepted low-volatility occupation category | 40 | Lower expected income volatility |
| Moderate-volatility occupation | Verified occupation is accepted but has moderate income variability | 25 | Normal occupation risk |  |
| High-volatility but eligible occupation | Verified occupation is eligible but associated with high or seasonal income variability | 5 | Higher income stability risk |  |
| Score total | Maximum possible score | Sum of applicable best-case factor points | 1000 | Final score is capped at 1000 and compared against the 500 cut-off |

An implementation may use hundreds of underlying variables, but the business view should still remain understandable. Reason information should show which major factors most improved or weakened the final score.

Example assessment rule: If final score is 500 or above, the case passes scoring and proceeds to grading. If final score is 499 or below, the case fails score cut-off and exits the assessment flow.

▸ Example simplified score interpretation
- A customer with: Strong internal repayment performance; Clean external credit history; Moderate obligations; Stable behavior. May score well above 700.
- A customer with: Mixed repayment history; Rising utilization; Several recent bureau inquiries. May still pass, but land closer to the 500-600 range.
- A customer with: Broadly weak factors; But no single hard-rule breach. May still be rejected if the overall score falls below the 500 threshold.

## 9.8 Step 4: Grading

Once a case passes the score cut-off, the final step converts the numeric score into a grade. This makes the assessment easier for business and downstream systems to consume consistently.

▸ Purpose
To provide a simple, standardized classification that summarizes the quality of a passing risk profile.

▸ Typical smaller steps
- Confirm eligibility: Ensure the case passed internal screening, external screening, and the score cut-off.
- Map score to grade band: Apply the approved score-to-grade range table.
- Attach supporting details: Record final score, grade, scorecard version, and key drivers.
- Publish assessment output: Make the result available to permitted downstream users and systems.

▸ Illustrative grade ranges

### Illustrative grade ranges

| Grade | Example Score Range | General Meaning |
|---|---|---|
| Platinum | 850-1000 | Very strong assessed risk profile relative to policy bands |
| Gold | 700-849 | Strong assessed risk profile with limited concern indicators |
| Silver | 600-699 | Acceptable assessed risk profile within normal policy tolerance |
| Bronze | 500-599 | Lowest passing band; acceptable but closer to policy threshold |

Any score below 500 does not receive a grade because it fails the minimum score cut-off.

A grade is not a replacement for the score. It is a simplified classification derived from the score so downstream processes can apply consistent treatment more easily.

## 9.9 Controls and Design Considerations

- Approved sources only: Internal and external inputs should come only from policy-approved data providers and systems.
- Freshness and completeness checks: Rules and scores should not run on stale, partial, or mismatched evidence.
- Segmentation discipline: The correct scorecard and rules must be selected for the product, applicant type, and customer segment.
- Traceability: Store timestamps, rule names, scorecard versions, factor outputs, and reasons to support review and audit.
- Reassessment: Re-run the lifecycle when material information changes, such as corrected customer data or newly received external evidence.

## 9.10 Example End-to-End Outcomes

| Example Outcome | Where the Case Stops or Passes | Illustrative Result | Status |
|---|---|---|---|
| Internal hard-rule rejection | Step 1 | Recent internal write-off detected | REJECTED |
| External hard-rule rejection | Step 2 | Recent external default found on bureau file | REJECTED |
| Score cut-off rejection | Step 3 | Final score = 462 | REJECTED |
| Low-pass graded case | Step 4 | Final score = 545, Grade = Bronze | PASSED |
| Strong graded case | Step 4 | Final score = 902, Grade = Platinum | PASSED |

## 9.11 Key Business Concepts

| Concept | Definition |
|---|---|
| Internal Hard Rule | A policy-defined internal condition that independently disqualifies the application before scoring |
| External Hard Rule | A policy-defined external condition that independently disqualifies the application before scoring |
| Risk Score | A numeric assessment result between 0 and 1000 representing the overall risk profile |
| Score Cut-off | The minimum score required to continue; in this example, the cut-off is 500 |
| Risk Grade | A business-friendly classification assigned to passing scores |
| Reason Information | The recorded explanation of why a rule, score, or grade outcome was produced |

FAQ: Does a failed hard rule still need a score?

No. Hard rules are designed to stop a case immediately when a policy-prohibited condition is present. Scoring is only applied to cases that pass the internal and external hard-rule gates.

FAQ: Can two customers have the same grade but different scores?

Yes. A grade is a band, not an exact number. Two customers can both be graded Gold, for example, even if one scores 705 and another scores 820.

FAQ: Should grade ranges be identical across all products?

Not necessarily. The example ranges on this page are illustrative. In practice, grade mapping may vary by product, segment, or scorecard design if approved by policy.

---

[← Digital Lending Onboarding](README.md) · [Previous: Risk Assessment](08-risk-assessment.md) · [Next: Offer & Agreement](10-offer-agreement.md)
