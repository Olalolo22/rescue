# Rescue: Ephemeral Pre-Liquidation Auction Protocol

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana)](https://solana.com)
[![MagicBlock ER](https://img.shields.io/badge/MagicBlock-Ephemeral%20Rollup%20%2B%20PER-8A2BE2)](https://magicblock.gg)
[![Pyth Network](https://img.shields.io/badge/Pyth-PriceUpdateV2-E54033)](https://pyth.network)

Rescue is a non-extractive, privacy-preserving pre-liquidation auction protocol built on Solana and MagicBlock Ephemeral Rollups (ER + PER / TEE). It intercepts distressed lending positions before predatory MEV liquidation occurs, delegates them into a confidential execution environment, and restructures the debt via sealed lender bids.

---

## 📚 Core Architecture Documents

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Complete 19-section technical design specification, system boundaries, PDA ownership lifecycle, MEV deflection model, and the 7 core verification assumptions.
- **[BRAINSTORM.md](./BRAINSTORM.md)** — Project evolution, taxonomy of 4 architectural tiers, competitor analysis (Tenor, BlitzMine), and verified core team insights.
- **[verification/](./verification/)** — Milestone 0 verification test harness proving all 7 blocking assumptions against live TEE ER devnet before writing core program code.

---

## 🚀 Quickstart: Milestone 0 Verification (Cloud Shell)

### 1. Clone & Setup
```bash
git clone https://github.com/Olalolo22/rescue.git
cd rescue/verification
```

### 2. Build Probe Program
```bash
# Sync program keys and compile with Anchor 1.0.2 / Agave 3.1.9
anchor keys sync
anchor build
```

### 3. Deploy to Solana Devnet
```bash
solana program deploy target/deploy/probe.so --url https://api.devnet.solana.com
```

### 4. Configure & Run Probe Suite
```bash
cp .env.example .env
sed -i 's/PROBE_PROGRAM_ID=.*/PROBE_PROGRAM_ID=<YOUR_DEPLOYED_PROBE_PROGRAM_ID>/' .env

yarn install
yarn probe:all
```

Results and live latencies will be automatically recorded in [`verification/probe-report.md`](./verification/probe-report.md).
