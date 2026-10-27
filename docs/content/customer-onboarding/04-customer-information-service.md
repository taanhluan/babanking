# 4. Customer Information Service

> Customer Onboarding — module 4 of 10. Exported from Development `customer-onboarding` v13.

[← Customer Onboarding](README.md) · [Previous: Application Management](03-application-management.md) · [Next: Account Setup Service](05-account-setup-service.md)

## Contents

- [4.1 Overview](#41-overview)
- [4.2 Business Purpose](#42-business-purpose)
- [4.3 Information Categories](#43-information-categories)
- [4.4 Information Collection Journey](#44-information-collection-journey)
- [4.5 Data Validation Rules](#45-data-validation-rules)
- [4.6 Exception & Failure Handling](#46-exception--failure-handling)
- [4.7 Data Accuracy & Customer Obligations](#47-data-accuracy--customer-obligations)
- [4.8 Business Rules](#48-business-rules)
- [4.9 Key Business Concepts](#49-key-business-concepts)

## 4.1 Overview

Covers: Business Definition · Business Responsibilities · Scope Boundary · Relationship with Other Domains

### Business Definition

The Customer Information Domain is responsible for collecting, validating, and maintaining all personal, contact, employment, and tax information required to open a CASA account and create a Customer Information File (CIF) in the bank's core banking system.

This domain is activated immediately after the customer's identity has been verified by the eKYC Domain. It takes the verified identity data as a starting point, pre-populates it into the customer information form, and guides the customer through completing the remaining required fields.

The Customer Information Domain does not make risk or compliance decisions. Its sole purpose is to ensure the bank holds a complete, accurate, and validated record of the customer's information before that information is used for compliance screening and account creation.

### Business Responsibilities

| Responsibility | Description |
|---|---|
| Pre-populate verified identity data | Retrieve OCR-extracted identity data from the eKYC Domain and pre-populate it into the customer information form, reducing manual entry and minimising errors. |
| Collect personal information | Capture full personal details: legal name, date of birth, gender, nationality, country of birth, and marital status. |
| Collect contact information | Capture the customer's current residential address, mailing address (if different), mobile number, and email address. |
| Collect employment details | Capture employment status, employer name, occupation, industry, and source of funds to support risk assessment and AML due diligence. |
| Collect tax declarations | Capture Tax Identification Number (TIN), country of tax residency, and any relevant tax status declarations required by CRS/FATCA obligations. |
| Validate all information | Apply business validation rules to ensure all required fields are complete, correctly formatted, and internally consistent. |
| Record customer preferences | Capture relationship type (individual/joint), preferred language, and communication preferences. |
| Maintain data accuracy | Ensure all captured information reflects the customer's current, true circumstances at the time of application. |

### Scope Boundary

| In Scope | Out of Scope (Handled Elsewhere) |
|---|---|
| Personal information collection and validation | Identity document verification — eKYC Domain (Section 6) |
| Contact information collection and validation | AML and compliance screening — Compliance & Risk Domain (Section 8) |
| Employment and financial background collection | Account type selection and product configuration — Account Setup Domain (Section 9) |
| Tax declaration collection (CRS/FATCA) | CIF creation in core banking — Account Opening Orchestrator (Section 12) |
| Communication preference capture | Consent and agreement capture — Consent & Agreement Domain (Section 11) |

### Relationship with Other Domains

| Domain / System | Relationship | What Is Exchanged |
|---|---|---|
| eKYC Domain (Section 6) | Receives input | Verified identity data (name, date of birth, ID number, nationality) is pre-populated from the eKYC Verified Identity Profile. |
| Application Management (Section 5) | Reports progress | Stage completion status and any validation failures are reported back to Application Management for tracking and status update. |
| Compliance & Risk Domain (Section 8) | Passes output | Complete Customer Information Record is passed to the Compliance & Risk Domain for AML screening and risk assessment. |
| Account Opening Orchestrator (Section 12) | Provides data | Customer information is used to create the Customer Information File (CIF) in core banking at the account opening stage. |
| Customer Communication Service | Triggers notifications | Validation errors or requests for additional information trigger customer-facing notifications. |
| Audit & Compliance | Records activity | All data submissions, validation outcomes, and changes are recorded in the Audit Log with timestamps. |

## 4.2 Business Purpose

The Customer Information Domain exists to ensure the bank holds a complete, accurate, and validated picture of every CASA applicant before proceeding to compliance screening and account opening. The quality of the customer information record directly impacts the reliability of AML screening, the bank's ability to contact the customer, and the accuracy of the core banking record.

| Business Purpose | Why It Matters |
|---|---|
| Enable Accurate Compliance Screening | AML screening is only as reliable as the customer information it is run against. Incomplete or inaccurate employment or address data can produce false results or miss genuine risks. |
| Support CIF Creation | The Customer Information Record is the primary source used to create the Customer Information File (CIF) in core banking. Errors here flow directly into the bank's system of record. |
| Meet Regulatory Obligations | Banking regulations require the bank to collect and maintain accurate customer information — including identity, address, source of funds, and tax status — as part of its KYC obligations. |
| Enable Customer Communication | Accurate contact information (mobile number, email, address) is essential for the bank to communicate with the customer throughout onboarding and for the ongoing relationship. |
| Fulfil Tax Reporting Requirements | TIN (Tax Identification Number) and tax residency declarations are required under international tax reporting frameworks (CRS, FATCA). Missing or incorrect tax data creates regulatory exposure for the bank. |
| Reduce Data Entry Errors | By pre-populating verified eKYC data, the domain minimises manual entry errors and ensures the customer's core identity data is consistent across all systems. |

## 4.3 Information Categories

The Customer Information Domain collects four categories of information, mapped directly to the four functions of Service 3 in the CASA Onboarding Business Architecture.

### Personal Information

Personal information establishes who the customer is. Most of this information is pre-populated from the eKYC Verified Identity Profile and confirmed by the customer.

| Field | Mandatory / Optional | Purpose |
|---|---|---|
| Full legal name | Mandatory | Must match the name on the verified identity document. Pre-populated from OCR. |
| Date of birth | Mandatory | Age verification and CIF creation. Pre-populated from OCR. |
| Gender | Mandatory | CIF creation and customer record. |
| Nationality | Mandatory | Eligibility assessment and AML risk profiling. Pre-populated from OCR. |
| Country of birth | Mandatory | AML risk profiling and regulatory reporting. |
| Marital status | Optional | Customer profile completeness. |
| Alternative name / maiden name | Optional | Customer record and correspondence matching. |

| 📌 Pre-Population Rule |
|---|
| Full legal name, date of birth, and nationality are pre-populated from the eKYC Verified Identity Profile. |
| The customer must review and confirm this information before proceeding. |
| If the customer disputes pre-populated data, they must provide supporting documentation. |
| The eKYC stage must be repeated if confirmed identity data changes materially. |

### Contact Information

Contact information enables the bank to communicate with the customer during onboarding and throughout the ongoing relationship. It is also used for regulatory correspondence and statement delivery.

| Field | Mandatory / Optional | Purpose |
|---|---|---|
| Residential address | Mandatory | Primary address for regulatory correspondence, AML screening, and account records. |
| Mailing address | Optional | Preferred delivery address if different from residential address. Used for card and statement delivery. |
| Mobile number | Mandatory | OTP delivery, notifications, and customer authentication during onboarding and banking. |
| Email address | Mandatory | Digital communications, e-statements, and notification delivery. |
| Preferred communication channel | Optional | Customer's preferred channel for bank communications: SMS, email, or push notification. |
| Preferred language | Optional | Language preference for customer-facing communications and documentation. |

| ⚠️ Address Validation Rule |
|---|
| Residential address must be a verifiable, physical address |
| For high-risk nationalities or non-resident applicants, address verification may require |
| supporting documentation (e.g. utility bill, bank statement) dated within 3 months. |

### Employment Details

Employment details are collected to assess the customer's source of funds and to support AML risk assessment. This information is self-declared by the customer and may be subject to verification for higher-risk profiles.

| Field | Mandatory / Optional | Purpose |
|---|---|---|
| Employment status | Mandatory | Determines which employment fields apply. Options: Employed, Self-Employed, Business Owner, Retired, Student, Unemployed. |
| Employer name | Mandatory (if Employed) | AML due diligence and source of funds validation. |
| Occupation / job title | Mandatory (if Employed or Self-Employed) | AML risk profiling. Certain high-risk occupations trigger enhanced due diligence. |
| Industry / sector | Mandatory (if Employed or Self-Employed) | AML risk profiling. Certain high-risk industries trigger enhanced due diligence. |
| Business name (if Self-Employed / Business Owner) | Mandatory (if applicable) | Source of funds and AML due diligence. |
| Source of funds | Mandatory | Primary source of funds for the account: Salary, Business Income, Investment Returns, Inheritance, etc. Required for AML risk assessment. |
| Estimated monthly / annual income | Mandatory | Risk profiling and account limit setting. Helps establish expected transaction patterns. |
| Employer address / country | Optional | Additional AML context for cross-border risk assessment. |

| 📌 High-Risk Occupation Note |
|---|
| Certain occupations and industries are classified as higher risk for AML purposes |
| (e.g. politically exposed persons, money services businesses, precious metals dealers). |
| Where a high-risk occupation or industry is declared, the Compliance & Risk Domain |
| will apply enhanced due diligence screening. This is handled in Section 8. |

### Tax Declarations

Tax declarations are collected to fulfil the bank's obligations under international tax reporting frameworks — specifically the Common Reporting Standard (CRS) and the Foreign Account Tax Compliance Act (FATCA). Every CASA applicant must provide a tax declaration before the application can be submitted.

| Field | Mandatory / Optional | Purpose |
|---|---|---|
| Tax Identification Number (TIN) | Mandatory | Primary tax reference number issued by the customer's country of tax residency. Required for CRS/FATCA reporting. |
| Country of tax residency | Mandatory | The country or countries where the customer is considered a tax resident. May be different from country of citizenship or residence. |
| Multiple tax residency declaration | Conditional | If the customer is tax resident in more than one country, each country and corresponding TIN must be declared separately. |
| US Person declaration (FATCA) | Mandatory | Customer must declare whether they are a US Person (US citizen, US resident, or US tax filer). A 'Yes' declaration triggers FATCA reporting obligations. |
| TIN exemption reason | Conditional | If the customer cannot provide a TIN (e.g. their country of tax residency does not issue TINs), they must provide a documented reason for the exemption. |

| ⚠️ Tax Declaration Rule |
|---|
| Tax declarations are a mandatory regulatory requirement. The application cannot be submitted |
| without a completed tax declaration, even if the customer is not liable for tax in any jurisdiction. |
| A customer who declares US Person status (FATCA) triggers additional compliance steps |
| managed by the Compliance & Risk Domain. |

## 4.4 Information Collection Journey

The customer information collection journey begins immediately after the eKYC Verified Identity Profile is generated. It follows a structured sequence designed to minimise customer effort by presenting pre-populated data first and collecting additional information in a logical order.

| Step | What Happens | Customer Action |
|---|---|---|
| 1. Pre-Population | System retrieves the Verified Identity Profile from the eKYC Domain and pre-populates available fields (name, date of birth, nationality, ID number) into the customer information form. | Customer reviews pre-filled information. Confirms accuracy or flags corrections. |
| 2. Personal Information Completion | Customer completes any personal information fields not pre-populated by eKYC (e.g. gender, country of birth, marital status). | Customer fills in remaining personal fields. System validates entries in real time. |
| 3. Contact Information | Customer provides residential address, mailing address (if different), mobile number, and email address. Customer selects preferred communication channel and language. | Customer enters contact details. System validates format (e.g. valid mobile number format, valid email structure). |
| 4. Employment Details | Customer selects employment status. Depending on selection, relevant employment fields are presented dynamically. Customer declares source of funds and income range. | Customer completes employment fields relevant to their status. High-risk occupation/industry selections are noted by the system for Compliance & Risk Domain. |
| 5. Tax Declarations | Customer declares country(ies) of tax residency and provides TIN(s). Customer answers the US Person declaration. Where TIN is unavailable, customer provides exemption reason. | Customer completes tax declaration form. Multiple residency declarations can be added. |
| 6. Relationship Type | Customer confirms whether the application is for an individual or joint account. For joint accounts, the second applicant's information collection process is initiated separately. | Customer selects relationship type. Joint applicant is notified and invited to complete their own information section. |
| 7. Review & Confirm | Customer is presented with a complete summary of all information entered. Customer reviews and confirms all details are accurate before the stage is marked complete. | Customer reviews summary. Makes corrections if needed. Confirms and proceeds. |

| 📌 Dynamic Form Rule |
|---|
| The information collection form adapts dynamically based on the customer's selections. |
| Example: Selecting 'Self-Employed' shows business name and business income fields. |
| Selecting 'Student' hides employer fields and adjusts income range options. |
| This reduces unnecessary fields and keeps the journey focused and efficient. |

## 4.5 Data Validation Rules

All information collected by this domain is subject to the following validation rules. Validation is performed in real time as the customer enters data, and again at the point of stage submission.

### Completeness Rules

- All mandatory fields must be completed before the stage can be marked as complete and the application can progress to the next step.
- Conditional fields become mandatory when the conditions that trigger them are met (e.g. Employer Name is mandatory when Employment Status = Employed).
- Optional fields may be left blank without blocking stage completion. However, the customer is encouraged to complete them for a more complete customer profile.

### Accuracy & Format Rules

- Name consistency: The full legal name entered must match the name on the verified identity document. Discrepancies flag the record for review.
- Mobile number format: Must be a valid mobile number for the declared country of residence. International format is accepted for non-resident applicants.
- Email format: Must be a syntactically valid email address. The email address is verified by sending a confirmation code during onboarding.
- Address completeness: Residential address must include street, city/district, and country as a minimum. P.O. Box addresses are not accepted as residential addresses.
- Date of birth consistency: Must match the date of birth on the verified identity document. If a discrepancy exists, the eKYC stage must be revisited.
- TIN format: Tax Identification Numbers must conform to the standard format for the declared country of tax residency. Format validation is applied per country.

### Consistency Rules

- Age eligibility: Date of birth must confirm the customer is aged 18 or above. If the declared date of birth results in an age below 18, the application cannot proceed.
- Source of funds alignment: The declared source of funds must be consistent with the declared employment status. A 'Student' declaring 'Business Income' as their primary source of funds will be flagged for review.
- Country consistency: Nationality, country of birth, country of residence, and country of tax residency are cross-checked for consistency. Material inconsistencies are flagged for Compliance review.
- Multiple tax residency: If the customer declares tax residency in more than one country, a TIN (or documented exemption) must be provided for each country declared.

## 4.6 Exception & Failure Handling

The following exceptions may arise during customer information collection and are handled as described:

| Exception | Handling | Customer Impact |
|---|---|---|
| Mandatory field missing | System blocks stage completion and highlights the missing field(s) with a clear error message. | Customer must complete the missing field before proceeding. No data is lost. |
| Name mismatch with eKYC data | System flags the discrepancy and routes the record for review. Customer may be asked to reconfirm or provide supporting documentation. | Application paused pending resolution. Customer notified. |
| Invalid mobile number / email | System rejects the entry and prompts the customer to re-enter a valid value. | Customer corrects and resubmits. No other impact. |
| P.O. Box entered as residential address | System rejects P.O. Box entries in the residential address field. | Customer prompted to provide a physical residential address. |
| TIN not available | Customer must select a documented reason for TIN unavailability. Reason is recorded and passed to Compliance for review. | Application may proceed but is flagged for compliance review. |
| US Person declaration (FATCA trigger) | Application is flagged. Compliance & Risk Domain applies additional FATCA processing steps. | Customer informed that additional steps may apply. No immediate impact on onboarding progress. |
| High-risk occupation / industry declared | Record flagged for Compliance & Risk Domain. Enhanced due diligence will be applied during AML screening. | Application proceeds normally. Additional compliance review occurs downstream. |
| Customer disputes pre-populated eKYC data | Customer is asked to provide supporting documentation. If data cannot be reconciled, eKYC must be repeated. | Application paused pending documentation or eKYC re-verification. |
| Joint applicant does not complete their section | Application cannot be submitted until all applicants complete their information sections. | Primary applicant notified. Joint applicant receives reminder notifications per the expiry schedule. |

## 4.7 Data Accuracy & Customer Obligations

The customer is responsible for providing accurate, complete, and truthful information during the onboarding process. The following obligations apply:

- Truthful declaration: The customer must declare all information truthfully. Knowingly providing false or misleading information is a breach of the Terms & Conditions and may constitute a criminal offence.
- Current information: All information provided must reflect the customer's current circumstances at the time of the application. The customer must not submit outdated or expired details.
- Notification of changes: If any information provided during onboarding changes before the account is opened, the customer must notify the bank immediately so the record can be updated.
- Post-onboarding update obligation: Once the account is opened, the customer is obligated to notify the bank of any material changes to their circumstances (e.g. change of address, employment, or tax residency) as required by the bank's Terms & Conditions.

| 📌 Data Privacy Note |
|---|
| All customer information collected during onboarding is subject to the bank's Data Privacy Policy |
| and applicable data protection regulations. |
| Information is collected only for the purposes stated and is retained for the period |
| required by law or the bank's Data Retention Policy. |

## 4.8 Business Rules

Covers: General Rules · Personal Information Rules · Contact Information Rules · Employment & Source of Funds Rules · Tax Declaration Rules

### General Rules

- Information completeness is a prerequisite: The Customer Information stage cannot be marked complete until all mandatory fields across all four information categories are validated and confirmed by the customer.
- Pre-populated data requires customer confirmation: Any field pre-populated from the eKYC Verified Identity Profile must be explicitly confirmed by the customer. Silent acceptance is not permitted.
- Data is immutable after stage completion: Once the Customer Information stage is confirmed and the application advances, the customer cannot edit their information without Operations Administrator involvement and a documented reason.
- Stage can be saved and resumed: Consistent with the Application Management save & resume rules, all data entered in this stage is saved automatically and can be resumed. Partially completed stages are held in draft.

### Personal Information Rules

- Name must match eKYC: The full legal name on the application must match the verified identity document. Any discrepancy must be resolved before the stage is complete.
- Age minimum: The customer must be at least 18 years of age. Applications from customers below the age of 18 cannot proceed.

### Contact Information Rules

- Mobile number must be unique: Each mobile number can only be registered to one active CASA onboarding application at a time. A mobile number linked to an existing active account will be flagged for review.
- Email must be verified: The email address must be verified by the customer via a confirmation code before the Contact Information stage is complete.
- Physical residential address required: A verifiable physical address is mandatory. P.O. Box addresses are not accepted.

### Employment & Source of Funds Rules

- Source of funds is mandatory for all customers: Every customer must declare their primary source of funds regardless of employment status.
- High-risk occupations are flagged automatically: The system automatically flags occupations and industries classified as high-risk under the bank's AML policy. These flags are passed to the Compliance & Risk Domain for enhanced due diligence.

### Tax Declaration Rules

- Tax declaration is mandatory: Every applicant must complete a tax declaration. The application cannot be submitted without it.
- Multiple TINs required for multiple tax residencies: A customer who is tax resident in more than one country must provide a TIN (or documented exemption) for each country.
- US Person declaration triggers FATCA process: A customer who declares US Person status initiates additional FATCA compliance steps managed by the Compliance & Risk Domain.
- TIN exemption must be documented: If a customer cannot provide a TIN, a valid exemption reason must be selected from the approved list and recorded on the application.

## 4.9 Key Business Concepts

| Concept | Definition |
|---|---|
| Customer Information Record | The complete set of personal, contact, employment, and tax information collected from a customer during onboarding. Forms the primary input for CIF creation in core banking. |
| CIF (Customer Information File) | The master customer record created in the core banking system. Contains the customer's verified identity and information as captured during onboarding. |
| Pre-Population | The automatic filling of customer information fields using data extracted and verified during the eKYC stage, reducing manual entry and minimising errors. |
| Source of Funds | The declared origin of the money the customer intends to deposit and transact with. A mandatory AML due diligence requirement. |
| TIN (Tax Identification Number) | A unique reference number issued by a tax authority to identify a taxpayer. Required for CRS and FATCA compliance reporting. |
| CRS (Common Reporting Standard) | An international standard for the automatic exchange of financial account information between tax authorities, requiring banks to collect and report customer tax residency information. |
| FATCA (Foreign Account Tax Compliance Act) | A US law requiring financial institutions worldwide to identify and report accounts held by US persons to the US Internal Revenue Service (IRS). |
| US Person | For FATCA purposes: a US citizen, US resident alien, US partnership, US corporation, or any person required to file a US tax return. US Person status triggers specific FATCA reporting obligations. |
| Enhanced Due Diligence (EDD) | Additional scrutiny applied to higher-risk customers (e.g. those with high-risk occupations, PEP status, or high-risk nationalities). Managed by the Compliance & Risk Domain. |
| Dynamic Form | A form that adapts its fields and requirements based on the customer's selections (e.g. employment status determines which employment fields are shown). |
| Joint Application | An application submitted by two individuals to open a CASA account jointly. Both applicants must independently complete all information sections before the application can be submitted. |

---

[← Customer Onboarding](README.md) · [Previous: Application Management](03-application-management.md) · [Next: Account Setup Service](05-account-setup-service.md)
