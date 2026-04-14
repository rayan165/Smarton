# TrustMesh Smart Contract Specifications

## Overview

5 contracts deployed on X Layer (chainId 196). Solidity 0.8.24+, Foundry toolchain, OpenZeppelin base contracts.

**USDC on X Layer**: `0x74b7f16337b8972027f6196a17a631ac6de26d22` (6 decimals)

**Deployment Order**:
1. AgentRegistry
2. TrustScorer(agentRegistry)
3. TrustGate(agentRegistry, trustScorer)
4. TrustMeshTreasury(usdc)
5. ServiceRegistry(agentRegistry, trustGate, treasury, usdc)
6. Wire: `agentRegistry.setTrustScorer(address(trustScorer))`
7. Wire: `treasury.setServiceRegistry(address(serviceRegistry))`

---

## Contract 1: AgentRegistry.sol

ERC-721 based soulbound agent identity registry.

### Interface — IAgentRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct AgentInfo {
    address owner;           // Human owner (accountability chain)
    uint8 tier;              // 0=unregistered, 1=registered, 2=proven, 3=trusted
    uint64 registeredAt;     // Block timestamp at registration
    uint64 lastActive;       // Last interaction timestamp
    string agentURI;         // Metadata URI (capabilities, endpoints, description)
}

interface IAgentRegistry {
    // Errors
    error NotAgentOwner();
    error AgentAlreadyRegistered();
    error InvalidAgentURI();
    error AgentNotFound();
    error NotAuthorizedScorer();
    error SoulboundTransferBlocked();

    // Events
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);
    event AgentTierUpdated(uint256 indexed agentId, uint8 oldTier, uint8 newTier);

    // Write
    function registerAgent(string calldata agentURI) external returns (uint256 agentId);
    function updateTier(uint256 agentId, uint8 newTier) external;       // only TrustScorer
    function updateLastActive(uint256 agentId) external;                // only agent owner
    function setTrustScorer(address scorer) external;                   // only contract owner

    // Read
    function getAgentInfo(uint256 agentId) external view returns (AgentInfo memory);
    function getAgentTier(uint256 agentId) external view returns (uint8);
    function getAgentByAddress(address wallet) external view returns (uint256);
    function isRegistered(address wallet) external view returns (bool);
    function totalAgents() external view returns (uint256);
}
```

### Implementation Notes

**Storage**:
```solidity
uint256 private _nextAgentId = 1;                    // auto-increment, starts at 1
mapping(uint256 => AgentInfo) private _agents;        // agentId → info
mapping(address => uint256) private _walletToAgent;   // wallet → agentId (reverse lookup)
address public trustScorer;                           // authorized tier updater
```

**Key Behaviors**:

- `registerAgent(agentURI)`:
  - Revert if `agentURI` is empty bytes → `InvalidAgentURI()`
  - Revert if `_walletToAgent[msg.sender] != 0` → `AgentAlreadyRegistered()`
  - Mint ERC-721 token with `_nextAgentId` to `msg.sender`
  - Store `AgentInfo{owner: msg.sender, tier: 1, registeredAt: uint64(block.timestamp), lastActive: uint64(block.timestamp), agentURI: agentURI}`
  - Set `_walletToAgent[msg.sender] = _nextAgentId`
  - Increment `_nextAgentId`
  - Emit `AgentRegistered`

- `updateTier(agentId, newTier)`:
  - Revert if `msg.sender != trustScorer` → `NotAuthorizedScorer()`
  - Store old tier, set new tier
  - Emit `AgentTierUpdated(agentId, oldTier, newTier)`

- **Soulbound mechanism** — override ERC-721 `_update(to, tokenId, auth)`:
  ```solidity
  function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
      address from = _ownerOf(tokenId);
      if (from != address(0) && to != address(0)) {
          revert SoulboundTransferBlocked();  // block transfer, allow mint (from=0) and burn (to=0)
      }
      return super._update(to, tokenId, auth);
  }
  ```

- `getAgentByAddress(wallet)`: Returns 0 if not registered (agentIds start at 1, so 0 = not found)

---

## Contract 2: TrustScorer.sol

On-chain trust score storage with automatic tier management.

### Interface — ITrustScorer.sol

```solidity
struct TrustScore {
    uint16 overall;           // 0-10000 (basis points, display as 0-100.00)
    uint16 tradePerformance;  // 0-10000, weight 30%
    uint16 securityHygiene;   // 0-10000, weight 25%
    uint16 peerRating;        // 0-10000, weight 25%
    uint16 uptime;            // 0-10000, weight 20%
    uint64 lastUpdated;       // timestamp of last score update
    uint32 totalInteractions; // lifetime interaction count (incremented each update)
}

