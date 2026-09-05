# Milestone 0: Verification Report (Pre-Run Template)

This document tracks the mechanical verification of the 7 `[TO VERIFY]` assumptions defined in Section 16 of [ARCHITECTURE.md](file:///home/lala_02/rescue/ARCHITECTURE.md#L621-L635).

---

## 1. Verification Scorecard

| # | Assumption / Probe | Target Subsystem | Expected Invariant | Status | Live Result / Latency |
|---|--------------------|------------------|--------------------|--------|-----------------------|
| **1** | Multi-Member EphemeralPermission | TEE PER (`devnet-tee`) | Can initialize permission with 2 members `[bidder, matcher]` | `PENDING_RUN` | — |
| **2** | CPI Undelegate & Ownership Return | TEE ER -> Solana Base | `undelegate` CPI returns base ownership to program in <= 30s | `PENDING_RUN` | — |
| **3** | Base Mutation on Delegated Account | Solana Runtime / Anchor | Direct mutation on DLP account fails with `3007` | `PENDING_RUN` | — |
| **4** | Pyth PriceUpdateV2 on TEE ER | Pyth Oracle + ER Sync | Feed is readable and non-stale (`age < 600s`) inside ER | `PENDING_RUN` | — |
| **5** | Delegation Latency vs Oracle Race | Solana Base -> ER Sync | Activation time $T_{\text{base}} + T_{\text{er}}$ quantified for buffer | `PENDING_RUN` | — |
| **6** | MEV Bot Liquidation Lockout | Attack Console (`liquidate()`) | Adversarial `liquidate()` strictly deflected by 3007 error | `PENDING_RUN` | — |
| **7** | Ephemeral Account Zero-Trace Close | TEE ER State Lifecycle | `LenderBidPDA` closes on ER leaving 0 base layer bytes | `PENDING_RUN` | — |

---

## 2. Methodology & Invariants Tested

### Probe 1: EphemeralPermission Multi-Member Bug
- **Context:** Tenor documented that public TEE Magick only persisted 1 member on `CreateEphemeralPermissionCpi`, requiring single-member permissioning + base-layer cross-read denial (`6013`).
- **Test:** Attempts `init_probe_permission(is_private: true, members: vec![authority, stranger])` on `https://devnet-tee.magicblock.app`.
- **Criterion:**
  - `PASS`: 2 members succeed, stranger receives `null` on TEE `getAccountInfo`.
  - `WARN`: 2 members fail or drop, stranger blocked via base error `6013`. (Fallback to Tenor architecture).

### Probe 2: CPI Undelegate & Ownership Return Latency
- **Context:** Settlement relies on program CPI undelegation rather than fragile client-side commit instructions.
- **Test:** Invokes `undelegate_probe()` via `MagicIntentBundleBuilder` on ER, starts timer, and polls `baseConn.getAccountInfo(probePda)` until `owner == PROBE_PROGRAM_ID`.
- **Criterion:**
  - `PASS`: Ownership returns within $\le 30$ seconds.
  - `WARN`: Ownership returns between 30–60 seconds (requires extending `RESCUE_WINDOW_DURATION`).
  - `FAIL`: Account remains stranded on DLP after 60 seconds.

### Probe 3 & 6: 3007 Error as the MEV Liquidation Lock
- **Context:** The Rescue protocol relies on DLP delegation to prevent MEV liquidation bots from front-running the rescue process.
- **Test:** An unprivileged caller sends `liquidate_probe()` on Solana base layer targeting a delegated `ProbeAccount`.
- **Criterion:**
  - `PASS`: Anchor rejects the transaction with error `3007 (AccountOwnedByWrongProgram)` before handler execution.
  - `CRITICAL IMPLICATION`: `timeout_rescue` cannot use `Account<'info, PositionPDA>` while stranded on DLP; it must use an `UncheckedAccount` or DLP undelegation trigger.

### Probe 4: Pyth PriceUpdateV2 on TEE ER
- **Context:** Health Factor calculation and bid validation occur inside TEE ER during `match_and_settle`.
- **Test:** Reads `PYTH_PRICE_FEED_ACCOUNT` on Base vs TEE ER RPC.
- **Criterion:** Account exists on ER, data length matches Base, and publish timestamp is within `MAX_PRICE_AGE_SECONDS` (600s).

### Probe 5: Delegation Latency vs Oracle Race
- **Context:** If a position is at $1.02$ Health Factor and price drops fast, keeper delegation latency must not exceed the price decay window.
- **Test:** Measures $T_{\text{base}}$ (transaction landing) + $T_{\text{er}}$ (ER account indexing).
- **Criterion:** Sets the exact basis points buffer for `INTERVENTION_ZONE` (e.g. $300\text{ bps} = 3\%$ above liquidation).

### Probe 7: Ephemeral Account Zero-Trace Cleanup
- **Context:** Sealed lender bids must remain private and leave zero historical on-chain footprint after matching closes.
- **Test:** Creates `EphemeralItemAccount` on ER, verifies base layer has 0 record, closes on ER, verifies base layer remains pristine.

---

## 3. How to Run

1. Build and deploy the throwaway probe program on **Google Cloud Shell** (see commands in instructions).
2. Update `.env` with `PROBE_PROGRAM_ID`.
3. Run:
   ```bash
   yarn probe:all
   ```
4. This file will be automatically overwritten with the live test outputs and measured latencies.
