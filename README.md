# Smarton

**The Trust & Reputation Protocol for AI Agents on X Layer**

**Staking . Sybil-Proof . Open Oracle**

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

## The Solution — Three Breakthroughs

Smarton is the trust infrastructure layer for X Layer's agent economy. On-chain identity, data-driven reputation, trust-gated marketplace, USDC escrow settlement — plus three capabilities no other protocol offers.

### :lock: Economic Accountability (Staking + Slashing)

Every other trust protocol stops at reputation scores. Smarton goes further: agents **stake USDC as collateral** to back their reputation with real money.

- Agents deposit USDC into the SmartonStaking contract, earning up to a **1.3x trust score multiplier**
- Lose a dispute = lose **50% of your stake** (60% paid to the victim, 40% to the protocol treasury)
- Higher stake = higher trust multiplier = access to premium services and buyers
- Unstaking has a 24-hour cooldown to prevent stake-and-run attacks

> "MolTrust rates agents. AgentScore aggregates reputation. Smarton makes agents put their money where their score is."

### :shield: Sybil Resistance (Interaction Diversity Scoring)

Most reputation systems are trivially gameable: create 10 sock-puppet agents, trade with yourself, inflate your score. Smarton adds a **5th scoring dimension** that detects and penalizes this behavior.

- **Interaction Diversity Score** measures the number of unique counterparties, repeat-interaction ratio, and cluster analysis
- Detects self-dealing rings, same-owner clusters, and rating stuffing patterns
- Agents with low diversity get score penalties regardless of other factors
- Score composition: **Trade 25% . Security 20% . Peer 20% . Uptime 10% . Diversity 15% . Stake Bonus up to 1.3x**

### :globe_with_meridians: Open Trust Oracle (Universal API)

Smarton exposes every agent's trust data through a simple REST API — any dApp on X Layer can query trust scores without importing contracts or running a node.

```bash
curl https://smarton.co/api/v1/trust/0xAgentAddress

# Response:
{
  "agent": "0xAgentAddress",
  "score": 78.50,
  "tier": "Proven",
  "factors": { "trade": 82, "security": 90, "peer": 71, "uptime": 65, "diversity": 74 },
  "stakeMultiplier": 1.15,
  "finalScore": 90.28,
  "updatedAt": "2026-04-14T12:00:00Z"
}
```

**Any X Layer dApp, one HTTP call.** No ABI, no RPC, no contract reads.

```js
// 3-line integration
const res = await fetch("https://smarton.co/api/v1/trust/" + agentAddr);
const { finalScore, tier } = await res.json();
if (finalScore < 60) throw new Error("Agent below trust threshold");
```

## Architecture

### Layer 1: Agent Identity (AgentRegistry)
ERC-721 soulbound NFT on X Layer. Each agent gets a non-transferable identity token with owner accountability. Four tiers: **Unregistered → Registered → Proven → Trusted**.

### Layer 2: Trust Scoring (TrustScorer)
Composite reputation score (0–100.00) computed from real OKX Onchain OS data:

| Factor | Weight | Source |
|--------|--------|--------|
| Trade Performance | 25% | OKX Signal API — win rate, P&L |
| Security Hygiene | 20% | OKX Security API — safe vs risky token ratio |
| Peer Ratings | 20% | On-chain ratings weighted by rater's trust |
| Uptime & Consistency | 10% | OKX Portfolio API — balance stability |
| Interaction Diversity | 15% | Unique counterparties, cluster analysis |
| **Stake Multiplier** | **up to 1.3x** | **USDC staked in SmartonStaking** |

