# 7. Card Enrollment Service

> Customer Onboarding — module 7 of 10. Exported from Development `customer-onboarding` v13.

[← Customer Onboarding](README.md) · [Previous: Digital Banking Enrollment Service](06-digital-banking-enrollment-service.md) · [Next: Consent & Agreement Service](08-consent-agreement-service.md)

## Contents

- [7.1 Overview](#71-overview)
- [7.2 Business Purpose](#72-business-purpose)
- [7.3 Card Enrollment Capabilities](#73-card-enrollment-capabilities)
- [7.4 Card Enrollment Journey](#74-card-enrollment-journey)
- [7.5 Card Lifecycle — Post Submission (External Card Management System)](#75-card-lifecycle--post-submission-external-card-management-system)
- [7.6 Enrollment Outcomes](#76-enrollment-outcomes)
- [7.7 Exception & Failure Handling](#77-exception--failure-handling)
- [7.8 Business Rules](#78-business-rules)
- [7.9 Key Business Concepts](#79-key-business-concepts)

## 7.1 Overview

Covers: Business Definition · Business Responsibilities · Scope Boundary · Relationship with Other Domains

### Business Definition

The Card Enrollment Service is the onboarding capability responsible for collecting the customer's debit card preferences and submitting a card issuance request to the Card Management System during the CASA account opening journey.

Card enrollment takes place after the customer has configured their account and product settings (Service 5) and enrolled in digital banking (Service 6). It captures the customer's card type selection, design preference, delivery preference, and PIN preference — and then submits a formal card request to the external Card Management System via the Card Request Queue.

The Card Enrollment Service does not produce or dispatch the physical card. Card production, PAN generation, dispatch, and activation are all handled by the external Card Management System. This service is solely responsible for capturing the customer's preferences and submitting a well-formed card request.

### Business Responsibilities

| Responsibility | Description |
|---|---|
| Present debit card options | Display the available debit card types and designs that the customer is eligible for based on their selected CASA product. |
| Capture debit card selection | Record the customer's chosen debit card type (e.g. standard, premium, co-branded). |
| Capture card type selection | Record any additional card configuration choices (e.g. contactless, virtual card alongside physical card). |
| Capture delivery preference | Record where and how the customer wants their physical card delivered: home address, branch collection, or alternative address. |
| Capture PIN preference | Record the customer's preferred PIN setup method: system-generated PIN delivered by mail or SMS, or self-selected PIN set during onboarding. |
| Validate card request data | Ensure all required card enrollment fields are completed and valid before submission. |
| Submit card request | Place a formal card issuance request onto the Card Request Queue for processing by the Card Management System. |
| Confirm submission to customer | Notify the customer that their card request has been successfully submitted and communicate expected delivery timelines. |

### Scope Boundary

| In Scope — Card Enrollment Service | Out of Scope (Handled by External Card Management System) |
|---|---|
| Debit card type and design selection | PAN (Primary Account Number) generation |
| Delivery address and preference capture | Card production and physical manufacturing |
| PIN setup method selection | Card dispatch and physical delivery |
| Card request submission to Card Request Queue | Card activation |
| Submission confirmation to customer | Card status management (active, blocked, replaced) |
| — | Card replacement and card blocking |

| 📌 Key Boundary Principle |
|---|
| The Card Enrollment Service ends when the card request is successfully placed onto the Card Request Queue. |
| Everything that happens after that point — PAN generation, production, dispatch, activation — |
| is the responsibility of the external Card Management System. |

### Relationship with Other Domains

| Domain / System | Relationship | What Is Exchanged |
|---|---|---|
| Account Setup Service (Service 5) | Receives context | Account type, product configuration, and customer eligibility determine which card options are available for selection. |
| Digital Banking Enrollment Service (Service 6) | Preceded by | Card enrollment occurs after digital banking enrollment is complete in the onboarding sequence. |
| Consent & Agreement Service (Service 8) | Followed by | Consent capture occurs after card enrollment. Card terms may be included in the consent presented to the customer. |
| Card Request Queue | Submits to | A formal card issuance request is placed onto the Card Request Queue for asynchronous processing by the Card Management System. |
| Card Management System (External) | Triggers | The card request initiates the full card lifecycle: PAN generation, card production, dispatch, and activation in the external Card Management System. |
| Notification Service (Service 11) | Triggers | Card request submission confirmation and card dispatch/activation notifications are sent to the customer via the Notification Service. |
| Application Management (Service 1) | Reports to | Stage completion and card request reference are reported back to Application Management for tracking. |
| Account Opening Orchestrator (Service 10) | Provides data to | Card enrollment status and card request reference are included in the service provisioning record used by the Account Opening Orchestrator. |

## 7.2 Business Purpose

The Card Enrollment Service ensures that every new CASA account holder has a debit card request in place at the point of account opening. Issuing a debit card is a core part of the CASA onboarding value proposition — without it, the customer cannot access their funds through ATMs, point-of-sale terminals, or digital payment channels.

| Business Purpose | Why It Matters |
|---|---|
| Enable Immediate Account Access | A debit card is the primary way most customers will access their new CASA account for cash withdrawals and payments. Capturing the card request during onboarding ensures the card is in production before the account is even activated. |
| Deliver Customer Choice | Customers have different preferences for card type, design, and delivery method. Capturing these during onboarding ensures the card issued matches the customer's actual preferences, reducing reissuance requests. |
| Support Secure Card Setup | Capturing the customer's preferred PIN setup method during onboarding ensures the PIN is set securely and in a way the customer is comfortable with before the card is dispatched. |
| Drive Digital Adoption | Where a virtual card option is available alongside a physical card, capturing this preference during onboarding accelerates the customer's ability to make digital payments from day one. |
| Reduce Post-Onboarding Friction | Handling card enrollment during onboarding eliminates the need for the customer to make a separate card request after their account is opened, reducing post-onboarding service interactions. |

## 7.3 Card Enrollment Capabilities

The Card Enrollment Service delivers five core capabilities as defined in the CASA Onboarding Business Architecture (Service 7):

| Capability | Description | Business Outcome |
|---|---|---|
| Debit Card Selection | The system presents the debit card options the customer is eligible for based on their selected CASA product and account tier. The customer selects their preferred debit card. | Customer's chosen debit card type recorded on the card request. |
| Card Type Selection | Customer selects additional card configuration options where available — for example, whether they want a physical card only, or a physical card paired with a virtual card for digital payments. | Card type configuration recorded. Determines what is ordered from the Card Management System. |
| Delivery Preference | Customer selects how and where they want their physical card delivered: to their registered home address, to a branch for in-person collection, or to an alternative specified address. | Delivery method and address recorded on the card request. |
| PIN Preference | Customer selects their preferred method for setting their card PIN: system-generated PIN (delivered by mail or SMS), or self-selected PIN (entered by the customer during onboarding). | PIN setup method recorded. Determines how the Card Management System handles PIN personalisation during card production. |
| Submit Card Request | Once all preferences are captured and validated, the system compiles the card request and places it onto the Card Request Queue for asynchronous processing by the Card Management System. | Card request submitted. Request reference number generated and recorded on the application. Customer notified of submission. |

## 7.4 Card Enrollment Journey

The card enrollment journey is a guided, sequential process that takes the customer through five steps. It is designed to be quick and straightforward — most customers complete it in under two minutes.

| 📌 Journey Position |
|---|
| Card Enrollment occurs at Step 7 of the CASA Onboarding Customer Flow: |
| Account & Product Configuration (5) → Digital Banking Enrollment (6) → Card Enrollment (7) → Consent & Agreement (8) |
| It is optional — customers who do not want a debit card may skip this step, |
| subject to the bank's product policy for the selected CASA account type. |

### Step 1 — Debit Card Selection

The system presents the debit card options available to the customer based on their selected CASA product. Not all card types are available to all customers — eligibility is determined by account type and customer tier.

| Card Selection Element | Detail |
|---|---|
| Available card types | Displayed based on the customer's CASA product and tier. Examples: Standard Debit Card, Premium Debit Card, Co-branded Debit Card. |
| Card network | Displayed where the customer has a choice of card network (e.g. Visa, Mastercard). Network availability depends on the selected product. |
| Card design / artwork | Where multiple designs are available, the customer selects their preferred visual design. |
| Eligibility filtering | Cards the customer is not eligible for (e.g. premium cards requiring a minimum balance tier) are either hidden or shown as unavailable with an explanation. |

### Step 2 — Card Type Selection

After selecting the debit card, the customer configures the card type — specifically whether they want a physical card, a virtual card, or both.

| Card Type Option | Description |
|---|---|
| Physical Card Only | A standard plastic debit card produced and dispatched by the Card Management System. Can be used at ATMs, POS terminals, and contactless payment points. |
| Virtual Card Only | A digital card number and CVV issued immediately upon account activation for use in online and digital wallet payments. No physical card is produced. |
| Physical + Virtual Card | Both a physical card (dispatched by post or branch) and an immediate virtual card are issued. The virtual card is available from day one while the physical card is in transit. |

Virtual card availability depends on the bank's product configuration for the selected CASA account type. Where virtual cards are not available, only the Physical Card option is presented.

### Step 3 — Delivery Preference

The customer selects how and where they want their physical card delivered. This step only applies if the customer has selected a Physical Card or Physical + Virtual card type.

| Delivery Option | Description |
|---|---|
| Home Address Delivery | Card is dispatched by mail to the customer's registered residential address as captured in the Customer Information stage. This is the default option. |
| Alternative Address Delivery | Customer provides a different delivery address (e.g. a work address or family member's address). The alternative address must be a valid physical address. |
| Branch Collection | Card is dispatched to the customer's nominated branch for in-person collection. Customer must present valid ID when collecting. |

| ⚠️ Delivery Address Rule |
|---|
| If the customer selects Home Address Delivery, the address used is the residential address |
| confirmed during the Customer Information stage. The customer cannot modify this address |
| within the card enrollment step — address changes must be made in the Customer Information stage. |
| Alternative address delivery must use a verifiable physical address. P.O. Box addresses are not accepted. |

### Step 4 — PIN Preference

The customer selects their preferred method for setting their debit card PIN. The available methods depend on the bank's card issuance policy and the customer's selected delivery option.

| PIN Setup Method | Description |
|---|---|
| System-Generated PIN — by Mail | The Card Management System generates a random PIN and mails it to the customer's registered address in a sealed PIN mailer, separate from the card delivery. |
| System-Generated PIN — by SMS | The Card Management System generates a random PIN and delivers it to the customer's registered mobile number via SMS at the point of card activation. |
| Self-Selected PIN — During Onboarding | The customer enters their preferred 4 or 6-digit PIN during the onboarding journey. The PIN is securely transmitted to the Card Management System for personalisation during card production. |
| Self-Selected PIN — At First Use | The customer sets their PIN at an ATM or branch terminal upon first use of the card after activation. The card is issued without a PIN until the customer sets one. |

| 🔒 PIN Security Rules |
|---|
| PINs entered during onboarding are never stored in plain text. |
| Self-selected PINs are encrypted immediately at the point of entry and transmitted |
| securely to the Card Management System. They are not visible to any bank staff member. |
| The bank does not store the PIN in any onboarding system after it has been transmitted. |

### Step 5 — Submit Card Request

Once all card preferences are captured and validated, the system compiles the card request and submits it to the Card Management System via the Card Request Queue.

| Submission Step | What Happens | Output |
|---|---|---|
| Compile card request | System assembles all captured preferences into a structured card request: account number, card type, card network, design, delivery method, delivery address, and PIN setup method. | Structured card request record created. |
| Validate request completeness | System validates all mandatory fields are present and correctly formatted before submission. | Validation passed — request ready for submission. Validation failed — customer prompted to correct. |
| Place on Card Request Queue | Card request is placed onto the Card Request Queue as an asynchronous message for processing by the Card Management System. | Request queued. Card request reference number generated and recorded on the application. |
| Confirm to customer | Customer receives an on-screen confirmation that their card request has been submitted. Confirmation notification sent via preferred channel (SMS/email/push). | Customer informed. Estimated card delivery timeframe displayed. |

| 📌 Asynchronous Processing Note |
|---|
| Card request submission is asynchronous. The card request is placed on the Card Request Queue |
| and the customer's onboarding journey continues immediately — it does not wait for the |
| Card Management System to process the request before proceeding. |
| The card lifecycle (PAN generation, production, dispatch, activation) runs independently |
| of the customer's onboarding completion. |

## 7.5 Card Lifecycle — Post Submission (External Card Management System)

Once the card request is placed on the Card Request Queue, all further card lifecycle activities are managed by the external Card Management System. These activities are outside the scope of the Card Enrollment Service but are documented here for business context.

| Card Lifecycle Stage | Managed By | Description |
|---|---|---|
| Card Order | Card Management System | The system receives the card request from the queue and creates a formal card order for production. |
| PAN Generation | Card Management System | A unique Primary Account Number (PAN) is generated and assigned to the customer's card. The PAN is linked to the customer's CASA account. |
| Card Production | Card Management System | The physical card is manufactured and personalised — the customer's name, card number, expiry date, and (where applicable) self-selected PIN are embossed or encoded. |
| Card Dispatch | Card Management System | The physical card is dispatched to the customer's selected delivery destination (home address, alternative address, or branch). |
| Card Activation | Card Management System | The customer activates their card via the bank's mobile app, web portal, ATM, or branch. A virtual card (if selected) is activated immediately upon account opening. |
| Card Status Management | Card Management System | Ongoing management of the card's status throughout its lifecycle: active, blocked, expired, replaced. |
| Card Replacement | Card Management System | Issuance of a replacement card when the original is lost, stolen, damaged, or expired. |
| Card Blocking | Card Management System | Temporary or permanent blocking of the card at the customer's request or due to a fraud event. |

| 📌 Notification Integration |
|---|
| Key card lifecycle events trigger customer notifications via the Notification Service (Service 11): |
| - Card request submitted — confirmation notification |
| - Card dispatched — dispatch notification with estimated delivery date |
| - Card activated — activation confirmation |
| - Card blocked — security alert notification |

## 7.6 Enrollment Outcomes

The card enrollment step produces one of the following outcomes:

| Outcome | Category | Description & Next Step |
|---|---|---|
| Card Request Submitted | SUCCESS | All preferences captured and validated. Card request placed on the Card Request Queue. Card request reference recorded. Customer notified. Onboarding proceeds to Consent & Agreement (Service 8). |
| Card Enrollment Skipped | SKIPPED | Customer opted not to enrol a debit card (where permitted by product policy). No card request submitted. Onboarding proceeds to Consent & Agreement (Service 8). |
| Validation Failed | PENDING | One or more required fields are missing or invalid. Customer prompted to correct. Card request not submitted until all fields pass validation. |
| Card Request Queue Unavailable | EXCEPTION | The Card Request Queue is temporarily unavailable. Card request is held and retried automatically. Onboarding may continue; card request will be resubmitted when the queue is available. |
| Card Type Not Eligible | INELIGIBLE | The customer's selected card type is not available for their account type or tier. Customer is presented with eligible options only and must make a valid selection. |

## 7.7 Exception & Failure Handling

| Exception | System Response | Customer Impact |
|---|---|---|
| Card type not available for selected product | Only eligible card types are displayed. Ineligible options are filtered out before presentation. | Customer sees only the options available to them. No confusion from ineligible choices. |
| Invalid delivery address entered | System validates delivery address format. P.O. Box addresses rejected. | Customer prompted to re-enter a valid physical address. |
| PIN fails format validation | System checks PIN meets length and format requirements (e.g. not all same digits, not sequential). | Customer prompted to select a compliant PIN. |
| Card request queue temporarily unavailable | System holds the card request and retries submission automatically at defined intervals. | Customer is not blocked from continuing onboarding. Card request is submitted when the queue becomes available. |
| Card request submission fails permanently | System flags the failure for Operations team. Card request is raised manually by Operations. | Customer notified that their card request is being processed and will be confirmed separately. |
| Customer changes delivery address after submission | Card request amendment is not possible via the onboarding journey after submission. Customer must contact the bank post-onboarding. | Customer informed. Bank updates the card delivery address via the Card Management System before dispatch. |
| Customer wants to change card selection after submission | Card request amendment is not possible via the onboarding journey after submission. | Customer informed. Changes can be made post-onboarding through the bank's card management service. |

## 7.8 Business Rules

Covers: Card Selection Rules · Delivery Rules · PIN Rules · Submission Rules

### Card Selection Rules

- Eligibility-based presentation: Only card types and designs the customer is eligible for based on their CASA product and account tier are presented for selection.
- Minimum one card selection required: The customer must select at least one card type (physical or virtual) to complete the card enrollment step, unless the product policy permits opting out of card enrollment entirely.
- Card network determined by product: The available card network (Visa, Mastercard, or both) is determined by the bank's product configuration for the selected CASA account type. It is not a free customer choice in all cases.

### Delivery Rules

- Home delivery uses confirmed residential address: The address used for home delivery is the residential address confirmed in the Customer Information stage. It cannot be modified within the card enrollment step.
- Alternative delivery address must be physical: P.O. Box addresses are not accepted for card delivery. All delivery addresses must be verifiable physical locations.
- Branch collection requires ID: Customers who select branch collection must present a valid, government-issued identity document when collecting their card.

### PIN Rules

- Self-selected PINs are not stored by the bank: PINs entered during onboarding are encrypted immediately and transmitted to the Card Management System. No onboarding system retains the PIN after transmission.
- PIN format requirements: Self-selected PINs must meet the bank's PIN format policy — typically 4 or 6 digits, no all-same-digit sequences, and no sequential digit patterns (e.g. 1234, 6543).
- PIN delivery method is irrevocable after submission: Once the card request is submitted, the PIN delivery method cannot be changed through the onboarding journey. Changes require contacting the bank post-onboarding.

### Submission Rules

- Card request is asynchronous: The card request is placed on the Card Request Queue and processed asynchronously. The onboarding journey does not wait for the Card Management System to confirm receipt before proceeding.
- Card request reference is mandatory: A card request reference number must be generated and recorded on the application at the point of submission. This reference is used for tracking and exception management.
- Card request is not the same as card activation: Submitting a card request during onboarding does not activate the card. The card must be separately activated by the customer after it is received.
- One card request per CASA account per onboarding journey: A single card request is submitted per new CASA account during onboarding. Additional card requests (e.g. supplementary cards) are handled post-onboarding.

## 7.9 Key Business Concepts

| Concept | Definition |
|---|---|
| Card Enrollment | The onboarding activity of capturing a customer's debit card preferences and submitting a card issuance request to the Card Management System. |
| Debit Card | A payment card linked directly to the customer's CASA account, enabling the customer to access their funds at ATMs, POS terminals, and digital payment channels. |
| Physical Card | A plastic debit card produced, personalised, and dispatched by the Card Management System to the customer's selected delivery address. |
| Virtual Card | A digital card number and CVV issued for use in online and digital wallet payments. Available immediately upon account activation. No physical card is produced. |
| PAN (Primary Account Number) | The unique 16-digit number on a debit card that identifies the card and links it to the customer's account. Generated by the Card Management System during card production. |
| Card Request Queue | The asynchronous message queue through which the Card Enrollment Service submits card issuance requests to the Card Management System for processing. |
| PIN (Personal Identification Number) | A secret numeric code used by the customer to authenticate card transactions at ATMs and POS terminals. |
| PIN Mailer | A sealed, tamper-evident envelope containing the customer's system-generated PIN, dispatched separately from the physical card for security reasons. |
| Card Activation | The step by which a newly issued card is enabled for use. Performed by the customer via mobile app, web portal, ATM, or branch after the card is received. |
| Card Request Reference | A unique identifier assigned to each card request at the point of submission. Used for tracking the card through the Card Management System lifecycle. |
| Asynchronous Processing | A processing model where a request is submitted to a queue and the submitting system continues without waiting for the receiving system to complete the action. |
| Card Blocking | The temporary or permanent disabling of a card, preventing it from being used for transactions. Managed by the Card Management System. |

---

[← Customer Onboarding](README.md) · [Previous: Digital Banking Enrollment Service](06-digital-banking-enrollment-service.md) · [Next: Consent & Agreement Service](08-consent-agreement-service.md)
