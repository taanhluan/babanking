# 10. External System Integration

> Customer Onboarding — module 10 of 10. Exported from Development `customer-onboarding` v13.

[← Customer Onboarding](README.md) · [Previous: Account Creation & Service Provisioning](09-account-creation-service-provisioning.md)

## Contents

- [10.1 Overview](#101-overview)
- [10.2 External Systems](#102-external-systems)
- [10.3 Cross-System Integration Summary](#103-cross-system-integration-summary)
- [10.4 Key Business Concepts](#104-key-business-concepts)

## 10.1 Overview

External systems are the platforms and services that exist outside the CASA Onboarding Services layer but are essential to the successful completion of the onboarding journey. The CASA Onboarding Services act as the orchestration layer — they collect, validate, and process customer information, but they depend on external systems to perform specialised functions such as storing core banking records, issuing physical cards, screening customers for compliance, and delivering communications.

Each external system has a defined integration point, a specific set of functions it performs within the onboarding context, and a clear boundary of responsibility. The CASA Onboarding Services do not replicate the capabilities of these external systems — they consume them.

| External System | Primary Role in Onboarding | Integration Type |
|---|---|---|
| Core Banking | Create and activate the customer's CIF and CASA account. Hold the authoritative account record. | Synchronous API — Account Opening Orchestrator |
| Card Management System | Receive card requests, generate PAN, produce and dispatch the physical card, manage card lifecycle. | Asynchronous — Card Request Queue |
| KYC / AML Providers | Perform identity document verification, AML watchlist screening, PEP and sanctions checks. | Synchronous API — Identity Verification & Compliance & Risk |
| Communication Providers | Deliver customer-facing notifications via SMS, Email, and Push throughout the onboarding journey. | Asynchronous — Notification Queue |
| BI / Analytics | Receive onboarding data for business reporting, dashboards, and performance analytics. | Asynchronous data feed — Dashboard & Onboarding Hub |
| Document Storage | Store and retrieve onboarding documents: uploaded files, eSign records, statements, and audit trail. | Synchronous / Asynchronous — multiple services |

## 10.2 External Systems

Covers: Core Banking · Card Management System · KYC / AML Providers · Communication Providers · BI / Analytics · Document Storage

### Core Banking

#### 2.1.1 Overview

| 2.1.1 Overview |
|---|
| Core Banking is the bank's central system of record. It is the authoritative platform where customer profiles and CASA accounts are created, stored, and managed throughout the customer lifecycle. Within the CASA Onboarding context, Core Banking is the ultimate destination of all onboarding activity — the onboarding journey is considered complete only when a live, active account exists in Core Banking. |
| The CASA Onboarding Services do not store the customer's account in their own systems. They orchestrate the creation of the account in Core Banking and read account data back from it for display on the Dashboard & Onboarding Hub. |

#### 2.1.2 Functions in CASA Onboarding

| 2.1.2 Functions in CASA Onboarding |
|---|
| See the table below. |

| Function | Description | Triggered By |
|---|---|---|
| CIF (Customer Information File) Creation | Create the master customer record in Core Banking using the verified identity and information collected during onboarding. The CIF is the authoritative customer profile across all bank systems. | Account Opening Orchestrator (Service 10) — after all onboarding stages are complete and the application is approved. |
| CASA Account Creation | Open the customer's Current or Savings Account in Core Banking, linked to the newly created CIF. Assign an account number. | Account Opening Orchestrator (Service 10) — immediately after CIF creation is confirmed. |
| Product Configuration | Apply the product parameters selected during the Account Setup stage (Service 5): account tier, limits, interest rates, fees, and features. | Account Opening Orchestrator (Service 10) — as part of service provisioning. |
| Transaction Readiness | Activate the account for transactions: enable deposits, withdrawals, transfers, and payment processing. | Account Opening Orchestrator (Service 10) — final step of account activation. |
| Account Data Retrieval | Provide account details (account number, balance, status, product details) to the Dashboard & Onboarding Hub for display to the customer upon account activation. | Dashboard & Onboarding Hub (Service 12) — real-time read at dashboard load. |

#### 2.1.3 Data Exchanged

| 2.1.3 Data Exchanged |
|---|
| See the table below. |

| Data Direction | Data Elements |
|---|---|
| Onboarding → Core Banking (Write) | Customer full legal name, date of birth, nationality, ID number, residential address, contact details, employment information, tax declarations, source of funds, account type, product configuration, limit settings, branch and RM assignment. |
| Core Banking → Onboarding (Read) | Account number, CIF ID, account status, current balance, available balance, account opening date, activated product features, transaction readiness confirmation. |

#### 2.1.4 Integration Rules

| 2.1.4 Integration Rules |
|---|
| - CIF creation is a prerequisite for account creation: The CASA account cannot be created in Core Banking until the CIF has been successfully created and a CIF ID has been returned. |
| - Onboarding does not proceed without Core Banking confirmation: The Account Opening Orchestrator must receive a successful account creation confirmation from Core Banking before the onboarding journey can progress to the Dashboard & Onboarding Hub. |
| - Core Banking is the system of record: In the event of any data discrepancy between the onboarding application record and Core Banking, the Core Banking record is authoritative. |
| - ETB customers use existing CIF: For Existing-to-Bank (ETB) customers opening an additional CASA account, the existing CIF is retrieved and linked to the new account. A new CIF is not created. |
| - Failure handling: If Core Banking is unavailable or returns an error during account creation, the application is held in Approved status and the Account Opening Orchestrator retries at defined intervals. Operations is alerted if the failure persists beyond the defined SLA. |

#### 2.1.5 Scope Boundary

| 2.1.5 Scope Boundary |
|---|
| See the table below. |

| In Scope (CASA Onboarding Interaction) | Out of Scope (Core Banking Internal) |
|---|---|
| CIF creation for new-to-bank customers | Ongoing account servicing and maintenance |
| CIF retrieval for existing customers | Transaction processing and payment rails |
| CASA account creation and activation | Account closure and archival |
| Product and limit configuration at opening | Interest calculation and fee charging |
| Account data read-back for dashboard display | Credit product management |

### Card Management System

#### 2.2.1 Overview

| 2.2.1 Overview |
|---|
| The Card Management System is the external platform responsible for the full lifecycle of the customer's debit card — from receiving the card request through to production, dispatch, activation, and ongoing card management. It is triggered during CASA Onboarding when the customer completes the Card Enrollment step (Service 7) and the Card Enrollment Service places a card request onto the Card Request Queue. |
| The Card Management System operates independently of the onboarding journey. Once the card request is received, it processes the request asynchronously — the customer's onboarding can continue and complete without waiting for the card to be produced or dispatched. |

#### 2.2.2 Functions in CASA Onboarding

| 2.2.2 Functions in CASA Onboarding |
|---|
| See the table below. |

| Function | Description | Trigger |
|---|---|---|
| Card Order | Receive the card request from the Card Request Queue and create a formal card production order. | Card request placed on Card Request Queue by Service 7. |
| PAN Generation | Generate and assign a unique Primary Account Number (PAN) to the customer's card, linked to their CASA account number. | Upon receipt of card order. |
| Card Production | Manufacture and personalise the physical card: emboss the customer's name, encode the PAN, expiry date, and (where applicable) the customer's self-selected PIN. | After PAN generation. |
| Card Dispatch | Dispatch the physical card to the customer's selected delivery destination: home address, alternative address, or branch for collection. | After card production is complete. |
| Card Activation | Enable the card for use after the customer activates it via the mobile app, web portal, ATM, or branch. | Triggered by customer action post-receipt of card. |
| Card Status Management | Manage the card's status throughout its lifecycle: active, suspended, expired, pending replacement. | Ongoing — post onboarding. |
| Card Replacement | Issue a replacement card when the original is lost, stolen, damaged, or expired. | Customer request or system trigger — post onboarding. |
| Card Blocking | Temporarily or permanently block the card to prevent transactions, triggered by the customer or by a fraud event. | Customer request or fraud trigger — post onboarding. |

#### 2.2.3 Data Exchanged

| 2.2.3 Data Exchanged |
|---|
| See the table below. |

| Data Direction | Data Elements |
|---|---|
| Onboarding → Card Management (Write via Queue) | Account number, customer name, card type selected, card network, card design, delivery method, delivery address, PIN setup method, self-selected PIN (encrypted). |
| Card Management → Onboarding (Status updates) | Card request reference, card production status, dispatch confirmation, estimated delivery date, activation status. Used to trigger customer notifications via Service 11. |

#### 2.2.4 Integration Rules

| 2.2.4 Integration Rules |
|---|
| - Integration is asynchronous via Card Request Queue: The Card Enrollment Service places the card request on the Card Request Queue and does not wait for the Card Management System to respond before the onboarding journey continues. |
| - Card request reference is mandatory: A unique card request reference must be generated at the point of submission and recorded on the application for tracking and exception management. |
| - PIN security: Self-selected PINs are encrypted at the point of entry and transmitted securely to the Card Management System. No onboarding system retains the PIN after transmission. |
| - Card lifecycle events trigger notifications: Card dispatch and card activation events from the Card Management System trigger customer notifications via the Notification Service (Service 11). |
| - Virtual card activation is immediate: Where a virtual card is selected, the Card Management System activates the virtual card immediately upon account activation, without a production or dispatch step. |

### KYC / AML Providers

#### 2.3.1 Overview

| 2.3.1 Overview |
|---|
| KYC / AML Providers are external third-party services that perform specialised identity verification and compliance screening functions on behalf of the bank. These providers have access to government databases, international watchlists, and adverse media sources that the bank's own systems do not maintain directly. |
| Within the CASA Onboarding journey, KYC / AML Providers are engaged at two distinct stages: identity verification (Service 2) for document authentication and biometric matching, and compliance screening (Service 4) for AML, PEP, and sanctions checks. Together, their outputs feed into the Bank Decision Engine to produce the final risk classification and onboarding decision. |

#### 2.3.2 Functions in CASA Onboarding

| 2.3.2 Functions in CASA Onboarding |
|---|
| See the table below. |

| Function | Description | Triggered By |
|---|---|---|
| ID Verification | Authenticate the customer's identity document: validate document format, detect tampering and fraud, perform OCR data extraction, and execute face match and liveness detection against the customer's selfie or video. | Identity Verification Service (Service 2) — during eKYC processing. |
| AML Screening | Screen the customer's verified identity against international AML watchlists, internal blacklists, and adverse media sources to identify potential money laundering or financial crime risk. | Compliance & Risk Service (Service 4) — after Verified Identity Profile is generated. |
| PEP / Sanctions Screening | Check the customer's identity against Politically Exposed Person (PEP) databases and international sanctions lists (OFAC, UN, and others) to identify prohibited or high-risk individuals. | Compliance & Risk Service (Service 4) — in parallel with AML screening. |

#### 2.3.3 Provider Types

| 2.3.3 Provider Types |
|---|
| See the table below. |

| Provider Type | Role & Examples |
|---|---|
| eKYC / Biometric Provider | Provides document authentication, OCR extraction, face matching, and liveness detection services. Integrates with the Identity Verification Service (Service 2). Examples include providers such as Jumio, Onfido, or equivalent. |
| AML Screening Provider | Provides watchlist screening against global AML databases and adverse media. Integrates with the Compliance & Risk Service (Service 4). Examples include Dow Jones Risk & Compliance, Refinitiv World-Check, or equivalent. |
| PEP / Sanctions Provider | Provides screening against PEP databases and international sanctions lists (OFAC, UN, EU, and local regulatory lists). May be the same provider as AML or a separate specialised service. |
| National Identity Database (NID) | Government-maintained database of registered citizen identities. Used as an optional cross-reference during eKYC to achieve the highest confidence level. Availability depends on government API access. |

#### 2.3.4 Data Exchanged

| 2.3.4 Data Exchanged |
|---|
| See the table below. |

| Data Direction | Data Elements |
|---|---|
| Onboarding → KYC Provider (eKYC) | Document images (front and back), selfie or video capture, customer-declared identity data (name, date of birth, nationality). |
| KYC Provider → Onboarding | Document authenticity result, extracted identity data (OCR), face match score, liveness detection result, overall eKYC confidence level. |
| Onboarding → AML/PEP Provider | Verified identity data from the Verified Identity Profile: full name, date of birth, nationality, country of residence, document number. |
| AML/PEP Provider → Onboarding | Match status (Clear / Possible Match / Confirmed Match), risk indicators, PEP status, sanctions match details, adverse media flags. |

#### 2.3.5 Integration Rules

| 2.3.5 Integration Rules |
|---|
| - AML screening only begins after eKYC is complete: The Compliance & Risk Service will not initiate AML or PEP/Sanctions screening until a Verified Identity Profile has been successfully generated by the Identity Verification Service. |
| - Provider results feed the Bank Decision Engine: All KYC and AML provider results are aggregated by the Bank Decision Engine to produce the final risk classification: Low (Approve), Medium (Manual Review), or High (Reject). |
| - NID verification is optional but consequential: NID verification is not always available. A NID match achieves the highest confidence level. NID unavailability does not fail the application but may affect the risk classification. |
| - Provider failure handling: If an external KYC or AML provider is temporarily unavailable, the application is held at the relevant stage and the provider is retried at defined intervals. Persistent failures escalate to the Operations team. |
| - Data minimisation: Only the minimum data required for the specific screening function is transmitted to each provider. Providers are not given access to the full customer application record. |

### Communication Providers

#### 2.4.1 Overview

| 2.4.1 Overview |
|---|
| Communication Providers are the external delivery services responsible for physically sending notifications to customers across three channels: SMS, Email, and Push notification. They are engaged by the Notification Service (Service 11), which acts as the internal orchestration layer for all customer communications during and after the onboarding journey. |
| Communication Providers do not determine what messages are sent or when — that is the responsibility of the Notification Service. The providers are purely the delivery mechanism: they receive a message payload from the Notification Service and deliver it to the customer via the specified channel. |

#### 2.4.2 Channel Types

| 2.4.2 Channel Types |
|---|
| See the table below. |

| Channel | Provider Function | Primary Use in Onboarding |
|---|---|---|
| SMS Gateway | Deliver short text messages to the customer's registered mobile number. Used for time-sensitive communications requiring immediate delivery. | OTP delivery for authentication, application status updates, card dispatch alerts, account activation confirmation. |
| Email Service | Deliver formatted email messages to the customer's registered email address. Supports HTML content, attachments (e.g. PDF documents), and clickable links. | Welcome email, detailed account confirmation, document delivery, Terms & Conditions confirmation, re-upload requests. |
| Push Notification Service | Deliver push notifications to the customer's registered mobile device via the bank's mobile application. | Real-time onboarding progress updates, next step reminders, card activation prompts, fund account reminders. |

#### 2.4.3 Integration Rules

| 2.4.3 Integration Rules |
|---|
| - Communication Providers are invoked by the Notification Service only: No onboarding service communicates directly with Communication Providers. All customer communications are routed through Service 11 (Notification Service), which manages channel selection, template rendering, and delivery tracking. |
| - Channel selection follows customer preference: The customer's preferred communication channel, captured during the Customer Information stage, determines the primary delivery channel for each notification. |
| - Transactional vs marketing consent: Transactional notifications (OTP, account confirmation, card dispatch) are sent regardless of marketing consent. Marketing notifications (cross-sell offers, fund account reminders) are only sent to customers who have provided marketing consent during the Consent & Agreement stage (Service 8). |
| - Delivery tracking: The Communication Provider must return a delivery status for every notification sent. This status is recorded by the Notification Service against the application record. Failed deliveries trigger a retry via an alternative channel where available. |
| - Notification failure does not block onboarding: A failure to deliver a notification does not halt the onboarding journey. The application continues to progress. Failed notifications are logged and retried. |

### BI / Analytics

#### 2.5.1 Integration Rules

| 2.5.1 Integration Rules |
|---|
| The BI / Analytics platform is the external business intelligence system that receives onboarding data from the CASA Onboarding Services and transforms it into reports, dashboards, and analytical insights for business stakeholders. It enables the bank to track acquisition performance, monitor onboarding funnel efficiency, measure product mix and channel effectiveness, and understand new customer cohort behaviour. |
| The BI / Analytics platform is a consumer of onboarding data — it does not participate in or influence the onboarding journey. Data is fed to it asynchronously and its availability does not affect the customer's onboarding experience. |

#### 2.5.2 Functions in CASA Onboarding

| 2.5.2 Functions in CASA Onboarding |
|---|
| See the table below. |

| Function | Description | Data Source |
|---|---|---|
| Reports | Generate structured business reports on onboarding performance: application volumes, completion rates, rejection rates, and channel breakdown. Available on demand and on scheduled basis. | Onboarding completion data from Dashboard & Onboarding Hub (Service 12) and Application Management (Service 1). |
| Dashboards | Provide real-time and near-real-time visual dashboards for operational and management monitoring: onboarding funnel, SLA compliance, drop-off by stage, and channel performance. | Application status feed from Application Management (Service 1) and all onboarding services. |
| Analytics | Enable deeper analytical work: cohort analysis, customer segment profiling, cross-sell conversion analysis, time-to-activation trends, and campaign attribution. | Full onboarding data set including customer profile, product selections, enrollment choices, and post-onboarding engagement signals from Service 12. |

#### 2.5.2 Integration Rules

| 2.5.2 Integration Rules |
|---|
| - Data feed is asynchronous: Onboarding data is fed to the BI / Analytics platform asynchronously. BI/Analytics availability does not affect the customer's onboarding journey. |
| - Data is for internal use only: Onboarding data fed to BI/Analytics is used for internal business reporting only. Individual customer data is not shared with third-party analytics providers without explicit consent. |
| - Data integrity: Data fed to BI/Analytics must match the records held in the onboarding Application DB. Any discrepancy must be flagged and investigated. |
| - Failure handling: If the BI/Analytics feed fails, data is queued locally and retransmitted when the platform is available. No onboarding data is lost due to a BI/Analytics outage. |

### Document Storage

#### 2.6.1 Overview

| 2.6.1 Overview |
|---|
| Document Storage is the external secure storage platform that holds all documents generated, collected, and signed during the CASA Onboarding journey. It serves as the authoritative repository for onboarding documentation — ensuring that every document is securely stored, retrievable by authorised parties, and retained for the periods required by regulation and the bank's data retention policy. |
| Document Storage is not a passive archive. It is actively read from by multiple onboarding services — most notably the Dashboard & Onboarding Hub, which retrieves documents for customer access — and it is written to at multiple points throughout the journey whenever a document is uploaded, generated, or signed. |

#### 2.6.2 Storage Components

| 2.6.2 Storage Components |
|---|
| See the table below. |

| Component | Description | Content Stored |
|---|---|---|
| Document Store | Primary storage for all documents uploaded by the customer or generated by the system during onboarding. | Customer-uploaded identity documents, selfies/videos (eKYC), supporting documents (address proof, income proof), account confirmation letter, Terms & Conditions, generated PDFs. |
| eSign Archive | Secure, tamper-evident storage for all electronic signature records. Provides legal evidence of the customer's consent and agreement. | e-Signature records with timestamp, IP address, device information, document version signed, consent categories accepted (T&C, Privacy, Marketing). |
| Audit Trail | Immutable log of all document-related events: uploads, retrievals, generation events, access logs, and any document status changes. | Document upload events, access logs (who retrieved which document and when), generation timestamps, deletion or expiry events. |

#### 2.6.3 Documents Stored During Onboarding

| 2.6.3 Documents Stored During Onboarding |
|---|
| See the table below. |

| Document | Storage Component | Retention |
|---|---|---|
| Identity document (ID card, passport) | Document Store | Duration of account relationship + regulatory retention period (typically 5–7 years post closure). |
| Selfie / liveness video (eKYC) | Document Store | Duration of onboarding + defined retention period per data privacy policy. |
| Supporting documents (address proof, income proof) | Document Store | Duration of account relationship + regulatory retention period. |
| Signed Terms & Conditions | eSign Archive | Duration of account relationship + regulatory retention period. |
| Privacy Policy acknowledgement | eSign Archive | Duration of account relationship + regulatory retention period. |
| e-Signature record | eSign Archive | Duration of account relationship + legal minimum (typically 7 years). |
| Tax declaration record | Document Store / eSign Archive | Regulatory retention period per CRS/FATCA requirements (typically 7 years). |
| Marketing consent record | eSign Archive | Duration of consent validity + regulatory requirement. |
| Account confirmation letter | Document Store | Duration of account relationship. |
| Card terms acknowledgement | eSign Archive | Duration of card relationship. |

#### 2.6.4 Integration Rules

| 2.6.4 Integration Rules |
|---|
| - Documents are stored at the point of creation or upload: Every document uploaded by the customer or generated by the system is written to Document Storage immediately. No document is held temporarily in an onboarding service's own storage. |
| - eSign records are immutable: Once an e-Signature record is written to the eSign Archive, it cannot be modified or deleted. Any subsequent consent changes create a new record; the original is retained. |
| - Audit trail is immutable: All document access and event records in the Audit Trail are immutable. No record can be altered after creation. |
| - Access is role-based: Document retrieval is restricted to authorised parties: the customer (via the dashboard), bank staff (per their role permissions), and the Account Opening Orchestrator (for CIF population). Unauthorised access attempts are logged. |
| - Documents available within 24 hours of account opening: All onboarding documents must be retrievable by the customer via the Dashboard & Onboarding Hub within 24 hours of account activation. |
| - Retention policy governs deletion: Documents are retained for the periods defined in the bank's Data Retention Policy and applicable regulatory requirements. Deletion is only permitted after the retention period expires and must be logged in the Audit Trail. |

## 10.3 Cross-System Integration Summary

| External System | Primary Onboarding Service | Criticality |
|---|---|---|
| Core Banking | Account Opening Orchestrator (10) | CRITICAL — onboarding cannot complete without it |
| Card Management System | Card Enrollment Service (7) | HIGH — card request queued; journey continues |
| KYC / AML Providers | Identity Verification (2) & Compliance (4) | CRITICAL — onboarding cannot proceed without results |
| Communication Providers | Notification Service (11) | HIGH — failure does not block onboarding |
| BI / Analytics | Dashboard & Onboarding Hub (12) | MEDIUM — failure does not affect customer experience |
| Document Storage | Multiple services throughout journey | HIGH — documents required for compliance and audit |

## 10.4 Key Business Concepts

| Concept | Definition |
|---|---|
| External System | A platform or service that exists outside the CASA Onboarding Services layer but is integrated with and depended upon by one or more onboarding services. |
| System of Record | The authoritative source of truth for a particular data domain. Core Banking is the system of record for all customer and account data. |
| Synchronous Integration | An integration where the calling service waits for a response from the external system before continuing. Used where the result is needed immediately to proceed (e.g. Core Banking account creation). |
| Asynchronous Integration | An integration where the calling service places a request on a queue and continues without waiting for the external system to respond. Used where the action can be processed independently (e.g. card request, notifications). |
| CIF (Customer Information File) | The master customer record in Core Banking. Created during onboarding for new-to-bank customers; retrieved for existing customers opening additional accounts. |
| PAN (Primary Account Number) | The unique 16-digit number on a debit card generated by the Card Management System and linked to the customer's CASA account. |
| eKYC Provider | A third-party service that performs document authentication, OCR extraction, face matching, and liveness detection as part of the identity verification process. |
| AML Provider | A third-party service that screens customer identities against international anti-money laundering watchlists and adverse media sources. |
| PEP / Sanctions Provider | A third-party service that checks customer identities against Politically Exposed Person databases and international sanctions lists. |
| NID (National Identity Database) | A government-maintained database used for optional cross-referencing during eKYC to achieve the highest confidence level of identity verification. |
| eSign Archive | The tamper-evident storage repository for electronic signature records, providing legal evidence of the customer's consent and agreement during onboarding. |
| Audit Trail | An immutable log of all document-related events during onboarding, used to support regulatory examination and internal audit. |
| Data Retention Policy | The bank's policy defining how long each category of customer data and documentation must be retained before it may be deleted. |

---

[← Customer Onboarding](README.md) · [Previous: Account Creation & Service Provisioning](09-account-creation-service-provisioning.md)
