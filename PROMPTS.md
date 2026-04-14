# TrustMesh — Claude Code Implementation Prompts

Use these prompts IN ORDER. Each builds on the previous. Copy-paste into Claude Code, wait for completion, review, then next.

**IMPORTANT**: Before starting, revoke the old GitHub PAT and create a new one. Set `GITHUB_TOKEN` env var.

---

## PROMPT 0 — Monorepo Setup

```
Read all .md files in the project root: CLAUDE.md, CONTRACTS.md, TYPES.md, OKX-API.md, README.md. These contain the full specification for TrustMesh — an agent trust and reputation protocol for X Layer.

Set up the monorepo:

1. Root level:
   - Copy README.md to root
   - Create LICENSE (MIT, Cayvox Labs 2026)
   - Create .gitignore: node_modules, dist, out, cache, broadcast, .env, .env.*, coverage, *.tsbuildinfo, artifacts, forge-cache
   - Symlink AGENTS.md -> CLAUDE.md

2. contracts/ directory (Foundry):
   - Run: forge init contracts --no-git --no-commit
   - Delete default Counter.sol and Counter.t.sol and script/Counter.s.sol
   - Create foundry.toml with solc 0.8.24, optimizer 200 runs, evm_version "paris"
   - Create remappings.txt: @openzeppelin/=lib/openzeppelin-contracts/src/
   - Install OpenZeppelin: cd contracts && forge install OpenZeppelin/openzeppelin-contracts --no-git --no-commit
   - Create empty files in src/: AgentRegistry.sol, TrustScorer.sol, TrustGate.sol, ServiceRegistry.sol, TrustMeshTreasury.sol
   - Create src/interfaces/: IAgentRegistry.sol, ITrustScorer.sol, ITrustGate.sol, IServiceRegistry.sol
   - Create test/: AgentRegistry.t.sol, TrustScorer.t.sol, TrustGate.t.sol, ServiceRegistry.t.sol, Integration.t.sol
   - Create script/Deploy.s.sol (empty placeholder)

3. backend/ directory (TypeScript):
   - cd backend && pnpm init (name: "trustmesh-backend", version: "0.1.0")
   - Install: pnpm add viem
   - Install dev: pnpm add -D typescript tsup vitest @types/node
   - Create tsconfig.json: strict, ES2022, NodeNext module/moduleResolution, outDir dist, rootDir src, skipLibCheck true
   - Create tsup.config.ts: entry src/index.ts, format esm+cjs, dts true, clean true
   - Create vitest.config.ts: test timeout 10000
   - Create .env.example with ALL vars from CLAUDE.md
   - Create full src/ directory structure from CLAUDE.md (all empty .ts files with just export {})
   - Include src/demo/ directory: mock-data.ts, mock-clients.ts, index.ts (empty)
   - Create test/fixtures/: agents.ts, services.ts, scores.ts (empty)
   - Create test/: scoring.test.ts, marketplace.test.ts, identity.test.ts, agents.test.ts, integration.test.ts (empty with describe blocks)
   - Add scripts to package.json: "build": "tsup", "test": "vitest run", "test:watch": "vitest", "lint": "tsc --noEmit", "start": "npx tsx scripts/start.ts", "demo": "DEMO_MODE=true npx tsx scripts/start.ts", "seed": "npx tsx scripts/seed-agents.ts"

4. site/ directory:
   - Create index.html (empty HTML5 boilerplate with title "TrustMesh")
   - Create dashboard.html (empty HTML5 boilerplate)
   - Create assets/style.css, assets/dashboard.css (empty)
   - Create js/main.js, js/dashboard.js (empty)

5. scripts/ directory:
   - Create deploy.sh, seed-agents.ts, start.ts (empty placeholders)

6. Verify:
   - cd contracts && forge build (should succeed with empty/minimal contracts)
   - cd backend && pnpm install && pnpm lint (should pass with empty files)

Then:
git init
git add -A
git commit -m "chore: monorepo scaffolding (contracts + backend + site)"
git remote add origin https://github.com/agenbyte/trustmesh.git
git push -u origin main
```

---

## PROMPT 1 — Smart Contracts: AgentRegistry + TrustGate

