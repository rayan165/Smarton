# CLAUDE.md — TrustMesh Project Instructions

## Project Overview

TrustMesh is the trust and reputation protocol for AI agents on X Layer. It enables agents to verify identity, build on-chain reputation through verifiable performance data, gate service access by trust tier, and exchange services via USDC micropayments — all with full accountability and zero central authority.

**Three Differentiators**: (1) Economic Accountability — agents stake USDC, disputes trigger slashing; (2) Sybil Resistance — 5th scoring dimension detects fake reputation rings; (3) Open Trust Oracle — REST API for any X Layer dApp to query trust.

**Hackathon**: OKX Build X Hackathon — X Layer Arena
**Deadline**: April 15, 2026 23:59 UTC
**Prize Targets**: 1st Prize (2,000 USDT) + Most Active Agent (500 USDT) + Most Popular (500 USDT)

## Monorepo Structure

```
trustmesh/
├── CLAUDE.md
├── AGENTS.md → CLAUDE.md (symlink)
├── README.md
├── LICENSE (MIT)
├── .gitignore
│
├── contracts/                     # Solidity smart contracts (Foundry)
│   ├── foundry.toml
│   ├── remappings.txt
│   ├── src/
│   │   ├── AgentRegistry.sol      # ERC-721 agent identity + tiers
│   │   ├── TrustScorer.sol        # On-chain trust score storage + updates
│   │   ├── TrustGate.sol          # Access control modifiers
│   │   ├── ServiceRegistry.sol    # Marketplace listings + escrow + ratings
│   │   ├── TrustMeshTreasury.sol  # Protocol fees + incentives
│   │   ├── TrustMeshStaking.sol   # USDC staking + slashing + multipliers
│   │   └── interfaces/
│   │       ├── IAgentRegistry.sol
│   │       ├── ITrustScorer.sol
│   │       ├── ITrustGate.sol
│   │       ├── IServiceRegistry.sol
│   │       └── ITrustMeshStaking.sol
│   ├── test/
│   │   ├── AgentRegistry.t.sol
│   │   ├── TrustScorer.t.sol
│   │   ├── TrustGate.t.sol
│   │   ├── ServiceRegistry.t.sol
│   │   ├── TrustMeshStaking.t.sol
│   │   └── Integration.t.sol
│   └── script/
│       └── Deploy.s.sol
│
├── backend/                       # TypeScript backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts
│   ├── vitest.config.ts
│   ├── .env.example
│   ├── src/
│   │   ├── index.ts               # Main entry — TrustMesh engine
│   │   ├── types.ts               # All shared types (~60 interfaces)
│   │   ├── config.ts              # Configuration loader + validation
│   │   ├── utils/
│   │   │   ├── okx-client.ts      # OKX Onchain OS API client (HMAC auth, rate limit, cache)
│   │   │   ├── contract-client.ts # Viem contract interactions (all 6 contracts)
│   │   │   └── logger.ts          # Structured logging
│   │   ├── identity/
│   │   │   ├── agent-registrar.ts # Register agents on-chain
│   │   │   ├── tier-manager.ts    # Tier upgrade/downgrade logic
│   │   │   └── index.ts
│   │   ├── scoring/
│   │   │   ├── trade-performance.ts  # OKX Signal API scoring
│   │   │   ├── security-hygiene.ts   # OKX Security API scoring
│   │   │   ├── peer-ratings.ts       # On-chain rating aggregation
│   │   │   ├── uptime-tracker.ts     # Portfolio stability scoring
│   │   │   ├── composite-scorer.ts   # Weighted composite calculation (5 factors + stake)
│   │   │   ├── sybil-detector.ts    # Interaction diversity + sybil ring detection
│   │   │   └── index.ts
│   │   ├── api/
│   │   │   └── trust-oracle.ts      # REST API — open trust oracle for any dApp
│   │   ├── marketplace/
│   │   │   ├── service-lister.ts     # List/delist services
│   │   │   ├── escrow-manager.ts     # USDC escrow deposit/release
│   │   │   ├── service-executor.ts   # Execute service + delivery confirmation
│   │   │   ├── rating-manager.ts     # Post-service rating submission
│   │   │   ├── dispute-handler.ts    # Dispute resolution logic
│   │   │   └── index.ts
│   │   ├── agents/
│   │   │   ├── base-agent.ts         # Abstract base — shared OKX integration
│   │   │   ├── signal-provider.ts    # Sells alpha signals via OKX Signal
│   │   │   ├── security-scanner.ts   # Sells token security reports
│   │   │   ├── trade-executor.ts     # Sells trade execution via OKX DEX
│   │   │   ├── analyst.ts            # Sells token analysis reports
│   │   │   ├── herald.ts             # Moltbook + dashboard reporter
│   │   │   └── index.ts
│   │   ├── engine/
│   │   │   ├── orchestrator.ts       # Starts/stops all agents, manages cycles
│   │   │   ├── cycle-runner.ts       # Single marketplace interaction cycle
│   │   │   └── index.ts
│   │   └── demo/
│   │       ├── mock-data.ts          # Realistic demo data for 5 agents
│   │       ├── mock-clients.ts       # Mock OKX + contract clients
│   │       └── index.ts
│   └── test/
│       ├── fixtures/
│       │   ├── agents.ts
│       │   ├── services.ts
│       │   └── scores.ts
│       ├── scoring.test.ts
│       ├── marketplace.test.ts
│       ├── identity.test.ts
│       ├── agents.test.ts
│       └── integration.test.ts
│
├── site/                          # Landing page + dashboard (static HTML)
│   ├── index.html                 # Landing page
│   ├── dashboard.html             # Live trust leaderboard + marketplace stats
│   ├── assets/
│   │   ├── style.css
│   │   └── dashboard.css
│   └── js/
│       ├── main.js
│       └── dashboard.js           # Reads from contracts via viem/ethers CDN
│
└── scripts/
    ├── deploy.sh                  # Deploy contracts to X Layer
    ├── seed-agents.ts             # Register initial agents + fund + generate txns
    └── start.ts                   # Start the TrustMesh engine (demo or live)
```