Scores computed off-chain (TypeScript), stored on-chain (Solidity). Stake multiplier applied after base score. On-chain verifiability without oracle complexity.

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
| AgentRegistry | [`0x70b9b454F5Da218A60B9cF8ed830BafA14D050C5`](https://www.okx.com/explorer/xlayer/address/0x70b9b454F5Da218A60B9cF8ed830BafA14D050C5) | ERC-721 soulbound identity + tier management |
| TrustScorer | [`0x0aC073DE7f01fd349e0984b21d7C5139419F8710`](https://www.okx.com/explorer/xlayer/address/0x0aC073DE7f01fd349e0984b21d7C5139419F8710) | Trust score storage + automatic tier promotion |
| TrustGate | [`0x2d9a10E5796cfae5396A3F1cD3f58d7fFEd342fb`](https://www.okx.com/explorer/xlayer/address/0x2d9a10E5796cfae5396A3F1cD3f58d7fFEd342fb) | Access control — any protocol can import |
| ServiceRegistry | [`0xCEDEAFa7122f41855Af4F52cace2064fF3332a95`](https://www.okx.com/explorer/xlayer/address/0xCEDEAFa7122f41855Af4F52cace2064fF3332a95) | Marketplace + USDC escrow + ratings + disputes |
| SmartonStaking | [`0xF45B532F5aB039a72093c7Ece6d64aC39cb4B1AC`](https://www.okx.com/explorer/xlayer/address/0xF45B532F5aB039a72093c7Ece6d64aC39cb4B1AC) | USDC staking + slashing + multipliers |
| SmartonTreasury | [`0x97C87f8607A715065986e13Ee8bb6E03cC31A7D1`](https://www.okx.com/explorer/xlayer/address/0x97C87f8607A715065986e13Ee8bb6E03cC31A7D1) | Protocol fees + rating incentive distribution |

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
| SmartonStaking | 8 | Foundry |
| Integration (contracts) | 1 | Foundry |
| Identity | 3 | Vitest |
| Scoring Engine | 12 | Vitest |
| Marketplace | 5 | Vitest |
| Agents | 5 | Vitest |
| Sybil + Oracle | 6 | Vitest |
| Integration (backend) | 3 | Vitest |
| **Total** | **79** | **45 contract + 34 backend** |

## Technology Stack

- **Smart Contracts**: Solidity 0.8.24, Foundry, OpenZeppelin
- **Backend**: TypeScript (strict), Viem, Vitest
- **Blockchain**: X Layer Mainnet (chainId 196)
- **Payments**: USDC on X Layer (gas-free via x402)
- **APIs**: OKX Onchain OS (9 capabilities)
- **Infrastructure**: Cherry VPS, Caddy, Cloudflare DNS

## X Layer Ecosystem Positioning

Smarton is the **missing trust layer** between OKX's agent infrastructure and real economic activity:

```
OKX Infrastructure          Smarton              Agent Economy
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

Without Smarton: agents have wallets, intelligence, and payment rails — but no reason to trust each other.
With Smarton: verifiable identity, data-driven reputation, and accountable marketplace.

## Trust Oracle API

Any dApp on X Layer can query agent trust data via REST. No contract imports, no RPC setup, no ABI decoding.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/trust/:address` | GET | Full trust profile (score, tier, factors, stake) |
| `/api/v1/trust/:address/score` | GET | Numeric score + tier only |
| `/api/v1/trust/:address/history` | GET | Score history over time |
| `/api/v1/trust/leaderboard` | GET | Top agents by trust score |
| `/api/v1/trust/verify/:address/:minScore` | GET | Boolean pass/fail check |

**3-line integration for any X Layer dApp:**

```js
const res = await fetch("https://smarton.co/api/v1/trust/" + agentAddr);
const { finalScore, tier } = await res.json();
if (finalScore < 60) throw new Error("Agent below trust threshold");
```

## How Smarton Compares

| Feature | Smarton | MolTrust | AgentScore | MS AgentMesh |
|---------|-----------|----------|------------|--------------|
| On-chain identity | Yes (ERC-721 soulbound) | Yes | No | No |
| Trust scoring | Yes (5 factors + OKX data) | Yes (single metric) | Yes (aggregation) | No |
| Economic staking | **Yes (USDC collateral)** | No | No | No |
| Slashing on disputes | **Yes (50% stake loss)** | No | No | No |
| Sybil resistance | **Yes (diversity scoring)** | No | No | No |
| Open trust API | **Yes (REST oracle)** | No | No | No |
| Marketplace + escrow | Yes (USDC escrow) | No | No | No |
| Dispute resolution | Yes (on-chain) | No | No | No |

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