interface ITrustScorer {
    // Errors
    error AgentNotRegistered();
    error ScoreOutOfRange();
    error CallerNotAuthorized();
    error CooldownNotElapsed();

    // Events
    event ScoreUpdated(uint256 indexed agentId, uint16 oldScore, uint16 newScore, uint32 interactions);
    event TierUpgrade(uint256 indexed agentId, uint8 oldTier, uint8 newTier);
    event TierDowngrade(uint256 indexed agentId, uint8 oldTier, uint8 newTier);

    // Write
    function updateScore(uint256 agentId, uint16 tradePerformance, uint16 securityHygiene, uint16 peerRating, uint16 uptime) external;
    function setOracle(address oracle) external;

    // Read
    function getScore(uint256 agentId) external view returns (TrustScore memory);
    function getOverallScore(uint256 agentId) external view returns (uint16);
    function getScoreHistory(uint256 agentId) external view returns (uint16[10] memory);
    function computeComposite(uint16 trade, uint16 security, uint16 peer, uint16 up) external pure returns (uint16);
}
```

### Implementation Notes

**Constants**:
```solidity
uint16 constant TIER_2_THRESHOLD = 6000;     // 60.00 score
uint32 constant TIER_2_INTERACTIONS = 50;
uint16 constant TIER_3_THRESHOLD = 8500;     // 85.00 score
uint32 constant TIER_3_INTERACTIONS = 500;
uint64 constant UPDATE_COOLDOWN = 300;       // 5 minutes between updates
```

**Storage**:
```solidity
IAgentRegistry public immutable agentRegistry;
address public oracle;                                // authorized score updater (backend)
mapping(uint256 => TrustScore) private _scores;
mapping(uint256 => uint16[10]) private _scoreHistory; // circular buffer
mapping(uint256 => uint8) private _historyIndex;
```

**Key Behaviors**:

- `updateScore(agentId, trade, security, peer, up)`:
  - Revert if `msg.sender != oracle` → `CallerNotAuthorized()`
  - Revert if any component > 10000 → `ScoreOutOfRange()`
  - Revert if `!agentRegistry.isRegistered(ownerOf(agentId))` → `AgentNotRegistered()`
  - Revert if `block.timestamp - _scores[agentId].lastUpdated < UPDATE_COOLDOWN` and lastUpdated != 0 → `CooldownNotElapsed()`
  - Compute composite: `(trade * 3000 + security * 2500 + peer * 2500 + up * 2000) / 10000`
  - Store all components, overall, lastUpdated, increment totalInteractions
  - Push overall to circular buffer: `_scoreHistory[agentId][_historyIndex[agentId] % 10] = overall`
  - Call internal `_checkAndUpdateTier(agentId)`
  - Emit `ScoreUpdated`

- `_checkAndUpdateTier(agentId)` (internal):
  - Get current tier from `agentRegistry.getAgentTier(agentId)`
  - Determine target tier based on score + interactions:
    - `overall >= 8500 && totalInteractions >= 500` → tier 3
    - `overall >= 6000 && totalInteractions >= 50` → tier 2
    - else → tier 1 (never demote below 1)
  - If target != current: call `agentRegistry.updateTier(agentId, target)`
  - Emit `TierUpgrade` or `TierDowngrade` as appropriate

- `computeComposite`: Pure function, `(t*3000 + s*2500 + p*2500 + u*2000) / 10000`

---

## Contract 3: TrustGate.sol

Lightweight read-only access control.

### Interface — ITrustGate.sol

```solidity
interface ITrustGate {
    error AgentNotRegistered();
    error TierTooLow(uint8 required, uint8 actual);

    function checkTier(address agent, uint8 requiredTier) external view returns (bool);
    function requireTier(address agent, uint8 requiredTier) external view; // reverts if not met
}
```

### Implementation Notes

**Storage**: `IAgentRegistry` and `ITrustScorer` references (immutable, set in constructor).

**Key Behaviors**:
- `checkTier(agent, requiredTier)`:
  - If `!agentRegistry.isRegistered(agent)` → return false
  - Get `agentId = agentRegistry.getAgentByAddress(agent)`
  - Get `tier = agentRegistry.getAgentTier(agentId)`
  - Return `tier >= requiredTier`

- `requireTier(agent, requiredTier)`:
  - Same logic but reverts with `AgentNotRegistered()` or `TierTooLow(required, actual)`

Pure reads — no state changes, minimal gas.

---

## Contract 4: ServiceRegistry.sol

Marketplace — service listings, USDC escrow, peer ratings, dispute resolution.

### Interface — IServiceRegistry.sol

```solidity
enum ServiceStatus { Listed, Escrowed, Delivered, Completed, Disputed, Refunded }

