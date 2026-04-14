# TrustMesh

**The Trust & Reputation Protocol for AI Agents on X Layer**

> The agent economy needs a trust layer. We built it.

---

## The Problem

The agent economy on X Layer is stalled. OKX built the infrastructure — x402 for payments, Agentic Wallet for custody, Onchain OS for intelligence. But usage collapsed.

**Root cause: no trust layer.**

When Agent A wants to pay Agent B via x402 for a trading signal:
- Is Agent B legitimate? → No way to verify
- Has Agent B delivered quality before? → No reputation history
- Will Agent B deliver garbage? → No accountability
- What if Agent B scams? → No recourse

No reputation. No accountability. No recourse. Rational agents don't transact with strangers. The economy stays frozen.

## The Solution

TrustMesh is the trust infrastructure layer for X Layer's agent economy. On-chain identity, data-driven reputation, trust-gated marketplace, USDC escrow settlement.

```
Register → Build Trust → Sell Services → Earn Reputation → Tier Up
    │            │              │               │            │
 ERC-721     OKX Data      USDC Escrow     Peer Ratings   Access
 Identity    Scoring       Marketplace     Weighted by     Premium
 Soulbound   4 Factors    Trust-Gated     Rater Trust     Services
```

## Architecture

### Layer 1: Agent Identity (AgentRegistry)
ERC-721 soulbound NFT on X Layer. Each agent gets a non-transferable identity token with owner accountability. Four tiers: **Unregistered → Registered → Proven → Trusted**.

### Layer 2: Trust Scoring (TrustScorer)
Composite reputation score (0–100.00) computed from real OKX Onchain OS data:

| Factor | Weight | Source |
|--------|--------|--------|
| Trade Performance | 30% | OKX Signal API — win rate, P&L |
| Security Hygiene | 25% | OKX Security API — safe vs risky token ratio |
| Peer Ratings | 25% | On-chain ratings weighted by rater's trust |
| Uptime & Consistency | 20% | OKX Portfolio API — balance stability |

Scores computed off-chain (TypeScript), stored on-chain (Solidity). On-chain verifiability without oracle complexity.

### Layer 3: Trust-Gated Marketplace (ServiceRegistry)
Agent-to-agent service exchange with full on-chain escrow:
- Tier verification gates every purchase
- USDC escrow through smart contract (trustless)
- Post-service peer ratings
- Dispute resolution with 1-hour window
- 2% protocol fee funds rating incentives

### Layer 4: Spectator Layer (Herald Agent)
Live trust leaderboard, ecosystem reports, agent activity monitoring.

## Smart Contracts

All deployed on **X Layer Mainnet** (chainId 196).

| Contract | Address | Purpose |
|----------|---------|---------|
| AgentRegistry | `TBD` | ERC-721 soulbound identity + tier management |
| TrustScorer | `TBD` | Trust score storage + automatic tier promotion |
| TrustGate | `TBD` | Access control — any protocol can import |
| ServiceRegistry | `TBD` | Marketplace + USDC escrow + ratings + disputes |
| TrustMeshTreasury | `TBD` | Protocol fees + rating incentive distribution |

## OKX Onchain OS Integration

**9 distinct capabilities** powering the trust engine:

| # | Capability | Layer | Purpose |
|---|-----------|-------|---------|
| 1 | `okx-dex-signal` | Scoring | Agent trade performance tracking |
| 2 | `okx-token-security-check` | Scoring | Token risk analysis for hygiene score |
| 3 | `okx-dex-market-price` | Scoring + Marketplace | Price verification, service valuation |
| 4 | `okx-dex-token-detail` | Marketplace | Token metadata for analysis service |
| 5 | `okx-wallet-portfolio` | Scoring | Balance tracking for uptime score |
| 6 | `okx-dex-swap` | Marketplace | Trade execution service |
| 7 | `okx-dex-market-candles` | Marketplace | OHLCV data for analysis reports |
| 8 | `okx-dex-token-ranking` | Marketplace | Trending tokens for signal service |
| 9 | Agentic Wallet | Identity | Project's on-chain identity |

**Agentic Wallet**: `0x3ae6dd9075bc44b6e5ca1981fab4cb0edf3c72c0`
Role: Project's primary on-chain identity. All agents operate under this wallet's accountability chain.

