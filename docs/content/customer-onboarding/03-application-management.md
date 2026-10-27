# 3. Application Management

> Customer Onboarding — module 3 of 10. Exported from Development `customer-onboarding` v13.

[← Customer Onboarding](README.md) · [Previous: Initiation & Eligibility](02-initiation-eligibility.md) · [Next: Customer Information Service](04-customer-information-service.md)

## Contents

- [3.1 Overview](#31-overview)
- [3.2 Business Purpose](#32-business-purpose)
- [3.3 Application Lifecycle](#33-application-lifecycle)
- [3.4 Start Application](#34-start-application)
- [3.5 Save & Resume](#35-save--resume)
- [3.6 Application Tracking](#36-application-tracking)
- [3.7 Application Expiry](#37-application-expiry)
- [3.8 Key Business Concepts](#38-key-business-concepts)

## 3.1 Overview

Covers: Business Definition · Business Responsibilities · Relationship with Other Domains

### Business Definition

The Application Management Domain manages the lifecycle of a customer's CASA onboarding application. It is responsible for creating, maintaining, tracking, and closing the application record that represents a customer's request to open a CASA account.

An application acts as the central business record throughout the entire onboarding journey. It provides a single point of reference for customer progress and coordinates the recording of outcomes from every other business domain involved in onboarding.

The Application Management Domain does not perform identity verification, compliance assessment, account creation, or product configuration. Those activities are owned by their respective business domains. Instead, Application Management records the progress and outcomes of these activities as they are completed, and uses them to determine the overall application status.

| 💡 Key Principle |
|---|
| Application Management is the record-keeper, not the decision-maker. |
| It owns the application's lifecycle and status — every other domain reports its outcomes into it. |

### Business Responsibilities

The Application Management Domain is responsible for the following business activities:

| Responsibility | Description |
|---|---|
| Initiate Application | Create a new onboarding application when a customer chooses to open a CASA account, regardless of channel. |
| Assign Application Reference | Generate and assign a unique application reference number that identifies the application across all systems and communications. |
| Maintain Application Record | Preserve all customer inputs, domain outcomes, and status changes throughout the onboarding journey. |
| Support Save & Resume | Allow customers to pause their application at any stage and return to continue without data loss. |
| Track Onboarding Progress | Provide real-time visibility of application progress to both the customer and internal bank staff. |
| Manage Application Status | Maintain and update the overall application status as each stage is completed or an exception occurs. |
| Record Domain Outcomes | Capture and store the outcomes reported by other business domains (e.g. eKYC result, compliance decision, account creation confirmation). |
| Enforce Expiry Rules | Automatically close applications that have been inactive beyond the permitted period, in accordance with the bank's expiry policy. |
| Close the Application | Formally close the application upon successful account opening, customer withdrawal, rejection, or expiry — and record the closure reason. |

### Relationship with Other Domains

The Application Management Domain interacts with every other domain in the CASA Onboarding process. It does not direct those domains — it records their outcomes and reflects them in the application status.

| Business Domain | Relationship | What Is Recorded |
|---|---|---|
| Identity Verification (eKYC) | Receives outcome | Whether the customer's identity was verified, failed, or is pending review. |
| Customer Information Management | Receives and stores data | All personal, contact, employment, and tax information captured from the customer. |
| Compliance & Risk Management | Receives outcome | Compliance screening result, risk rating, and whether a manual review was required. |
| Product & Account Setup | Receives outcome | Selected CASA product, account type, configuration, and branch or RM assignment. |
| Digital Banking Enrollment | Receives outcome | Whether digital banking credentials and channel enrollment were successfully completed. |
| Debit Card Management | Receives outcome | Debit card type selected, delivery preferences, and card order status. |
| Consent & Agreement Management | Receives outcome | Whether all required consents were accepted and e-Signature was captured. |
| Customer Authentication | Receives outcome | Authentication method used, outcome, and fraud check result. |
| Account Opening | Receives outcome | Account creation status, assigned account number, and activation confirmation. |
| Customer Communication | Triggers notifications | Provides application status updates to the Notification Service to trigger customer-facing communications. |

## 3.2 Business Purpose

The purpose of the Application Management Domain is to provide a controlled, visible, and auditable business record for every CASA onboarding request — from the moment a customer initiates an application to the moment it is closed.

The application record serves five core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Single Reference Point | Every onboarding activity — across all domains and channels — is linked to a single application reference. This prevents fragmentation and ensures that all parties are working from the same record. |
| Progress Visibility | The application status gives customers and bank staff a clear, real-time view of where the onboarding is at any moment — what has been completed, what is outstanding, and what happens next. |
| Save & Resume Enablement | By persisting all customer inputs and domain outcomes, the application record enables customers to pause and resume their journey without data loss — reducing drop-off and improving completion rates. |
| Cross-Domain Coordination | The application acts as the coordination layer across all onboarding domains. Each domain records its outcome into the application, which then determines the next step in the journey. |
| Audit Trail | Every status change, stage completion, data update, and domain outcome is recorded with a timestamp and the identity of the actor who triggered it. This creates a complete, immutable audit trail for every application. |

## 3.3 Application Lifecycle

The application lifecycle represents the overall progression of a customer's CASA onboarding application from initiation to closure. The lifecycle is divided into two distinct parts: Active Lifecycle Stages, through which the application progresses based on business events and customer actions; and Terminal Outcomes, which are alternative end states that close the application permanently.

Diagram: ChatGPT Image Jul 1, 2026, 01_13_30 PM.png (see the Confluence page)
https://datumhq.atlassian.net/wiki/download/attachments/1705705478/ChatGPT%20Image%20Jul%201,%202026,%2001_13_30%20PM.png?version=1&modificationDate=1782886424489&cacheVersion=1&api=v2

### Active Lifecycle Stages

| Stage | Description | Key Business Activity |
|---|---|---|
| 1. Draft | The application has been initiated but not yet submitted. The customer has started the process but has not yet completed all required stages. | Application record created. Unique reference assigned. Channel and entry source recorded. Customer begins completing onboarding stages. |
| 2. In Progress | The customer is actively completing onboarding activities. One or more stages have been started or completed. The application is live and the customer is engaged in the journey. | Stage completion events update the application record. Progress is saved automatically after each completed stage. The customer can see their progress in real time. |
| Saved (Draft) | The customer has saved their application mid-journey and exited the session. The application is held open awaiting the customer’s return. Saved is a sub-state of Draft, not a separate lifecycle stage. | Progress preserved. Inactivity clock starts. Reminder notifications scheduled. Customer can resume at any time within the expiry window. |
| 3. Submitted | The customer has completed all required stages and formally submitted the application for processing. No further customer input is expected unless the bank requests it. | Application queued for downstream processing. Compliance screening and account creation orchestration triggered. SLA tracking begins. |
| 4. Processing | Business domains are actively performing verification and assessment activities — identity verification, compliance screening, account configuration, and authentication. | Domain outcomes recorded as received. Application status updated to reflect current processing state. Straight-through processing occurs where all checks pass without exception. |
| 5. Pending Customer Action | Additional information or action is required from the customer before processing can continue. The application is paused until the customer responds. | Customer notified of outstanding requirement. Application held in pending state. 14-day expiry clock applies. Stage may recur if further information is subsequently required. |
| 6. Pending Bank Review | Manual review by a bank officer is required — typically triggered by a compliance flag, risk escalation, or operational exception. | Application enters the relevant officer’s review queue. SLA timers active. Escalation rules apply if not actioned within the defined period. Stage may recur if further review is required after initial resolution. |

### Terminal Outcomes (End States)

The application ends in ONE of the following terminal outcomes. These are alternative end points — not sequential steps. Once an application reaches a terminal outcome, it cannot move to any other terminal outcome, and it cannot be reopened.

| Terminal Outcome | End State Type | Outcome Category | Description |
|---|---|---|---|
| 7. Approved | Decision Achieved | SUCCESSFUL | All business, compliance, and risk assessments have succeeded. The application is authorised for account opening. Approved is a business decision — it confirms the customer is cleared to proceed. Account creation is triggered but not yet complete. |
| 8. Completed | Execution Completed | SUCCESSFUL | All account opening and service provisioning activities have been successfully executed. Onboarding is complete. A new banking relationship has been established. IMPORTANT: Completed can ONLY occur after Approved (Stage 7). Operational failures after approval may result in the application remaining in Approved until completion is achieved. |
| 9. Rejected | Unsuccessful | UNSUCCESSFUL | The application cannot proceed due to business or regulatory reasons. The rejection may result from an automated compliance rule or a manual officer decision. The customer is notified and assistance is provided. |
| 10. Withdrawn | Unsuccessful | UNSUCCESSFUL | The customer has voluntarily cancelled their application. No account is opened. The customer may reapply. Withdrawal may be reinstated within 7 calendar days subject to Operations approval. |
| 11. Expired | Unsuccessful | UNSUCCESSFUL | The application has been automatically closed after exceeding the defined business validity rules (inactivity or pending action periods). No account is opened. The customer must submit a new application. |

## 3.4 Start Application

Covers: Overview · Business Triggers · Business Rules

### Overview

Start Application is the business activity that initiates a new CASA onboarding application. It is the first action taken in the onboarding journey and results in the creation of an application record that persists throughout the entire process.

### Business Triggers

A new application is initiated when any of the following business events occur:

| Business Trigger | Description |
|---|---|
| Customer Self-Initiates (Digital) | Customer selects 'Open an Account' on the bank's mobile app or web portal and confirms they wish to proceed. |
| Campaign Entry | Customer arrives via a targeted marketing link, QR code, or email campaign and confirms intent to open an account. Campaign ID is captured and attributed to the application. |
| Bank Staff Initiates (Assisted) | A Relationship Manager or Branch Officer initiates the application on behalf of the customer via the staff-facing interface. Customer is identified or details entered by staff. |
| Embedded Partner Entry | An e-commerce or fintech partner triggers onboarding as part of a customer interaction on their own platform. Partner passes customer context and entry source to the bank's onboarding system. |
| Existing Customer Adds Account (ETB) | An existing bank customer selects to open an additional CASA account. The system identifies their existing CIF and pre-populates available information into the new application. |

### Business Rules

- Unique reference assignment: Every new application is assigned a unique application reference number at the point of creation. This reference is immutable and is used in all communications and records relating to the application.
- One active application per customer: A customer may not hold more than one active CASA onboarding application simultaneously. If an active Draft application exists, the customer must resume or withdraw it before a new one can be created.
- Channel context must be recorded: The channel, entry source, and any campaign attribution must be captured and stored on the application record at the point of initiation. This information cannot be changed after creation.
- ETB pre-population: For existing customers (ETB), available information from the bank's core systems is pre-populated into the application. The customer must review and confirm this information — they cannot proceed without explicit confirmation of pre-filled data.
- Basic eligibility check at initiation: A lightweight eligibility check is performed at the point of application creation. If the customer fails the basic eligibility criteria (e.g. age below 18, nationality restriction), the application is not created and the customer is informed of the reason.
- Terms & Conditions acknowledgement: The customer must acknowledge that they have reviewed the key product requirements and terms before the application record is created. This acknowledgement is timestamped and stored.
- Staff-initiated applications: When a bank staff member initiates an application on behalf of a customer, the staff member's identity and role must be recorded on the application. The customer must be informed that an application has been initiated on their behalf.

## 3.5 Save & Resume

Covers: Overview · How Save & Resume Works · Resume Authentication · Data Revalidation on Resume · Cross-Channel Resume · Business Rules

### Overview

Save & Resume is the capability that allows a customer to pause their CASA onboarding application at any point in the journey and return to continue it at a later time — without losing any previously entered information or completed stages.

This capability is central to the bank's customer experience strategy for onboarding. Completing a CASA application requires the customer to provide personal, identity, employment, and financial information, which many customers need time to gather. Forcing a customer to restart from the beginning after an interruption is one of the most significant drivers of application abandonment.

### How Save & Resume Works

| Step | What Happens |
|---|---|
| Auto-Save after Stage Completion | The application is automatically saved each time a customer completes and confirms a stage. No action is required from the customer. The completed stage is locked — the customer cannot return to change it without Operations involvement. |
| Manual Save Mid-Stage | At any point during an incomplete stage, the customer can choose to save and exit. Partial inputs are saved as a draft. The customer returns to the beginning of that stage when they resume. |
| Session Timeout Save | If the customer's session expires due to inactivity (default: 15 minutes), the system saves all completed stage data and any partial inputs entered during the current stage before closing the session. |
| Resume Authentication | When the customer returns, they authenticate using their registered mobile number (OTP) or email verification. The system retrieves their application and presents it from the last saved point. |
| Progress Presentation on Resume | On resuming, the customer is shown a summary of their completed stages and is taken directly to the first incomplete stage. They do not need to navigate through completed stages again. |
| Data Revalidation on Resume | The system checks whether any previously entered or verified data has become stale (e.g. an OTP has expired, a document has passed its validity date). Only stale data is flagged for re-entry — the rest is retained. |

### Resume Authentication

To protect the customer's application data, the system requires the customer to authenticate before they can access a saved application. The following authentication methods are supported at the point of resume:

| Authentication Method | When Used |
|---|---|
| Mobile OTP | Customer receives a one-time password to their registered mobile number. Standard method for all digital channel resumes. |
| Email OTP | Customer receives a one-time password to their registered email address. Used as an alternative if the customer's mobile number is unavailable. |
| Biometric (where available) | On mobile devices where biometric authentication has been set up by the customer, fingerprint or face recognition may be used to resume. |
| Staff-Assisted Resume | A branch officer or RM may resume an application on behalf of the customer following in-person identity verification. The staff member's identity is recorded on the application. |

A customer who cannot authenticate cannot access their saved application. In this case, the customer should contact the bank for assisted support. Under no circumstances should the system allow access to a saved application without successful authentication.

### Data Revalidation on Resume

Not all data entered during a previous session remains valid indefinitely. When a customer resumes an application, the system performs a revalidation check and flags any data that must be re-entered or re-verified before the journey can continue.

| Data Type | Revalidation Rule |
|---|---|
| eKYC / Identity Verification Result | If more than 30 days have elapsed since the eKYC check was completed, the result is considered stale and the eKYC stage must be repeated with a valid document. |
| Identity Document | If the customer's identity document has expired between the time it was submitted and the time of resume, a new valid document must be provided. |
| Compliance Screening Result | If more than 14 days have elapsed since the compliance screening was last completed, the screening must be rerun to ensure the result reflects the current watchlist state. |
| OTP / Session Tokens | Any OTP or session token generated during a previous session is invalid on resume. New authentication is required. |
| Customer Information | Personal, contact, and employment information entered in a previous session is retained and does not require re-entry unless the customer chooses to update it. |
| Consent Records | Consent given in a previous session remains valid provided the Terms & Conditions version has not changed. If T&C have been updated since the customer's last consent, the consent stage must be repeated. |

### Cross-Channel Resume

The application record is channel-agnostic. A customer who begins their application on one channel may resume it on a different channel without any loss of progress.

| Scenario | Business Outcome |
|---|---|
| Started on mobile, resuming on web portal | Customer authenticates on the web portal. Application is retrieved and presented from the last saved stage. All previously entered data is available. |
| Started on mobile, resuming in branch | Customer visits a branch. Branch Officer authenticates the customer in person and resumes the application on the branch interface. Staff member's identity is recorded. |
| Started via campaign link, resuming via mobile app | Customer downloads the mobile app and authenticates. Application initiated via the campaign link is retrieved and available for continuation. |
| Staff-initiated application, resumed by customer digitally | RM initiates the application in branch. Customer completes remaining stages independently via mobile or web. Both the RM's initiation and the customer's subsequent actions are recorded. |

| 📌 Cross-Channel Rule |
|---|
| The channel used to resume an application does not need to match the channel used to start it. |
| However, certain channel-specific capabilities may not be available on all channels. |
| Example: Camera-based eKYC is available on mobile but not all web browsers. |
| In such cases, the customer is offered an alternative method (e.g. document upload). |

### Business Rules

- Maximum saved duration: An application in Draft — Saved status is held open for a maximum of 30 calendar days from the date of the last activity. After this period, the application automatically moves to Expired.
- Reminder notifications: Automated reminders are sent to the customer on Day 7, Day 20, and Day 28 of inactivity, encouraging them to return and complete their application.
- Session inactivity timeout: An active session with no user interaction for 15 consecutive minutes is automatically timed out. All progress is saved before the session closes.
- Completed stages are locked: Once a stage has been completed and the application has been saved past that stage, the customer cannot return to modify that stage's data without Operations Administrator involvement and a documented reason.
- Authentication required on every resume: Every time a customer returns to a saved application, they must successfully authenticate before the application is accessible. There are no exceptions.
- Partial stage data is retained: If a customer saves mid-stage, the partial data entered in that stage is retained and pre-filled when they return. The customer resumes from the beginning of the incomplete stage.
- Compliance re-screening on long gaps: If more than 14 days have elapsed since compliance screening was last completed, the screening must be rerun when the customer resumes, regardless of the original result.

## 3.6 Application Tracking

Covers: Overview · Customer Tracking View · Internal Staff Tracking View · Tracking Business Rules

### Overview

Application Tracking is the capability that provides real-time visibility into the progress and current status of a CASA onboarding application. It serves two distinct audiences — the customer who submitted the application, and the internal bank staff responsible for processing or supporting it.

Effective tracking reduces inbound customer enquiries ('Where is my application?'), enables operations staff to proactively manage queues and SLAs, and provides auditors with a complete, timestamped history of every action taken on an application.

### Customer Tracking View

The customer tracking view is accessible at any time via the mobile app or web portal, following authentication. It presents the following information:

| Information Displayed | Business Purpose |
|---|---|
| Application Reference Number | Allows the customer to quote a unique identifier when contacting the bank for support. |
| Current Application Status | Tells the customer the overall state of their application in plain language (e.g. 'Your application is under review', 'Your account is ready'). |
| Stage Progress Indicator | Visual representation showing completed stages (ticked), the current active stage, and upcoming stages not yet reached. Gives the customer a sense of how far along they are. |
| Outstanding Actions | Clearly lists any actions required from the customer before the application can continue (e.g. 'Please upload your proof of address'). |
| Next Steps | Describes what will happen next, either from the customer's side or the bank's side. |
| Estimated Timeframe | Where applicable, provides the customer with an indication of how long the next step is expected to take (e.g. 'Your account should be ready within 1 business day'). |
| Notification History | A log of all communications sent to the customer in relation to this application (SMS, email, in-app). |

### Internal Staff Tracking View

Internal bank staff have access to a more detailed tracking view, appropriate to their role and permissions. The following describes the tracking capability available to each staff role:

| Staff Role | Tracking Access | Key Capability |
|---|---|---|
| Operations Administrator | All active and recently closed applications in the system. | Filter by status, channel, date range, assigned RM, or SLA breach. View applications approaching expiry. Manage exception queues. |
| Relationship Manager (RM) | Applications they have initiated or are assigned to. | Monitor customer progress. Identify customers who have stalled and may need proactive outreach or branch assistance. |
| Compliance Officer | Applications in the Under Compliance Review and Pending Bank Review queues. | Action, escalate, or reject individual applications. View compliance screening details and risk ratings. |
| Branch Officer | Applications initiated at their branch or assigned to their support. | Resume, update, or submit applications on behalf of customers. View outstanding document requirements. |
| Auditor | All applications — active and closed — in read-only mode. | View complete status history, stage-by-stage timestamps, and the full actor trail for every change made to the application. |

### Tracking Business Rules

- Immutable audit trail: Every status change on an application must be recorded with: the new status, the previous status, the timestamp of the change, and the identity of the actor (customer, system process, or named staff member) who triggered it. This record is immutable — it cannot be edited or deleted.
- Role-based access: Internal staff may only view and act on applications within their defined access permissions. No staff member may access application records outside their authorised scope.
- Customer data privacy: The customer tracking view must not display sensitive information (e.g. full document numbers, full account numbers) in plain text. Masking rules apply.
- SLA breach visibility: Applications that have breached or are approaching an SLA threshold must be visually flagged in the internal tracking view. Operations Administrators must be able to identify these at a glance without needing to filter.
- Notification log completeness: Every customer-facing notification triggered by an application event must be logged against the application record, including the channel used, the timestamp, and the delivery status.

## 3.7 Application Expiry

*Application Expiry Rules vary significantly based on bank-specific requirements and regulatory frameworks

### Overview

Application expiry rules govern how long an onboarding application may remain open without being completed or progressed. These rules exist to protect both the customer and the bank:

- For the customer: They ensure that stale or forgotten applications do not remain open indefinitely, creating confusion about account status or blocking the customer from reapplying.
- For the bank: They keep the active application pipeline accurate, reduce compliance exposure from unprocessed or unresolved applications, and ensure that operational queues reflect genuine work in progress.

When an application expires, it moves to the terminal status of Expired. It cannot be reopened. The customer must submit a new application if they wish to proceed.

### Expiry Types

| Expiry Type | Description |
|---|---|
| Standard Inactivity Expiry | Applies to all Draft applications (In Progress or Saved). If no activity is recorded on the application for 30 consecutive calendar days, the application is automatically expired by the system. |
| Pending Customer Action Expiry | Applies when the bank has requested additional information from the customer and the customer has not responded. The application expires after 14 calendar days from the date of the bank's request. |
| Compliance Review Expiry | Does not result in automatic expiry. Instead, a compliance review not actioned within 5 business days triggers automatic escalation to the Head of Compliance. The application remains open but is escalated. |
| Submitted Application SLA Breach | Does not result in automatic expiry. A submitted application not actioned within 3 business days triggers an internal SLA breach alert to Operations. The application remains open but is flagged. |
| Verification Result Expiry | Individual domain results (e.g. eKYC result, compliance screening) carry their own validity periods. Expired domain results require the relevant stage to be repeated — this does not expire the application itself but may block its progression. |

### Common Expiry Scenarios

| Scenario | Rule Applied | Outcome for Customer |
|---|---|---|
| Customer starts application, completes Stage 1, then does not return. | Standard 30-day inactivity expiry from last activity date. | Application expired on Day 30. Customer must submit a new application. No data is pre-filled from the expired application. |
| Customer saves at Stage 3 and returns on Day 25. | Activity on Day 25 resets the 30-day inactivity clock. | Customer resumes normally from Stage 3. No data is lost. New expiry date = 30 days from Day 25. |
| Bank requests a supporting document. Customer does not respond. | 14-day Pending Customer Action expiry from the date of the bank's request. | Application expires on Day 14. Customer notified on Day 7 and Day 13 with final warning. Must submit a new application. |
| Application submitted. Bank does not action within 3 business days. | Internal SLA breach alert raised on Day 3. No automatic expiry. | Application remains active. Operations team alerted. No direct impact on the customer unless further delays occur. |
| Compliance review not actioned for 6 business days. | SLA breach on Day 5. Auto-escalation to Head of Compliance on Day 6. | Application remains active. Escalation managed internally. Customer may be notified of an expected delay. |
| Customer resumes after 35 days of inactivity. | Application expired on Day 30 (standard expiry). | Customer finds their application has expired. They are informed and directed to submit a new application. Previously entered data is not available. |

### Expiry Notifications

Customers are notified ahead of expiry to give them the opportunity to return and complete their application. The following notification schedule applies for the standard 30-day inactivity expiry:

| Day (from last activity) | Notification Sent |
|---|---|
| Day 7 | First reminder: 'Your application is saved. You have 23 days remaining to complete it.' |
| Day 20 | Second reminder: 'Your application will expire in 10 days. Please log in to continue.' |
| Day 28 | Final warning: 'Your application expires in 2 days. Complete it now to avoid losing your progress.' |
| Day 30 | Expiry confirmation: 'Your application has expired. Please start a new application if you still wish to open an account.' |

For the 14-day Pending Customer Action expiry, the following schedule applies:

| Day (from bank request) | Notification Sent |
|---|---|
| Day 0 (request date) | Initial request: Bank notifies customer of the required information or document. |
| Day 7 | Reminder: 'We are still waiting for your document. You have 7 days remaining before your application closes.' |
| Day 13 | Final warning: 'Your application will expire tomorrow if we do not receive the required information.' |
| Day 14 | Expiry confirmation: 'Your application has expired due to missing information. Please start a new application.' |

### Post-Expiry Handling

Once an application has expired, the following rules apply:

- Expiry is permanent: An expired application cannot be reopened, reactivated, or resumed under any circumstances. This applies regardless of how close to completion the application was.
- New application required: The customer must initiate a new application. For existing bank customers (ETB), core system data may be pre-populated. For new-to-bank customers, all information must be re-entered.
- Audit record retained: The expired application record, including all data entered and all status history, is retained for audit and regulatory purposes for the period defined in the bank's Data Retention Policy (typically 7 years).
- No data pre-fill from expired application: Data entered in an expired application may not be pre-populated into a new application for security and data accuracy reasons.
- Compliance records preserved: Any compliance screening results, eKYC outcomes, or fraud flags recorded against an expired application are retained and may be considered during any subsequent application from the same customer.

### Business Rules

- Standard expiry window: 30 consecutive calendar days of inactivity on a Draft application. Measured from the date of last recorded activity (customer input, system event, or staff action).
- Pending Customer Action expiry window: 14 calendar days from the date the bank's request is issued. The clock starts from the date of the request, not the date the customer reads the notification.
- Activity resets the expiry clock: Any customer activity on the application — including resuming and re-saving without completing a stage — resets the 30-day inactivity clock.
- System-automated expiry: Expiry is executed automatically by the system at midnight on the day the expiry period ends. No manual action is required from bank staff.
- Expiry notification channel: Expiry reminder notifications are sent via the customer's preferred channel (SMS, email, or push notification) as recorded on the application.
- Failed notification delivery: If an expiry reminder notification cannot be delivered (e.g. invalid contact details), the application still expires on schedule. Notification failure does not extend the expiry period.
- SLA breach alerts do not expire applications: Internal SLA breach alerts for submitted or compliance-review applications trigger internal escalation only. They do not cause the application to expire. Only the standard inactivity and pending action rules result in automatic expiry.

| 📌 Expiry Summary |
|---|
| Draft — Inactivity: 30 calendar days → Auto-expires |
| Pending Customer Action: 14 calendar days → Auto-expires |
| Submitted — No action (SLA): 3 business days → Internal alert only |
| Under Compliance Review (SLA): 5 business days → Auto-escalation only |
| Withdrawn — Reinstatement window: 7 calendar days → Reinstatable on request |

## 3.8 Key Business Concepts

| Concept | Definition |
|---|---|
| Application | The business record representing a customer's request to open a CASA account. It is created at onboarding initiation and closed upon completion, rejection, withdrawal, or expiry. |
| Application Reference | A unique identifier assigned to every CASA onboarding application at the point of creation. Used in all communications, records, and customer interactions relating to the application. |
| Application Lifecycle | The defined sequence of stages an application passes through from initiation to closure. Each stage has defined entry and exit criteria. |
| Application Status | The consolidated business state of the onboarding application at any point in time. Reflects the overall progress across all domains, not the granular state of any individual domain. |
| Save & Resume | The capability that allows a customer to pause their application at any stage and return to continue it later without data loss. |
| Application Tracking | Real-time visibility of application progress and status, available to both the customer and internal bank staff, appropriate to their role. |
| Application Expiry | The automatic closure of an application that has not been completed or progressed within the permitted timeframe. Expiry is permanent — a new application must be initiated. |
| Terminal Status | An application status from which no further transitions are possible. Completed, Rejected, and Expired are terminal states. |
| Draft | The status of an application that has been initiated but not yet submitted. Encompasses both In Progress and Saved states. |
| ETB (Existing-to-Bank) | A customer who already holds a product or account with the bank. ETB customers may benefit from data pre-population and simplified verification steps when opening an additional CASA account. |
| NTB (New-to-Bank) | A customer who does not currently hold any product or account with the bank. Full onboarding journey applies, including CIF creation. |
| CIF (Customer Information File) | The core banking record that represents a customer's master profile. Created as part of the Account Opening stage for NTB customers. |

---

[← Customer Onboarding](README.md) · [Previous: Initiation & Eligibility](02-initiation-eligibility.md) · [Next: Customer Information Service](04-customer-information-service.md)