## Coding Standards

- **Solidity**: 0.8.24+, Foundry for testing, OpenZeppelin for base contracts (ERC-721, Ownable, ReentrancyGuard)
- **TypeScript**: Strict mode, no `any`, explicit return types, named exports only
- **Testing**: Foundry tests for contracts (forge test), vitest for backend. Target: ~31 contract tests + ~26 backend tests = ~57 total
- **Naming**: Solidity — PascalCase contracts, camelCase functions. TypeScript — camelCase vars/functions, PascalCase types/interfaces
- **Error handling**: Custom errors in Solidity (gas efficient). Typed `TrustMeshError` in TypeScript with code, message, module, details fields.
- **No hardcoding**: All addresses, chain IDs, API URLs from config/env. No magic numbers without named constants.
- **Comments**: NatSpec for all public Solidity functions. JSDoc for all exported TypeScript functions.
- **Git**: Single author commits. No secrets in any file. Conventional commit messages.

## Key Dependencies

### Contracts (Foundry)
```
forge-std
@openzeppelin/contracts (ERC721, Ownable, ReentrancyGuard, IERC20)
```

### Backend (pnpm)
```json
{
  "dependencies": { "viem": "^2.21.0" },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tsup": "^8.3.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.0.0"
  }
}
```

## Environment Variables

```bash
# OKX Onchain OS
OKX_API_KEY=
OKX_SECRET_KEY=
OKX_PASSPHRASE=

# X Layer RPC
XLAYER_RPC_URL=https://rpc.xlayer.tech
XLAYER_CHAIN_ID=196

# Contract Addresses (populated after deployment)
AGENT_REGISTRY_ADDRESS=
TRUST_SCORER_ADDRESS=
TRUST_GATE_ADDRESS=
SERVICE_REGISTRY_ADDRESS=
TREASURY_ADDRESS=
STAKING_ADDRESS=

# Deployer wallet
DEPLOYER_PRIVATE_KEY=

# Agentic Wallet (project's onchain identity)
AGENTIC_WALLET_ADDRESS=0x3ae6dd9075bc44b6e5ca1981fab4cb0edf3c72c0

# USDC on X Layer
USDC_ADDRESS=0x74b7f16337b8972027f6196a17a631ac6de26d22

# Misc
LOG_LEVEL=info
DEMO_MODE=false
ORACLE_PORT=3000
```

## X Layer Details

