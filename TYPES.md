# Smarton Backend Type Definitions

All TypeScript types used across the backend. Authoritative reference for implementation.
Every type is `readonly` — Smarton uses immutable data patterns throughout.

```typescript
// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface SmartonConfig {
  readonly okx: OKXConfig;
  readonly xlayer: XLayerConfig;
  readonly contracts: ContractAddresses;
  readonly scoring: ScoringConfig;
  readonly marketplace: MarketplaceConfig;
}

export interface OKXConfig {
  readonly apiKey: string;
  readonly secretKey: string;
  readonly passphrase: string;
  readonly baseUrl: string; // default: "https://www.okx.com"
}

export interface XLayerConfig {
  readonly rpcUrl: string;     // default: "https://rpc.xlayer.tech"
  readonly chainId: number;    // 196
  readonly usdcAddress: `0x${string}`;
}

export interface ContractAddresses {
  readonly agentRegistry: `0x${string}`;
  readonly trustScorer: `0x${string}`;
  readonly trustGate: `0x${string}`;
  readonly serviceRegistry: `0x${string}`;
  readonly treasury: `0x${string}`;
}

export interface ScoringConfig {
  readonly weights: ScoringWeights;
  readonly updateIntervalMs: number;     // default: 300_000 (5 min)
  readonly tier2Threshold: number;       // default: 6000 (60.00)
  readonly tier2Interactions: number;    // default: 50
  readonly tier3Threshold: number;       // default: 8500 (85.00)
  readonly tier3Interactions: number;    // default: 500
}

export interface ScoringWeights {
  readonly tradePerformance: number;     // default: 3000 (30%)
  readonly securityHygiene: number;      // default: 2500 (25%)
  readonly peerRating: number;           // default: 2500 (25%)
  readonly uptime: number;               // default: 2000 (20%)
}

export interface MarketplaceConfig {
  readonly protocolFeeBps: number;       // default: 200 (2%)
  readonly ratingIncentive: bigint;      // default: 1000n (0.001 USDC)
  readonly disputeWindowSec: number;     // default: 3600
  readonly cycleIntervalMs: number;      // default: 60_000 (1 min)
}

// ═══════════════════════════════════════════════════════════════
// IDENTITY
// ═══════════════════════════════════════════════════════════════

export type AgentTier = 0 | 1 | 2 | 3;

export interface AgentInfo {
  readonly agentId: bigint;
  readonly owner: `0x${string}`;
  readonly wallet: `0x${string}`;        // same as owner for Smarton agents
  readonly tier: AgentTier;
  readonly registeredAt: number;          // unix timestamp
  readonly lastActive: number;
  readonly agentURI: string;
}

export interface AgentProfile {
  readonly info: AgentInfo;
  readonly trustScore: TrustScore;
  readonly services: readonly ServiceListing[];
  readonly stats: AgentStats;
}

export interface AgentStats {
  readonly totalOrders: number;
  readonly completedOrders: number;
  readonly averageRating: number;         // 1.00-5.00
  readonly totalEarned: bigint;           // USDC (6 decimals)
  readonly totalSpent: bigint;
  readonly activeOrders: number;
}

// ═══════════════════════════════════════════════════════════════
// TRUST SCORING
// ═══════════════════════════════════════════════════════════════

export interface TrustScore {
  readonly overall: number;               // 0-10000 (display as 0-100.00)
  readonly tradePerformance: number;      // 0-10000
  readonly securityHygiene: number;       // 0-10000
  readonly peerRating: number;            // 0-10000
  readonly uptime: number;                // 0-10000
  readonly lastUpdated: number;           // unix timestamp
  readonly totalInteractions: number;
}

export interface ScoreComponents {
  readonly tradePerformance: number;      // 0-10000, raw before weighting
  readonly securityHygiene: number;
  readonly peerRating: number;
  readonly uptime: number;
}

export interface TradePerformanceData {
  readonly agentWallet: `0x${string}`;
  readonly totalTrades: number;
  readonly profitableTrades: number;
  readonly winRate: number;               // 0-1
  readonly totalPnlUsd: number;
  readonly maxDrawdownPct: number;        // 0-1
  readonly score: number;                 // 0-10000 computed
}

export interface SecurityHygieneData {
  readonly agentWallet: `0x${string}`;
  readonly totalTokensTraded: number;
  readonly safeTokens: number;
  readonly riskyTokens: number;
  readonly honeypotInteractions: number;
  readonly safeRatio: number;             // 0-1
  readonly score: number;                 // 0-10000 computed
}

export interface PeerRatingData {
  readonly agentId: bigint;
  readonly totalRatings: number;
  readonly averageStars: number;          // 1-5
  readonly ratingDistribution: readonly number[];  // [count_1star, ..., count_5star]
  readonly weightedAverage: number;       // weighted by rater's trust score
  readonly score: number;                 // 0-10000 computed
}

export interface UptimeData {
  readonly agentWallet: `0x${string}`;
  readonly balanceHistory: readonly BalanceSnapshot[];
  readonly volatility: number;            // 0-1, lower is better
  readonly hasRugPattern: boolean;
  readonly activeDays: number;
  readonly score: number;                 // 0-10000 computed
}

export interface BalanceSnapshot {
  readonly timestamp: number;
  readonly balanceUsd: number;
}

// ═══════════════════════════════════════════════════════════════
// MARKETPLACE
// ═══════════════════════════════════════════════════════════════

export type ServiceType = 'signal' | 'analysis' | 'execution' | 'security-scan';

export interface ServiceListing {
  readonly serviceId: bigint;
  readonly sellerAgentId: bigint;
  readonly sellerWallet: `0x${string}`;
  readonly serviceType: ServiceType;
  readonly description: string;
  readonly priceUSDC: bigint;             // 6 decimals
  readonly minBuyerTier: AgentTier;
  readonly active: boolean;
}

export type OrderStatus = 'escrowed' | 'delivered' | 'completed' | 'disputed' | 'refunded';

export interface ServiceOrder {
  readonly orderId: bigint;
  readonly serviceId: bigint;
  readonly buyerAgentId: bigint;
  readonly buyerWallet: `0x${string}`;
  readonly sellerAgentId: bigint;
  readonly sellerWallet: `0x${string}`;
  readonly amount: bigint;
  readonly status: OrderStatus;
  readonly createdAt: number;
  readonly deliveredAt: number | null;
  readonly completedAt: number | null;
  readonly buyerRating: number;           // 0-5, 0 = not rated
  readonly deliveryHash: string;
}

export interface ServiceDelivery {
  readonly orderId: bigint;
  readonly deliveryHash: string;
  readonly data: unknown;                 // actual service response payload
  readonly timestamp: number;
}

export interface MarketplaceStats {
  readonly totalServices: number;
  readonly activeServices: number;
  readonly totalOrders: number;
  readonly completedOrders: number;
  readonly totalVolumeUSDC: bigint;
  readonly averageRating: number;         // 1.00-5.00
  readonly activeAgents: number;
}

// ═══════════════════════════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════════════════════════

export type AgentRole = 'signal-provider' | 'security-scanner' | 'trade-executor' | 'analyst' | 'herald';

export interface AgentConfig {
  readonly role: AgentRole;
  readonly wallet: `0x${string}`;
  readonly privateKey: `0x${string}`;
  readonly serviceType: ServiceType | null;  // null for herald
  readonly servicePrice: bigint;              // USDC (6 decimals), 0n for herald
  readonly serviceDescription: string;
  readonly minBuyerTier: AgentTier;
  readonly cycleIntervalMs: number;
}

export interface AgentCycleResult {
  readonly agentRole: AgentRole;
  readonly timestamp: number;
  readonly actions: readonly AgentAction[];
  readonly ordersProcessed: number;
  readonly revenueEarned: bigint;
  readonly transactionCount: number;
}

export type AgentActionType =
  | 'register'
  | 'list_service'
  | 'purchase_service'
  | 'deliver_service'
  | 'rate_service'
  | 'update_score'
  | 'post_report'
  | 'trade'
  | 'scan';

export interface AgentAction {
  readonly type: AgentActionType;
  readonly txHash: `0x${string}` | null;
  readonly details: string;
  readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════

export interface EngineState {
  readonly running: boolean;
  readonly startedAt: number | null;
  readonly totalCycles: number;
  readonly agents: readonly AgentStatus[];
  readonly marketplace: MarketplaceStats;
}

export interface AgentStatus {
  readonly role: AgentRole;
  readonly agentId: bigint;
  readonly wallet: `0x${string}`;
  readonly tier: AgentTier;
  readonly trustScore: number;            // 0-10000
  readonly lastCycle: number;
  readonly ordersCompleted: number;
  readonly totalRevenue: bigint;
}

export interface CycleResult {
  readonly cycleNumber: number;
  readonly timestamp: number;
  readonly agentResults: readonly AgentCycleResult[];
  readonly totalOrders: number;
  readonly totalTransactions: number;
  readonly totalRevenue: bigint;
}

// ═══════════════════════════════════════════════════════════════
// MOLTBOOK / HERALD
// ═══════════════════════════════════════════════════════════════

export type ReportType = 'hourly_report' | 'tier_change' | 'milestone' | 'alert';

export interface HeraldReport {
  readonly content: string;
  readonly timestamp: number;
  readonly type: ReportType;
  readonly data: {
    readonly agentCount: number;
    readonly topAgent: { readonly agentId: bigint; readonly score: number } | null;
    readonly orderCount: number;
    readonly volumeUSDC: bigint;
  };
}

// ═══════════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════════

export interface DemoConfig {
  readonly cycleCount: number;            // how many cycles to run
  readonly cycleDelayMs: number;          // delay between cycles
  readonly prettyOutput: boolean;         // colorized console output
}

// ═══════════════════════════════════════════════════════════════
// ERROR
// ═══════════════════════════════════════════════════════════════

export interface SmartonError {
  readonly code: string;                  // e.g. "OKX_50011", "CONTRACT_REVERT", "CONFIG_MISSING"
  readonly message: string;
  readonly module: string;                // e.g. "okx-client", "scoring", "marketplace"
  readonly details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// OKX API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

/** Wrapper for all OKX API responses */
export interface OKXApiResponse<T> {
  readonly code: string;                  // "0" = success
  readonly msg: string;
  readonly data: readonly T[];
}

export interface OKXSignalData {
  readonly walletAddress: string;
  readonly action: 'buy' | 'sell';
  readonly amount: string;
  readonly timestamp: string;
  readonly isKOL: boolean;
  readonly winRate: string;               // "0.72" — string decimal
}

export interface OKXSecurityData {
  readonly isHoneypot: boolean;
  readonly ownerIsRenounced: boolean;
  readonly buyTax: string;                // "0", "5" etc
  readonly sellTax: string;
  readonly isProxy: boolean;
  readonly hasMintFunction: boolean;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface OKXTokenPrice {
  readonly price: string;
  readonly priceChange24h: string;
  readonly volume24h: string;
  readonly timestamp: string;
}

export interface OKXTokenDetail {
  readonly tokenContractAddress: string;
  readonly tokenSymbol: string;
  readonly tokenName: string;
  readonly decimals: string;
  readonly totalSupply: string;
  readonly holderCount: string;
  readonly marketCap: string;
}

export interface OKXSwapResult {
  readonly routerResult: {
    readonly toTokenAmount: string;
    readonly estimatedGas: string;
  };
  readonly tx: {
    readonly to: string;
    readonly data: string;
    readonly value: string;
    readonly gasLimit: string;
  };
}

export interface OKXTokenBalance {
  readonly tokenContractAddress: string;
  readonly tokenSymbol: string;
  readonly balance: string;
  readonly balanceUsd: string;
}

/** Candlestick data — array format [timestamp, open, high, low, close, volume] */
export type OKXCandleData = readonly [string, string, string, string, string, string];

export interface OKXTokenRanking {
  readonly tokenContractAddress: string;
  readonly tokenSymbol: string;
  readonly price: string;
  readonly volume24h: string;
  readonly priceChange24h: string;
  readonly marketCap: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTRACT CLIENT TYPES
// ═══════════════════════════════════════════════════════════════

/** Result from a contract write operation */
export interface TxResult {
  readonly hash: `0x${string}`;
  readonly blockNumber: bigint;
  readonly gasUsed: bigint;
  readonly status: 'success' | 'reverted';
}

/** Cache entry for OKX client */
export interface CacheEntry<T> {
  readonly data: T;
  readonly expiresAt: number;             // unix ms
}
```
