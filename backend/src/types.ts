// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface TrustMeshConfig {
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
  readonly baseUrl: string;
}

export interface XLayerConfig {
  readonly rpcUrl: string;
  readonly chainId: number;
  readonly usdcAddress: `0x${string}`;
}

export interface ContractAddresses {
  readonly agentRegistry: `0x${string}`;
  readonly trustScorer: `0x${string}`;
  readonly trustGate: `0x${string}`;
  readonly serviceRegistry: `0x${string}`;
  readonly treasury: `0x${string}`;
  readonly staking: `0x${string}`;
}

export interface ScoringConfig {
  readonly weights: ScoringWeights;
  readonly updateIntervalMs: number;
  readonly tier2Threshold: number;
  readonly tier2Interactions: number;
  readonly tier3Threshold: number;
  readonly tier3Interactions: number;
}

export interface ScoringWeights {
  readonly tradePerformance: number;
  readonly securityHygiene: number;
  readonly peerRating: number;
  readonly uptime: number;
}

export interface MarketplaceConfig {
  readonly protocolFeeBps: number;
  readonly ratingIncentive: bigint;
  readonly disputeWindowSec: number;
  readonly cycleIntervalMs: number;
}

// ═══════════════════════════════════════════════════════════════
// IDENTITY
// ═══════════════════════════════════════════════════════════════

export type AgentTier = 0 | 1 | 2 | 3;

export interface AgentInfo {
  readonly agentId: bigint;
  readonly owner: `0x${string}`;
  readonly wallet: `0x${string}`;
  readonly tier: AgentTier;
  readonly registeredAt: number;
  readonly lastActive: number;
  readonly agentURI: string;
}

export interface StakeInfo {
  readonly agentId: bigint;
  readonly stakedAmount: bigint;
  readonly multiplier: number;
  readonly stakedAt: number;
  readonly lastSlashedAt: number;
}

export interface AgentProfile {
  readonly info: AgentInfo;
  readonly trustScore: TrustScore;
  readonly services: readonly ServiceListing[];
  readonly stats: AgentStats;
  readonly stakeInfo: StakeInfo | null;
}

export interface AgentStats {
  readonly totalOrders: number;
  readonly completedOrders: number;
  readonly averageRating: number;
  readonly totalEarned: bigint;
  readonly totalSpent: bigint;
  readonly activeOrders: number;
}

// ═══════════════════════════════════════════════════════════════
// TRUST SCORING
// ═══════════════════════════════════════════════════════════════

export interface TrustScore {
  readonly overall: number;
  readonly tradePerformance: number;
  readonly securityHygiene: number;
  readonly peerRating: number;
  readonly uptime: number;
  readonly lastUpdated: number;
  readonly totalInteractions: number;
}

export interface ScoreComponents {
  readonly tradePerformance: number;
  readonly securityHygiene: number;
  readonly peerRating: number;
  readonly uptime: number;
}

export interface TradePerformanceData {
  readonly agentWallet: `0x${string}`;
  readonly totalTrades: number;
  readonly profitableTrades: number;
  readonly winRate: number;
  readonly totalPnlUsd: number;
  readonly maxDrawdownPct: number;
  readonly score: number;
}

export interface SecurityHygieneData {
  readonly agentWallet: `0x${string}`;
  readonly totalTokensTraded: number;
  readonly safeTokens: number;
  readonly riskyTokens: number;
  readonly honeypotInteractions: number;
  readonly safeRatio: number;
  readonly score: number;
}

export interface PeerRatingData {
  readonly agentId: bigint;
  readonly totalRatings: number;
  readonly averageStars: number;
  readonly ratingDistribution: readonly number[];
  readonly weightedAverage: number;
  readonly score: number;
}

export interface UptimeData {
  readonly agentWallet: `0x${string}`;
  readonly balanceHistory: readonly BalanceSnapshot[];
  readonly volatility: number;
  readonly hasRugPattern: boolean;
  readonly activeDays: number;
  readonly score: number;
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
  readonly priceUSDC: bigint;
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
  readonly buyerRating: number;
  readonly deliveryHash: string;
}

export interface ServiceDelivery {
  readonly orderId: bigint;
  readonly deliveryHash: string;
  readonly data: unknown;
  readonly timestamp: number;
}

export interface MarketplaceStats {
  readonly totalServices: number;
  readonly activeServices: number;
  readonly totalOrders: number;
  readonly completedOrders: number;
  readonly totalVolumeUSDC: bigint;
  readonly averageRating: number;
  readonly activeAgents: number;
  readonly totalStaked: bigint;
}

// ═══════════════════════════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════════════════════════

export type AgentRole = 'signal-provider' | 'security-scanner' | 'trade-executor' | 'analyst' | 'herald';

export interface AgentConfig {
  readonly role: AgentRole;
  readonly wallet: `0x${string}`;
  readonly privateKey: `0x${string}`;
  readonly serviceType: ServiceType | null;
  readonly servicePrice: bigint;
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
  readonly trustScore: number;
  readonly lastCycle: number;
  readonly ordersCompleted: number;
  readonly totalRevenue: bigint;
  readonly stakedAmount: bigint;
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
  readonly cycleCount: number;
  readonly cycleDelayMs: number;
  readonly prettyOutput: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ERROR
// ═══════════════════════════════════════════════════════════════

export interface TrustMeshError {
  readonly code: string;
  readonly message: string;
  readonly module: string;
  readonly details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// OKX API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface OKXApiResponse<T> {
  readonly code: string;
  readonly msg: string;
  readonly data: readonly T[];
}

export interface OKXSignalData {
  readonly walletAddress: string;
  readonly action: 'buy' | 'sell';
  readonly amount: string;
  readonly timestamp: string;
  readonly isKOL: boolean;
  readonly winRate: string;
}

export interface OKXSecurityData {
  readonly isHoneypot: boolean;
  readonly ownerIsRenounced: boolean;
  readonly buyTax: string;
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

export interface TxResult {
  readonly hash: `0x${string}`;
  readonly blockNumber: bigint;
  readonly gasUsed: bigint;
  readonly status: 'success' | 'reverted';
}

export interface CacheEntry<T> {
  readonly data: T;
  readonly expiresAt: number;
}