```
Read CONTRACTS.md for the full Solidity specification. Implement the first two contracts.

## contracts/src/interfaces/IAgentRegistry.sol
Define the interface exactly as specified in CONTRACTS.md:
- AgentInfo struct (owner, tier, registeredAt, lastActive, agentURI)
- Custom errors: NotAgentOwner, AgentAlreadyRegistered, InvalidAgentURI, AgentNotFound, NotAuthorizedScorer, SoulboundTransferBlocked
- Events: AgentRegistered, AgentTierUpdated
- All function signatures from the spec

## contracts/src/AgentRegistry.sol
- Inherits ERC721, Ownable
- Uses a counter for auto-incrementing agentIds (start from 1)
- mapping(uint256 => AgentInfo) private _agents
- mapping(address => uint256) private _walletToAgent (reverse lookup)
- address public trustScorer (set via setTrustScorer, onlyOwner)

registerAgent(string calldata agentURI):
  - Require agentURI not empty (bytes(agentURI).length > 0)
  - Require msg.sender not already registered (_walletToAgent[msg.sender] == 0)
  - Increment counter, mint ERC-721 to msg.sender
  - Store AgentInfo: owner=msg.sender, tier=1, registeredAt=uint64(block.timestamp), lastActive=uint64(block.timestamp)
  - Set _walletToAgent[msg.sender] = agentId
  - Emit AgentRegistered
  - Return agentId

updateTier(uint256 agentId, uint8 newTier):
  - Require msg.sender == trustScorer
  - Require agentId exists (ownerOf doesn't revert)
  - Store old tier, update to new tier
  - Emit AgentTierUpdated(agentId, oldTier, newTier)

Override _update (ERC721 internal) to make tokens SOULBOUND:
  - Allow mint (from == address(0))
  - Allow burn (to == address(0))
  - Revert on any transfer where both from and to are non-zero

getAgentInfo, getAgentTier, getAgentByAddress, isRegistered, totalAgents — straightforward view functions.
getAgentByAddress returns 0 if not registered (agentIds start at 1).

## contracts/src/interfaces/ITrustGate.sol
- Custom errors: AgentNotRegistered, TierTooLow(uint8 required, uint8 actual)
- function checkTier(address agent, uint8 requiredTier) external view returns (bool)
- function requireTier(address agent, uint8 requiredTier) external view

## contracts/src/TrustGate.sol
- Takes IAgentRegistry address in constructor (immutable)
- checkTier: lookup agentId via registry.getAgentByAddress, if 0 return false, else get tier, return tier >= requiredTier
- requireTier: same but revert with AgentNotRegistered() if agentId==0, TierTooLow(required, actual) if tier < required

## contracts/test/AgentRegistry.t.sol
Write Foundry tests (use forge-std Test, console2):
1. "registers agent successfully" — register, verify agentId=1, tier=1, owner=msg.sender
2. "cannot register twice" — register, try again, expect revert AgentAlreadyRegistered
3. "cannot register with empty URI" — expect revert InvalidAgentURI
4. "soulbound — cannot transfer" — register, try safeTransferFrom, expect revert SoulboundTransferBlocked
5. "only trustScorer can update tier" — non-scorer calls updateTier, expect revert NotAuthorizedScorer
6. "trustScorer updates tier" — set scorer, call updateTier from scorer, verify new tier
7. "reverse lookup by wallet" — register, query getAgentByAddress, verify agentId matches
8. "totalAgents increments" — register 3 agents from different addresses, verify totalAgents()==3

## contracts/test/TrustGate.t.sol
1. "checkTier returns true for sufficient tier" — register agent (tier 1), check tier 1, expect true
2. "checkTier returns false for insufficient tier" — register agent (tier 1), check tier 2, expect false
3. "requireTier reverts for unregistered" — unregistered address, expect revert AgentNotRegistered
4. "requireTier reverts with TierTooLow" — registered tier 1, require tier 2, expect revert TierTooLow(2, 1)

Run: cd contracts && forge test -vvv
Then: git add -A && git commit -m "feat: AgentRegistry + TrustGate contracts (12 tests)" && git push origin main
```

---

## PROMPT 2 — Smart Contracts: TrustScorer

```
Read CONTRACTS.md TrustScorer specification. Implement:

## contracts/src/interfaces/ITrustScorer.sol
- TrustScore struct (overall, tradePerformance, securityHygiene, peerRating, uptime, lastUpdated, totalInteractions)
- Constants: TIER_2_THRESHOLD=6000, TIER_2_INTERACTIONS=50, TIER_3_THRESHOLD=8500, TIER_3_INTERACTIONS=500, UPDATE_COOLDOWN=300
- Custom errors: AgentNotRegistered, ScoreOutOfRange, CallerNotAuthorized, CooldownNotElapsed
- Events: ScoreUpdated, TierUpgrade, TierDowngrade
- All function signatures

## contracts/src/TrustScorer.sol
- Constructor takes IAgentRegistry address (immutable). Also takes initial owner for Ownable.
- address public oracle (authorized score updater, set via setOracle onlyOwner)
- mapping(uint256 => TrustScore) private _scores
- mapping(uint256 => uint16[10]) private _scoreHistory (circular buffer for last 10 scores)
- mapping(uint256 => uint8) private _historyIndex

updateScore(uint256 agentId, uint16 trade, uint16 security, uint16 peer, uint16 up):
  - Require msg.sender == oracle → CallerNotAuthorized
  - Require all components <= 10000 → ScoreOutOfRange
  - Require agent is registered (agentRegistry.isRegistered check via ownerOf or getAgentTier returning > 0)
  - Require cooldown elapsed: block.timestamp - _scores[agentId].lastUpdated >= UPDATE_COOLDOWN (skip if lastUpdated == 0, first update)
  - Compute composite: (trade*3000 + security*2500 + peer*2500 + up*2000) / 10000
  - Store all components + overall + lastUpdated=uint64(block.timestamp) + increment totalInteractions
  - Push to circular history: _scoreHistory[agentId][_historyIndex[agentId] % 10] = overall; _historyIndex[agentId]++
  - Call internal _checkAndUpdateTier(agentId)
  - Emit ScoreUpdated(agentId, oldOverall, newOverall, newTotalInteractions)

_checkAndUpdateTier(uint256 agentId) internal:
  - Get currentTier from agentRegistry.getAgentTier(agentId)
  - Determine targetTier:
    - overall >= TIER_3_THRESHOLD && totalInteractions >= TIER_3_INTERACTIONS → 3
    - overall >= TIER_2_THRESHOLD && totalInteractions >= TIER_2_INTERACTIONS → 2
    - else → 1 (never demote below 1)
  - If targetTier > currentTier: agentRegistry.updateTier(agentId, targetTier), emit TierUpgrade
  - If targetTier < currentTier: agentRegistry.updateTier(agentId, targetTier), emit TierDowngrade

computeComposite: pure function, (t*3000 + s*2500 + p*2500 + u*2000) / 10000
getScore, getOverallScore, getScoreHistory — view functions

## contracts/test/TrustScorer.t.sol
Setup: deploy AgentRegistry, deploy TrustScorer(agentRegistry), set TrustScorer as trustScorer on AgentRegistry, set oracle, register a test agent.

1. "updates score correctly" — oracle updates (8000,7000,9000,6000), verify all stored components match
2. "computes composite correctly" — (8000*3000 + 7000*2500 + 9000*2500 + 6000*2000) / 10000 = 7600
3. "auto-promotes to tier 2" — set score 7000 overall, set totalInteractions to 50, verify tier=2
4. "auto-promotes to tier 3" — score 9000, interactions 500+, verify tier=3
5. "demotes on score drop" — was tier 2, update score to 4000, verify tier back to 1
6. "respects cooldown" — update, warp only 100s, update again, expect revert CooldownNotElapsed
7. "skips cooldown on first update" — first update works without any wait
8. "only oracle can update" — non-oracle calls updateScore, expect revert CallerNotAuthorized
9. "rejects scores above 10000" — one component = 10001, expect revert ScoreOutOfRange
10. "tracks score history" — update 5 times (warping cooldown each time), verify history buffer has 5 entries

For tests needing many interactions: directly manipulate totalInteractions is not possible (private), so either:
- Call updateScore many times with vm.warp between each, OR
- Make a helper that updates score N times, OR
- Add a test-only setter (not recommended for production, but acceptable for hackathon)

PRACTICAL APPROACH: For tier promotion tests, update score multiple times using a loop with vm.warp(block.timestamp + UPDATE_COOLDOWN + 1) between calls. This correctly tests the full flow.

Run: cd contracts && forge test -vvv
Then: git add -A && git commit -m "feat: TrustScorer contract (10 tests)" && git push origin main
```