struct ServiceListing {
    uint256 serviceId;
    uint256 sellerAgentId;
    address sellerWallet;
    string serviceType;       // "signal", "analysis", "execution", "security-scan"
    string description;
    uint256 priceUSDC;        // in USDC smallest unit (6 decimals)
    uint8 minBuyerTier;       // minimum tier required to purchase
    bool active;
}

struct ServiceOrder {
    uint256 orderId;
    uint256 serviceId;
    uint256 buyerAgentId;
    address buyerWallet;
    uint256 sellerAgentId;
    address sellerWallet;
    uint256 amount;           // USDC escrowed
    ServiceStatus status;
    uint64 createdAt;
    uint64 deliveredAt;       // timestamp when delivered (for dispute window calc)
    uint64 completedAt;
    uint8 buyerRating;        // 1-5 stars, 0 = not rated
    string deliveryHash;      // hash of delivered content
}

interface IServiceRegistry {
    // Errors
    error ServiceNotFound();
    error InsufficientPayment();
    error ServiceAlreadyCompleted();
    error NotBuyer();
    error NotSeller();
    error BuyerCannotBeSeller();
    error DisputeWindowExpired();
    error DisputeAlreadyFiled();
    error RatingOutOfRange();
    error OrderNotInExpectedStatus(ServiceStatus expected, ServiceStatus actual);

    // Events
    event ServiceListed(uint256 indexed serviceId, uint256 indexed sellerAgentId, string serviceType, uint256 price);
    event ServiceDelisted(uint256 indexed serviceId);
    event OrderCreated(uint256 indexed orderId, uint256 indexed serviceId, uint256 indexed buyerAgentId, uint256 amount);
    event ServiceDelivered(uint256 indexed orderId, string deliveryHash);
    event OrderCompleted(uint256 indexed orderId, uint8 rating);
    event DisputeFiled(uint256 indexed orderId, address indexed filer);
    event DisputeResolved(uint256 indexed orderId, bool refunded);

    // Seller functions
    function listService(string calldata serviceType, string calldata description, uint256 priceUSDC, uint8 minBuyerTier) external returns (uint256 serviceId);
    function delistService(uint256 serviceId) external;
    function deliverService(uint256 orderId, string calldata deliveryHash) external;

    // Buyer functions
    function purchaseService(uint256 serviceId) external returns (uint256 orderId);
    function confirmAndRate(uint256 orderId, uint8 rating) external;
    function fileDispute(uint256 orderId) external;

    // Admin
    function resolveDispute(uint256 orderId, bool refund) external;   // onlyOwner
    function completeExpiredOrder(uint256 orderId) external;           // anyone, after dispute window

    // Read functions
    function getService(uint256 serviceId) external view returns (ServiceListing memory);
    function getOrder(uint256 orderId) external view returns (ServiceOrder memory);
    function getActiveServices() external view returns (ServiceListing[] memory);
    function getAgentServices(uint256 agentId) external view returns (ServiceListing[] memory);
    function getAgentOrders(uint256 agentId) external view returns (ServiceOrder[] memory);
    function getAverageRating(uint256 agentId) external view returns (uint16);
    function totalServices() external view returns (uint256);
    function totalOrders() external view returns (uint256);
}
```

### Implementation Notes

**Constants**:
```solidity
uint256 constant PROTOCOL_FEE_BPS = 200;  // 2%
uint256 constant RATING_INCENTIVE = 1000; // 0.001 USDC (6 decimals)
uint64 constant DISPUTE_WINDOW = 3600;    // 1 hour after delivery
```

**Storage**:
```solidity
IAgentRegistry public immutable agentRegistry;
ITrustGate public immutable trustGate;
TrustMeshTreasury public immutable treasury;
IERC20 public immutable usdc;

