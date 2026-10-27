# 2. Profile & Information Collection

> Digital Lending Onboarding — module 2 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Previous: Registration & Onboarding](01-registration-onboarding.md) · [Next: Eligibility Check](03-eligibility-check.md)

## Contents

- [2.1 Business Definition](#21-business-definition)
- [2.2 Business Responsibilities](#22-business-responsibilities)
- [2.3 Relationship with Other Domains](#23-relationship-with-other-domains)
- [2.4 Business Purpose](#24-business-purpose)
- [2.5 Collection Stages](#25-collection-stages)
- [2.6 Typical Collection Outcomes](#26-typical-collection-outcomes)
- [2.7 Overview: Collecting Profile Information](#27-overview-collecting-profile-information)
- [2.8 Common Data Collected](#28-common-data-collected)
- [2.9 Collection Methods](#29-collection-methods)
- [2.10 Business Rules](#210-business-rules)
- [2.11 Overview: How Profile & Information Collection Is Used for Decision Making and Downstream Assessment](#211-overview-how-profile--information-collection-is-used-for-decision-making-and-downstream-assessment)
- [2.12 Decision Uses](#212-decision-uses)
- [2.13 Typical Decision Logic Patterns](#213-typical-decision-logic-patterns)
- [2.14 Example Scenarios](#214-example-scenarios)
- [2.15 Key Business Concepts](#215-key-business-concepts)

## 2.1 Business Definition

The Profile & Information Collection Domain manages the business capability that collects, structures, and validates the customer-declared information a lending application depends on.

In a digital lending journey, this domain:
- Collects personal information not already established during onboarding;
- Captures employment context and declared income;
- Records declared expenses and existing financial obligations;
- Records address and contact details;
- Captures the bank account details used later for disbursement and repayment;
- Reuses information the bank already holds, presented for customer confirmation;
- And validates the collected information for completeness, format, and internal consistency before it is passed on.

The domain helps the bank to determine what does the customer say about themselves, and is that picture complete and coherent enough to assess?

Profile & Information Collection does not itself:
- Establish or verify identity;
- Confirm that a declared employer or employment is real;
- Prove or verify declared income;
- Assess repayment capacity, or re-request income evidence for assessment purposes;
- Retrieve credit history or existing external borrowing;
- Collect or validate supporting documents;
- Confirm that a declared bank account belongs to the customer;
- Or make the lending decision.

Those activities are owned by the Registration & Onboarding, Eligibility Check, Credit Assessment, Income & Affordability, Document Upload, Decision Engine, and Core Lending / Loan Origination domains.

Instead, this domain produces the structured declared profile that those domains verify, test, and decide upon.

Boundary with 5. Income & Affordability. Both domains handle income, employment, expense, and obligation information, and the split between them is by purpose, not by field:

| # | This domain | Income & Affordability. |
|---|---|---|
| Owns | First capture of the customer-declared values | Assessment of repayment capacity |
| Produces | A structured declared profile, recorded as declared | An affordability outcome with reason codes |
| May re-request | Missing or contradictory values, to complete the profile | Additional detail or evidence needed to assess |
| Does not | Evaluate whether the borrowing is supportable | Act as the first point of capture for a declared value |

There is one point of first capture, and it is here. Where assessment needs richer breakdown, better evidence, or a refreshed figure, 5. requests it under its own purpose, and the original declared value is retained alongside.

## 2.2 Business Responsibilities

| Responsibility | Description |
|---|---|
| Collect Personal Information | Capture personal details not already established during onboarding, such as: Marital status; Dependants; Education level; Residential status; Other profile attributes required by product policy. |
| Capture Employment Context | Record customer-declared employment details such as: Employment status; Employer name; Occupation or job title; Industry; Tenure; Contract type. |
| Capture Declared Income | Record the customer's stated income, including: Primary income source and amount; Secondary or supplementary income; Pay frequency; Regular versus variable composition. |
| Capture Declared Expenses and Obligations | Record stated: Living expenses; Existing loan and card commitments; Other recurring obligations. As declared by the customer, pending later confirmation. |
| Record Address Information | Capture: Residential address; Mailing address where different; Length of residence; Residence type. |
| Record Contact Details | Capture and confirm: Mobile number; Email address; Preferred contact channel and language. |
| Capture Bank Account Details | Record the account intended for disbursement and repayment, including account identifier, holding bank, and account type. |
| Reuse Known Customer Data | Pre-fill information already held for existing customers or carried in from campaign and partner context, presented to the customer for confirmation rather than assumed. |
| Validate Completeness | Check that the information required for the selected product and customer type is present before the profile may be submitted. |
| Validate Internal Consistency | Check that declared values are plausible and do not contradict one another or the identity established during onboarding. |
| Manage Progressive Capture | Support step-by-step collection, saving of partial progress, and resumption of an incomplete profile within a permitted window. |
| Maintain Change History | Record amendments made after submission, so that the earlier declared value and the revised value are both retained. |
| Maintain Auditability | Retain the declared values, their source, the point of capture, validation results, and the profile status history. |

## 2.3 Relationship with Other Domains

The Profile & Information Collection Domain sits between onboarding and lending assessment. It receives an established applicant, collects and structures what that applicant declares, and provides the assembled profile that downstream domains verify and evaluate.

| Business Domain | Relationship | What Is Exchanged |
|---|---|---|
| Registration & Onboarding | Receives the established applicant | Verified identity attributes; Customer type; Consent state; Declared borrowing intent and entry context. Refer to 1. Registration & Onboarding for detailed handling of this step. |
| Retail Lending Customer Portal | Receives captured inputs | Customer-declared profile data; Employment and income declarations; Address and contact details; Bank account details. |
| Customer Data / Core Banking | Reuses and updates profile data | Existing customer profile; Known employer and contact details; Held account information; Confirmed profile updates. |
| Employee Portal / Assisted Channel | Supports assisted capture | Staff-entered or corrected profile data; Assisted-channel capture context. |
| Partner and Merchant Channels | Provides pre-fill context | Pre-populated customer or loan details; Campaign or merchant context used to shorten capture. |
| Eligibility Check | Provides declared attributes | Age and residency attributes; Declared income figure; Declared employer and employment status. Refer to 3. Eligibility Check for detailed handling of this step. |
| Credit Assessment | Provides declared obligations | Customer-stated existing borrowing; Declared commitments used as the comparison point for bureau data. Refer to 4. Credit Assessment for detailed handling of this step. |
| Income & Affordability | Provides declared financial inputs for assessment | Declared income and its composition; Declared expenses; Declared obligations; Pay frequency and stability context. This domain performs first capture; 5. performs assessment and requests further detail or evidence under its own purpose. Refer to 5. Income & Affordability for detailed handling of this step. |
| Document Upload | Indicates evidence requirements | Declared income type and employment status used to determine which supporting documents are required. Refer to 7. Document Upload for detailed handling of this step. |
| Risk Assessment | Provides the declared baseline | Declared values retained for comparison against verified values; Unusual or accepted-with-exception entries. Refer to 8. Risk Assessment for detailed handling of this step. |
| Core Lending / Loan Origination | Provides account details | Declared disbursement and repayment account; Account holder details for later confirmation. |
| Notification Services | Triggers customer communication | Requests to complete missing profile sections, resumption reminders, and confirmation of submitted details. |

## 2.4 Business Purpose

The purpose of the Profile & Information Collection Domain is to assemble a complete, structured, and internally coherent declared profile, without asking for more than the lending decision requires.

This domain serves five core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Complete Application Picture | Ensures downstream assessment receives all the information the selected product requires. → Preventing assessment on a partial profile. |
| Structured and Comparable Data | Captures declarations in a consistent structure across channels and customer types. → Allowing later domains to verify and compare values reliably. |
| Reduced Customer Effort | Reuses known and already-established information rather than re-asking for it. → Improving completion rates without weakening the picture. |
| Early Detection of Inconsistency | Surfaces implausible or contradictory declarations at the point of capture. → Resolving them while the customer is present, rather than at assessment. |
| Operational Efficiency | Automates validation for straightforward profiles and routes only incomplete, unusual, or contradictory cases for follow-up. |

## 2.5 Collection Stages

The collection lifecycle describes how an established applicant is turned into a structured profile that later lending domains can assess.

| # | Stage | Description | Key Business Activity |
|---|---|---|---|
| 1 | Profile Initiation | The applicant established during onboarding is carried forward, and the required profile scope is determined. | Product, customer type, and channel are used to determine which sections and fields are required. |
| 2 | Known Data Reuse | Information the bank already holds is presented to the customer. | Existing profile, campaign, or partner data is pre-filled and offered for confirmation or correction. |
| 3 | Progressive Data Capture | The customer completes the remaining profile sections through the digital journey. | Structured forms collect personal, employment, income, expense, address, contact, and account information. |
| 4 | Validation | Captured information is checked before the profile may progress. | Completeness, format, and internal consistency checks are applied, and contradictions are raised for clarification. |
| 5 | Profile Assembly | Validated information is assembled into a structured applicant profile. | Declared values are recorded with their source and capture point, and the profile is marked ready for assessment. |
| 6 | Downstream Consumption | The assembled profile is passed into the wider lending journey. | Eligibility, credit, affordability, evidence, and setup activities are triggered based on the declared profile. |

## 2.6 Typical Collection Outcomes

Collection does not by itself approve or decline a loan. It produces one of several profile outcomes that determine whether, and how, assessment may proceed.

| Outcome | Category | Description |
|---|---|---|
| Complete | USABLE | All information required for the selected product and customer type is present, valid, and internally consistent. |
| Pending Additional Information | WAITING | Required sections or fields are missing, and the profile cannot be assessed until they are provided. |
| Requires Clarification | REVIEW | Declared values are present but implausible or contradictory, and the customer is asked to confirm or correct them. |
| Refer for Manual Review | REFERRED | The declared profile is unusual or not suitable for straight-through capture, such as complex employment or non-standard income patterns. |
| Abandoned or Expired | INCOMPLETE | The customer did not complete the profile, or the captured information has aged beyond its validity and requires refresh. |

## 2.7 Overview: Collecting Profile Information

In digital lending, profile information is usually collected progressively through the customer portal, section by section, immediately after onboarding has established who the customer is. The aim is to gather everything later assessment needs, while keeping the number of questions proportionate to the decision being made.

Collection design typically balances three needs: decision usefulness, customer effort, and data quality. An existing customer applying for a small top-up may need only to confirm what the bank already holds, while a new customer with self-employed or multi-source income requires a fuller declaration and more structured breakdown.

## 2.8 Common Data Collected

| Data Category | Typical Information Collected |
|---|---|
| Personal Information | Marital status; Number of dependants; Education level; Residential status; Other profile attributes required by product policy. |
| Employment Details | Employment status; Employer name; Occupation or job title; Industry; Tenure; Contract type; Pay frequency. |
| Declared Income | Primary income amount and source; Secondary income such as overtime, commission, rental, or freelance earnings; Regular versus variable composition; Income currency. |
| Declared Expenses and Obligations | Regular living expenses; Existing loan repayments; Credit card commitments; Other recurring obligations. |
| Address Information | Residential address; Mailing address where different; Length of residence; Residence type such as owned, rented, or family-owned. |
| Contact Details | Mobile number; Email address; Preferred contact channel; Preferred language. |
| Bank Account Details | Account identifier; Holding bank; Account type; Declared account holder name. |
| Requested Loan Context | Requested amount; Requested term; Loan purpose; New loan, top-up, or refinance indicator. |

## 2.9 Collection Methods

- Customer declaration through structured forms: The most common digital method. Customers enter profile, employment, income, and account information directly.
- Profile reuse for existing customers: Held identity, employer, contact, and account data may be pre-filled and confirmed rather than re-entered, where policy permits.
- Campaign and partner pre-population: Customer or loan details carried in from a campaign or merchant checkout may pre-fill parts of the profile before capture begins.
- Progressive disclosure: Additional sections are requested only where earlier answers make them relevant, such as secondary income detail or self-employment context.
- Integrated data retrieval: Some journeys retrieve held account details, salary crediting patterns, or known employment data from connected internal services.
- Assisted completion: Branch or relationship staff may capture or correct profile information on the customer's behalf in assisted channels.

## 2.10 Business Rules

- Required fields depend on product and customer type: The profile required for a small top-up to an existing customer differs from that required for a new customer's unsecured personal loan.
- Established information is not re-requested: Attributes already proven during onboarding are displayed for confirmation rather than asked for again.
- Pre-filled data must be confirmed by the customer: Information carried in from an existing profile, campaign, or partner is presented for confirmation and remains editable.
- Declared values are recorded as declared: Nothing captured here is treated as verified, and the declared value is retained even after a later domain establishes a different one.
- This domain is the single point of first capture: Income, employment, expense, and obligation values are declared here once. 5. Income & Affordability assesses them and may request additional breakdown, refreshed figures, or supporting evidence under its own purpose, but does not act as an alternative first capture point. The originally declared value is retained alongside anything 5. obtains.
- Internal contradictions must be resolved before submission: Values that conflict with each other or with established identity attributes are raised for clarification at the point of capture.
- Incomplete profiles do not progress: Assessment domains receive a complete profile for the selected product, or the application does not advance.
- Amendments after submission are tracked, not overwritten: Corrections are recorded as changes, preserving both the original and revised values.
- Profile information must remain current: Where an application remains pending beyond a defined period, declared information may require review or refresh before assessment continues.

## 2.11 Overview: How Profile & Information Collection Is Used for Decision Making and Downstream Assessment

Once assembled, the declared profile becomes the working input to every subsequent lending domain. It determines which assessments can run, what evidence is required, what each verification is compared against, and whether the application is complete enough to proceed at all.

## 2.12 Decision Uses

| Decision Use | How the Profile Is Used |
|---|---|
| Assessment Readiness | Confirms the application holds everything required for the selected product before assessment begins. |
| Policy Attribute Supply | Provides the declared attributes that eligibility rules are applied to, such as income figure, employment status, and residency. |
| Verification Target | Establishes the declared values that later domains verify, such as employer, income, and account ownership. |
| Evidence Determination | Indicates which supporting documents are required, based on declared employment and income type. |
| Affordability Input | Supplies the declared income, expense, and obligation figures used in repayment capacity assessment. |
| Comparison Baseline | Retains declared values so that any difference between what was stated and what is later found can be identified and used. |
| Referral Triggering | Routes unusual, contradictory, or non-standard declared profiles for manual handling. |
| Conditional Progression | Supports outcomes that depend on missing sections being completed or contradictory values being clarified. |
| Customer Communication | Provides the confirmed contact details used for status updates, evidence requests, and offer delivery. |

## 2.13 Typical Decision Logic Patterns

Although exact policy varies by bank and product, digital lending commonly uses profile information in patterns such as:
- Pass: The profile is complete for the selected product, values are plausible, and no contradiction remains unresolved.
- Clarify: Declared values are present but implausible or inconsistent, and the customer is asked to confirm or correct before progressing.
- Conditional path: The application may proceed once missing sections are completed, or once a declared value is supported by evidence at a later stage.
- Stop: The profile cannot be completed for the selected product, or the customer does not provide the information the assessment requires.

Profile collection is rarely just a form in mature lending journeys. It is the declared baseline against which every later verification is measured, and the difference between what was stated and what is later found is itself a usable signal.

## 2.14 Example Scenarios

| Scenario | Collection Outcome | Likely Decision Impact |
|---|---|---|
| Existing customer requesting a top-up confirms held employer, income, and account details | Complete | Supports straight-through progression with minimal additional capture. |
| Salaried customer completes all required sections with plausible, consistent values | Complete | Profile passes to eligibility and credit assessment without follow-up. |
| Customer declares twenty years of employment tenure inconsistent with their date of birth | Requires Clarification | Customer is asked to correct the value before the profile may be submitted. |
| Self-employed customer declares variable multi-source income | Refer for Manual Review | Requires structured breakdown and richer evidence at the document and affordability stages. |
| Customer completes personal and employment sections but leaves account details empty | Pending Additional Information | Assessment may begin, but disbursement setup cannot be prepared until provided. |
| Customer starts the profile and does not return within the permitted window | Abandoned or Expired | Captured information may require review or refresh before the journey resumes. |

## 2.15 Key Business Concepts

| Concept | Definition |
|---|---|
| Applicant Profile | The structured set of information the customer declares about themselves for the purposes of a lending application. |
| Declared Information | Information provided directly by the customer, recorded as stated and not verified within this domain. |
| First Capture | The initial recording of a customer-declared value. Owned by this domain only, and distinct from the re-collection or refinement 5. Income & Affordability performs for assessment purposes. |
| Outcome Category | The controlled token classifying an outcome in this page's 3.2 table. The full vocabulary is defined in 0. Conventions & Domain Register . |
| Established Information | Information already proven during onboarding, displayed for confirmation rather than re-requested. |
| Held Information | Information the bank already holds about an existing customer, offered as pre-filled values for confirmation. |
| Progressive Capture | The collection of profile information step by step across the journey, with partial progress saved. |
| Pre-fill | The population of profile fields from held, campaign, or partner data before the customer begins entry. |
| Primary Income | The main recurring income source the customer declares, such as salary or core business income. |
| Secondary Income | Additional declared income such as overtime, commission, rental, or freelance earnings. |
| Declared Obligations | The customer's stated existing borrowing and recurring commitments, pending confirmation by credit assessment. |
| Completeness | The state in which every field required for the selected product and customer type has been provided. |
| Internal Consistency | The state in which declared values are plausible and do not contradict each other or established identity attributes. |
| Clarification | A request to the customer to confirm or correct a declared value that appears implausible or contradictory. |
| Comparison Baseline | The retained declared value against which a later verified value is compared. |
| Declared-versus-Verified Difference | The gap between what the customer stated and what a later domain established, retained as an assessment signal. |
| Change History | The record of amendments made to declared values after submission, preserving both original and revised entries. |
| Profile Assembly | The point at which validated declared information is structured and marked ready for downstream assessment. |
| Resumption | The continuation of an incomplete profile within a permitted window, without restarting collection. |
| Refresh | The review or re-collection of declared information that has aged beyond its validity while the application remained pending. |

---

[← Digital Lending Onboarding](README.md) · [Previous: Registration & Onboarding](01-registration-onboarding.md) · [Next: Eligibility Check](03-eligibility-check.md)