---

## PROMPT 3 — Smart Contracts: ServiceRegistry + Treasury + Deploy

```
Read CONTRACTS.md ServiceRegistry and Treasury specs. Implement:

## contracts/src/TrustMeshTreasury.sol
- Ownable. Constructor takes IERC20 usdc address.
- address public serviceRegistry (authorized caller, set via setServiceRegistry onlyOwner)
- uint256 constant RATING_INCENTIVE = 1000 (0.001 USDC)
- collectFee(uint256 amount): only serviceRegistry can call. Emit FeeCollected(amount). Note: the actual USDC transfer is done by ServiceRegistry directly to treasury address, this just tracks it.
- payRatingIncentive(address rater): only serviceRegistry. Transfer RATING_INCENTIVE USDC to rater. If balance < RATING_INCENTIVE, silently skip (don't revert). Emit IncentivePaid.
- withdraw(address to, uint256 amount): onlyOwner. usdc.transfer(to, amount).
- getBalance(): usdc.balanceOf(address(this))

## contracts/src/interfaces/IServiceRegistry.sol
All types (ServiceStatus enum, ServiceListing struct, ServiceOrder struct) and function signatures from CONTRACTS.md.

## contracts/src/ServiceRegistry.sol
- Constructor: takes IAgentRegistry, ITrustGate, TrustMeshTreasury, IERC20 (USDC). All immutable.
- Uses ReentrancyGuard for purchaseService, confirmAndRate, resolveDispute, completeExpiredOrder
- Auto-incrementing _nextServiceId=1 and _nextOrderId=1

listService(serviceType, description, priceUSDC, minBuyerTier):
  - Require msg.sender is registered (agentRegistry.isRegistered)
  - Create ServiceListing, store, emit ServiceListed

purchaseService(uint256 serviceId) nonReentrant:
  - Require service exists and active
  - Require buyer is registered agent
  - trustGate.requireTier(msg.sender, service.minBuyerTier)
  - Require msg.sender != service.sellerWallet → BuyerCannotBeSeller
  - usdc.transferFrom(msg.sender, address(this), service.priceUSDC) — escrow in contract
  - Create ServiceOrder with status Escrowed, createdAt=block.timestamp
  - Emit OrderCreated

deliverService(uint256 orderId, string deliveryHash):
  - Require msg.sender == order.sellerWallet
  - Require status == Escrowed
  - Set status = Delivered, store deliveryHash, deliveredAt=block.timestamp
  - Emit ServiceDelivered

confirmAndRate(uint256 orderId, uint8 rating) nonReentrant:
  - Require msg.sender == order.buyerWallet
  - Require status == Delivered
  - Require rating >= 1 && rating <= 5
  - uint256 fee = order.amount * PROTOCOL_FEE_BPS / 10000
  - uint256 sellerPayout = order.amount - fee
  - usdc.transfer(order.sellerWallet, sellerPayout) — release to seller
  - usdc.transfer(address(treasury), fee) — fee to treasury
  - treasury.payRatingIncentive(msg.sender) — incentive to buyer
  - Set status = Completed, store rating, completedAt=block.timestamp
  - Emit OrderCompleted

fileDispute(uint256 orderId):
  - Require msg.sender == order.buyerWallet
  - Require status == Delivered
  - Require block.timestamp - order.deliveredAt <= DISPUTE_WINDOW
  - Set status = Disputed
  - Emit DisputeFiled

resolveDispute(uint256 orderId, bool refund) onlyOwner nonReentrant:
  - Require status == Disputed
  - If refund: usdc.transfer(order.buyerWallet, order.amount), status = Refunded
  - If !refund: same payout logic as confirmAndRate (seller gets amount-fee, treasury gets fee), status = Completed
  - Emit DisputeResolved

completeExpiredOrder(uint256 orderId) nonReentrant:
  - Require status == Delivered
  - Require block.timestamp - order.deliveredAt > DISPUTE_WINDOW
  - Same payout as confirmAndRate, rating = 5 (default), status = Completed
  - Anyone can call

getActiveServices: iterate, return active listings (limit to reasonable gas — cap at 100)
getAverageRating(agentId): iterate seller orders, compute mean*100 of non-zero ratings (returns 100-500)
totalServices, totalOrders — return counters

## contracts/script/Deploy.s.sol
Foundry deployment script using vm.envAddress and vm.envUint:
  1. Deploy AgentRegistry("TrustMesh Agent", "TMA")
  2. Deploy TrustScorer(agentRegistry)
  3. Deploy TrustGate(agentRegistry)
  4. Deploy TrustMeshTreasury(usdc)
  5. Deploy ServiceRegistry(agentRegistry, trustGate, treasury, usdc)
  6. agentRegistry.setTrustScorer(address(trustScorer))
  7. treasury.setServiceRegistry(address(serviceRegistry))
  8. console.log all deployed addresses

## contracts/test/ServiceRegistry.t.sol
Setup: deploy all 5 contracts with proper wiring. Create a mock USDC token (simple ERC20 with mint). Register 2 agents (seller + buyer) from different addresses. Mint USDC to buyer. Approve ServiceRegistry for USDC spending. Fund treasury with some USDC for rating incentives.

1. "lists service" — seller lists, verify serviceId=1, stored correctly
2. "purchases service — escrows USDC" — buyer purchases, USDC moves from buyer to contract
3. "tier gate blocks low-tier buyer" — service requires tier 2, tier 1 buyer → revert TierTooLow
4. "seller delivers" — deliver with hash, status → Delivered
5. "buyer confirms and rates 4 stars" — confirm + rate 4, USDC released to seller minus fee
6. "protocol fee collected" — verify treasury received 2% fee
7. "rating incentive paid" — verify buyer got 0.001 USDC from treasury
8. "cannot rate outside 1-5" — rate 0, expect revert RatingOutOfRange. Rate 6, expect revert.
9. "dispute within window" — file dispute after delivery, status → Disputed
10. "dispute after window fails" — warp past DISPUTE_WINDOW, expect revert
11. "owner resolves dispute with refund" — resolve(refund=true), buyer gets full USDC back
12. "buyer cannot be seller" — try purchase own service, revert BuyerCannotBeSeller
13. "auto-complete after window" — deliver, warp past window, anyone calls completeExpiredOrder, seller gets paid

## contracts/test/Integration.t.sol
End-to-end:
1. "full lifecycle: register → list → purchase → deliver → rate → score → tier upgrade"
   - Register 2 agents (seller + buyer)
   - Seller lists "signal" service at 1 USDC (1_000_000), minTier 1
   - Buyer purchases (escrows 1 USDC)
   - Seller delivers with hash
   - Buyer rates 5 stars
   - Verify: seller got 0.98 USDC, treasury got 0.02 USDC
   - Oracle updates seller score to (8000,8000,8000,8000) → overall 8000
   - After enough interactions (use loop with vm.warp): seller tier → 2
   - Verify AgentRegistry shows tier 2

Run: cd contracts && forge test -vvv (target: ~35 total contract tests)
Then: git add -A && git commit -m "feat: ServiceRegistry + Treasury + Deploy (35 contract tests)" && git push origin main
```