uint256 private _nextServiceId = 1;
uint256 private _nextOrderId = 1;
mapping(uint256 => ServiceListing) private _services;
mapping(uint256 => ServiceOrder) private _orders;
mapping(uint256 => uint256[]) private _agentServices;  // agentId → serviceId[]
mapping(uint256 => uint256[]) private _agentOrders;    // agentId → orderId[] (as buyer or seller)
```

**Key Behaviors**:

- `listService(serviceType, description, priceUSDC, minBuyerTier)`:
  - Require `msg.sender` is registered agent
  - Create `ServiceListing`, store, emit `ServiceListed`

- `purchaseService(serviceId)` — **nonReentrant**:
  - Require service exists and active
  - Require buyer is registered agent
  - `trustGate.requireTier(msg.sender, service.minBuyerTier)`
  - Require `msg.sender != service.sellerWallet` → `BuyerCannotBeSeller()`
  - `usdc.transferFrom(msg.sender, address(this), service.priceUSDC)` — escrow
  - Create `ServiceOrder` with status `Escrowed`
  - Emit `OrderCreated`

- `deliverService(orderId, deliveryHash)`:
  - Require `msg.sender == order.sellerWallet`
  - Require status == `Escrowed`
  - Set status = `Delivered`, store deliveryHash, set `deliveredAt = block.timestamp`
  - Emit `ServiceDelivered`

- `confirmAndRate(orderId, rating)` — **nonReentrant**:
  - Require `msg.sender == order.buyerWallet`
  - Require status == `Delivered`
  - Require `rating >= 1 && rating <= 5`
  - Calculate fee: `amount * PROTOCOL_FEE_BPS / 10000`
  - Transfer `(amount - fee)` USDC to seller
  - Transfer `fee` USDC to treasury address
  - Treasury pays `RATING_INCENTIVE` USDC to buyer (if treasury has sufficient balance)
  - Set status = `Completed`, store rating + `completedAt`
  - Emit `OrderCompleted`

- `fileDispute(orderId)`:
  - Require `msg.sender == order.buyerWallet`
  - Require status == `Delivered`
  - Require `block.timestamp - order.deliveredAt <= DISPUTE_WINDOW`
  - Set status = `Disputed`
  - Emit `DisputeFiled`

- `resolveDispute(orderId, refund)` — **onlyOwner**:
  - Require status == `Disputed`
  - If refund: transfer escrowed USDC back to buyer, status = `Refunded`
  - If !refund: release to seller minus fee (same as confirmAndRate flow), status = `Completed`

- `completeExpiredOrder(orderId)`:
  - Require status == `Delivered`
  - Require `block.timestamp - order.deliveredAt > DISPUTE_WINDOW`
  - Release to seller minus fee, status = `Completed`, rating = 5 (default)
  - Anyone can call this (incentive: no gas cost on X Layer)

- `getAverageRating(agentId)`: Iterate seller's completed orders, compute mean of non-zero ratings × 100 (returns 100-500 for 1.00-5.00)

---

## Contract 5: TrustMeshTreasury.sol

Protocol fee collector + rating incentive distributor.

```solidity
interface ITrustMeshTreasury {
    error NotAuthorizedCaller();
    error InsufficientBalance();

    event FeeCollected(uint256 amount);
    event IncentivePaid(address indexed rater, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    function collectFee(uint256 amount) external;           // called by ServiceRegistry
    function payRatingIncentive(address rater) external;    // called by ServiceRegistry
    function withdraw(address to, uint256 amount) external; // only owner
    function getBalance() external view returns (uint256);
}
```

### Implementation Notes

**Storage**:
```solidity
IERC20 public immutable usdc;
address public serviceRegistry;    // authorized caller, set via setServiceRegistry (onlyOwner)
uint256 constant RATING_INCENTIVE = 1000;  // 0.001 USDC
```

**Key Behaviors**:
- `collectFee(amount)`: Called by ServiceRegistry after order completion. The fee USDC is transferred directly from ServiceRegistry to treasury address (ServiceRegistry does the `usdc.transfer`). Treasury just emits event for tracking.
- `payRatingIncentive(rater)`: Transfer `RATING_INCENTIVE` USDC from treasury to rater. Silently skip if insufficient balance (don't revert — incentive is optional).
- `withdraw(to, amount)`: onlyOwner. Transfer USDC to recipient.
- `getBalance()`: `usdc.balanceOf(address(this))`

**Simplification for hackathon**: The fee transfer flow is kept simple. ServiceRegistry transfers fee USDC directly to treasury address. Treasury's `collectFee` just emits the tracking event. This avoids complex approval chains.

---

## Test Coverage Target

| Contract | Test File | Test Count |
|----------|-----------|-----------|
| AgentRegistry | AgentRegistry.t.sol | 8 |
| TrustScorer | TrustScorer.t.sol | 10 |
| TrustGate | TrustGate.t.sol | (included in AgentRegistry tests) |
| ServiceRegistry | ServiceRegistry.t.sol | 12 |
| Integration | Integration.t.sol | 1 |
| **Total** | | **~31** |

---

## X Layer Specific Notes

- USDC address: `0x74b7f16337b8972027f6196a17a631ac6de26d22`
- Use `IERC20` interface for all USDC interactions
- Gas costs are near-zero on X Layer (~0.001 OKB per tx)
- Block confirmations are fast (~3 seconds)
- For Foundry deployment: `--rpc-url https://rpc.xlayer.tech`
- X Layer explorer for verification: `https://www.okx.com/explorer/xlayer`
- Note: `forge verify-contract` may not work with X Layer explorer. Use `--verify` flag in deploy script and if it fails, skip verification (manual verification via explorer UI).
