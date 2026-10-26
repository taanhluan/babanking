# Datum Bank — onboarding concept v2

Datum Bank onboarding concept, reviewed on 2026-10-26.

## Development integration

On Development, the Customer Onboarding toolbar places **Mockup** next to
**Save knowledge**. It opens `/en/banking-journeys/customer-onboarding/mockup`
in a new tab. The document and each module, image and font require the existing
Journey VIEW authorization. The link and handler are disabled outside matching
Development application/database environments.

The app serves an explicit file allowlist from this directory through a dynamic
route handler, with private/no-store and noindex headers. Resources are not
copied to `public/`. A base URL keeps relative module/asset loading compatible
with locale middleware. CSP disables network APIs and form submission.

Deployment and verification evidence is recorded in `docs/hand-off/AI_PROJECT_HANDOFF.md`.

Serve this folder (ES modules require HTTP; do not open the HTML with `file://`):

```bash
python3 -m http.server 4175 --bind 127.0.0.1 --directory docs/mockups/customer-onboarding
```

Open `http://127.0.0.1:4175/?v=2`. Reload an existing tab to receive updates.

## Branding

Owner-requested **Datum Bank** concept, using the symbol from the official
[Datum logo](https://datumhq.com/wp-content/uploads/2025/04/logo_white.png),
Manrope typography and the blue sampled from [Datum's website](https://datumhq.com/en/).
The original logo image is unchanged; CSS displays its symbol beside the new
Datum Bank wordmark. Header, sample card, favicon, browser title, buttons,
progress and form accents use the updated identity. Assets are served locally;
font license and provenance are in `assets/`.

## What changed after v1 review

- Choose **CASA**, **Debit Card**, or **Credit Card** before the relevant stages
  are generated. CASA includes digital enrollment and an optional card; Debit
  Card requires an existing active sample CASA; Credit Card requires financial
  information and separate credit consent.
- Detailed field, conditional and cross-field rules with inline errors and a
  per-stage validation checklist. See [the rule catalogue](./VALIDATION_RULES.md).
- Generated **mock OTP** for mobile, email, application submission and resume.
  Codes appear inline and in the mock inbox. Includes expiry, resend cooldown,
  invalidated old codes, attempt locks, send limits and application binding.
- Continue stays disabled at verification steps until the corresponding checks
  pass. Submission requires its own consumed OTP bound to the current payload;
  contact/resume OTP and an old authentication stamp do not unlock it.
- Fictional form details are saved locally, including partly completed stages.
  Save/resume requires a fresh mock OTP and checks stale identity/screening,
  expired documents and changed consent versions. Confirmed information is
  read-only until reasoned, simulated Operations rework.
- Withdrawal, rejection, pending customer action, saved-application expiry,
  idempotent provisioning retry and notification-only retry are demonstrated.

## Reviewed source

Authenticated Chrome review of the live shared Development reader:

`https://babanking-git-develop-taanhluans-projects.vercel.app/en/banking-journeys/customer-onboarding`

Reviewed Overview's customer-facing stages/outcomes, Application Management
lifecycle/Save & Resume, and Customer Information validation/business rules.
The live ten-module version is newer than the hand-off v6 JSON. Product routing
and standalone Card/credit checks are explicit mockup extensions requested by
the owner, not new claims about the published CASA Journey.

## Try it

1. Choose a product and start its journey.
2. Send mock mobile OTP, read its displayed code, enter and verify; repeat for
   email. There is no fixed `123456` code in v2.
3. Complete eligibility, sample eKYC, information and screening. Change inputs
   to exercise validation; the checklist explains unmet conditions.
4. Follow product-specific stages, acknowledge the current sample notices and
   type the fictional legal name declaration. Marketing remains optional.
5. Verify a separate submission OTP, review, submit and create the sample product.
6. Use the scenario selector at the first step for identity retry, bank review,
   duplicate contact, unavailable product, provisioning timeout or notification
   delivery failure. Labelled demo clock controls help test OTP expiry/locks.
7. Save & exit to exercise resume authentication. Reset clears this origin's
   v2 saved demo and starts again. Prototype v1 storage is not migrated.

## Verification

```bash
node --test docs/mockups/customer-onboarding/model.test.mjs
npx eslint docs/mockups/customer-onboarding/app.mjs docs/mockups/customer-onboarding/model.mjs docs/mockups/customer-onboarding/model.test.mjs
```

29 behavioral groups cover branch routing, date/format boundaries, conditional
validation, OTP lifecycle/binding, rework, stale evidence, terminal outcomes and
idempotency. Chrome walkthroughs completed all three branches and tested the
major error paths, contact/submission/resume OTP, retained form data, PEP review,
notification retry and responsive layout at 390px.

## Prototype boundaries and next step

All data and provider outcomes are fictional. The prototype has no network API,
bank integration, uploads, camera, real credentials, signatures, messages or
transactions. Only this local origin's browser storage is used; it is not secure
persistence, real authentication or an immutable audit log. Do not enter real
personal data. Source-derived rules and illustrative demo policy are identified
in the rule catalogue, including credit thresholds and tax-format approximations.

The owner authorized integration into shared Development. The existing app auth,
membership and Knowledge Access checks run before reading any artifact file.
The current Journey URL and published revision stay unchanged. Do not move these
artifacts into unauthenticated `public/` routes.

The design iterations were local. The subsequent integration targets `develop`
only; Production promotion is separate. No CMS content change is required.