---

## PROMPT 4 — Backend: Types, Config, Utils

```
Read TYPES.md and OKX-API.md. Implement the backend foundation.

## backend/src/types.ts
Implement EVERY type from TYPES.md exactly as specified. All interfaces, all type aliases. Export everything with named exports.

## backend/src/config.ts
- Export constants: DEFAULT_SCORING_WEIGHTS, DEFAULT_SCORING_CONFIG, DEFAULT_MARKETPLACE_CONFIG
- Export createConfig(overrides?: Partial<TrustMeshConfig>): TrustMeshConfig
  - Reads all env vars via process.env
  - Merges with overrides
  - Validates: OKX keys required (unless DEMO_MODE=true), xlayer config has defaults
  - Contract addresses can be empty `0x${'0'.repeat(40)}` as placeholder (populated after deployment)
  - Throws TrustMeshError code 'CONFIG_MISSING' for missing required fields

## backend/src/utils/logger.ts
- Export createLogger(module: string): { debug, info, warn, error }
- Format: [ISO-TIMESTAMP] [LEVEL] [MODULE] message {JSON data}
- Respects LOG_LEVEL env (debug < info < warn < error)
- Each method: (message: string, data?: Record<string, unknown>) => void

## backend/src/utils/okx-client.ts
Full OKX Onchain OS API client:
- createOKXClient(config: OKXConfig): OKXClient
- HMAC-SHA256 auth per OKX-API.md (CRITICAL: sign path WITH query params)
- Rate limiter: 3 req/s using queue-based approach
- Response cache: Map<string, CacheEntry<T>> with TTL per data type (30s market, 300s security, 60s signal, 600s token detail)
- All methods return typed data (using OKX response types from types.ts)
- Methods:
  - getSignals(chainId: number, tokenAddress: string): Promise<OKXSignalData[]>
  - getTokenSecurity(chainId: number, tokenAddress: string): Promise<OKXSecurityData | null>
  - getTokenPrice(chainId: number, tokenAddress: string): Promise<OKXTokenPrice | null>
  - getTokenDetail(chainId: number, tokenAddress: string): Promise<OKXTokenDetail | null>
  - getSwapQuote(chainId: number, from: string, to: string, amount: string, wallet: string): Promise<OKXSwapResult | null>
  - getPortfolioBalance(address: string, chainId: number): Promise<OKXTokenBalance[]>
  - getCandles(chainId: number, tokenAddress: string, bar: string, limit: number): Promise<OKXCandleData[]>
  - getTokenRanking(chainId: number, sortBy: string, limit: number): Promise<OKXTokenRanking[]>
- Error handling: map OKX error codes to TrustMeshError, retry on rate limit (max 3), return null on 82000

## backend/src/utils/contract-client.ts
Viem client for all 5 TrustMesh contracts:
- createContractClient(xlayerConfig: XLayerConfig, contracts: ContractAddresses, privateKey: `0x${string}`): ContractClient
- Create viem publicClient (http transport) and walletClient
- Define ABI constants for each contract (matching Solidity interfaces — use human-readable ABI format)
- Write methods (simulate → send → waitForReceipt → return TxResult):
  - registerAgent(agentURI: string): Promise<TxResult>
  - updateScore(agentId: bigint, trade: number, security: number, peer: number, uptime: number): Promise<TxResult>
  - listService(serviceType: string, description: string, priceUSDC: bigint, minBuyerTier: number): Promise<TxResult>
  - purchaseService(serviceId: bigint): Promise<TxResult>
  - deliverService(orderId: bigint, deliveryHash: string): Promise<TxResult>
  - confirmAndRate(orderId: bigint, rating: number): Promise<TxResult>
  - fileDispute(orderId: bigint): Promise<TxResult>
  - approveUSDC(spender: `0x${string}`, amount: bigint): Promise<TxResult>
- Read methods (publicClient.readContract):
  - getAgentInfo(agentId: bigint): Promise<AgentInfo>
  - getAgentTier(agentId: bigint): Promise<AgentTier>
  - getAgentByAddress(wallet: `0x${string}`): Promise<bigint>
  - isRegistered(wallet: `0x${string}`): Promise<boolean>
  - totalAgents(): Promise<bigint>
  - getScore(agentId: bigint): Promise<TrustScore>
  - checkTier(agent: `0x${string}`, requiredTier: number): Promise<boolean>
  - getActiveServices(): Promise<ServiceListing[]>
  - getService(serviceId: bigint): Promise<ServiceListing>
  - getOrder(orderId: bigint): Promise<ServiceOrder>
  - getAverageRating(agentId: bigint): Promise<number>
  - getTreasuryBalance(): Promise<bigint>
  - totalServices(): Promise<bigint>
  - totalOrders(): Promise<bigint>

## backend/test/identity.test.ts (3 tests)
Mock contract client. Test:
1. "registers new agent" — mock registerAgent, verify call
2. "detects already registered" — mock isRegistered returns true, verify skip
3. "gets agent info" — mock getAgentInfo, verify parsed correctly

Run: cd backend && pnpm lint && pnpm test
Then: git add -A && git commit -m "feat: backend types, config, OKX client, contract client (3 tests)" && git push origin main
```

