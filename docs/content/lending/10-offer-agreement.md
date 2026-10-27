# 10. Offer & Agreement

> Digital Lending Onboarding — module 10 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Previous: Decision Engine](09-decision-engine.md)

## Contents

- [10.1 Business Definition](#101-business-definition)
- [10.2 Business Responsibilities](#102-business-responsibilities)
- [10.3 Relationship with Other Domains](#103-relationship-with-other-domains)
- [10.4 Business Purpose](#104-business-purpose)
- [10.5 Lifecycle Summary](#105-lifecycle-summary)
- [10.6 Step 1: Offer Eligibility Check](#106-step-1-offer-eligibility-check)
- [10.7 Step 2: Offer Construction](#107-step-2-offer-construction)
- [10.8 Step 3: Offer Presentation](#108-step-3-offer-presentation)
- [10.9 Step 4: Customer Agreement](#109-step-4-customer-agreement)
- [10.10 Step 5: Agreement Signing](#1010-step-5-agreement-signing)
- [10.11 Step 6: Post-Signing Routing and Closure](#1011-step-6-post-signing-routing-and-closure)
- [10.12 Step 6: Agreement Signing](#1012-step-6-agreement-signing)
- [10.13 Offer Inputs, Controls, and Design Considerations](#1013-offer-inputs-controls-and-design-considerations)
- [10.14 Typical Outcomes](#1014-typical-outcomes)
- [10.15 Key Business Concepts](#1015-key-business-concepts)

## 10.1 Business Definition

The Offer & Agreement Domain converts policy-eligible retail lending cases into customer-facing offers and records the customer's decision to proceed.

It takes the application context, approved product rules, pricing/configuration, and the Risk Assessment grade, then decides what offer to make, presents it clearly to the customer, records acceptance or rejection, and prepares accepted cases for agreement signing.

Offer & Agreement does not itself:
- Perform the underlying risk assessment or assign the risk grade
- Replace the decision engine’s approval or rejection logic
- Disburse funds
- Manage post-disbursement servicing or collections

Instead, it produces a structured offer outcome and a confirmed customer-intent outcome for downstream domains to consume.

## 10.2 Business Responsibilities

- Receive eligible applications and assessment results from upstream domains
- Translate policy, pricing, and grade-based treatment into a valid customer offer
- Determine allowed ranges for amount, tenor, repayment plan, and pricing within approved rules
- Present the offer clearly, including key terms, obligations, and important conditions
- Capture whether the customer accepts or declines the offer
- Support controlled revision or re-offer flows where policy allows
- Close the application if the customer does not agree to the offer and no further path is permitted
- Record timestamps, versioning, and audit evidence for offer presentation and customer response
- Prepare accepted offers for downstream agreement signing
- Facilitate the formal agreement signing process once the offer is accepted

## 10.3 Relationship with Other Domains

| Business Domain | Relationship to Offer & Agreement | What Is Exchanged |
|---|---|---|
| Risk Assessment | Provides graded risk outcome used for offer shaping | Pass status; Score; Grade; Reason information; Policy-relevant indicators. |
| Decision Engine | Provides eligibility to proceed into offer stage | Proceed decision; Routing status; Applicable decision reasons. |
| Application Management | Provides case context and receives offer-state updates | Application identifier; Product context; Applicant details; Offer status; Closure outcome. |
| Retail Lending Customer Portal | Presents the offer and captures customer response | Offer details; Disclosures; Acceptance input; Decline input; Confirmation status. |
| Employee Portal / Review Workflow | Supports assisted handling or exception review where needed | Offer summary; Exception notes; Manual adjustments within authority; Customer response status. |
| Agreement Signing | Receives accepted offer and executes the legal agreement | Accepted terms; Customer consent status; Agreement-ready package; Offer version. |

## 10.4 Business Purpose

The Offer & Agreement Domain provides a structured, customer-confirmed bridge between risk-assessed eligibility and formal lending execution.

This domain serves six core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Grade-Based Commercial Treatment | Ensures customers receive an offer aligned with the risk grade assigned during assessment, supporting consistent and policy-based differentiation. |
| Clear Customer Choice | Gives the customer a clear opportunity to review key terms and decide whether to proceed before agreement signing. |
| Explainable Offer Construction | Supports traceability of how amount, tenor, pricing, and repayment structure were derived from approved rules and assessment outputs. |
| Operational Control | Separates offer acceptance from legal agreement execution so that intent to proceed is captured cleanly before downstream actions begin. |
| Application Closure Discipline | Provides a controlled end-state when a customer declines the offer or does not proceed within the allowed response window. |

## 10.5 Lifecycle Summary

| Step | Objective | Main Logic | Possible Outcome |
|---|---|---|---|
| 1 | Offer Eligibility Check | Confirm the case is allowed to enter offer stage and that required upstream outputs are complete | Continue or stop for exception handling |
| 2 | Offer Construction | Build a valid offer using: Product policy; Commercial rules; Risk grade treatment. | Offer package generated |
| 3 | Offer Presentation | Present: Terms; Repayment expectations; Important conditions. To the customer | Offer displayed and response awaited |
| 4 | Customer Agreement | Capture whether the customer accepts or declines the offer | Accepted; Declined; Expired. |
| 5 | Agreement Signing | Execute the legal agreement using the accepted offer, capture required signatures and consent evidence, and confirm the agreement outcome | Signed and ready for downstream processing, or signing failed / abandoned |
| 6 | Post-Signing Routing and Closure | Record the agreement outcome, route successfully signed cases downstream, or close cases where signing fails or is abandoned | Signed agreement routed downstream, or application closed |

## 10.6 Step 1: Offer Eligibility Check

This step confirms that the application is allowed to enter the offer stage. The domain should verify that the application has passed required upstream checks and that the information needed to build an offer is complete and current.

▸ Purpose
To ensure only eligible, decision-ready cases are translated into customer offers.

▸ Typical smaller steps
- Confirm proceed status: Check that upstream decisioning and assessment outcomes allow the case to enter offer stage.
- Validate required inputs: Confirm that product, applicant, requested-loan, score, grade, and commercial configuration inputs are available and usable.
- Check freshness and versioning: Ensure the offer is based on current policy, pricing, and assessment outputs.
- Determine whether an offer can be constructed: Route the case forward only if the required conditions are satisfied.

▸ Typical controls at this step
- Accepted risk grade must exist for cases that require grade-based treatment
- Offer logic must use approved pricing and product configuration only
- Expired or superseded upstream results should not be used to create a new offer
- Cases under unresolved exception review should not proceed automatically unless policy allows it

## 10.7 Step 2: Offer Construction

If the case is eligible, the domain constructs an offer using customer context, product rules, and the grade assigned by Risk Assessment. The offer should remain within approved commercial boundaries and must be understandable to the customer.

▸ Purpose
To convert a passed lending case into a concrete, policy-approved offer that reflects both risk quality and product rules.

▸ What offer construction commonly determines
- Approved loan amount or approved amount cap
- Tenor or repayment duration
- Interest rate or pricing tier
- Repayment frequency and installment structure
- Whether stricter conditions apply for weaker passing grades
- Whether promotional or preferential terms are allowed for stronger grades

▸ How risk grade influences the offer
The risk grade should not be treated as a purely informational label. It can be used as an input to shape commercial treatment within policy.

### How risk grade influences the offer

| Grade | Illustrative Offer Position | Illustrative Customer Benefit or Restriction | Repayment Treatment Example |
|---|---|---|---|
| Platinum | Best available offer tier within product policy | Higher eligible amount; More favorable rate; Longer flexible tenor; Lower fee burden. Where allowed | Standard installment plan with the broadest choice of repayment dates or tenor combinations |
| Gold | Strong offer tier | Good pricing; Strong amount eligibility; Standard-to-favorable tenor options. | Standard repayment structure with minor restrictions compared with Platinum |
| Silver | Baseline acceptable offer tier | Moderate amount eligibility; Standard pricing; Normal tenor choices. | Standard repayment plan using ordinary controls and affordability limits |
| Bronze | Most conservative passing offer tier | Lower approved amount; Less favorable pricing; Shorter tenor; Tighter affordability guardrails. | Stricter repayment plan, such as shorter repayment duration, lower exposure, or more conservative installment sizing |

Important distinction: Higher grades can support better offers, but only within approved product and policy limits. Lower grades are still passing grades, yet they may receive more conservative terms to control risk appropriately.

▸ Illustrative examples of grade-based offer treatment
- Platinum customer: may receive the full requested amount if within policy, the lowest rate band for the product, and a broader tenor range.
- Gold customer: may receive near-preferred pricing and a high proportion of the requested amount with standard flexibility.
- Silver customer: may receive a standard offer with ordinary pricing, standard fees, and a moderate approved tenor.
- Bronze customer: may still be offered credit, but with a lower amount, shorter tenor, stricter repayment plan, or higher margin within policy to reflect weaker but still acceptable risk quality.

▸ Typical smaller steps within offer construction
- Select the applicable product offer logic: Choose the correct offer framework for product, channel, and customer type.
- Apply grade-based treatment: Map the risk grade to allowed pricing bands, amount limits, tenor limits, or repayment constraints.
- Calculate key offer terms: Determine amount, repayment schedule, rate, fees, and important conditions.
- Validate commercial and policy compliance: Ensure the generated offer stays within approved boundaries.
- Create the offer record: Store the generated terms, assumptions, and offer version.

## 10.8 Step 3: Offer Presentation

Once constructed, the offer must be presented to the customer in a clear and understandable form before any legal signing event occurs.

▸ Purpose
To ensure the customer can review the proposed lending terms and make an informed decision on whether to proceed.

▸ What should typically be shown
- Loan amount offered
- Repayment tenor
- Expected installment amount and frequency
- Interest rate, fees, or other important charges where applicable
- Any important conditions, limitations, or expiry of the offer
- A clear action choice to accept or decline

▸ Typical smaller steps
- Prepare customer-facing summary: Translate structured offer data into understandable customer language.
- Display important terms and disclosures: Present the key commercial and repayment obligations clearly.
- Record presentation event: Store when, where, and which version of the offer was shown.
- Start response window if applicable: Track the period during which the customer may accept the offer.

## 10.9 Step 4: Customer Agreement

After reviewing the offer, the customer must explicitly indicate whether they agree to proceed. This agreement step is distinct from formal contract signing. It captures intent to move forward before agreement execution begins.

▸ Purpose
To obtain a clear pre-signing customer decision on the offer.

▸ Possible customer responses
- Accept: the customer agrees to proceed on the offered terms
- Decline: the customer does not agree to the offer
- No response / expiry: the customer does not act within the allowed window
- Refer or assisted handling: the case needs human support where policy allows controlled adjustment or explanation

▸ Typical smaller steps
- Capture customer response: Record whether the customer accepts or declines.
- Validate response authority and integrity: Confirm the response is linked to the correct customer and offer version.
- Determine next state: Route the case to signing preparation, closure, or exception handling.
- Record audit evidence: Store timestamp, channel, and offer version related to the customer’s choice.

Customer agreement is the precursor to agreement signing. Once the customer accepts the offer, the process moves to the formal signing step described in Step 6.

## 10.10 Step 5: Agreement Signing

After the customer accepts the offer, the case proceeds to formal agreement signing. This step executes the legal agreement using the accepted offer version and records the required customer signatures, consent, and signing evidence. Fund disbursement is not part of this lifecycle and is handled in a separate downstream process.

▸ Purpose
To convert the accepted offer into a legally executed agreement and provide a reliable agreement outcome for downstream processing.

▸ Typical smaller steps
- Prepare the agreement package: Generate the agreement and required disclosures from the accepted offer version, customer details, and applicable product terms.
- Present the agreement for signing: Make the agreement available through the approved digital or assisted signing channel.
- Capture signatures and consent: Record the customer’s signature, consent, authentication evidence, signing timestamp, and signing channel as required.
- Validate signing completion: Confirm that all mandatory parties, documents, and signing steps are complete and that the executed agreement is valid.
- Record the agreement outcome: Store the signed agreement reference, executed document version, and audit evidence, or record a failed, abandoned, or expired signing outcome.

▸ Possible signing outcomes
- Signed: all required signing and consent steps are complete.
- Signing failed or abandoned: the agreement was not successfully executed.
- Signing expired: the customer did not complete signing within the permitted window.

Scope boundary: This page covers agreement signing and its outcome. It does not cover the subsequent disbursement step, which is documented separately.

## 10.11 Step 6: Post-Signing Routing and Closure

The domain must produce a clear outcome after the customer response.

▸ Purpose
To move accepted cases into agreement signing and to close non-proceeding cases in a controlled manner.

### Purpose

| Customer Response | Operational Meaning | Typical Next Outcome |
|---|---|---|
| Accepted | Customer agrees to proceed with the offer | Proceed to agreement signing |
| Declined | Customer does not want to proceed on offered terms | Close application with customer-declined-offer outcome |
| No response / expired | Customer did not respond within allowed period | Close application or mark expired according to policy |
| Exception / assisted handling | Customer needs clarification or policy-permitted review | Route to employee workflow for supported handling |

If the customer disagrees with the offer they received and no permitted revision path exists, the application should be closed with a clear reason outcome. This avoids leaving the case in an ambiguous state and ensures downstream signing does not proceed incorrectly.

## 10.12 Step 6: Agreement Signing

After the customer accepts the offer, this step finalizes the legal commitment between the bank and the customer. It executes the agreement using the accepted offer version and records the required signature, consent, and audit evidence. Fund disbursement is excluded and handled on another page.

▸ Purpose
To finalize the legal commitment and produce a valid, executed agreement ready for downstream processing.

▸ Typical smaller steps
- Generate agreement documents: Create the agreement and required disclosures from the accepted offer, customer details, and applicable product terms.
- Present for signature: Make the agreement available through the approved digital or assisted signing channel.
- Capture signature: Record the customer’s signature, consent, authentication evidence, timestamp, and signing channel.
- Verify and finalize: Confirm all mandatory parties and documents are complete, validate the executed agreement, and store the final agreement reference and audit evidence.

▸ Typical controls
- Agreement terms must match the accepted offer version and applicable disclosures.
- Use MFA or OTP as required to authenticate the customer for signing.
- Store executed documents and signing evidence in tamper-evident storage.

## 10.13 Offer Inputs, Controls, and Design Considerations

- Approved inputs only: Offer generation should use approved product, pricing, and assessment sources only.
- Grade-based consistency: Similar grades under similar product conditions should receive consistent treatment unless an approved segmentation rule applies.
- Clear separation of stages: Offer acceptance must remain distinct from legal agreement signing and fund disbursement.
- Version control: Offer terms, disclosures, and customer response should be tied to a specific offer version.
- Expiry handling: Offers should not remain open indefinitely; response windows and stale-offer treatment should be controlled.
- Traceability: Store timestamps, channel, customer action, and offer terms for audit and dispute handling.
- Controlled revisions: If re-offers or manual adjustments are allowed, they must remain within delegated authority and policy boundaries.

## 10.14 Typical Outcomes

| Outcome | Category | Description |
|---|---|---|
| Offer Generated | USABLE | A valid customer offer was created based on policy, product rules, and risk grade. |
| Offer Accepted | USABLE | The customer agreed to proceed and the case can move to agreement signing preparation. |
| Agreement Signed | USABLE | The legal agreement was executed successfully and is ready for downstream processing. Fund disbursement is excluded from this page. |
| Offer Declined by Customer | NEGATIVE | The customer did not agree to the offered terms and the application should be closed unless another permitted path exists. |
| Offer Expired | NEGATIVE | The customer did not respond within the allowed timeframe. |

## 10.15 Key Business Concepts

| Concept | Definition |
|---|---|
| Offer | The customer-facing set of proposed lending terms created from approved policy and assessment outputs. |
| Offer Version | The specific version of the offer terms and disclosures presented to the customer. |
| Customer Agreement | The customer’s explicit decision to accept or decline the offer before legal agreement signing. |
| Grade-Based Treatment | The use of Risk Assessment grade to shape pricing, amount, tenor, or repayment conditions within policy. |
| Offer Expiry | The point after which the presented offer is no longer valid if the customer has not responded. |
| Application Closure | The controlled end-state applied when the customer declines the offer or does not proceed. |
| Agreement Signing | The formal process of executing the legal agreement after the customer accepts the offer, including signature capture, authentication, verification, and tamper-evident storage of the executed agreement. |

FAQ

Does this page cover legal agreement signing? Yes. This page covers offer construction, offer presentation, customer agreement to proceed, and formal agreement signing. Fund disbursement is excluded and documented on a separate page.

Can two customers receive different offers even if they requested the same amount? Yes. If policy allows grade-based treatment, customers with stronger grades may receive better pricing, broader tenor options, or higher approved amounts, while weaker passing grades may receive more conservative terms.

What happens if the customer declines the offer? If the customer declines the offer and no permitted revision or assisted path applies, the application should be closed with a clear customer-declined-offer outcome.

---

[← Digital Lending Onboarding](README.md) · [Previous: Decision Engine](09-decision-engine.md)
