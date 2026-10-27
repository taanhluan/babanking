# 1. Registration & Onboarding

> Digital Lending Onboarding — module 1 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Next: Profile & Information Collection](02-profile-information-collection.md)

## Contents

- [1.1 Business Definition](#11-business-definition)
- [1.2 Business Responsibilities](#12-business-responsibilities)
- [1.3 Relationship with Other Domains](#13-relationship-with-other-domains)
- [1.4 Business Purpose](#14-business-purpose)
- [1.5 Onboarding Stages](#15-onboarding-stages)
- [1.6 Typical Onboarding Outcomes](#16-typical-onboarding-outcomes)
- [1.7 Overview: Collecting Registration & Onboarding Data](#17-overview-collecting-registration--onboarding-data)
- [1.8 Common Data Collected](#18-common-data-collected)
- [1.9 Collection Methods](#19-collection-methods)
- [1.10 Business Rules](#110-business-rules)
- [1.11 Overview: How Registration & Onboarding Is Used for Decision Making and Journey Control](#111-overview-how-registration--onboarding-is-used-for-decision-making-and-journey-control)
- [1.12 Decision Uses](#112-decision-uses)
- [1.13 Typical Decision Logic Patterns](#113-typical-decision-logic-patterns)
- [1.14 Example Scenarios](#114-example-scenarios)
- [1.15 Key Business Concepts](#115-key-business-concepts)

## 1.1 Business Definition

The Registration & Onboarding Domain manages the business capability that establishes a verified, permitted, and consented applicant, and initiates the loan application journey.

In a digital lending journey, this domain:
- Captures how and where the application started, across self-service, campaign, assisted, and embedded channels;
- Registers the customer, or recognises an existing relationship;
- Verifies the customer's identity through electronic identity verification;
- Screens the customer against AML, sanctions, and politically exposed person requirements;
- Presents lending terms and captures the consents required for later processing;
- And creates the structured loan application journey that downstream lending domains operate on.

The domain helps the bank to determine whether the bank is permitted and prepared to deal with this person at all?

Registration & Onboarding does not itself:
- Assess creditworthiness or credit history;
- Verify income or evaluate affordability;
- Select, configure, or price a lending product;
- Make the final lending decision;
- Or issue the offer and disburse funds.

Those activities are owned by the Credit Assessment, Income & Affordability, Loan Product & Simulation, Decision Engine, Offer & Agreement, and Core Lending / Loan Origination domains.

Instead, this domain produces the verified identity, compliance screening result, consent record, and initiated application context used by those domains.

## 1.2 Business Responsibilities

| Responsibility | Description |
|---|---|
| Capture Application Entry Context | Record how the application began, including: Entry channel; Campaign or offer reference; Partner or merchant identifier; Assisted-channel staff reference; Entry type. |
| Register the Customer | Create a customer registration record, or recognise and link an existing customer relationship where one already exists. |
| Identify Customer Type | Determine whether the applicant is: A new customer; An existing customer; A returning applicant. Which affects available data, pre-fill, and verification treatment. |
| Capture Borrowing Intent | Record the customer's declared lending scope, such as: Loan purpose; New loan versus top-up or refinance; Indicative amount and tenor; Product or offer of interest. |
| Verify Customer Identity | Establish that the applicant is who they claim to be, using: Identity document capture; Data extraction and validation; Biometric or liveness comparison; Verification against trusted sources where available. |
| Perform AML and Sanctions Screening | Screen the applicant against: Sanctions lists; Politically exposed person lists; Adverse media and watchlists; Internal compliance lists. As required by policy. |
| Present Terms and Conditions | Display the lending terms, product disclosures, and processing notices the customer must see before consenting. |
| Capture Consents | Record the customer's explicit agreement to: Terms and conditions; Credit bureau enquiry; Data sharing and processing; Third-party data usage where applicable. |
| Record Consent for Audit | Store each consent with its timestamp, version, scope, and channel, so later processing can prove it was permitted. |
| Support Preliminary Eligibility Check | Apply a lightweight pre-check on declared data, such as basic age and income range, to indicate early suitability before full assessment begins. This check neither binds nor replaces the full policy evaluation performed by 3. Eligibility Check , which applies the product rule set to established as well as declared data. |
| Create the Loan Application Journey | Generate the structured application record that downstream domains progress, carrying identity, compliance, consent, and entry context. |
| Support Resumption and Re-verification | Allow an incomplete application to be resumed, and require verification or consent to be refreshed where it has expired or is no longer valid. |
| Maintain Auditability | Retain the verification results, screening outcomes, consent records, entry context, and status history used at every step of onboarding. |

## 1.3 Relationship with Other Domains

The Registration & Onboarding Domain operates at the start of the digital lending journey. It receives entry, channel, and customer-declared context, establishes identity and permission, and provides a verified and consented applicant for all downstream lending activity.

| Business Domain | Relationship | What Is Exchanged |
|---|---|---|
| Retail Lending Customer Portal | Receives captured inputs | Customer registration details; Contact information; Declared borrowing intent; Captured identity evidence. |
| Campaign & Offer Management | Receives campaign context | Campaign reference; Pre-defined offer details; Pre-approved indicative terms; Targeting context used for pre-fill. |
| Partner and Merchant Channels | Receives embedded entry context | Merchant or partner identifier; Purchase or basket context; Referral source; Channel-specific journey constraints. |
| Employee Portal / Assisted Channel | Supports staff-assisted capture | Branch or relationship manager reference; Staff-entered or corrected customer data; In-person verification context. |
| Identity Verification Services | Consumes verification results | Document authenticity result; Extracted identity data; Biometric or face match outcome; Verification confidence and failure reasons. |
| AML and Screening Services | Consumes compliance results | Sanctions screening result; Politically exposed person status; Watchlist or adverse media hits; Match strength and review status. |
| Customer Data / Core Banking | Creates or reuses profile data | Existing customer identifier; Known profile and contact details; Relationship and product holding context; Newly created customer record. |
| Document Upload | Provides evidence handling | Identity documents; Captured images; Document validation status; Evidence references linked to the application. Refer to 7. Document Upload for detailed handling of this step. |
| Profile & Information Collection | Provides the initiated applicant | Verified identity; Customer type; Declared borrowing scope; Consent state for onward collection. Refer to 2. Profile & Information Collection for detailed handling of this step. |
| Eligibility Check | Provides the permitted applicant | Established age and residency attributes; Customer type; Preliminary check indication, which does not bind the full evaluation. Refer to 3. Eligibility Check for detailed handling of this step. |
| Credit and Bureau Services | Provides the permission to enquire | Credit bureau consent reference; Consent scope, version, and timestamp; Consent validity status. Refer to 4. Credit Assessment for detailed handling of this step. |
| Retail Lending Decision Engine | Provides identity and compliance status | Verification outcome; Screening outcome and any compliance block; Consent completeness; Reason codes where onboarding could not complete. Refer to 9. Decision Engine for detailed handling of this step. |
| Application Management | Hands over the created application | Application identifier created at the end of onboarding; Entry context and channel; Customer type and declared borrowing intent; Initial application stage. This domain creates the application record; Application Management owns it thereafter. |
| Notification Services | Triggers customer communication | Verification requests, resumption reminders, and status updates where additional customer action is required. |

## 1.4 Business Purpose

The purpose of the Registration & Onboarding Domain is to ensure that every lending application begins with a customer whose identity is established, whose compliance status is acceptable, and whose permissions are recorded.

This domain serves five core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Regulatory and Compliance Control | Ensures identity verification and AML obligations are met before the bank enters a lending relationship. → Preventing prohibited or non-compliant customers from progressing. |
| Trusted Customer Identity | Establishes a verified identity that every later assessment depends on. → Reducing fraud and misattributed applications. |
| Consent and Permission Integrity | Captures and evidences the customer's agreement before credit enquiry or data sharing occurs. → Making later processing lawful and auditable. |
| Consistent Journey Initiation | Applies the same registration, verification, and consent treatment regardless of how the customer entered. → Reducing variation in application quality across channels. |
| Operational Efficiency | Automates straightforward registration and verification, and routes only exceptions, failed verifications, or screening hits for manual handling. |

## 1.5 Onboarding Stages

The onboarding lifecycle describes how a prospective borrower is admitted into the lending journey, from the moment of entry to the creation of a working application.

| # | Stage | Description | Key Business Activity |
|---|---|---|---|
| 1 | Entry and Channel Capture | The application starts through a self-service, campaign, assisted, or embedded route. | Entry source, channel context, and entry type are recorded, and any available campaign, partner, or customer context is used for pre-fill. |
| 2 | Customer Registration and Recognition | The customer is registered, or an existing relationship is identified and linked. | Basic identity and contact details are captured, customer type is determined, and known profile data is reused where permitted. |
| 3 | Identity Verification | The customer's claimed identity is checked electronically. | Identity documents are captured and validated, biometric or liveness comparison is performed, and a verification outcome is produced. |
| 4 | Compliance Screening | The customer is screened against AML, sanctions, and politically exposed person requirements. | Screening is executed, matches are assessed, and cases requiring compliance review are routed accordingly. |
| 5 | Terms and Consent Capture | The customer is shown lending terms and asked for the permissions later processing requires. | Terms are presented and accepted, credit bureau and data sharing consents are captured, and each consent is recorded with its version and timestamp. |
| 6 | Application Journey Creation | A structured loan application is created for downstream processing. | Verified identity, compliance status, consent references, and declared borrowing intent are carried forward into the lending journey. |

## 1.6 Typical Onboarding Outcomes

Onboarding does not by itself approve or decline a loan. It produces one of several admission outcomes that determine whether, and how, the lending journey may continue.

| Outcome | Category | Description |
|---|---|---|
| Verified and Permitted | USABLE | Identity is verified, screening is clear, and the required consents are captured. The application proceeds to lending assessment. |
| Pending Additional Verification | WAITING | Onboarding cannot complete because identity capture, document quality, or a required consent is incomplete. |
| Refer for Manual Review | REFERRED | The case requires human review, typically due to a partial identity match, low verification confidence, or an unresolved screening hit. |
| Compliance Restricted | BLOCKED | A confirmed screening match or regulatory restriction prevents the bank from proceeding. This is a compliance outcome, not a credit outcome. |
| Not Verified | NEGATIVE | Identity could not be established to the required standard, and onboarding cannot continue on the current evidence. |
| Abandoned or Expired | INCOMPLETE | The customer did not complete onboarding, or verification and consent have aged beyond their validity and must be refreshed. |

## 1.7 Overview: Collecting Registration & Onboarding Data

In digital lending, registration and onboarding data is usually collected at the very start of the journey, before the customer has invested effort in the application. The aim is to establish identity and permission with enough certainty to satisfy regulation, while keeping the entry experience short enough that legitimate customers complete it.

Collection design typically balances three needs: regulatory sufficiency, customer effort, and channel constraint. A returning customer in a mobile app may need only re-authentication and consent refresh, while a new customer at a merchant checkout must complete full identity capture within a much shorter attention window.

## 1.8 Common Data Collected

| Data Category | Typical Information Collected |
|---|---|
| Entry Context | Entry channel; Entry type; Campaign or offer reference; Partner or merchant identifier; Assisting staff reference. |
| Customer Identity Data | Full name; Date of birth; Nationality; Identity document type and number; Issuing authority and validity dates. |
| Contact Details | Mobile number; Email address; Residential address; Preferred contact channel. |
| Identity Evidence | Identity document images; Supplementary proof of address; Extracted document data; Document validation results. |
| Biometric Capture | Facial image or selfie; Liveness check result; Face match comparison outcome. |
| Customer Type and Relationship | New or existing customer; Existing customer identifier; Known product holdings; Relationship history relevant to pre-fill. |
| Declared Borrowing Intent | Loan purpose; New loan, top-up, or refinance; Indicative amount; Indicative tenor; Product or offer of interest. |
| Consent Records | Terms and conditions acceptance; Credit bureau enquiry consent; Data sharing and processing consent; Consent version, scope, timestamp, and channel. |

## 1.9 Collection Methods

- Customer declaration through structured forms: The most common digital method. Customers enter identity, contact, and borrowing intent information directly.
- Document and biometric capture: Customers photograph identity documents and complete a facial or liveness check, from which identity data is extracted and compared.
- Profile reuse for existing customers: Known identity, contact, and relationship data may be pre-filled and confirmed rather than re-entered, where policy permits.
- Campaign and partner pre-population: Campaign targeting data or merchant checkout context may pre-fill customer or loan details before the customer begins.
- Integrated data retrieval: Some journeys retrieve verified identity attributes, sanctions status, or customer records from connected internal and external services.
- Assisted completion: Branch or relationship staff may capture or correct registration details on the customer's behalf in assisted channels.

## 1.10 Business Rules

- Verification requirements depend on customer type and channel: A returning customer with an existing verified profile may require lighter treatment than a new customer onboarding for the first time.
- Consent must be explicit and recorded before dependent processing: Credit enquiry and data sharing may not proceed on implied agreement, and each consent is stored with its version and timestamp.
- Identity evidence must meet a defined quality standard: Unreadable documents, failed liveness checks, or low match confidence prevent verification from completing.
- Screening outcomes are handled separately from credit outcomes: A compliance restriction is not a credit decline and is not communicated or recorded as one.
- Pre-filled data must be confirmed by the customer: Information carried in from a campaign, partner, or existing profile is presented for confirmation rather than assumed.
- Onboarding data must remain current: Verification results and consents that have aged beyond their validity period require refresh before the journey may continue.
- Incomplete journeys may be resumed within a defined window: After that window, registration, verification, or consent may need to be repeated.

## 1.11 Overview: How Registration & Onboarding Is Used for Decision Making and Journey Control

Once completed, registration and onboarding information becomes the gating input to the rest of the lending journey. It determines whether the application may proceed at all, what data downstream domains may rely on, which processing steps are permitted, and whether the case must be handled by a person before it continues.

## 1.12 Decision Uses

| Decision Use | How the Outcome Is Used |
|---|---|
| Journey Admission | Confirms the applicant may enter the lending journey, based on verified identity and acceptable screening status. |
| Processing Permission | Establishes which downstream activities are permitted, particularly credit bureau enquiry and third-party data sharing. |
| Data Trust Level | Indicates how far downstream assessment may rely on customer-provided information, based on verification strength. |
| Customer Treatment Path | Distinguishes new, existing, and returning customers, which affects pre-fill, evidence requirements, and available product treatment. |
| Straight-Through Progression Support | Allows automated progression where identity is verified, screening is clear, and consents are complete. |
| Referral Triggering | Routes partial matches, low-confidence verification, and unresolved screening hits to compliance or operations staff. |
| Compliance Stop | Provides a reasoned basis for preventing an application from proceeding where regulation does not permit the relationship. |
| Conditional Progression | Supports outcomes that depend on better identity evidence, a repeated verification attempt, or a refreshed consent. |

## 1.13 Typical Decision Logic Patterns

Although exact policy varies by bank and channel, digital lending commonly uses registration and onboarding information in patterns such as:
- Pass: Identity is verified to the required standard, screening is clear, and all required consents are captured and current.
- Refer: Verification confidence is low, a screening match is unresolved, or the identity evidence requires human assessment.
- Conditional path: The customer may proceed once better document capture, a repeated biometric check, or an outstanding consent is provided.
- Stop: Identity cannot be established, or a confirmed compliance restriction prevents the bank from entering the relationship.

Onboarding is rarely a single identity check in mature lending journeys. It is a combination of entry context, identity assurance, compliance status, consent completeness, and channel constraint, and it determines what every later domain is permitted to do.

## 1.14 Example Scenarios

| Scenario | Onboarding Outcome | Likely Decision Impact |
|---|---|---|
| Existing customer applying in the mobile app with a current verified profile | Verified and Permitted | Supports straight-through progression with lighter re-verification and consent refresh. |
| New customer whose document capture is blurred and fails extraction | Pending Additional Verification | Journey pauses until acceptable identity evidence is captured. |
| Applicant returns a partial name match against a watchlist | Refer for Manual Review | Requires compliance assessment of match strength before the journey may continue. |
| Applicant returns a confirmed sanctions match | Compliance Restricted | Application stops for regulatory reasons and is not treated or communicated as a credit decline. |
| Customer completes registration and verification but declines credit bureau consent | Pending Additional Verification | Credit assessment cannot proceed, and the journey cannot continue without the permission. |
| Customer starts at a merchant checkout but does not complete identity capture in time | Abandoned or Expired | Application may be resumed in the bank's own channel within the permitted window. |

## 1.15 Key Business Concepts

| Concept | Definition |
|---|---|
| Registration | The creation of a customer record and application entry point at the start of the lending journey. |
| Onboarding | The combined process of registering, verifying, screening, and obtaining consent from a prospective borrower. |
| Entry Context | The recorded circumstances of how an application began, including channel, campaign, partner, and entry type. |
| Customer Type | The classification of the applicant as new, existing, or returning, which affects data reuse and verification treatment. |
| Identity Verification | The process of establishing that the applicant is the person they claim to be, using document, data, and biometric checks. |
| Electronic Identity Verification | Identity verification performed digitally through document capture, data extraction, and biometric comparison, without in-person attendance. |
| Biometric Match | The comparison of a captured facial image against the identity document image to confirm the applicant's presence and identity. |
| Verification Confidence | The strength of the identity verification result, which determines whether the outcome may be accepted automatically. |
| AML Screening | The check of an applicant against anti-money-laundering, sanctions, and watchlist requirements. |
| Politically Exposed Person | An individual holding a prominent public position who is subject to enhanced compliance treatment. |
| Screening Hit | A potential match against a compliance list, which requires assessment before the journey may continue. |
| Compliance Restriction | A regulatory outcome preventing the bank from entering a relationship. Distinct from a credit decline. |
| Consent | The customer's explicit, recorded agreement to a defined processing activity, such as a credit bureau enquiry. |
| Consent Record | The stored evidence of a consent, including its scope, version, timestamp, and channel. |
| Terms Acceptance | The customer's recorded agreement to the presented lending terms and disclosures. |
| Preliminary Eligibility Check | A lightweight early check on declared information that indicates suitability before full assessment begins. It neither binds nor replaces the policy evaluation in 3. Eligibility Check . |
| Outcome Category | The controlled token classifying an outcome in this page's 3.2 table. The full vocabulary is defined in 0. Conventions & Domain Register . |
| Application Journey | The structured application record created at the end of onboarding and progressed by downstream lending domains. |
| Resumption | The continuation of an incomplete onboarding journey within a permitted window, without restarting from the beginning. |
| Re-verification | A repeated identity check or consent refresh required when a previous result has aged beyond its validity. |

---

[← Digital Lending Onboarding](README.md) · [Next: Profile & Information Collection](02-profile-information-collection.md)