---

## PROMPT 5 — Backend: Scoring Engine

```
Implement the trust scoring engine — the core intelligence of TrustMesh.

## backend/src/scoring/trade-performance.ts
- Export computeTradePerformance(okxClient, agentWallet, chainId): Promise<TradePerformanceData>
- Fetch signal data via okxClient.getSignals for well-known X Layer tokens
- Calculate: totalTrades, profitableTrades (buy signals from KOLs with winRate > 0.5), winRate
- Score formula: winRate * 7000 + (1 - maxDrawdownPct) * 3000 (clamp 0-10000)
- If no data available: return default score 5000 (neutral)

## backend/src/scoring/security-hygiene.ts
- Export computeSecurityHygiene(okxClient, agentWallet, chainId, recentTokens: string[]): Promise<SecurityHygieneData>
- For each token: okxClient.getTokenSecurity
- Count safe (riskLevel low/medium, not honeypot) vs risky (high/critical or honeypot)
- safeRatio = safeTokens / totalTokensTraded (0 if no tokens)
- Score: safeRatio * 10000. If honeypotInteractions > 0: cap at 5000.
- If no tokens to check: return default score 7500

## backend/src/scoring/peer-ratings.ts
- Export computePeerRating(contractClient, agentId): Promise<PeerRatingData>
- Read agent's completed orders via contract (as seller)
- Extract non-zero ratings, compute averageStars
- Weighted average: weight each by rater's trust score (if available, else weight=1)
- Score: (weightedAverage - 1) / 4 * 10000 (maps 1-5 stars to 0-10000)
- If no ratings: return default score 5000

## backend/src/scoring/uptime-tracker.ts
- Export computeUptime(okxClient, agentWallet, chainId): Promise<UptimeData>
- Fetch portfolio balance via okxClient.getPortfolioBalance
- For hackathon simplified approach: check current total USD balance
- If balance exists and > 0: score = 8000 (healthy)
- If balance == 0: score = 4000 (inactive)
- hasRugPattern detection: if balance dropped > 50% from known initial → cap at 3000

## backend/src/scoring/composite-scorer.ts
- Export computeCompositeScore(components: ScoreComponents, weights: ScoringWeights): number
  - (trade*weights.trade + security*weights.security + peer*weights.peer + uptime*weights.uptime) / 10000
  - Clamp result to 0-10000

- Export determineTier(score: number, interactions: number, config: ScoringConfig): AgentTier
  - score >= tier3Threshold && interactions >= tier3Interactions → 3
  - score >= tier2Threshold && interactions >= tier2Interactions → 2
  - else → 1

- Export runScoringCycle(config, okxClient, contractClient, agentId, agentWallet, recentTokens): Promise<TrustScore>
  - Compute all 4 components
  - Compute composite
  - Write to contract via contractClient.updateScore
  - Return the new TrustScore

## backend/src/scoring/index.ts
- Export createScoringEngine(config, okxClient, contractClient)
- Returns { scoreAgent(agentId, wallet, tokens): Promise<TrustScore>, scoreAllAgents(agents): Promise<void> }

## backend/test/fixtures/scores.ts
- MOCK_TRADE_GOOD: TradePerformanceData with 70% win rate, score 7500
- MOCK_TRADE_BAD: 30% win rate, score 3500
- MOCK_SECURITY_SAFE: 90% safe ratio, score 9000
- MOCK_SECURITY_HONEYPOT: has honeypot, score 4500
- MOCK_PEER_HIGH: 4.5 avg stars, score 8750
- MOCK_PEER_LOW: 2.0 avg stars, score 2500
- MOCK_UPTIME_STABLE: low volatility, score 8000
- MOCK_UPTIME_RUG: rug pattern, score 3000

## backend/test/scoring.test.ts (12 tests)
1. "trade performance — good trader" — 70% win rate → score ~7000-8000
2. "trade performance — bad trader" — 30% win rate → score ~3000-4000
3. "trade performance — no data defaults to 5000" — empty signals → 5000
4. "security hygiene — all safe tokens" — 100% safe → 10000
5. "security hygiene — honeypot penalty caps at 5000" — any honeypot → max 5000
6. "security hygiene — no tokens defaults to 7500"
7. "peer rating — 5 star average maps to 10000"
8. "peer rating — 2.5 stars maps to ~3750"
9. "peer rating — no ratings defaults to 5000"
10. "uptime — healthy balance → 8000"
11. "composite score weighted correctly" — (8000*3000+7000*2500+9000*2500+6000*2000)/10000 = 7600
12. "tier determination — tier 2 at 7000/50 interactions, tier 1 at 9000/10 interactions (insufficient)"

Run: cd backend && pnpm test
Then: git add -A && git commit -m "feat: trust scoring engine (12 tests)" && git push origin main
```