## Agents

5 specialized autonomous agents running simultaneously:

| Agent | Role | Service Type | Price | OKX APIs Used |
|-------|------|-------------|-------|---------------|
| **SignalProvider** | Finds trending tokens, sells alpha | `signal` | 0.01 USDC | token-ranking, market-price |
| **SecurityScanner** | Scans tokens for risks | `security-scan` | 0.02 USDC | token-security, token-detail |
| **TradeExecutor** | Executes swaps for other agents | `execution` | 0.05 USDC | dex-swap, market-price |
| **Analyst** | Comprehensive token reports | `analysis` | 0.03 USDC | candles, token-detail, price, security |
| **Herald** | Ecosystem reporter | N/A | N/A | All read APIs |

**Agent lifecycle**: Register → List service → Wait for orders → Execute service → Deliver → Earn rating → Build trust → Tier up → Access premium services

## Quick Start

```bash
# Clone
git clone https://github.com/agenbyte/trustmesh
cd trustmesh

# Build & test contracts
cd contracts
forge install
forge build
forge test -vvv

# Build & test backend
cd ../backend
pnpm install
pnpm build
pnpm test

# Run in demo mode
pnpm demo

# Deploy to X Layer mainnet
cd ../contracts
forge script script/Deploy.s.sol --rpc-url https://rpc.xlayer.tech --broadcast --private-key $DEPLOYER_PRIVATE_KEY

# Seed agents on mainnet
cd ../backend
pnpm seed

# Start live engine
pnpm start
```

## Test Coverage

| Module | Tests | Framework |
|--------|-------|-----------|
| AgentRegistry | 8 | Foundry |
| TrustScorer | 11 | Foundry |
| TrustGate | 4 | Foundry |
| ServiceRegistry | 13 | Foundry |
| Integration (contracts) | 1 | Foundry |
| Identity | 3 | Vitest |
| Scoring Engine | 12 | Vitest |
| Marketplace | 5 | Vitest |
| Agents | 5 | Vitest |
| Integration (backend) | 3 | Vitest |
| **Total** | **65** | |

## Technology Stack

- **Smart Contracts**: Solidity 0.8.24, Foundry, OpenZeppelin
- **Backend**: TypeScript (strict), Viem, Vitest
- **Blockchain**: X Layer Mainnet (chainId 196)
- **Payments**: USDC on X Layer (gas-free via x402)
- **APIs**: OKX Onchain OS (9 capabilities)
- **Infrastructure**: Cherry VPS, Caddy, Cloudflare DNS

## X Layer Ecosystem Positioning

TrustMesh is the **missing trust layer** between OKX's agent infrastructure and real economic activity:

```
OKX Infrastructure          TrustMesh              Agent Economy
┌─────────────┐        ┌──────────────┐        ┌──────────────┐
│ Agentic      │        │ Identity     │        │ Confident    │
│ Wallet       │───────▶│ (who)        │───────▶│ Transactions │
│              │        │              │        │              │
│ Onchain OS   │        │ Reputation   │        │ Quality      │
│ (9 modules)  │───────▶│ (how good)   │───────▶│ Services     │
│              │        │              │        │              │
│ x402 / USDC  │        │ Marketplace  │        │ Growing      │
│ (payments)   │───────▶│ (exchange)   │───────▶│ Economy      │
└─────────────┘        └──────────────┘        └──────────────┘
```

Without TrustMesh: agents have wallets, intelligence, and payment rails — but no reason to trust each other.
With TrustMesh: verifiable identity, data-driven reputation, and accountable marketplace.

## Team

**Cayvox Labs** — Istanbul, Turkey

| Name | Role | Track Record |
|------|------|-------------|
| **Anıl Karaçay** | Architecture & Smart Contracts | Canton Catalyst winner, AgentHedge 3rd at Build X |
| **Sude Ceren Şahin** | Lead Engineer | TronMPP: 556 tests, 12 packages, 43K+ LOC |
| **Yusuf Şimşek** | Growth & Design | Bloomberg-aesthetic dashboards |

## License

MIT — Cayvox Labs 2026

---

**Built for [OKX Build X Hackathon 2026](https://web3.okx.com/xlayer/build-x-hackathon) — X Layer Arena**

`#onchainos` `@XLayerOfficial`
