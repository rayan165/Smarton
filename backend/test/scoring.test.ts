import { describe, it, expect, vi } from 'vitest';
import { computeTradePerformance } from '../src/scoring/trade-performance.js';
import { computeSecurityHygiene } from '../src/scoring/security-hygiene.js';
import { computePeerRating } from '../src/scoring/peer-ratings.js';
import { computeUptime } from '../src/scoring/uptime-tracker.js';
import { computeCompositeScore, determineTier } from '../src/scoring/composite-scorer.js';
import { DEFAULT_SCORING_CONFIG, DEFAULT_SCORING_WEIGHTS } from '../src/config.js';
import { MOCK_SIGNALS_GOOD, MOCK_SIGNALS_BAD, MOCK_SECURITY_SAFE, MOCK_SECURITY_HONEYPOT, MOCK_BALANCE_HEALTHY } from './fixtures/scores.js';
import type { OKXClient } from '../src/utils/okx-client.js';
import type { ContractClient } from '../src/utils/contract-client.js';

const WALLET: `0x${string}` = '0x1234567890123456789012345678901234567890';

function mockOKXClient(overrides: Partial<OKXClient> = {}): OKXClient {
  return {
    getSignals: vi.fn().mockResolvedValue([]),
    getTokenSecurity: vi.fn().mockResolvedValue(null),
    getTokenPrice: vi.fn().mockResolvedValue(null),
    getTokenDetail: vi.fn().mockResolvedValue(null),
    getSwapQuote: vi.fn().mockResolvedValue(null),
    getPortfolioBalance: vi.fn().mockResolvedValue([]),
    getCandles: vi.fn().mockResolvedValue([]),
    getTokenRanking: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function mockContractClient(overrides: Partial<ContractClient> = {}): ContractClient {
  return {
    registerAgent: vi.fn(),
    getAgentInfo: vi.fn(),
    getAgentTier: vi.fn().mockResolvedValue(1),
    getAgentByAddress: vi.fn().mockResolvedValue(1n),
    isRegistered: vi.fn().mockResolvedValue(true),
    totalAgents: vi.fn().mockResolvedValue(1n),
    updateLastActive: vi.fn(),
    updateScore: vi.fn(),
    getScore: vi.fn(),
    getOverallScore: vi.fn().mockResolvedValue(5000),
    checkTier: vi.fn().mockResolvedValue(true),
    listService: vi.fn(),
    purchaseService: vi.fn(),
    deliverService: vi.fn(),
    confirmAndRate: vi.fn(),
    fileDispute: vi.fn(),
    getActiveServices: vi.fn().mockResolvedValue([]),
    getService: vi.fn(),
    getOrder: vi.fn(),
    getAverageRating: vi.fn().mockResolvedValue(0),
    totalServices: vi.fn().mockResolvedValue(0n),
    totalOrders: vi.fn().mockResolvedValue(0n),
    approveUSDC: vi.fn(),
    balanceOfUSDC: vi.fn().mockResolvedValue(0n),
    getTreasuryBalance: vi.fn().mockResolvedValue(0n),
    stakeUSDC: vi.fn(),
    unstakeUSDC: vi.fn(),
    getStakeInfo: vi.fn().mockResolvedValue({ stakedAmount: 0n, multiplier: 10000, stakedAt: 0n, lastSlashedAt: 0n }),
    getTotalStaked: vi.fn().mockResolvedValue(0n),
    isStaked: vi.fn().mockResolvedValue(false),
    ...overrides,
  } as ContractClient;
}

describe('Scoring Engine', () => {
  it('trade performance — good trader 70% win rate', async () => {
    const client = mockOKXClient({ getSignals: vi.fn().mockResolvedValue(MOCK_SIGNALS_GOOD) });
    const result = await computeTradePerformance(client, WALLET, 196);
    expect(result.score).toBeGreaterThanOrEqual(7000);
    expect(result.score).toBeLessThanOrEqual(10000);
  });

  it('trade performance — bad trader 30% win rate', async () => {
    const client = mockOKXClient({ getSignals: vi.fn().mockResolvedValue(MOCK_SIGNALS_BAD) });
    const result = await computeTradePerformance(client, WALLET, 196);
    expect(result.score).toBeGreaterThanOrEqual(3000);
    expect(result.score).toBeLessThanOrEqual(5000);
  });

  it('trade performance — no data defaults to 5000', async () => {
    const client = mockOKXClient();
    const result = await computeTradePerformance(client, WALLET, 196);
    expect(result.score).toBe(5000);
  });

  it('security hygiene — all safe tokens', async () => {
    const client = mockOKXClient({ getTokenSecurity: vi.fn().mockResolvedValue(MOCK_SECURITY_SAFE) });
    const result = await computeSecurityHygiene(client, WALLET, 196, ['0xtoken1', '0xtoken2']);
    expect(result.score).toBe(10000);
  });

  it('security hygiene — honeypot caps at 5000', async () => {
    const client = mockOKXClient({ getTokenSecurity: vi.fn().mockResolvedValue(MOCK_SECURITY_HONEYPOT) });
    const result = await computeSecurityHygiene(client, WALLET, 196, ['0xtoken1']);
    expect(result.score).toBeLessThanOrEqual(5000);
    expect(result.honeypotInteractions).toBe(1);
  });

  it('security hygiene — no tokens defaults to 7500', async () => {
    const client = mockOKXClient();
    const result = await computeSecurityHygiene(client, WALLET, 196, []);
    expect(result.score).toBe(7500);
  });

  it('peer rating — 5 star average → 10000', async () => {
    const client = mockContractClient({ getAverageRating: vi.fn().mockResolvedValue(500) });
    const result = await computePeerRating(client, 1n);
    expect(result.score).toBe(10000);
    expect(result.averageStars).toBe(5);
  });

  it('peer rating — 2.5 stars → ~3750', async () => {
    const client = mockContractClient({ getAverageRating: vi.fn().mockResolvedValue(250) });
    const result = await computePeerRating(client, 1n);
    expect(result.score).toBe(3750);
  });

  it('peer rating — no ratings defaults to 5000', async () => {
    const client = mockContractClient({ getAverageRating: vi.fn().mockResolvedValue(0) });
    const result = await computePeerRating(client, 1n);
    expect(result.score).toBe(5000);
  });

  it('uptime — healthy balance → 8000', async () => {
    const client = mockOKXClient({ getPortfolioBalance: vi.fn().mockResolvedValue(MOCK_BALANCE_HEALTHY) });
    const result = await computeUptime(client, WALLET, 196);
    expect(result.score).toBe(8000);
  });

  it('composite score weighted correctly', () => {
    const components = { tradePerformance: 8000, securityHygiene: 7000, peerRating: 9000, uptime: 6000 };
    const score = computeCompositeScore(components, DEFAULT_SCORING_WEIGHTS);
    expect(score).toBe(7600);
  });

  it('tier determination — 7000/50 → tier 2, 9000/10 → tier 1', () => {
    expect(determineTier(7000, 50, DEFAULT_SCORING_CONFIG)).toBe(2);
    expect(determineTier(9000, 10, DEFAULT_SCORING_CONFIG)).toBe(1);
  });
});
