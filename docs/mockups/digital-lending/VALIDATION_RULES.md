# Digital lending concept v1 — rule catalogue and gap review

This is an executable prototype rule catalogue, not approved credit policy.

- Source: Development Journey `lending`, published v6 ("Digital Lending
  Onboarding"), read-only on 2026-10-27.
- Values marked *demo* are configurable examples (`POLICY` in `model.mjs`).

## Executable rules

| IDs | Area | Checks / behavior | Basis |
|---|---|---|---|
| PR01–05 | Product & request | Product required. Repeat-customer product only for existing customers (DEMO-CIF-001). Restricted purpose blocked. Amount 10m–catalogue max in 1m steps. Term 6–60 months. | Simulation segmentation gating; amount step/tenor examples |
| RG01–03 | Registration | Vietnam mobile and email formats. Separate purpose-bound OTP for each. Changing a contact invalidates its verification. | Registration & Onboarding stage 2 |
| ID01–04 | Identity | New customers need document, front/back, readable image, expiry, selfie and liveness. Existing customers need selfie + liveness only. Third failure ends as Not Verified. | "Verification depends on customer type"; Not Verified outcome |
| SC01–03 | Screening | Confirmed match → Compliance Restricted (never a credit decline). Potential match / PEP → compliance referral with a separate outcome. 14-day freshness (*demo*). | Onboarding rules and outcomes |
| CS01–03 | Consent | Terms, privacy and bureau consent are explicit and versioned (`LEND-DEMO-3`). Data sharing and marketing are optional. Earlier rework clears consents. | "Consent must be explicit and recorded before dependent processing" |
| PF01–05 | Profile | Name and DOB match the verified identity. Employer/business required by employment type. Whole-number validation. Implausible spending vs. income, or expenses too low for the household, needs correction or a clarification (Requires Clarification). Explicit confirmation required. | Profile rules: declared values recorded as declared; Clarify pattern |
| EL01–09 | Eligibility | Rule set `ELIG-DEMO-2026.10` bound to the result. Age ≥18. Age at maturity ≤65. Resident. Serviceable city. Salaried/self-employed. Tenure ≥3 / ≥12 months. Occupation not prohibited. Top-up relationship ≥12 months. | Eligibility stages; internal hard-rule examples |
| EL10–12 | Eligibility outcomes | Primary income below 8m but ≥5m → redirect to Collateral loan (*demo*). Probation contract → discretionary referral, approved only with a reason (Eligible with Exception). Mandatory failure → Not Eligible. | Redirect / Conditional / Not Eligible outcomes |
| CR01–05 | Credit assessment | Valid current bureau consent checked before the enquiry. Purpose recorded. A pending response retries the same enquiry. A refresh needs a reason. Maximum 2 enquiries (*demo*). Thin file → Limited (not adverse); disputed → Flagged. 30-day freshness. | Credit Assessment rules and outcomes |
| CL01–03 | Collateral | Value ≥50m. Third-party owner consent. Appraised value (not declared) × LTV 70% car / 75% property caps the amount (*demo*). | Secured product prerequisites |
| DU01–07 | Documents | Requirements by employment, product and address history (<1 year → proof of address). Formats PDF/JPG/PNG. ≤10 MB. Not encrypted, readable, matches requirement purpose. Replacement supersedes with lineage. Transfer failure registers nothing. Identity not re-requested. | Document Upload stages, rules and outcomes |
| AF01–06 | Affordability | Usable income = min(declared, evidenced) primary + 50% secondary. Obligations = max(declared, bureau). DSR ≤30 / 40, DTI ≤45 / 55, residual buffer 3m. Evidence gap >10% minor, >30% referral. Results bound to their inputs. | DSR/DTI guideline table (example) |
| DE01–05 | Decision engine | Internal hard rules (eligibility re-checked + active arrears, recent write-off). External hard rules (recent default, 2+ obligations 60+ DPD, utilization >95%, external DTI >55%). Score from the example factor table. Cut-off 500. Grades 850/700/600/500. Referral for >10 inquiries in 30 days, disputed entry, Bronze + borderline, or eligibility exception. | Decision Engine steps 1–4 |
| SM01–05 | Simulation | Grade rate, tenor and amount caps (Platinum 500m/60m … Bronze 100m/24m, *demo*). Collateral −3 pts, top-up −1 pt. Affordability cap from DSR/DTI. Counter-offer names the binding cap. 1% origination fee in APR. Optional protection excluded from APR. Maturity age re-checked. | Product data configured; simulation rules |
| OF01–04 | Offer | Versioned offer with presentation time. 7-day validity (*demo*). Key facts acknowledgement before accepting. Decline and expiry close with a reason. Rework supersedes the offer. | Offer & Agreement steps 1–4, 6 |
| SG01–04 | Signing | All earlier stages revalidated. Agreement and typed name. Signing OTP bound to offer version, terms, mandate and signature. Timeout leaves nothing executed and retries idempotently. Disbursement excluded. | Agreement signing controls |
| RS01–05 | Resume | Fresh resume OTP. 30-day inactivity expiry. Offer expiry. Stale identity, screening or bureau result forces rework. Consent version change. | Prototype session controls |

## Gaps found in the Journey content (for the content owner)

1. **Score scale.** The example factor table's best case sums to 800 points,
   but the table states a maximum of 1000. Grade bands assume 1000. The mockup
   scales factor points × 1000/800; the table needs either more factors or
   restated bands.
2. **New customers in scoring.** Internal repayment points cover existing
   customers only. The mockup assigns a neutral 55 to "no internal lending
   history" (*demo* assumption).
3. **Self-employed income stability.** Only the ≥24-month band is defined.
   The mockup uses 20 points below 24 months.
4. **Module order versus dependencies.** Loan Product & Simulation (module 6)
   depends on the Decision Engine (module 9). Document Upload (7) feeds
   Income & Affordability (5). The Journey could state the runtime order explicitly.
5. **Offer & Agreement has two "Step 6" sections.** "Post-Signing Routing" and
   "Agreement Signing" overlap with Step 5.
6. **Eligibility redirect targets are unspecified.** The mockup's
   unsecured-to-collateral redirect is an illustrative example.