---

## PROMPT 6 — Backend: Marketplace + Agents + Engine

```
Implement marketplace logic, all 5 agents, and the orchestration engine.

## backend/src/marketplace/service-lister.ts
- Export listAgentService(contractClient, serviceType, description, price, minTier): Promise<bigint>
- Calls contractClient.listService, returns serviceId from tx receipt

## backend/src/marketplace/escrow-manager.ts
- Export purchaseAgentService(contractClient, serviceId, servicePrice): Promise<bigint>
- First: contractClient.approveUSDC(serviceRegistryAddress, servicePrice)
- Then: contractClient.purchaseService(serviceId)
- Return orderId

## backend/src/marketplace/service-executor.ts
- Export deliverAgentService(contractClient, orderId, deliveryData: unknown): Promise<string>
- Serialize deliveryData to JSON string
- Hash: keccak256 of the JSON bytes (use viem's keccak256)
- Call contractClient.deliverService(orderId, hash)
- Return the hash

## backend/src/marketplace/rating-manager.ts
- Export rateAgentService(contractClient, orderId, rating: number): Promise<void>
- Validate rating 1-5
- Call contractClient.confirmAndRate

## backend/src/marketplace/dispute-handler.ts
- Export fileAgentDispute(contractClient, orderId): Promise<void>
- Call contractClient.fileDispute

## backend/src/marketplace/index.ts
- Export createMarketplace(config, contractClient) → object with all above methods

## backend/src/agents/base-agent.ts
- Export interface BaseAgent: { role, wallet, agentId, config, register(), listService(), runCycle(): Promise<AgentCycleResult>, stop() }
- Export createBaseAgentFactory(okxClient, contractClient, marketplace):
  Returns a factory function that creates agents with shared registration + listing logic.
  The factory handles: check if registered → register if not → store agentId → list service.

## backend/src/agents/signal-provider.ts
- Export createSignalProvider(factory params)
- Service: "signal" type, price 10000n (0.01 USDC), minTier 1, description "Alpha trading signals — trending X Layer tokens"
- runCycle:
  1. Check for pending orders (orders with status 'escrowed' where this agent is seller)
  2. For each: fetch okxClient.getTokenRanking(196, "volume24h", 10)
  3. Pick top 3 trending tokens, package as signal data
  4. Call marketplace.deliverAgentService with signal data
  5. Return AgentCycleResult

## backend/src/agents/security-scanner.ts
- "security-scan" type, 20000n (0.02 USDC), minTier 1
- runCycle: for pending orders, run okxClient.getTokenSecurity on a well-known X Layer token, deliver security report

## backend/src/agents/trade-executor.ts
- "execution" type, 50000n (0.05 USDC), minTier 2
- runCycle: for pending orders, get okxClient.getSwapQuote, deliver the quote data

## backend/src/agents/analyst.ts
- "analysis" type, 30000n (0.03 USDC), minTier 1
- runCycle: fetch tokenDetail + price + candles + security for a token, compile comprehensive report, deliver

## backend/src/agents/herald.ts
- Does NOT sell services (serviceType = null)
- runCycle:
  1. Read agent trust scores (contractClient.getScore for each registered agent)
  2. Read marketplace stats (totalOrders, totalServices)
  3. Compose formatted report string with leaderboard, stats, tier distribution
  4. Log the report
  5. Return AgentCycleResult with the report as action detail

## backend/src/agents/index.ts
- Export createAllAgents(config, okxClient, contractClient, marketplace): readonly BaseAgent[]

## backend/src/engine/cycle-runner.ts
- Export runMarketplaceCycle(agents, marketplace, scoring, contractClient, cycleNumber): Promise<CycleResult>
  1. Each non-herald agent checks for services from other agents
  2. Each agent randomly purchases one service from another (not self)
  3. Sellers process deliveries
  4. Buyers confirm and rate (random 3-5 stars, weighted toward 4)
  5. Scoring engine updates all agents
  6. Herald generates report
  7. Return CycleResult with aggregate stats

## backend/src/engine/orchestrator.ts
- Export createOrchestrator(config: TrustMeshConfig):
  - init(): Create all clients, all agents, scoring engine, marketplace
  - start(): Register all agents → list all services → begin cycle loop (setInterval)
  - stop(): Clear interval, log final stats
  - getState(): Return EngineState
  - runOneCycle(): Manual single cycle trigger

## backend/src/engine/index.ts
- Export orchestrator factory

## backend/src/index.ts
- Export createTrustMesh(configOverrides?) → creates config, creates orchestrator, returns it
- Re-export all types from types.ts

## backend/test/fixtures/agents.ts + services.ts
- Mock agent configs for all 5 agents (with fake wallet addresses)
- Mock service listings, mock orders in various statuses

## backend/test/marketplace.test.ts (5 tests)
1. "lists service" — mock contractClient, verify listService called
2. "purchases service with USDC approval" — verify approve + purchase flow
3. "delivers service with hash" — verify delivery hash generation
4. "rates service" — verify confirmAndRate called with correct rating
5. "full exchange cycle" — list → purchase → deliver → rate sequence

## backend/test/agents.test.ts (5 tests)
1. "signal provider generates signals" — mock OKX ranking, verify delivery data contains trending tokens
2. "security scanner delivers report" — mock OKX security, verify report structure
3. "trade executor quotes swap" — mock OKX swap, verify quote data
4. "analyst compiles comprehensive report" — mock multiple OKX calls, verify report has all sections
5. "herald generates ecosystem report" — mock scores, verify report contains leaderboard

## backend/test/integration.test.ts (3 tests)
1. "orchestrator initializes all 5 agents" — verify createAllAgents returns 5
2. "marketplace cycle produces transactions" — mock everything, run cycle, verify actions > 0
3. "scoring updates after cycle" — run cycle with ratings, verify score computation called

Run: cd backend && pnpm test (target: 12 scoring + 5 marketplace + 5 agents + 3 integration + 3 identity = 28 total)
Run: cd backend && pnpm lint
Then: git add -A && git commit -m "feat: marketplace, agents, engine (28 backend tests)" && git push origin main
```

