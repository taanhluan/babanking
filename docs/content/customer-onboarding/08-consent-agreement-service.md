# 8. Consent & Agreement Service

> Customer Onboarding — module 8 of 10. Exported from Development `customer-onboarding` v13.

[← Customer Onboarding](README.md) · [Previous: Card Enrollment Service](07-card-enrollment-service.md) · [Next: Account Creation & Service Provisioning](09-account-creation-service-provisioning.md)

## Contents

- [8.1 Overview](#81-overview)
- [8.2 Business Purpose](#82-business-purpose)
- [8.3 Core Capabilities](#83-core-capabilities)
- [8.4 Consent Journey](#84-consent-journey)
- [8.5 Consent Categories](#85-consent-categories)
- [8.6 Consent Versioning & Updates](#86-consent-versioning--updates)
- [8.7 Exception Handling](#87-exception-handling)
- [8.8 Business Rules](#88-business-rules)
- [8.9 Key Business Concepts](#89-key-business-concepts)

## 8.1 Overview

Covers: Business Definition · Business Responsibilities · Scope Boundary · Relationship with Other Domains

### Business Definition

The Consent & Agreement Service is responsible for ensuring that the customer formally understands, agrees to, and provides their explicit acceptance of all legally required terms, policies, and consent categories before the bank proceeds to open their CASA account. It is the point in the onboarding journey where the relationship between the customer and the bank is legally established.

This service is implementation-agnostic by design. While all banks must achieve the same core outcomes — informed consent, documented acceptance, and an auditable record — the specific documents presented, the consent categories collected, the presentation format, and the acceptance mechanism will vary depending on the bank's regulatory environment, internal policy, and technology choices.

What does not vary is the business principle: the customer must have a genuine opportunity to read and understand what they are agreeing to, and the bank must be able to demonstrate this for every customer, at any point in the future.

### Business Responsibilities

| Responsibility | Description |
|---|---|
| Present required documents | Make all mandatory legal documents available to the customer in a clear, accessible, and complete form before requesting acceptance. |
| Capture explicit acceptance | Record the customer's active, affirmative acceptance of each required document or consent category. Passive or implied consent is not sufficient. |
| Collect consent preferences | Where consent is optional (e.g. marketing communications), capture the customer's preference clearly and store it for downstream use. |
| Record customer acceptance for audit | Create a durable, timestamped record of what the customer accepted, which version of each document was presented, and when and how the acceptance was given. |
| Apply e-Signature or equivalent | Apply an electronic acceptance mechanism that meets the bank's legal and regulatory requirements for binding agreement. |
| Version-control all documents | Ensure the customer is always presented with the current, approved version of each document. Maintain a record of which version was presented to each customer. |
| Support withdrawal and re-consent | Where a customer withdraws a previously given consent, or where documents are updated, manage re-consent as required by policy and regulation. |

### Scope Boundary

| In Scope — Consent & Agreement Service | Out of Scope (Handled Elsewhere) |
|---|---|
| Presentation of Terms & Conditions | Legal drafting and maintenance of T&C content — Legal / Compliance team |
| Presentation of Privacy Policy | Regulatory approval of consent framework — Compliance team |
| Marketing consent capture and storage | Delivery of marketing communications — Notification Service (Service 11) |
| e-Signature or acceptance mechanism | Storage of signed documents — Document Storage (External System) |
| Audit record creation | Ongoing consent management post-onboarding — CRM / account servicing platform |
| Consent preference storage for downstream use | Data privacy compliance and regulatory reporting — Compliance team |

### Relationship with Other Domains

| Domain / System | Relationship | What Is Exchanged |
|---|---|---|
| Card Enrollment Service | Preceded by | Card enrollment is completed before consent capture. Card-specific terms may be included in the consent presented. |
| Authentication & Security Service | Followed by | Consent capture must be complete before authentication and account creation are triggered. |
| Account Opening Orchestrator | Provides confirmation to | Consent completion status is a prerequisite for the Account Opening Orchestrator to proceed with CIF and account creation. |
| Document Storage (External) | Writes to | Signed consent records, document versions presented, and e-Signature data are stored in the eSign Archive. |
| Notification Service | Informs | Marketing consent preference is passed to the Notification Service to govern which communications the customer receives post-onboarding. |
| Dashboard & Onboarding Hub | Provides documents to | Consent records and signed documents are made accessible to the customer via the dashboard after account opening. |
| Application Management | Reports to | Consent stage completion status and any exceptions are reported to Application Management for tracking. |

## 8.2 Business Purpose

The Consent & Agreement Service exists to fulfil the bank's legal and regulatory obligation to obtain informed, documented customer consent before entering into a formal account relationship. Without valid consent, the account opening cannot proceed and the bank cannot lawfully process the customer's personal data or communicate with them for marketing purposes.

Beyond compliance, this service also plays a customer trust role — it is the moment where the customer understands what they are signing up for and makes an active choice to proceed. A well-designed consent experience builds confidence; a poorly designed one creates friction, abandonment, and future disputes.

| Business Purpose | Why It Matters |
|---|---|
| Legal Enforceability | The accepted Terms & Conditions form the legal contract between the customer and the bank. Without valid acceptance, the bank has no enforceable agreement. |
| Regulatory Compliance | Data protection regulations require explicit, documented consent before the bank can process personal data for defined purposes. Non-compliance carries significant regulatory risk. |
| Audit Readiness | The bank must be able to produce evidence of a customer's consent — what they agreed to, which version, when, and how — at any time, including years after the account was opened. |
| Customer Trust | Transparent, clearly presented consent documentation builds trust. Customers who understand what they are agreeing to are less likely to dispute terms later. |
| Preference Management | Capturing the customer's communication and marketing preferences at onboarding ensures subsequent interactions respect the customer's wishes from day one. |
| Downstream Enablement | The marketing consent captured here governs what communications the customer receives post-onboarding. Accurate capture prevents regulatory breaches in customer communications. |

## 8.3 Core Capabilities

The Consent & Agreement Service delivers four core capabilities. These represent the minimum required outcomes that every implementation must achieve, regardless of the specific method, format, or technology used.

### Present Terms & Conditions

The bank must present the Terms & Conditions governing the CASA account to the customer in a form they can read and understand before requesting acceptance.

| Requirement | Implementation Guidance |
|---|---|
| Document must be complete | The full Terms & Conditions must be presented — not a summary or extract. Where a summary is provided for readability, it must be clearly labelled as a summary and the full document must remain accessible. |
| Customer must have sufficient opportunity to read | The presentation must allow the customer adequate time and means to read the document. Implementations that auto-advance or time-out during reading are not acceptable. |
| Document must be the current approved version | Only the current, bank-approved version of the Terms & Conditions may be presented. The version number and effective date must be visible. |
| Language must be appropriate | The document must be presented in a language the customer can reasonably understand. Where multiple languages are available, the customer's preferred language should be used where possible. |
| Presentation format is implementation-specific | The bank may present the Terms & Conditions as an in-app scrollable document, a downloadable PDF, a web page, or a physical document in branch. The format must meet accessibility standards. |

| 📌 Implementation Note |
|---|
| How the Terms & Conditions are presented will vary by bank and channel. |
| What must not vary: the customer must have seen and had the opportunity to read the complete |
| document before they are asked to accept it. The system must be able to evidence this. |

### Capture Consent & Acceptance

The customer must actively and explicitly accept each required consent category. The method of capturing acceptance is implementation-specific, but the following principles apply universally.

| Consent Category | Nature | Core Requirement |
|---|---|---|
| Terms & Conditions | Mandatory — account cannot be opened without acceptance | Customer must explicitly accept. Acceptance cannot be pre-selected, implied, or assumed. |
| Privacy Policy / Data Processing Consent | Mandatory — required by data protection regulation | Customer must explicitly accept the bank's use of their personal data as described in the Privacy Policy. |
| Marketing Consent | Optional — customer choice | Customer must be given a clear, unambiguous choice to opt in or opt out of marketing communications. The default must not be pre-selected as opted in. |
| Product-Specific Terms (e.g. Card Terms) | Mandatory where applicable | Where additional product terms apply (e.g. debit card terms, digital banking terms), these must be separately presented and accepted. |
| Third-Party Data Sharing Consent | Conditional — where applicable | Where the bank intends to share customer data with third parties (e.g. credit bureaus, partners), explicit consent must be captured separately for each purpose. |

Acceptance methods vary by implementation and regulatory environment. Common approaches include:

- Digital checkbox with explicit label (e.g. 'I have read and agree to the Terms & Conditions')
- Button-based confirmation after scrolling through the full document
- e-Signature applied to a digital document
- Verbal confirmation recorded during an assisted onboarding session
- Physical wet signature on a printed document in branch

| ⚠️ Universal Acceptance Rules |
|---|
| 1. Pre-ticked checkboxes are not acceptable for any consent category. |
| 2. Acceptance of one consent category must not imply acceptance of another. |
| 3. Marketing consent must be genuinely optional — declining must not prevent account opening. |
| 4. The customer must be able to review what they are accepting before confirming. |
| 5. Acceptance must be an active, deliberate act by the customer. |

### Apply e-Signature or Equivalent

Once the customer has accepted the required documents, an acceptance record must be created that is legally equivalent to a signature in the applicable jurisdiction. The specific mechanism used is implementation-specific and must comply with the bank's legal team requirements and local e-signature regulations.

| Acceptance Mechanism | Typical Use Context |
|---|---|
| Electronic Signature (e-Signature) | Digital onboarding via mobile or web. The customer signs a digital document using a typed name, drawn signature, or cryptographic method. Governed by e-signature legislation in the applicable jurisdiction. |
| Click-to-Accept | Widely used for digital onboarding. The customer clicks 'I Agree' or equivalent after reviewing the document. Legally valid in many jurisdictions when combined with a robust audit record. |
| OTP-Based Acceptance | The customer receives a one-time password and enters it to confirm their acceptance. The OTP acts as a binding confirmation that the person in possession of the registered mobile number accepted the terms. |
| Biometric Acceptance | Fingerprint or facial recognition used to confirm the customer's identity at the point of acceptance. Provides a strong binding between the individual and the acceptance act. |
| Physical Wet Signature | Used in branch-assisted onboarding. The customer signs a printed document. The signed document is scanned and stored in Document Storage. |
| Agent-Witnessed Acceptance | In assisted onboarding, a bank agent witnesses and records the customer's verbal or written acceptance. The agent's identity and the acceptance event are recorded. |

| 📌 Implementation Note |
|---|
| The acceptance mechanism must be approved by the bank's Legal team and must comply with |
| applicable e-signature and data protection legislation in the bank's operating jurisdiction. |
| The mechanism used must be recorded as part of the consent audit record. |

### Record Consent for Audit

This is the most critical and non-negotiable capability of the Consent & Agreement Service. Regardless of how consent is presented or captured, the bank must create and retain a durable, detailed record of every consent event. This record must be sufficient to demonstrate compliance to a regulator or court at any point in the future.

### Minimum Audit Record Requirements

The following data elements must be captured and stored for every consent event, regardless of implementation:

| Audit Record Element | Why It Is Required |
|---|---|
| Customer identifier | Links the consent record to the specific customer and account opening application. |
| Document name and type | Identifies which document the customer accepted (e.g. Terms & Conditions, Privacy Policy). |
| Document version number | Confirms which specific version of the document was presented. Essential if documents are later updated. |
| Date and time of acceptance | Establishes when the consent was given. Must be recorded in a standardised format with timezone. |
| Acceptance mechanism used | Records how the customer accepted (e.g. click-to-accept, e-signature, OTP, physical signature). Required to demonstrate the acceptance was active and explicit. |
| Consent outcome per category | Records the customer's decision for each consent category: Accepted, Declined, or Not Presented. |
| Channel and device information | Records the channel (mobile, web, branch) and, where applicable, device information (IP address, device ID) at the time of acceptance. |
| Agent identity (assisted onboarding) | Where a bank agent facilitated the acceptance, the agent's identity and role must be recorded. |

| 📌 Record Retention |
|---|
| Consent records must be retained for at least the duration of the account relationship |
| plus the regulatory retention period (typically 5–7 years post account closure). |
| Consent records are immutable — they cannot be modified after creation. |
| Subsequent consent changes (e.g. marketing opt-out) create new records; the original is preserved. |

## 8.4 Consent Journey

The consent journey describes the sequence of activities within the Consent & Agreement Service. While the specific steps, their order, and their presentation format are implementation-specific, the following sequence represents the minimum required flow that every implementation must cover.

| Step | What Must Happen | Implementation Flexibility |
|---|---|---|
| 1. Determine applicable consents | The system identifies which documents and consent categories apply to this specific customer based on their account type, channel, product selections, and any applicable regulatory requirements. | The logic for determining applicable consents is implementation-specific. Different products or customer categories may require different consent sets. |
| 2. Present documents | All applicable documents are made available to the customer for review before acceptance is requested. | Presentation format (PDF, scrollable text, web page, printed document) is implementation-specific. Must meet accessibility standards. |
| 3. Capture mandatory acceptance | The customer actively accepts all mandatory consent categories (Terms & Conditions, Privacy Policy, and any applicable product-specific terms). | Acceptance mechanism is implementation-specific. Must be explicit and active. Pre-selection is not permitted. |
| 4. Capture optional preferences | The customer is given a clear choice for each optional consent category (e.g. marketing communications). Their selection is recorded regardless of whether they opt in or out. | Presentation of optional consents must make the optional nature clear. Declining optional consents must not affect mandatory consents or block account opening. |
| 5. Apply acceptance record | The acceptance mechanism is applied (e-signature, click-to-accept, OTP, or equivalent), creating a binding record of the customer's agreement. | The specific mechanism is implementation-specific and must comply with applicable e-signature legislation. |
| 6. Generate and store audit record | A complete consent audit record is created and stored in the Document Storage system (eSign Archive). The record captures all required audit elements. | The storage format and system are implementation-specific. The minimum data elements described in Section 3.4 must always be captured. |
| 7. Confirm to customer | The customer receives confirmation that their consent has been recorded. Copies of accepted documents are made available for the customer to retain. | Confirmation may be provided on-screen, via notification, or as a downloadable document. The method is implementation-specific. |

## 8.5 Consent Categories

The following consent categories represent the typical set required during CASA onboarding. The specific categories, their naming, and their regulatory basis will vary by bank and jurisdiction. Banks must determine the applicable consent categories in consultation with their Legal and Compliance teams.

| Consent Category | Nature | Description |
|---|---|---|
| Terms & Conditions | Mandatory | The contractual agreement governing the customer's CASA account. Defines the rights and obligations of both the customer and the bank. Must be accepted before the account can be opened. |
| Privacy Policy / Data Processing | Mandatory | The bank's statement of how it collects, uses, stores, and shares the customer's personal data. Required under data protection legislation. Must be accepted before personal data can be processed for account opening purposes. |
| Marketing Consent | Optional | The customer's permission for the bank to send personalised marketing communications, product offers, and promotional content. The customer must be able to opt in or opt out freely. Declining does not affect account opening. |
| Product-Specific Terms | Mandatory where applicable | Additional terms specific to products enrolled during onboarding — for example, debit card terms, digital banking terms, or overdraft terms. Required where the customer has selected products with separate term sets. |
| Third-Party Data Sharing | Conditional | Consent for the bank to share the customer's data with defined third parties for defined purposes (e.g. credit bureau reporting, loyalty partners). Required only where applicable and must be granular — consent for one purpose does not imply consent for another. |
| Electronic Communications Preference | Optional | The customer's preference for receiving account communications electronically (e.g. e-statements instead of paper statements). May be required in some jurisdictions for the bank to cease paper communications. |

| 📌 Implementation Note |
|---|
| The consent categories listed above are illustrative. Each bank must define its own |
| consent framework in consultation with its Legal and Compliance teams, taking into account |
| applicable data protection law, consumer banking regulation, and internal policy. |
| The number, naming, and grouping of consent categories will vary by implementation. |

## 8.6 Consent Versioning & Updates

Documents presented during onboarding will change over time as the bank updates its terms, policies, or product features. The Consent & Agreement Service must manage document versions in a way that maintains the integrity of existing consent records while ensuring new customers always receive the current version.

| Versioning Requirement | Description |
|---|---|
| Every document must have a version identifier | Each version of a document must carry a unique version number or effective date. This identifier must be recorded in every consent audit record that references the document. |
| Customers always receive the current version | The system must present only the current, approved version of each document. Outdated versions must not be presented to new customers. |
| Version changes do not invalidate prior consent | A customer who accepted a previous version of a document remains bound by that version. The audit record confirms which version they accepted. |
| Material changes may require re-consent | Where a document is updated in a way that materially changes the customer's rights or obligations, the bank's policy and applicable regulation may require existing customers to re-consent. Re-consent processes are outside the scope of onboarding. |
| In-progress applications use the version current at acceptance | If a customer saves their application and resumes after a document version change, they must be presented with the updated version and must re-accept. Their prior in-progress acceptance of the old version is not carried forward. |

## 8.7 Exception Handling

| Exception | Required Handling | Impact |
|---|---|---|
| Customer declines mandatory consent | The application cannot proceed. The customer must be clearly informed that the account cannot be opened without acceptance of mandatory terms. The customer is offered the option to exit or reconsider. | Application blocked. Customer informed. No account opened. |
| Customer declines optional consent (e.g. marketing) | The application proceeds normally. The declined preference is recorded and applied downstream. The customer must not be penalised or disadvantaged for declining optional consent. | No impact on account opening. Preference recorded and applied. |
| Document not available (technical failure) | The consent stage cannot be completed until all required documents are available. The application is held and the customer is notified of the delay. | Application paused. Customer notified. Stage resumes when document is available. |
| Consent audit record fails to write | The acceptance must not be confirmed to the customer and the application must not proceed until the audit record has been successfully written to Document Storage. | Application held until record is confirmed written. Critical failure requiring immediate Operations attention. |
| Customer re-opens a saved application after document version change | The customer must be presented with the updated document and must re-accept. Prior acceptance of the old version is not valid for the new version. | Customer re-reads and re-accepts. Updated version recorded in audit record. |
| Assisted onboarding — agent records acceptance | The agent must follow the bank's defined procedure for recording customer acceptance in assisted channels. Both the customer's acceptance and the agent's identity must be captured. | Acceptance recorded with agent identity. Physical document scanned and stored where applicable. |

## 8.8 Business Rules

Covers: Presentation Rules · Acceptance Rules · Audit Record Rules · Versioning Rules

### Presentation Rules

- Full document must be presented: The complete document must be made available to the customer before acceptance is requested. Presenting a summary in place of the full document is not acceptable unless the full document remains separately accessible.
- Current version only: Only the current, bank-approved version of each document may be presented. The version number and effective date must be visible to the customer.
- Document must be accessible: Documents must be presented in a format the customer can read, save, and retain. Digital documents must be downloadable. Font size, contrast, and language must meet accessibility standards.

### Acceptance Rules

- Acceptance must be explicit and active: The customer must take a deliberate action to accept each consent category. Pre-ticked boxes, implied consent, or auto-acceptance are not permitted under any circumstances.
- Mandatory and optional consents must be clearly distinguished: The customer must be able to identify which consent categories are required for account opening and which are optional without ambiguity.
- Each consent category is independent: Acceptance of one consent category does not imply or trigger acceptance of any other. Each must be accepted separately.
- Declining optional consent does not block the application: A customer who declines marketing consent or any other optional consent must not be prevented from opening their account or penalised in any way.

### Audit Record Rules

- Audit record must be written before acceptance is confirmed: The application must not advance to the next stage until the consent audit record has been successfully written to Document Storage. Acceptance confirmation to the customer must only occur after successful record creation.
- Audit records are immutable: Once written, a consent audit record cannot be modified or deleted. Subsequent changes to consent (e.g. marketing opt-out post-onboarding) create new records; the original is always preserved.
- Audit records must include the minimum required data elements: Every consent audit record must capture: customer identifier, document name and version, date and time of acceptance, acceptance mechanism, consent outcome per category, channel, and agent identity where applicable.
- Audit records must be retained for the required period: Consent records must be retained for at least the duration of the account relationship plus the regulatory retention period. The specific retention period is defined by the bank's Data Retention Policy.

### Versioning Rules

- In-progress consent is invalidated by a document version change: If a document is updated while a customer's application is in progress, the customer must be presented with the new version and must re-accept upon resuming. Their prior acceptance of the old version is not carried forward.
- Version identifier must be stored: The specific version of each document presented to the customer must be recorded in the consent audit record.

## 8.9 Key Business Concepts

| Concept | Definition |
|---|---|
| Informed Consent | Consent given by a customer who has had a genuine opportunity to read and understand the documents they are accepting. The opposite of consent obtained through obscure language, pre-ticked boxes, or time pressure. |
| Explicit Consent | Consent given through a clear, affirmative action by the customer. Silence, inaction, or pre-selection does not constitute explicit consent. |
| Mandatory Consent | A consent category that the customer must accept for the account opening to proceed. Examples: Terms & Conditions, Privacy Policy. |
| Optional Consent | A consent category where the customer's choice (opt in or opt out) does not affect the account opening outcome. Example: Marketing communications consent. |
| e-Signature | An electronic mechanism used to bind a customer's identity to their acceptance of a document. The specific form (typed name, drawn signature, OTP-based, cryptographic) varies by implementation and must comply with applicable legislation. |
| Consent Audit Record | The durable, timestamped record of a customer's consent event, capturing what they accepted, which version, when, and how. Must be retained for regulatory and legal purposes. |
| Document Version | A specific release of a document (e.g. Terms & Conditions v2.1, effective 1 January 2025). Every consent audit record must reference the exact version of each document presented. |
| Consent Withdrawal | The act of a customer revoking a previously given consent (e.g. opting out of marketing). Withdrawal does not delete the original consent record — it creates a new record documenting the withdrawal. |
| Re-consent | The process of obtaining fresh consent from an existing customer following a material change to a document or a change in the customer's circumstances. Managed outside the onboarding journey. |
| Privacy Policy | The bank's statement of how it collects, processes, stores, and shares customer personal data. Acceptance is required by data protection regulation before personal data can be processed. |
| Marketing Consent | The customer's permission for the bank to send personalised marketing communications and product offers. Always optional. Governs post-onboarding marketing communications. |

---

[← Customer Onboarding](README.md) · [Previous: Card Enrollment Service](07-card-enrollment-service.md) · [Next: Account Creation & Service Provisioning](09-account-creation-service-provisioning.md)
