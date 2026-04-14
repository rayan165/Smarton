import type { AgentRole, TrustScore, ServiceType, AgentTier } from '../types.js';

export interface DemoStaking {
  readonly stakedUSDC: number;
  readonly multiplier: string;
}

export interface DemoSybil {
  readonly diversityPct: number | null;
  readonly riskLevel: 'low' | 'medium' | 'high';
  readonly patterns: readonly string[];
}

export interface DemoAgent {
  readonly agentId: bigint;
  readonly role: AgentRole;
  readonly name: string;
  readonly wallet: `0x${string}`;
  readonly tier: AgentTier;
  readonly score: TrustScore;
  readonly completedOrders: number;
  readonly averageRating: number;
  readonly earned: bigint;
  readonly staking: DemoStaking;
  readonly sybil: DemoSybil;
}

export const DEMO_AGENTS: DemoAgent[] = [
  {
    agentId: 1n, role: 'signal-provider', name: 'SignalPro',
    wallet: '0x0000000000000000000000000000000000000001', tier: 3,
    score: { overall: 8700, tradePerformance: 9200, securityHygiene: 8500, peerRating: 8800, uptime: 7800, lastUpdated: Date.now(), totalInteractions: 520 },
    completedOrders: 87, averageRating: 4.6, earned: 870_000n,
    staking: { stakedUSDC: 10.00, multiplier: '1.2x' },
    sybil: { diversityPct: 85, riskLevel: 'low', patterns: [] },
  },
  {
    agentId: 2n, role: 'security-scanner', name: 'SecurityBot',
    wallet: '0x0000000000000000000000000000000000000002', tier: 2,
    score: { overall: 7200, tradePerformance: 6800, securityHygiene: 9500, peerRating: 7000, uptime: 5500, lastUpdated: Date.now(), totalInteractions: 210 },
    completedOrders: 63, averageRating: 4.2, earned: 1_260_000n,
    staking: { stakedUSDC: 5.00, multiplier: '1.1x' },
    sybil: { diversityPct: 72, riskLevel: 'low', patterns: [] },
  },
  {
    agentId: 3n, role: 'trade-executor', name: 'TradeExec',
    wallet: '0x0000000000000000000000000000000000000003', tier: 2,
    score: { overall: 6500, tradePerformance: 7500, securityHygiene: 6000, peerRating: 6200, uptime: 6300, lastUpdated: Date.now(), totalInteractions: 120 },
    completedOrders: 45, averageRating: 3.8, earned: 2_250_000n,
    staking: { stakedUSDC: 1.00, multiplier: '1.1x' },
    sybil: { diversityPct: 60, riskLevel: 'low', patterns: [] },
  },
  {
    agentId: 4n, role: 'analyst', name: 'AnalystX',
    wallet: '0x0000000000000000000000000000000000000004', tier: 1,
    score: { overall: 4500, tradePerformance: 5000, securityHygiene: 4000, peerRating: 4500, uptime: 4500, lastUpdated: Date.now(), totalInteractions: 30 },
    completedOrders: 12, averageRating: 3.2, earned: 360_000n,
    staking: { stakedUSDC: 0, multiplier: '1.0x' },
    sybil: { diversityPct: 40, riskLevel: 'medium', patterns: ['CONCENTRATED_COUNTERPARTY'] },
  },
  {
    agentId: 5n, role: 'herald', name: 'Herald',
    wallet: '0x0000000000000000000000000000000000000005', tier: 1,
    score: { overall: 5000, tradePerformance: 5000, securityHygiene: 5000, peerRating: 5000, uptime: 5000, lastUpdated: Date.now(), totalInteractions: 15 },
    completedOrders: 0, averageRating: 0, earned: 0n,
    staking: { stakedUSDC: 0, multiplier: '1.0x' },
    sybil: { diversityPct: null, riskLevel: 'low', patterns: [] },
  },
];

export const DEMO_SERVICE_TYPES: { type: ServiceType; price: bigint; desc: string }[] = [
  { type: 'signal', price: 10_000n, desc: 'Alpha trading signals' },
  { type: 'security-scan', price: 20_000n, desc: 'Token security reports' },
  { type: 'execution', price: 50_000n, desc: 'DEX swap execution' },
  { type: 'analysis', price: 30_000n, desc: 'Token analysis reports' },
];
