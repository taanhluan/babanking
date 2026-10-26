# Onboarding concept v2 — rule and gap review

This is an executable prototype rule catalogue, not approved bank policy.
The live Development Journey was reviewed in authenticated Chrome on 2026-10-26.
Card-only product routing and credit-specific checks are requested prototype
extensions; they do not rewrite the published CASA-oriented Customer Onboarding
Journey.

## Gaps detected in v1

- One fixed CASA route; no product-first routing or standalone Card dependency.
- One constant OTP; no actual challenge lifecycle, contact verification, resume
  authentication, resend limits, expiry, lock or binding to the current payload.
- Incomplete format, conditional-field and cross-field validation.
- Contact/form details lost after reload; no evidence-freshness check on resume.
- Confirmed customer information could be edited without controlled rework.
- Missing terminal withdrawal/expiry and product-specific provisioning outcomes.
- Notification failure/retry and duplicate-product protection not demonstrated.

## Executable rules

| IDs | Area | Checks / behavior | Basis |
|---|---|---|---|
| PR01–03 | Product routing | Product is required; CASA includes optional card/digital enrollment; Debit Card requires existing CASA; Credit Card includes financial assessment and credit consent. | Owner request / prototype extension |
| CT01–04 | Contacts | Vietnam mobile format; international E.164-style format for other residence; email syntax; separate verification of both current mobile and email. | Customer Information §4.5/4.8; demo format implementation |
| CT05–06 | Contact changes / duplicate | Changed contact invalidates its verification/challenge; duplicate-active-contact scenario blocks progression. | Customer Information §4.8; static duplicate fixture |
| EL01–04 | Eligibility | Valid/non-future DOB and exact birthday calculation; age 18+ CASA/debit; age 21+ credit; resident digital path / non-resident assisted-route message; acknowledgements required. | Age 18 from live; credit age/routing are demo policy |
| ID01–07 | Identity | Fictional document reference format; front required; National ID back conditional; selfie required; readable image; passed liveness; valid unexpired document. | Journey identity principles; sample evidence controls |
| ID08–10 | Identity result | Document name and DOB valid; verification required and current; maximum three failed capture attempts. | Live identity + resume; retry cap is demo policy |
| CI01–04 | Identity consistency | Legal name format and match to verified document; DOB match; explicit confirmation of prefilled data. | Customer Information §4.5/4.8 |
| CI05–07 | Address / employment | Physical street, no P.O. Box; city/district required; employer mandatory only for Employed. | Customer Information §4.5 |
| CI08–11 | Tax | TIN syntax for demo Vietnam/US formats; documented exemption reason instead of TIN; second country must differ; second TIN/exemption required when multi-tax. | Customer Information §4.5/4.8; formats are demo approximations |
| CI12–13 | Source / confirmation | Source of funds required; prefilled details require explicit confirmation. | Customer Information §4.8 |
| SC01–05 | Review triggers | PEP, demo high-risk occupation, US Person, multi-tax/country inconsistency, Student + Business income route to simulated bank review. | Live consistency and compliance boundaries |
| SC06–08 | Review outcomes | Flagged cases cannot auto-pass; bank outcomes are clear / request information / reject; changed review-driving fields invalidate screening. | Application records domain outcomes; demo officer controls |
| DB01–03 | Debit dependency | Funding account must be owned by sample customer, active/unfrozen and VND; standalone Debit Card cannot omit card; no new CASA is created. | Prototype product dependency |
| CR01–04 | Credit data | Demo income ≥10m VND/month; obligations explicitly entered, ≥0 and <income; requested limit 5m–3×income; sample income evidence required. | Configurable demo thresholds, not real underwriting |
| PC01–04 | Product setup | Available catalogue product; supported currency VND; uppercase Latin printed name, 2–26 characters; physical-card alternative address requires street/city and excludes P.O. Box. | Live Account Setup / Card Enrollment principles; demo catalogue |
| DG01–03 | Digital | Username syntax, 6–20 characters starting with a letter; reserved/conflicting sample username blocked; at least one digital channel. | Live Digital Banking Enrollment; sample conflict fixture |
| CS01–05 | Consent | Separate current product terms and privacy acknowledgement; credit notice conditional on Credit Card; fictional name declaration must match; marketing remains optional; consent version stored. | Live Consent & Agreement; prototype declaration |
| OT01–04 | OTP lifecycle | Six-digit generated mock challenge; purpose/contact/payload binding; 120-second expiry; consumed once. | Mock authentication design |
| OT05–08 | OTP abuse controls | 30-second resend cooldown; resend invalidates prior code; five wrong attempts lock 60 seconds; maximum three sends per purpose/contact. | Configurable demo policy |
| OT09–10 | OTP separation | Mobile and email confirmation are distinct; submission and resume each require separate fresh OTP. Editing payload invalidates submission authentication. Continue is disabled until required verification passes; the submission status and validation share one consumed-challenge/payload predicate. | Live resume authentication and contact verification |
| SV01–04 | Resume | Save fictional forms, product, progress and outcomes; resume OTP; invalidate prior-session OTP; revalidate identity after 30 days and screening after 14 days. | Application Management §3.5.3/3.5.4 |
| SV05–07 | Reconfirmation / expiry | Expired ID returns to eKYC; changed terms return to consent; general inactivity >30 days or pending-customer-action >14 days closes demo. | Live resume/pending-action rule; 30-day inactivity is demo configuration |
| WF01–04 | Rework / stage control | No skipping preceding steps; confirmed information snapshot is read-only; rework reason ≥10 characters; rework invalidates downstream checks/consent/authentication. | Live immutable information / Operations boundary; simulated handoff |
| WF05–08 | Final / terminal | Revalidate every applicable stage before approval and provisioning; withdrawal/rejection/expiry close the application; provisioning retry retains approval; creation is idempotent for the saved demo reference. | Journey state and execution separation |
| NF01–02 | Notifications | Delivery outcome is distinct from provisioning; notification retry does not create another account/card. | Journey service ownership |