---

## PROMPT 7 — Demo Mode + Scripts

```
Create demo mode for testing without real contracts/APIs, plus deployment scripts.

## backend/src/demo/mock-data.ts
Export realistic demo data for 5 agents with varying trust scores:
- DEMO_AGENTS: 5 AgentProfile objects:
  - SignalPro: score 8700, tier 3, 87 orders, 4.6 avg rating
  - SecurityBot: score 7200, tier 2, 63 orders, 4.2 avg rating
  - TradeExec: score 6500, tier 2, 45 orders, 3.8 avg rating
  - AnalystX: score 4500, tier 1, 12 orders, 3.2 avg rating
  - Herald: score 5000, tier 1, 0 orders (reporter only)
- DEMO_SERVICES: 4 service listings (one per non-herald agent)
- DEMO_ORDERS: 10 completed orders showing marketplace activity with varied ratings
- DEMO_SCORE_HISTORY: 5 cycles of score progression showing gradual improvement

## backend/src/demo/mock-clients.ts
- createMockOKXClient(): returns object matching OKXClient interface with:
  - Realistic fake data for all endpoints
  - 100-300ms random delays to simulate network
  - Cycling through different token data for variety
- createMockContractClient(): returns object matching ContractClient interface with:
  - In-memory state (agents Map, scores Map, services Map, orders Map)
  - Simulates register, list, purchase, deliver, rate flows
  - Auto-assigns agentIds, serviceIds, orderIds
  - Returns mock TxResult with fake hashes

## backend/src/demo/index.ts
- Export createDemoTrustMesh(demoConfig?: DemoConfig): runs 3 demo cycles with pretty output
- Output format:
  ```
  ═══════════════════════════════════════
  🔷 TrustMesh Demo — Cycle 1/3
  ═══════════════════════════════════════
  
  📋 Agents:
    SignalPro    [Tier 3] Score: 87.00  ██████████████████░░
    SecurityBot  [Tier 2] Score: 72.00  ██████████████░░░░░░
    TradeExec    [Tier 2] Score: 65.00  █████████████░░░░░░░
    AnalystX     [Tier 1] Score: 45.00  █████████░░░░░░░░░░░
    Herald       [Tier 1] Score: 50.00  ██████████░░░░░░░░░░

  📊 Marketplace:
    Orders this cycle: 4
    USDC volume: $0.14
    Avg rating: 4.2 ★

  📰 Herald Report:
    "TrustMesh ecosystem active: 5 agents, 14 total orders..."
  ```

## scripts/start.ts
- Check DEMO_MODE env var
- If DEMO_MODE=true: run createDemoTrustMesh, exit after completion
- If DEMO_MODE=false: run createTrustMesh with real config, keep running

## scripts/seed-agents.ts
Script for mainnet setup:
- Load config with real contract addresses
- Create contract client with deployer key
- Register all 5 agents on-chain (with descriptive agentURIs)
- List all 4 services on-chain
- Log: agentIds, serviceIds, tx hashes
- Generate 10+ marketplace transactions:
  - Each non-herald agent purchases a service from another
  - Deliver and rate each order
  - Update trust scores
  - This creates real on-chain activity for "Most Active Agent" prize

## scripts/deploy.sh
```bash
#!/bin/bash
set -e
echo "🔨 Building contracts..."
cd contracts
forge build

echo "🧪 Running tests..."
forge test -vvv

