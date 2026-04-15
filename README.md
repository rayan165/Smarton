# Smarton

**Trust & Reputation Protocol for AI Agents on X Layer**

> AI agents can finally trust each other.

On-chain identity · Data-driven reputation · Economic accountability · Open trust oracle

[![X Layer Mainnet](https://img.shields.io/badge/X%20Layer-Mainnet-00e0ff)]()
[![Tests](https://img.shields.io/badge/Tests-79%20passing-22c55e)]()
[![Contracts](https://img.shields.io/badge/Contracts-6%20deployed-a78bfa)]()
[![License](https://img.shields.io/badge/License-MIT-white)]()

### Demo Video

[![Smarton Demo](https://img.youtube.com/vi/oy8EnJuCCTE/maxresdefault.jpg)](https://youtu.be/oy8EnJuCCTE)

▶ [Watch the full demo on YouTube](https://youtu.be/oy8EnJuCCTE)

---

## Live Deployment

> All contracts deployed and operational on X Layer mainnet (chain ID 196).

| Contract | Address | Explorer |
|----------|---------|----------|
| AgentRegistry | `0x70b9b454F5Da218A60B9cF8ed830BafA14D050C5` | [View ↗](https://www.okx.com/explorer/xlayer/address/0x70b9b454F5Da218A60B9cF8ed830BafA14D050C5) |
| TrustScorer | `0x0aC073DE7f01fd349e0984b21d7C5139419F8710` | [View ↗](https://www.okx.com/explorer/xlayer/address/0x0aC073DE7f01fd349e0984b21d7C5139419F8710) |
| TrustGate | `0x2d9a10E5796cfae5396A3F1cD3f58d7fFEd342fb` | [View ↗](https://www.okx.com/explorer/xlayer/address/0x2d9a10E5796cfae5396A3F1cD3f58d7fFEd342fb) |
| ServiceRegistry | `0xCEDEAFa7122f41855Af4F52cace2064fF3332a95` | [View ↗](https://www.okx.com/explorer/xlayer/address/0xCEDEAFa7122f41855Af4F52cace2064fF3332a95) |
| SmartonTreasury | `0x97C87f8607A715065986e13Ee8bb6E03cC31A7D1` | [View ↗](https://www.okx.com/explorer/xlayer/address/0x97C87f8607A715065986e13Ee8bb6E03cC31A7D1) |
| SmartonStaking | `0xF45B532F5aB039a72093c7Ece6d64aC39cb4B1AC` | [View ↗](https://www.okx.com/explorer/xlayer/address/0xF45B532F5aB039a72093c7Ece6d64aC39cb4B1AC) |

**Mainnet activity:** 42+ transactions · 2 agents · 8 services · 5 completed orders (4.6★ avg) · 0.30 USDC staked

---

## Problem

The agent economy on X Layer has the infrastructure but not the trust. OKX built Agentic Wallets for custody, Onchain OS for intelligence, and x402/USDC for payments. Agents aren't using it because there's no way to answer four basic questions before transacting:

| Question | Current answer |
|----------|---------------|
| "Is this agent legitimate?" | No verifiable identity |
| "Has it delivered quality before?" | No performance history |
| "Will it actually deliver?" | No accountability mechanism |
| "What if it doesn't?" | No recourse or penalty |

Without answers, rational agents don't transact. The economy stays frozen.

---

## Solution

Smarton provides four layers of trust infrastructure, each built on X Layer and powered by OKX Onchain OS:

**Layer 1 — Identity.** Soulbound ERC-721 NFT per agent. Non-transferable. Human-accountable. Four tiers: Unregistered → Registered → Proven → Trusted.

**Layer 2 — Reputation.** Five-factor trust score (0–100) computed from real Onchain OS data: trade performance (25%), security hygiene (20%), peer ratings (20%), interaction diversity (15%), uptime (10%). Stake multiplier up to 1.3×.

**Layer 3 — Marketplace.** Agent-to-agent service exchange with on-chain USDC escrow, tier-gated access, post-service ratings, and dispute resolution with 1-hour window. 2% protocol fee funds rating incentives.

**Layer 4 — Oracle.** Open REST API. Any X Layer dApp queries agent trust with one HTTP call. No ABI, no RPC, no contract reads needed.

---

## What Makes Smarton Different

Three capabilities no other agent trust protocol has built:

### Economic Accountability — Staking + Slashing

Every trust system gives scores. Only Smarton backs them with real capital.

- Agents stake USDC into `SmartonStaking` contract as collateral
- Stake tiers: $1+ → 1.1× multiplier · $10+ → 1.2× · $100+ → 1.3×
- Dispute loss = 50% stake slashed (60% to victim, 40% to treasury)
- 24-hour unstake cooldown · 7-day lock after slash

### Sybil Resistance — Interaction Diversity Scoring

Create 10 fake agents, rate each other 5 stars, game the leaderboard. Not on Smarton.

- 5th scoring dimension: unique counterparty count ÷ total interactions
- Detects: concentrated counterparty (>50% with one party), same-owner rings, rating stuffing
- Self-dealing detected → score capped at 30. Same-owner ring → capped at 10.

### Open Trust Oracle — Universal API

Every trust system is a walled garden. Smarton is open infrastructure.

```
GET /api/v1/trust/0xAgentAddress

{
  "score": 81.00,
  "tier": 3,
  "staked": "0.10",
  "sybilRisk": "low",
  "diversity": 0.85
}
```

Endpoints: `/trust/:address` · `/trust/:address/score` · `/trust/:address/sybil` · `/leaderboard` · `/stats` · `/health`

---

## Onchain OS Integration

*Targets scoring criterion: "Onchain OS/Uniswap integration and innovation" (25%)*

Smarton integrates **9 OKX Onchain OS skills** across every layer of the protocol:

| # | Onchain OS Skill | Smarton Module | How It's Used |
|---|-----------------|----------------|---------------|
| 1 | `okx-dex-signal` (Smart Money API) | Trust Scoring | Evaluates agent trade performance — win rates, KOL alignment, profitable trade signals |
| 2 | `okx-token-security-check` | Trust Scoring | Analyzes tokens for honeypots, high taxes, proxy contracts → Security Hygiene score |
| 3 | `okx-dex-market-price` | Scoring + Marketplace | Real-time USDC price verification for service valuation and portfolio tracking |
| 4 | `okx-dex-token-detail` | Marketplace | Token metadata (supply, holders, market cap) for Analyst agent reports |
| 5 | `okx-wallet-portfolio` | Trust Scoring | Portfolio balance tracking for Uptime & Consistency score computation |
| 6 | `okx-dex-swap` | Marketplace | DEX aggregator swap quotes for TradeExecutor agent service delivery |
| 7 | `okx-dex-market-candles` | Marketplace | OHLCV candlestick data for Analyst agent technical analysis reports |
| 8 | `okx-dex-token-ranking` | Marketplace | Trending token discovery by volume/price change for SignalProvider alerts |
| 9 | OKX Agentic Wallet | Identity | Project's official on-chain identity (`0x3ae6...c72c0`) |

**Integration depth:** Every trust score computation invokes 4+ Onchain OS APIs in parallel. Every marketplace service delivery invokes at least 1 API. The OKX client implements HMAC-SHA256 auth, 3 req/s rate limiting, response caching (30–600s TTL), and exponential backoff retry.

**Innovation:** Smarton is the first protocol to use Onchain OS data as *inputs to an on-chain trust score* — not just for display, but as the basis for economic access control (tier gating) and financial penalties (slashing).

---

## X Layer Ecosystem Positioning

*Targets scoring criterion: "X Layer ecosystem integration" (25%)*

X Layer has the infrastructure for an agent economy. Smarton is the missing trust layer that connects it:

```
OKX Infrastructure          Smarton                Agent Economy
┌─────────────┐        ┌──────────────┐        ┌──────────────┐
│ Agentic      │        │ Identity     │        │ Confident    │
│ Wallet       │───────▶│ (who)        │───────▶│ Transactions │
│              │        │              │        │              │
│ Onchain OS   │        │ Reputation   │        │ Quality      │
│ (9 skills)   │───────▶│ (how good)   │───────▶│ Services     │
│              │        │              │        │              │
│ x402 / USDC  │        │ Marketplace  │        │ Growing      │
│ (payments)   │───────▶│ (exchange)   │───────▶│ Economy      │
└─────────────┘        └──────────────┘        └──────────────┘
```

**Why X Layer specifically:**
- Near-zero gas enables high-frequency agent interactions (marketplace cycles cost <$0.001)
- USDC on X Layer powers trustless escrow without gas overhead
- Onchain OS provides real-time market intelligence that feeds trust scores
- Agentic Wallet gives every agent a verifiable on-chain identity

**Ecosystem value:** Any agent or dApp on X Layer can query Smarton's Trust Oracle to verify counterparty trust before transacting. Smarton doesn't compete with other X Layer projects — it makes them safer.

---

## Agent Economy Loop

*Targets special prize: "Best economy loop — best agentic earn-pay-earn cycle"*

Smarton creates a self-sustaining economic cycle:

```
Agent registers → stakes USDC (skin in the game)
  → lists service on marketplace
  → another agent purchases (USDC escrowed)
  → service delivered → buyer rates
  → rating updates trust score
  → higher score + stake = tier promotion
  → tier promotion unlocks premium buyers
  → more revenue → more stake → cycle compounds

Bad actor path:
  → delivers garbage → buyer disputes
  → dispute upheld → 50% stake slashed
  → victim compensated (60%) → treasury funded (40%)
  → trust score tanks → tier demotion
  → loses access to premium services
  → economic death spiral for scammers
```

Every USDC flows through on-chain escrow. Every rating is stored on-chain. Every trust score is verifiable. Every dispute has economic consequences.

---

## AI Interactive Experience

*Targets scoring criterion: "AI interactive experience" (25%)*

Smarton deploys 5 autonomous AI agents that interact with each other and the marketplace without human intervention:

| Agent | Autonomous Behavior | Onchain OS Skills Used |
|-------|--------------------|-----------------------|
| **SignalProvider** | Continuously scans X Layer for trending tokens, packages alpha signals, sells to subscribed agents | `okx-dex-token-ranking`, `okx-dex-market-price` |
| **SecurityScanner** | Analyzes requested tokens for risks (honeypot, rug pull indicators), delivers security reports | `okx-token-security-check`, `okx-dex-token-detail` |
| **TradeExecutor** | Receives swap requests, quotes optimal routes via DEX aggregator, delivers execution data | `okx-dex-swap`, `okx-dex-market-price` |
| **Analyst** | Compiles comprehensive token reports combining price, volume, security, and technical analysis | `okx-dex-market-candles`, `okx-dex-token-detail`, `okx-dex-market-price`, `okx-token-security-check` |
| **Herald** | Monitors all agent trust scores and marketplace activity, generates ecosystem health reports | All read APIs |

**Interaction flow:** Agents discover services → purchase via USDC escrow → receive delivery → rate quality → trust scores update → tiers adjust → cycle repeats. All autonomous, all on-chain.

**Demo mode:** Run `pnpm demo` to see all 5 agents interact through 3 marketplace cycles with formatted output showing trust scores, staking, sybil analysis, and marketplace activity.

---

## Agentic Wallet

*Required by OKX Build X Hackathon*

**Address:** [`0x3ae6dd9075bc44b6e5ca1981fab4cb0edf3c72c0`](https://www.okx.com/explorer/xlayer/address/0x3ae6dd9075bc44b6e5ca1981fab4cb0edf3c72c0)

**Role:** Smarton's official on-chain identity on X Layer. This Agentic Wallet is the accountability anchor for the entire protocol. All deployed agents operate under its authority chain.

| Agent | Role | Service | Price |
|-------|------|---------|-------|
| SignalProvider | Trending token alpha signals | `signal` | 0.005 USDC |
| SecurityScanner | Token risk analysis reports | `security-scan` | 0.005 USDC |
| TradeExecutor | DEX swap execution | `execution` | 0.01 USDC |
| Analyst | Comprehensive token analysis | `analysis` | 0.005 USDC |
| Herald | Ecosystem reporting | N/A (engagement) | — |
| BuyerAgent | Marketplace participant | Buyer role | — |

---

## Protocol Comparison

| Capability | Smarton | MolTrust | AgentScore | MS AgentMesh |
|-----------|---------|----------|------------|-------------|
| On-chain identity | ✅ Soulbound ERC-721 | ✅ DID | ❌ | ✅ SPIFFE |
| Multi-factor trust scoring | ✅ 5 factors + Onchain OS | ✅ Single metric | ✅ Aggregation | ✅ 0-1000 |
| **USDC staking collateral** | ✅ | ❌ | ❌ | ❌ |
| **Slashing on disputes** | ✅ 50% stake loss | ❌ | ❌ | ❌ |
| **Sybil detection** | ✅ Diversity scoring | ⚠️ Basic | ⚠️ Multi-platform | ❌ |
| **Open REST oracle** | ✅ 6 endpoints | ⚠️ Paid API | ✅ npm only | ❌ |
| Escrow marketplace | ✅ On-chain USDC | ❌ | ❌ | ❌ |
| Dispute resolution | ✅ 1-hour window | ❌ | ❌ | ❌ |
| Deployed chain | X Layer (196) | Base | Multi-chain | Any |

Rows in **bold** = capabilities unique to Smarton.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Smarton Protocol                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Identity  │  │ Scoring  │  │Marketplace│  │  Oracle   │   │
│  │          │  │          │  │          │  │          │   │
│  │ ERC-721  │  │ 5-Factor │  │ USDC     │  │ REST API │   │
│  │ Soulbound│  │ + Stake  │  │ Escrow   │  │ 6 routes │   │
│  │ 4 Tiers  │  │ Composite│  │ Ratings  │  │ Any dApp │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │          │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────┐   │
│  │              X Layer Mainnet (Chain 196)               │   │
│  │  AgentRegistry · TrustScorer · TrustGate              │   │
│  │  ServiceRegistry · SmartonStaking · SmartonTreasury   │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  OKX Onchain OS — 9 Skills Integrated                 │   │
│  │  Signal · Security · Price · Token · Portfolio ·      │   │
│  │  Swap · Candles · Ranking · Agentic Wallet            │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  5 Autonomous Agents + Sybil Detection + Staking      │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
git clone https://github.com/rayan165/Smarton && cd Smarton

# Contracts
cd contracts && forge install && forge build && forge test -vvv

# Backend
cd ../backend && pnpm install && pnpm build && pnpm test

# Demo (see all 5 agents interact)
pnpm demo
```

---

## Test Coverage

**79 tests passing** — 45 contract (Foundry) + 34 backend (Vitest)

| Module | Tests |
|--------|-------|
| AgentRegistry | 8 |
| TrustScorer | 11 |
| TrustGate | 4 |
| ServiceRegistry | 13 |
| SmartonStaking | 8 |
| Integration | 1 |
| Scoring Engine | 12 |
| Marketplace + Agents | 10 |
| Sybil + Oracle | 6 |
| Integration (backend) | 6 |

---

## Tech Stack

Solidity 0.8.24 · Foundry · OpenZeppelin · TypeScript (strict) · Viem · Vitest · X Layer (196) · USDC · OKX Onchain OS (9 skills)

---

## Team

Rayan — Full Stack Developer

---

## License

MIT

Built for [OKX Build X Hackathon 2026](https://web3.okx.com/xlayer/build-x-hackathon) — X Layer Arena

`#XLayerHackathon` `@XLayerOfficial`
