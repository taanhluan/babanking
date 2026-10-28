# Datum Bank — IFT Fee Workbench (T24 → satellite systems fee mock)

Training simulator for corporate international fund transfer (IFT) fees: a
T24-style tariff is configured under maker–checker, synced to the IFT fee
catalog, quoted to a corporate customer, executed, posted and reconciled.
Plain HTML + ES modules, no dependencies, state in `localStorage`
(`datum-ift-fee-workbench.v1`), no network calls.

## Origin

Adapted on 2026-10-28 from the handover kit `IFT_Fee_Workbench_Developer_Kit`
(source commit `c2e78238d637d951b26b98d6470647c12bfb8593`). The kit stays at
the repository root as the untouched original and is git-ignored.

Changes against the original (owner decisions, 2026-10-28):

- UI, seed data, errors, warnings and glossary translated from Vietnamese to
  English; dates use `en-GB`.
- Real bank branding replaced with the fictitious **Datum Bank**. The external
  link to the real bank's tariff PDF was removed; the Temenos pricing-capability
  link is kept as a public reference.
- Storage key renamed so old Vietnamese sessions are not reused.
- `styles.css` is byte-identical to the original. Fee logic in `engine.mjs` is
  unchanged; only text strings changed. `engine.test.mjs` is the original 25
  checks (`checks.mjs`) on `node:test`.

## Development integration

On Development, the `payments-and-transfers` Journey (Retail) toolbar shows
**Mockup**, which opens `/en/banking-journeys/payments-and-transfers/mockup`.
It uses the same protected route handler as the other mockups:

- Journey VIEW authorization runs before any file is read.
- Only `index.html`, `styles.css`, `app.mjs` and `engine.mjs` are served
  (per-mockup allow-list in `src/server/journey-mockups/catalog.ts`), with
  private/no-store, noindex and CSP headers (`connect-src 'none'`).
- The handler is disabled outside matching Development labels.

The app has no URL router, so there are no `#step=` deep links from the reader.

## Screens

Overview · T24 configuration (draft, compare, approve) · Tariff sync (7 steps)
· IFT new payment (details, quote breakdown, review) · Approve & execute ·
API Explorer · Accounting & reconciliation · Audit trail · Scenario lab
(12 scenarios) · Guide & glossary. Five simulated roles: bank configurator,
bank approver, corporate maker, corporate approver, trainer.

## Run the checks

```bash
node --test docs/mockups/ift-fee-workbench/engine.test.mjs
```

## Limits

Everything is simulated: `/mock/...` paths are trace labels, not APIs; GLs,
BICs, FX rates, tax and balances are assumptions; Number arithmetic, not
decimal money. The kit's own docs (`docs/09_LIMITATIONS.md`,
`docs/11_PRODUCTION_PROPOSAL.md`, the proposed OpenAPI bridge) describe the gap
to a real T24 integration. None of that backend is implemented here.