| Field | Value |
|-------|-------|
| Chain ID | 196 |
| RPC | https://rpc.xlayer.tech |
| Explorer | https://www.okx.com/explorer/xlayer |
| USDC | 0x74b7f16337b8972027f6196a17a631ac6de26d22 |
| Gas | Near-zero (~0.001 OKB per tx) |
| Block time | ~3 seconds |

## Payment Model — On-Chain USDC Escrow

TrustMesh uses **on-chain USDC escrow** through the ServiceRegistry contract for all agent-to-agent payments. This is the simplest trustless payment model:

1. Buyer calls `purchaseService(serviceId)` → USDC transferred from buyer to ServiceRegistry (escrow)
2. Seller calls `deliverService(orderId, deliveryHash)` → marks delivery
3. Buyer calls `confirmAndRate(orderId, rating)` → releases USDC to seller minus 2% protocol fee
4. If buyer doesn't confirm within 1 hour → auto-complete releases to seller

The README references "x402" for hackathon positioning (OKX's x402 protocol enables gas-free USDC transfers on X Layer). The actual escrow mechanics are standard ERC-20 transferFrom flows — x402 is the underlying gas sponsorship layer that makes these USDC transfers near-free.

## Moltbook Integration

Moltbook is OKX's social platform for agents. The Herald agent posts ecosystem reports there for the "Most Popular" prize.

**Current status**: Moltbook API docs are not publicly available. Implementation approach:
- Herald agent generates formatted report strings
- Reports are logged to console and stored in-memory
- If Moltbook API becomes available: add POST endpoint in herald.ts
- For hackathon demo: show report output in dashboard UI

## Build & Test Commands

### Contracts
```bash
cd contracts
forge install
forge build
forge test -vvv
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

### Backend
```bash
cd backend
pnpm install
pnpm build          # tsup
pnpm test           # vitest run
pnpm lint           # tsc --noEmit
pnpm start          # Run TrustMesh engine (live mode)
pnpm demo           # Run in demo mode (mock data, no real contracts)
pnpm seed           # Register agents + generate initial txns on mainnet
```

## Architecture Notes

1. **Separation of concerns**: Contracts handle state + access control + escrow. Backend handles OKX API integration + scoring computation + agent orchestration. Communication via viem.

2. **Trust scores are computed off-chain, stored on-chain**: The backend fetches OKX data, computes the composite score, then writes it to TrustScorer.sol via an authorized oracle address. This avoids oracle complexity while maintaining on-chain verifiability.

3. **Escrow is on-chain**: USDC payments go through ServiceRegistry.sol escrow. Trustless — no backend can steal funds.

4. **Agents are TypeScript processes**: Each agent is a long-running async loop that calls OKX APIs, interacts with contracts, and generates marketplace activity. They share a base class for common integration.

5. **Agentic Wallet**: The project's onchain identity is the OKX Agentic Wallet at `0x3ae6dd9075bc44b6e5ca1981fab4cb0edf3c72c0`. Individual agents use the deployer wallet for contract interactions (simplicity for hackathon).

6. **Staking + Slashing**: TrustMeshStaking.sol holds USDC collateral. Agents stake to get trust multiplier (1.0x-1.3x). On dispute refund, ServiceRegistry calls staking.slashAgent() — 50% slashed, 60/40 split buyer/treasury. 24h unstake cooldown, 7-day post-slash lock.

7. **Sybil Resistance**: The 5th scoring dimension — Interaction Diversity (15% weight) — analyzes counterparty uniqueness. Detects concentrated counterparties, same-owner rings, rating stuffing. Computed in sybil-detector.ts.

8. **Trust Oracle API**: HTTP server (Node built-in, no Express) on port 3000. Any X Layer dApp can query agent trust via REST: /api/v1/trust/:address. CORS enabled, rate limited, cached responses.

9. **Scoring weights**: Trade 25%, Security 20%, Peer 20%, Uptime 10%, Diversity 15%. Stake multiplier applied as post-processing bonus (up to 1.3x).

10. **Deployment order**: AgentRegistry → TrustScorer → TrustGate → TrustMeshTreasury → ServiceRegistry → TrustMeshStaking → wire all contracts.

11. **Priority order**: Contracts → Backend (scoring + marketplace + agents) → Demo mode → Mainnet deployment → Site/Dashboard. If time is short, site is the first thing to cut.
