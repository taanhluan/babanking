# 4. Credit Assessment

> Digital Lending Onboarding — module 4 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Previous: Eligibility Check](03-eligibility-check.md) · [Next: Income & Affordability](05-income-affordability.md)

## Contents

- [4.1 Business Definition](#41-business-definition)
- [4.2 Business Responsibilities](#42-business-responsibilities)
- [4.3 Relationship with Other Domains](#43-relationship-with-other-domains)
- [4.4 Business Purpose](#44-business-purpose)
- [4.5 Assessment Stages](#45-assessment-stages)
- [4.6 Typical Assessment Outcomes](#46-typical-assessment-outcomes)
- [4.7 Overview: Obtaining and Interpreting Credit Information](#47-overview-obtaining-and-interpreting-credit-information)
- [4.8 Common Credit Data Obtained](#48-common-credit-data-obtained)
- [4.9 Retrieval Methods](#49-retrieval-methods)
- [4.10 Business Rules](#410-business-rules)
- [4.11 Overview: How Credit Assessment Is Used for Decision Making and Risk Input](#411-overview-how-credit-assessment-is-used-for-decision-making-and-risk-input)
- [4.12 Decision Uses](#412-decision-uses)
- [4.13 Typical Decision Logic Patterns](#413-typical-decision-logic-patterns)
- [4.14 Example Scenarios](#414-example-scenarios)
- [4.15 Key Business Concepts](#415-key-business-concepts)

## 4.1 Business Definition

The Credit Assessment Domain manages the business capability that retrieves the customer's external credit record and turns it into a structured, dated, and sourced credit picture for downstream lending use.

In a digital lending journey, this domain:
- Confirms that a valid consent to enquire exists before any enquiry is made;
- Requests the credit bureau enquiry and manages its asynchronous response;
- Confirms that the record returned belongs to the applicant;
- Obtains the credit report and the bureau score, with the scale, model version, and reference date that make the score usable;
- Extracts existing loan and facility information, including balances, limits, and repayment commitments;
- Extracts repayment behaviour, including adverse entries and clean repayment history;
- Classifies what was found against a maintained interpretation rule set;
- And reconciles the record against the obligations the customer declared earlier in the journey.

The domain helps the bank to determine what does the external credit record show about how this customer has handled borrowing?

Credit Assessment does not itself:
- Capture identity, or obtain the consent the enquiry relies on;
- Verify income, or calculate affordability and debt-to-income;
- Produce the bank's internal risk score, fraud assessment, or risk grade;
- Select, configure, or price the lending product;
- Make the final lending decision, or issue the offer;
- Or monitor the customer's credit record after the loan is live.

Those activities are owned by the Registration & Onboarding, Income & Affordability, Risk Assessment, Loan Product & Simulation, Decision Engine, Offer & Agreement, and loan servicing domains.

Instead, this domain produces the structured credit picture - facts, sources, dates, and classifications - that those domains interpret and act on.

## 4.2 Business Responsibilities

| Responsibility | Description |
|---|---|
| Confirm Enquiry Permission | Verify that a valid, in-scope consent to check credit history exists before an enquiry is made, and record the consent reference against the enquiry. |
| Request the Credit Bureau Enquiry | Submit the enquiry with a defined purpose and the minimum identifying information required, and manage its asynchronous response. |
| Match the Record to the Applicant | Confirm that the record returned relates to the applicant, and route uncertain matches for review before any information is extracted. |
| Obtain the Credit Report | Retrieve the detailed credit file, including facilities held, entry dates, holding institutions, and recorded statuses. |
| Obtain and Qualify the Credit Score | Retrieve the bureau score together with: Its scale; The model version that produced it; Its reference date. Without which the value cannot be compared or reused. |
| Extract Existing Loan Information | Record the customer's existing facilities, including: Outstanding balances; Available limits; Contractual repayment per period; Remaining term; Secured or unsecured status. |
| Extract Repayment Behaviour | Record how existing and closed facilities were repaid, including: Late payments and arrears; Defaults, write-offs, and restructures; Cure status and cure dates; Clean repayment history. |
| Classify Credit Information | Apply a maintained interpretation rule set to determine how each entry is read, including severity, currency, and whether it falls within the applicable look-back period. |
| Reconcile Declared and Recorded Obligations | Compare the obligations the customer declared with those the record shows, and retain both values together with the difference. |
| Assemble the Internal Position | Include facilities the customer already holds with the bank, ensuring they are counted once rather than duplicated against the bureau record. |
| Handle Limited or Absent Records | Distinguish an identification problem from a genuine absence of credit history, and route the latter to an alternative evidence path. |
| Handle Unavailable Bureau Service | Manage retry, hold, and referral where an enquiry could not be completed, so that unavailability is treated as an unresolved state. |
| Support Dispute Handling | Record customer disputes over a specific entry, flag the assessment accordingly, and re-enquire once the bureau has updated the record. |
| Manage Validity and Re-enquiry | Apply a validity period to the assessment, and manage refresh where it expires or where the requested terms change materially. |
| Maintain Auditability | Retain the enquiry record, consent reference, purpose, response status, matching outcome, interpretation rule version, and assessment history. |

## 4.3 Relationship with Other Domains

The Credit Assessment Domain sits between policy eligibility and the assessment domains that follow. It receives a permitted application and a recorded consent, obtains and interprets the external credit record, and provides a structured credit picture for affordability, risk, and decisioning use.

| Business Domain | Relationship | What Is Exchanged |
|---|---|---|
| Registration & Onboarding | Receives the enquiry permission | Credit bureau consent reference; Consent scope, version, and timestamp; Consent validity status. Refer to 1. Registration & Onboarding for detailed handling of this step. |
| Eligibility Check | Receives the permitted application | Applications meeting the bank's own policy criteria; Rule set version applied; Any recorded policy exception. Refer to 3. Eligibility Check for detailed handling of this step. |
| Profile & Information Collection | Receives declared obligations | Customer-stated existing borrowing and commitments; Declared income context used in reconciliation. Refer to 2. Profile & Information Collection for detailed handling of this step. |
| Credit Bureau Services | Consumes external credit information | Credit report; Credit score with scale, model version, and date; Existing facilities and balances; Repayment history and adverse entries; Search history. |
| Customer Data / Core Banking | Receives internally held positions | Facilities the customer holds with the bank; Internal repayment behaviour; Relationship context used where external history is limited. |
| Income & Affordability | Provides commitment data | Contractual repayments per period; Existing obligations; Obligations flagged for consolidation; Declared-versus-recorded differences. Refer to 5. Income & Affordability for detailed handling of this step. |
| Risk Assessment | Primary consumer of the credit picture | Exposure, facility structure, and utilisation; Classified repayment behaviour; Limited-record and dispute states; Search history and obligation variance; Assessment validity period. This is the route by which credit information reaches decisioning. Refer to 8. Risk Assessment for detailed handling of this step. |
| Loan Product & Simulation | Provides existing obligation context | Facilities to be repaid or consolidated; Existing commitments relevant to product and term shaping. Refer to 6. Loan Product & Simulation for detailed handling of this step. |
| Document Upload | Indicates evidence needs | Alternative evidence requirements where credit history is limited; Evidence relating to a disputed entry. Refer to 7. Document Upload for detailed handling of this step. |
| Retail Lending Decision Engine | Indirect consumer | Receives the credit picture through 8. Risk Assessment , as part of the hard-rule result, score, grade, and supporting reasons. This domain does not feed decisioning directly. Refer to 9. Decision Engine for detailed handling of this step. |
| Employee Portal / Review Workflow | Supports manual handling | Uncertain matches; Unresolved enquiries; Dispute cases; Requests for a further enquiry. |
| Compliance and Data Protection | Provides the search record | Enquiry register with consent references and purposes; Access records for retrieved credit reports. |
| Notification Services | Triggers customer communication | Status updates while an enquiry is outstanding, and requests for alternative evidence where credit history is limited. |

## 4.4 Business Purpose

The purpose of the Credit Assessment Domain is to establish an evidenced view of the customer's borrowing history, obtained lawfully and interpreted consistently, before risk grading and lending decisions are made.

This domain serves five core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Evidence-Based Assessment | Replaces customer declaration with an independent record of existing borrowing and repayment history. → Allowing later decisions to rest on evidence rather than statement. |
| Consent and Regulatory Control | Ensures every enquiry is made under a valid, recorded permission and for an approved purpose. → Keeping the search lawful, auditable, and limited to its purpose. |
| Consistent Interpretation | Applies the same reading rules to comparable records across applications. → Reducing variation in how the same history is treated. |
| Enquiry Cost and Customer Impact Control | Limits enquiries to those the application requires, since each carries a cost and is visible on the customer's own record. → Avoiding unnecessary searches and repeated footprints. |
| Operational Efficiency | Automates retrieval, extraction, and classification for straightforward records, and routes only unmatched, incomplete, or disputed cases for manual handling. |

## 4.5 Assessment Stages

The credit assessment lifecycle describes how an external credit record is obtained, attributed, interpreted, and turned into a usable input for later lending steps.

| # | Stage | Description | Key Business Activity |
|---|---|---|---|
| 1 | Permission Confirmation | The consent to check credit history is confirmed as valid and in scope before anything else occurs. | The consent reference is checked and bound to the enquiry, and the application is returned for consent where none is valid. |
| 2 | Internal Position Assembly | Facilities the customer already holds with the bank are assembled. | Internal facilities, balances, and repayment behaviour are retrieved so that they can be reconciled rather than duplicated. |
| 3 | Bureau Enquiry and Record Matching | The enquiry is submitted and the returned record is attributed to the applicant. | The request is queued and despatched with a defined purpose, and the returned record is matched before extraction begins. |
| 4 | Credit Information Extraction | Score, facilities, and repayment history are extracted from the returned record. | The score is captured with its scale, model version, and date, and facilities and behaviour are structured for downstream use. |
| 5 | Classification and Reconciliation | Extracted information is interpreted, and compared with what the customer declared. | Entries are classified against the maintained rule set, and declared and recorded obligations are reconciled with the difference retained. |
| 6 | Assessment Consumption | The assembled credit picture is passed into the wider lending process. | Affordability, risk grading, product shaping, and decisioning activities are triggered based on the picture and its validity. |

## 4.6 Typical Assessment Outcomes

The assessment does not by itself approve or decline a loan, and the presence of adverse information does not change the outcome category. It produces one of several assessment states that determine whether, and how, the picture can be used downstream.

| Outcome | Category | Description |
|---|---|---|
| Complete Credit Picture | USABLE | A record was obtained, matched, and fully extracted. Score, facilities, and repayment behaviour are available for downstream use. |
| Partial Credit Picture | REVIEW | A record was returned but could not be fully attributed or extracted, and requires review before it is relied upon. |
| Limited Credit History | LIMITED | The customer has little or no external borrowing history. Assessment continues through alternative evidence rather than being treated as adverse. |
| Disputed Information Present | FLAGGED | The customer has contested a specific entry. The picture is usable but carries the dispute state until the bureau resolves it. |
| Pending Bureau Response | WAITING | The enquiry has not returned, or could not be completed, and is subject to retry or hold. |
| Refer for Manual Review | REFERRED | The record, the match, or the classification is not suitable for straight-through handling and requires human assessment. |

## 4.7 Overview: Obtaining and Interpreting Credit Information

In digital lending, the credit enquiry is usually made once the application has passed the bank's own policy criteria, since the enquiry carries a fee and appears as a search on the customer's own credit record. Journeys commonly treat the enquiry as asynchronous, so the customer is not held waiting for an external response, and each channel defines how long it will wait before continuing another way.

Interpretation is typically held as a maintained rule set rather than embedded in individual journey builds, so that what counts as adverse, how severity is graded, and how far back entries are read can be changed and evidenced under policy control. The version applied is retained with the assessment so that the reading can be reconstructed later.

## 4.8 Common Credit Data Obtained

| Data Category | Typical Information Obtained |
|---|---|
| Record Identity Information | Name and identifiers held on the record; Date of birth; Addresses recorded; Match confidence against the applicant. |
| Credit Score | Score value; Score scale; Model version; Reference date. |
| Existing Facilities | Facility type such as term loan, card, overdraft, or mortgage; Holding institution; Outstanding balance; Available limit; Secured or unsecured status. |
| Facility Terms and Commitments | Contractual repayment per period; Original amount and start date; Remaining term; Currency; Current status. |
| Repayment Behaviour | Payments made as agreed; Length of clean history; Late payments and arrears; Facilities settled and closed. |
| Adverse Entries | Entry type such as default, write-off, restructure, or enforcement; Date of occurrence; Cure status and cure date; Amount involved. |
| Search History | Recent enquiries by other institutions; Enquiry dates and purposes where reported. |
| Public and Registry Information | Insolvency and similar registry entries carried by the bureau. |
| Internally Held Positions | Facilities held with the bank; Internal balances and commitments; Internal repayment behaviour. |

## 4.9 Retrieval Methods

- Bureau enquiry under recorded consent: The primary method. The enquiry is submitted with a defined purpose and the consent reference captured during onboarding.
- Asynchronous request handling: Enquiries are typically queued and processed independently of the customer session, with the journey continuing once a response is received.
- Scoped enquiry types: Some products retrieve a full credit file, while others retrieve a score only or an obligations extract, depending on the depth of evidence the product requires.
- Internal record retrieval: Facilities and repayment behaviour held by the bank are retrieved directly, without cost and without appearing as an external search.
- Re-enquiry under a defined purpose: A further enquiry may be made where the assessment has expired, the requested terms have changed materially, or a disputed entry has been updated.
- Manual review of returned records: Uncertain matches, incomplete extractions, and unusual histories are examined by authorised staff, whose conclusion is recorded against the assessment.

## 4.10 Business Rules

- No enquiry is made without a valid recorded consent: The consent reference is confirmed immediately before the enquiry and stored with it, and an application without valid consent does not proceed to enquiry.
- Every enquiry carries a defined purpose: Purposes are limited to those approved for the journey, such as application assessment, expiry refresh, material change, or dispute resolution.
- Enquiries are limited to those the application requires: A further enquiry on the same application is made only where authorised, with the reason recorded, since each enquiry carries a cost and a visible footprint.
- Only the information the enquiry requires is disclosed: Identifying information sent to the bureau is limited to what the check needs.
- The record is matched before information is extracted: Extraction does not begin until the returned record has been attributed to the applicant with sufficient confidence.
- A score is used only with its scale, model version, and date: A score value without these attributes cannot be banded, compared, or reused.
- Internally held facilities are counted once: Facilities appearing in both the bureau record and internal systems are reconciled rather than aggregated twice.
- Declared and recorded obligations are both retained: The customer's declaration is not replaced by the record, and the difference between them is kept for downstream use.
- Adverse entries are read with their date and cure status: An entry without its occurrence date, cure status, and amount cannot be classified consistently.
- Absence of history is distinguished from adverse history: A limited or absent record is recorded as such, and is handled through an alternative evidence path.
- The interpretation rule version in force is bound to the assessment: The version applied is retained so the reading can be reconstructed, and changes take effect forward only.
- Unavailable bureau service is not an adverse outcome: Where an enquiry could not be completed, the case is retried, held, or referred rather than treated as a negative result.
- The bank does not amend the credit record: Disputes are recorded, flagged, and directed to the bureau, which owns the data.
- The assessment has a validity period: Beyond it, the picture is refreshed by a further enquiry or accepted as aged under a recorded authorisation.

## 4.11 Overview: How Credit Assessment Is Used for Decision Making and Risk Input

Once assembled, the credit picture becomes one of the primary evidenced inputs into lending decisioning. It supplies the existing commitment figures affordability depends on, the borrowing history risk grading interprets, and the reasoned basis for stopping or referring applications where the record does not support the requested borrowing.

## 4.12 Decision Uses

| Decision Use | How the Assessment Is Used |
|---|---|
| Commitment Supply | Provides the existing repayment commitments used in affordability and debt-burden calculation. |
| Exposure Assessment | Provides current and available exposure, facility count, and utilisation for risk evaluation. |
| Repayment History Input | Provides classified repayment behaviour, distinguishing current from historic and cured from open entries. |
| Declaration Comparison | Provides the difference between declared and recorded obligations, used as a data quality and risk signal. |
| Product and Term Shaping | Identifies obligations that would be repaid or consolidated by the new lending, informing product structure and amount. |
| Straight-Through Progression Support | Allows automated progression where the record is complete, matched, and free of unresolved conditions. |
| Referral Triggering | Routes unmatched records, unresolved enquiries, disputed entries, and unusual histories for manual assessment. |
| Alternative Evidence Triggering | Initiates a different evidence path where credit history is limited or absent. |
| Decline Support | Provides a reasoned, sourced basis where the recorded borrowing history does not support the requested lending. The picture supports that outcome through risk grading at 8. , which is where credit evidence enters decisioning; this domain does not itself decline or feed 9. directly. |

## 4.13 Typical Decision Logic Patterns

Although exact policy varies by bank and product, digital lending commonly uses credit assessment information in patterns such as:
- Proceed: The record is complete and matched, and its content is within the tolerance the product allows for straight-through handling.
- Refer: The match is uncertain, the classification is unusual, or the recorded history sits close to the limits of automated treatment.
- Alternative evidence path: Credit history is limited or absent, and assessment continues through income, internal relationship, or documentary evidence instead.
- Conditional path: The application may proceed once an outstanding enquiry completes, a disputed entry is resolved, or the requested amount or term is adjusted.
- Stop: The recorded borrowing history does not support the requested lending under policy, and the application does not continue in its current form.

Credit assessment is rarely a single score lookup in mature lending journeys. It is a sourced and dated picture of external borrowing history, in which the absence of a record, the presence of a cured historic entry, and the presence of a current one are treated as three different situations rather than one.

## 4.14 Example Scenarios

| Scenario | Assessment Outcome | Likely Decision Impact |
|---|---|---|
| Customer with several facilities, consistent repayment, and matching declarations | Complete Credit Picture | Supports straight-through progression to affordability and risk assessment. |
| Customer with a default settled several years ago and clean repayment since | Complete Credit Picture | Risk grading weighs a cured historic entry differently from a current one, based on its date and cure status. |
| Young customer with no prior borrowing and no bureau record | Limited Credit History | Assessment continues through alternative evidence, and the absence is not treated as adverse. |
| Identifiers returned no record, and a data entry error is subsequently found | Partial Credit Picture | The identifiers are corrected and a further enquiry is authorised before assessment continues. |
| Customer states an entry belongs to a relative with a similar name | Disputed Information Present | Application is flagged and paused pending bureau resolution, and the entry is neither ignored nor accepted. |
| Recorded obligations are materially higher than the customer declared | Complete Credit Picture | Affordability is calculated on the recorded position, and the variance is passed to risk assessment as a signal. |
| Bureau service is unavailable beyond the retry policy | Pending Bureau Response | Case is held and referred, and is not treated as a negative credit outcome. |

## 4.15 Key Business Concepts

| Concept | Definition |
|---|---|
| Credit Assessment | The obtaining and interpretation of a customer's external credit record for use in lending assessment. |
| Credit Picture | The structured output of this domain: facts, sources, dates, and classifications, without a lending conclusion attached. |
| Credit Bureau | The external organisation holding credit records, which supplies the report, score, and related services. |
| Credit Enquiry | A single request to a bureau, made under one consent and for one defined purpose. It carries a cost and appears on the customer's record. |
| Consent Reference | The pointer to the recorded permission to check credit history, confirmed before every enquiry. |
| Enquiry Purpose | The approved reason for which an enquiry is made, such as application assessment, expiry refresh, or dispute resolution. |
| Search Register | The record of every enquiry made, its purpose, and its consent reference, used for compliance oversight. |
| Record Matching | The confirmation that a returned credit record relates to the applicant, performed before any information is extracted. |
| Credit Report | The detailed credit file, including facilities held, dates, holding institutions, and recorded statuses. |
| Credit Score | The bureau's summary assessment of the customer, expressed on the bureau's scale and produced by a stated model version at a reference date. Distinct from the internal risk score and grade produced by 8. Risk Assessment , which are the bank's own assessment and combine this picture with income, fraud, and behavioural inputs. A bureau score is an input to that assessment, never a substitute for it. |
| Score Band | The bank's grouping of score values for internal use. Descriptive, and distinct from any decision threshold. |
| Existing Facility | A credit arrangement the customer already holds, whether externally recorded or internally held. |
| Contractual Repayment | The required repayment per period for an existing facility, used as the commitment figure in affordability assessment. |
| Repayment Behaviour | The recorded history of how existing and closed facilities were repaid. |
| Adverse Entry | A recorded failure to repay as agreed, carrying its type, occurrence date, cure status, and amount. |
| Cure Status | Whether an adverse entry remains open or has been resolved, and the date of resolution. |
| Look-Back Period | The period over which recorded entries are read for assessment purposes, defined by policy. |
| Interpretation Rule Set | The maintained and versioned rules determining how recorded credit information is classified. |
| Limited Credit History | A state in which the customer has little or no external borrowing record. An absence of information, distinct from adverse information. |
| Obligation Reconciliation | The comparison of declared and recorded obligations, in which both values and the difference are retained. |
| Disputed Entry | A recorded item the customer has contested with the bureau, flagged on the assessment until resolved. |
| Assessment Validity | The period during which the credit picture may be relied upon before refresh is required. |
| Re-enquiry | A further enquiry on the same application, made under an authorised purpose and recorded reason. |
| Credit Monitoring | Ongoing notification of changes to a credit record after lending is live. A servicing activity, outside this domain. |
| Outcome Category | The controlled token classifying an outcome in this page's 3.2 table. The full vocabulary is defined in 0. Conventions & Domain Register . |

---

[← Digital Lending Onboarding](README.md) · [Previous: Eligibility Check](03-eligibility-check.md) · [Next: Income & Affordability](05-income-affordability.md)