## Mock OTP walkthrough

1. Select a product, then start its journey.
2. Send **mock mobile OTP**. Read its generated code in the inline mock message
   or the right-hand inbox; enter it and verify.
3. Repeat with **mock email OTP**. Both must be verified before continuing.
4. Submission issues a new challenge after the current terms and form are
   confirmed. The old contact code cannot authenticate submission.
5. Save & exit or reload an unfinished application: use **Send resume OTP**,
   then **Verify & resume**. Session/submission challenges are invalidated.

Labelled demo clock controls allow expiry, cooldown and lock scenarios without
waiting in real time. They affect prototype time only. The mock code appears in
plain text deliberately and is never a real authentication credential.

## Verification

Run `node --test docs/mockups/customer-onboarding/model.test.mjs`.
29 behavioral groups cover branch routing, date/format boundaries, conditional
data, OTP misuse, locks/resends/expiry/binding, evidence revalidation, staged
rework, terminal outcomes and idempotent provisioning. These tests do not touch
the database or impersonate a member session.

Chrome walkthroughs completed CASA without a card, standalone physical Debit
Card linked to an active CASA, and Credit Card with bank-review and notification
failure/retry. UI checks included form errors, under-age blocking, OTP locking
and expiry, resume OTP/form retention, frozen funding account, delivery fields,
credit limit and separate credit consent. Mobile checked at 390px.

## Remaining boundaries

- Client-side-only demo. Local storage and the activity list are not secure
  persistence, authentication, real policy decisions or an immutable audit log.
- No real document images, KYC provider, SMS/email delivery, account lookup,
  screening, credit bureau, core banking or card processor.
- Duplicate contact, product availability, bank review and income evidence are
  deterministic sample scenarios, not live provider checks.
- Vietnam/US TIN formats, credit thresholds, fees, eligibility and retry rules
  require approved product/jurisdiction policy before any real implementation.
- Source lifecycle terminology (Approved as terminal versus Completed after
  approval) remains a documented content decision. The mockup preserves approval
  before successful provisioning.
- Shared Development integration was authorized after design review. The entry
  and each module/asset use the existing authentication/membership/Knowledge
  Access boundary; no file is served from unauthenticated public routes.
