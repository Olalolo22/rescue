# 🎨 Rescue Protocol — UI & Motion Design Specification

> **Target Audience for this document:** UI/UX Designers, Motion Designers, Frontend Developers, or Generative UI Prompts (v0.dev, Galileo, Midjourney).

---

## 1. Executive Summary & Metaphor

### The 1-Sentence Pitch
> *"DeFi liquidations today are public bloodbaths where MEV searchers cannibalize borrower equity. Rescue inserts a 60-second confidential TEE shield where liquidators compete in a reverse auction to offer the borrower the lowest penalty."*

### Visual Metaphor
- **The Status Quo:** A defenseless borrower standing in an open gladiator arena under red sniper lasers.
- **Rescue Activated:** A glowing violet electromagnetic bubble (The TEE Shield) drops over the borrower. The sniper lasers (MEV bots) hit the shield and ricochet off with `Error 3007`. Inside the bubble, searchers silently bid down the penalty.

---

## 2. Design Aesthetics & Visual Tokens

- **Theme:** High-frequency Institutional Defense / Cyber-Telemetry (think *Bloomberg Terminal meets Iron Man HUD*).
- **Background:** Deep obsidian slate (`#0B0E14` base, `#121824` cards, `#1E2638` borders).
- **Typography:** 
  - Primary UI: `Inter` or `Geist`
  - Numbers, Metrics, & Timers: `JetBrains Mono` or `Fira Code` (tabular numbers)
- **Status Accent Colors:**
  - 🟩 **Emerald Safety (`#00F5A0`):** Health Factor $\ge 1.20$, Status: `HEALTHY`
  - 🟧 **Amber Warning (`#FF9F1C`):** Health Factor $\le 1.05$, Status: `AT_RISK`
  - 🟪 **Cyber Violet (`#7B2CBF` / `#A855F7`):** The Confidential TEE Shield (`IN_INTERVENTION_ZONE`)
  - 🟥 **Crimson Threat (`#FF3366`):** Predatory MEV liquidator bot attempts (Blocked: `Error 3007`)
  - 🟦 **Electric Cyan (`#00D2FF`):** Completed rescue, borrower surplus saved

---

## 3. The 4 Essential UI Modules

### Module 1: Position Health & Simulation Bar (Left Panel)
- **Live Health Factor Dial:** Radial gauge or segmented bar transitioning smoothly:
  - Green ($1.25$) $\to$ Orange ($1.02$) $\to$ Purple Shielded.
- **Position Telemetry:**
  - Collateral: `10.00 SOL` ($1,000.00)
  - Outstanding Debt: `$900.00 USDC`
  - Current Liquidation Boundary: `1.00`
- **Simulation Control:** A prominent slider or button:
  - `[Simulate -33% Price Drop]` $\to$ Triggers market downturn to test the shield.

---

### Module 2: The TEE Intervention Zone (Center / Top Hero)
- **Visual:** Pulsing violet glassmorphic card with a subtle grid background.
- **Countdown Timer:** Large digital countdown (`00:48s`) showing the 60-second sealed reverse auction.
- **Encrypted Bid Stream:**
  - Shows activity without leaking amounts:
  - `[Slot 304892012] Rescuer 7xK9... submitted sealed bid (Encrypted 🔒)`
  - `[Slot 304892019] Rescuer 2mP4... submitted sealed bid (Encrypted 🔒)`
  - Bid Count badge: `3 Bids Active`
- **Reserve Cap Banner:**
  - `Max Permissible Penalty (P_reserve): 6.50%`
  - Micro-label: *"Borrower guaranteed to save at least 1.50% vs public penalty (8.00%)"*

---

### Module 3: The MEV Attack Console (Real-time Defense Feed)
- **Visual:** An embedded dark terminal with monospace logs.
- **What it shows:**
  ```text
  [22:35:10] Keeper detected HF breach (0.8888) -> Position delegated to TEE
  [22:35:12] MEV searcher 8XA4... detected underwater position on L1
  [22:35:13] Searcher calling liquidate() with 500 SOL priority fee...
  [22:35:14] ❌ TRANSACTION REJECTED by Solana Runtime: Error 3007
  [22:35:14] 🛡️ AccountOwnedByWrongProgram: L1 mutation locked by DLP
  [22:35:15] MEV front-run neutralized. Private reverse auction continuing...
  ```
- **Impact:** This is the killer feature for judges. It visually proves that MEV bots are powerless while the TEE shield is up.

---

### Module 4: Settlement & Borrower Surplus Card
- **Comparison View:**
  - Standard Public Liquidation: **8.00% penalty** (Equity lost: **$72.00**)
  - Rescue Reverse Auction Winner: **2.50% penalty** (Equity lost: **$22.50**)
- **Hero Metric:**
  - 🎉 **Borrower Surplus Saved: +5.50% (+$49.50 retained)**
- **Audit Verification:**
  - Link to Solana Explorer: `View RescueRecord PDA (Verified Immutable) ↗`

---

## 4. Ready-to-Use AI Prompt (v0 / Galileo / Claude)

Copy and paste this into [v0.dev](https://v0.dev) or an AI frontend generator:

```text
Create a modern, dark-themed DeFi dashboard for "Rescue Protocol" — an ephemeral liquidation-intervention layer on Solana using MagicBlock TEE.

Aesthetic:
- Dark mode: deep slate (#0B0E14), glowing accents: emerald green (#00F5A0), cyber purple (#A855F7), and alert crimson (#FF3366). Monospace data tables, glassmorphism cards.

Layout:
1. Header: Logo, network indicator (Solana Devnet + MagicBlock TEE Active), wallet connection button.
2. Left Column: 
   - Position Health Card with an animated Health Factor gauge (current: 0.88 - AT_RISK).
   - Metrics: Collateral 10 SOL ($1,000), Debt $900 USDC.
   - Interactive button: "Simulate Market Crash (-33%)".
3. Center Column (The Hero):
   - "Confidential Intervention Zone" card with glowing purple border.
   - 60-second countdown circular timer (00:42 remaining).
   - Real-time sealed bid ticker showing anonymized encrypted bids.
   - Badge: "P_reserve Cap: 6.50% (Guaranteed Non-Worseness)".
4. Right Column (The Defense Feed):
   - "MEV Attack Interceptor" terminal showing simulated MEV searchers attempting public liquidation and getting rejected with "Error 3007: AccountOwnedByWrongProgram".
5. Bottom Banner:
   - Settlement comparison bar showing: Public Penalty (8%) vs Rescue Winning Bid (2.5%).
   - Big highlight: "Borrower Saved: +5.50% ($49.50)".
```