echo "🚀 Deploying to X Layer mainnet..."
forge script script/Deploy.s.sol \
  --rpc-url ${XLAYER_RPC_URL:-https://rpc.xlayer.tech} \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY

echo "✅ Deployment complete! Update .env with contract addresses."
```

Add scripts to backend/package.json (if not already):
"demo": "DEMO_MODE=true npx tsx scripts/start.ts"
"start": "npx tsx scripts/start.ts"
"seed": "npx tsx scripts/seed-agents.ts"

Run: cd backend && pnpm demo (verify clean, colorful output)
Run: cd backend && pnpm test (all tests still pass)
Then: git add -A && git commit -m "feat: demo mode + scripts + seed" && git push origin main
```

---

## PROMPT 8 — Landing Page + Dashboard

```
Build a premium landing page and live dashboard for TrustMesh. These are static HTML files served via Caddy on the VPS.

## site/index.html — Landing Page
Single-page premium landing site. Design direction: dark theme, blockchain/trust aesthetic, sharp typography.

Sections:
1. Hero: "TrustMesh" title, "The Trust Layer for X Layer's Agent Economy" subtitle, CTA buttons (Dashboard, GitHub)
2. Problem: "Why the agent economy is frozen" — 4 cards (No Identity, No Reputation, No Accountability, No Recourse)
3. Solution: 4-layer architecture diagram (Identity → Scoring → Marketplace → Spectator)
4. Trust Score: Visual breakdown of the 4 scoring factors with weights
5. Agents: 5 agent cards with roles, service types, trust scores
6. Tech Stack: OKX Onchain OS integration (9 capabilities), X Layer, Foundry, TypeScript
7. Team: Cayvox Labs — 3 team members
8. Footer: GitHub link, hackathon badge, MIT license

Use: Google Fonts (distinctive pairing — NOT Inter/Roboto), CSS custom properties, CSS animations on scroll (IntersectionObserver), responsive. No framework — vanilla HTML/CSS/JS.

## site/dashboard.html — Live Trust Leaderboard
Real-time dashboard reading from X Layer contracts via ethers.js CDN.

Features:
1. Trust Leaderboard: Table of all agents sorted by trust score, showing: rank, name, tier badge, overall score, 4 component scores, total orders
2. Marketplace Stats: Total services, total orders, volume, average rating
3. Recent Orders: Last 10 orders with status, buyer/seller, amount, rating
4. Score Radar: Visual radar/spider chart showing the 4 scoring dimensions per agent
5. Auto-refresh every 30 seconds

Use ethers.js from CDN (not viem — smaller for browser). Read-only — no wallet connection needed. Contract ABIs embedded.

If contract addresses not yet deployed: use demo data as fallback (read from a JS config object).

## site/assets/style.css + dashboard.css
Premium styling. Dark theme (#0a0a0f base). Accent color: electric blue (#00d4ff) or trust green (#00ff88).
Animate trust score bars. Tier badges with glow effects. Responsive grid.

## site/js/main.js
Scroll animations, smooth scrolling, mobile menu toggle.

## site/js/dashboard.js
Contract reads via ethers.js, data formatting, auto-refresh, chart rendering (use canvas or SVG for radar chart).

Deploy plan: Copy site/ contents to VPS at /var/www/trustmesh/, configure Caddy for trustmesh.cayvox.com (or similar domain).

Run: Open index.html in browser, verify responsive and polished
Then: git add -A && git commit -m "feat: landing page + dashboard" && git push origin main
```

---

## PROMPT 9 — Final Polish + Deployment

```
Final polish — deploy to mainnet, generate activity, update README, verify everything.

1. Deploy contracts to X Layer mainnet:
   - cd contracts && bash ../scripts/deploy.sh
   - Record all contract addresses
   - Update backend/.env with real addresses
   - Update site/js/dashboard.js with real addresses

2. Seed agents on mainnet:
   - cd backend && pnpm seed
   - Verify 5 agents registered on X Layer explorer
   - Verify 4 services listed
   - Verify 10+ marketplace transactions completed
   - Record all tx hashes for README

3. Update README.md:
   - Fill in contract addresses table
   - Add real test counts
   - Add tx hashes or explorer links showing on-chain activity
   - Verify all commands work

4. Test everything one final time:
   - cd contracts && forge test -vvv (all pass)
   - cd backend && pnpm test && pnpm lint && pnpm build (all clean)
   - cd backend && pnpm demo (produces clean output)

5. Deploy site to VPS:
   - scp site/ to VPS
   - Configure Caddy reverse proxy
   - Verify live at domain

6. Verify .gitignore covers: node_modules, dist, out, cache, broadcast, .env, .env.*, forge-cache
7. Verify .env.example has ALL required vars (no real secrets)
8. Verify no private keys or tokens in any committed file

9. Create submission materials:
   - GitHub repo is public with comprehensive README
   - Contract addresses verified on X Layer explorer
   - Working demo mode
   - X post drafted: "Introducing TrustMesh — the trust & reputation protocol for AI agents on X Layer. On-chain identity, data-driven scoring, trust-gated marketplace. Built by @CayvoxLabs for @XLayerOfficial #onchainos #BuildXHackathon"

Then: git add -A && git commit -m "polish: final deployment, docs, all tests passing" && git push origin main

Submit via Google Form: https://docs.google.com/forms/d/e/1FAIpQLSfEjzs4ny2yH04tfDXs14Byye1KYhXv6NeytpqSKhrqTtgKqg/viewform
```

---

## Execution Timeline

| Prompt | Focus | Tests | Est. Time |
|--------|-------|-------|-----------|
| 0 | Monorepo scaffolding | 0 | 20 min |
| 1 | AgentRegistry + TrustGate | 12 | 45 min |
| 2 | TrustScorer | 10 | 40 min |
| 3 | ServiceRegistry + Treasury + Deploy | 14 | 60 min |
| 4 | Backend types, config, utils | 3 | 45 min |
| 5 | Scoring engine | 12 | 50 min |
| 6 | Marketplace + agents + engine | 13 | 60 min |
| 7 | Demo mode + scripts + seed | 0 | 40 min |
| 8 | Landing page + dashboard | 0 | 60 min |
| 9 | Final polish + deployment | 0 | 40 min |

**Total: ~7.5 hours**
**Contract tests: ~36 | Backend tests: ~28 | Grand total: ~64 tests**

## Pre-submission Checklist

- [ ] All contracts deployed on X Layer mainnet (chainId 196)
- [ ] 5 agents registered with soulbound NFTs
- [ ] 4 services listed on marketplace
- [ ] 20+ real marketplace transactions (for "Most Active Agent")
- [ ] Trust scores computed and stored on-chain
- [ ] Demo mode works (`pnpm demo`)
- [ ] All tests pass (forge test + pnpm test)
- [ ] Landing page live
- [ ] Dashboard reads from real contracts
- [ ] README has contract addresses, test counts, architecture diagram
- [ ] GitHub repo is public
- [ ] X post published with #onchainos tagging @XLayerOfficial
- [ ] Google Form submitted before April 15, 2026 23:59 UTC
- [ ] Agentic Wallet address documented: 0x3ae6dd9075bc44b6e5ca1981fab4cb0edf3c72c0
