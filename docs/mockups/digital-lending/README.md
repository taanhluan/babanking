# Datum Bank — digital lending onboarding concept v1

Interactive concept for the Development Journey `lending` (published v6,
"Digital Lending Onboarding"), built on 2026-10-27 in the same format as the
Customer Onboarding mockup: Datum Bank branding, plain HTML + ES modules, a mock
OTP inbox, executable rules and Node tests.

## Development integration

On Development, the `lending` Journey toolbar places **Mockup** next to
**Save knowledge**. It opens `/en/banking-journeys/lending/mockup` in a new tab.
It uses the same protected route handler as Customer Onboarding:

- Journey VIEW authorization runs before any file is read.
- Only allow-listed files are served, with private/no-store, noindex and CSP headers.
- The handler is disabled outside matching Development labels.

The catalog maps the slug `lending` to this directory. Nothing is copied to `public/`.

Run it standalone (ES modules need HTTP, not `file://`):

```bash
python3 -m http.server 4176 --bind 127.0.0.1 --directory docs/mockups/digital-lending
```

## Journey mapping

| Mockup stage | Journey module |
|---|---|
| Choose a loan, Register & OTP, Verify identity, Screening, Consents | 1. Registration & Onboarding |
| Your profile | 2. Profile & Information Collection |
| Eligibility | 3. Eligibility Check |
| Credit check | 4. Credit Assessment |
| Collateral (Collateral loan only) | 6. Loan Product & Simulation (secured prerequisites) |
| Documents | 7. Document Upload |
| Affordability | 5. Income & Affordability |
| Decision | 8. Risk Assessment + 9. Decision Engine |
| Simulation | 6. Loan Product & Simulation |
| Your offer, Sign, Signed | 10. Offer & Agreement |

Order differs from the module order in two places:

- Documents run before Affordability, because affordability consumes the evidenced income.
- Final simulation runs after the Decision Engine, because it needs the risk grade
  (the Journey's own Simulation Stage 3 depends on it).

The product step shows an indicative, non-binding estimate instead.

The side panel lists **Domain outcomes** using the Journey's outcome taxonomy
(USABLE / WAITING / REFERRED / NEGATIVE / BLOCKED ...).

## Products and personas

- **Personal credit loan**: unsecured.
- **Collateral loan**: adds collateral appraisal, an LTV cap and the ownership document.
- **Repeat-customer top-up**: existing customers only. Selfie-only re-verification;
  bank-held salary credits replace payslips.

Personas give reviewers quick paths to different outcomes:

| Persona | Expected path |
|---|---|
| Alex | Platinum |
| Binh | Bronze + borderline → referral → counter-offer |
| Chi | Thin file → Silver |
| Dung | External hard-rule decline |

Scenarios add exception paths:

- identity retry
- compliance referral
- pending bureau response
- failed document transfer
- signing timeout
- notification failure

## Verification

```bash
node --test docs/mockups/digital-lending/model.test.mjs
npx eslint docs/mockups/digital-lending/
```

20 behavioral tests cover routing, gating, eligibility outcomes, bureau
footprint, upload validation and lineage, affordability bands, hard rules,
scoring and grading, caps and counter-offers, offer expiry and decline, signing
OTP binding and idempotency, OTP lifecycle, resume revalidation and outcome
taxonomy.

A headless Chrome walkthrough completed every product and persona path (Dung
ends declined) with no console errors, including a 390px mobile run.

## Boundaries

- All data, scores, rates, caps and fees are fictional demo policy. See
  [the rule catalogue](./VALIDATION_RULES.md).
- No network API, bureau, upload, camera, signature, disbursement or message.
- Browser storage only; this is not secure persistence or an audit log.
- Do not enter real personal data.
- The published Journey revision is unchanged. No CMS or database change was made.
