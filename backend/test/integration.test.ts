import { describe, it, expect, vi, afterAll } from 'vitest';
import { createAllAgents } from '../src/agents/index.js';
import { runMarketplaceCycle } from '../src/engine/cycle-runner.js';
import { createTrustOracle } from '../src/api/trust-oracle.js';
import type { OKXClient } from '../src/utils/okx-client.js';
import type { ContractClient } from '../src/utils/contract-client.js';
import type { Marketplace } from '../src/marketplace/index.js';

function mockOKX(): OKXClient {
  return {
    getSignals: vi.fn().mockResolvedValue([]),
    getTokenSecurity: vi.fn().mockResolvedValue({ riskLevel: 'low', isHoneypot: false }),
    getTokenPrice: vi.fn().mockResolvedValue({ price: '1.00' }),
    getTokenDetail: vi.fn().mockResolvedValue({ tokenSymbol: 'USDC' }),
    getSwapQuote: vi.fn().mockResolvedValue({ routerResult: { toTokenAmount: '999', estimatedGas: '200000' }, tx: {} }),
    getPortfolioBalance: vi.fn().mockResolvedValue([]),
    getCandles: vi.fn().mockResolvedValue([]),
    getTokenRanking: vi.fn().mockResolvedValue([]),
  };
}

function mockCC(): ContractClient {
  const tx = { hash: '0xabc' as `0x${string}`, blockNumber: 1n, gasUsed: 21000n, status: 'success' as const };
  return {
    registerAgent: vi.fn().mockResolvedValue(tx), getAgentInfo: vi.fn().mockResolvedValue({ owner: '0x1', tier: 1, registeredAt: 0n, lastActive: 0n, agentURI: 'test' }),
    getAgentTier: vi.fn().mockResolvedValue(1), getAgentByAddress: vi.fn().mockResolvedValue(1n),
    isRegistered: vi.fn().mockResolvedValue(false), totalAgents: vi.fn().mockResolvedValue(5n),
    updateLastActive: vi.fn().mockResolvedValue(tx), updateScore: vi.fn().mockResolvedValue(tx),
    getScore: vi.fn().mockResolvedValue({ overall: 7500, tradePerformance: 8000, securityHygiene: 7000, peerRating: 9000, uptime: 6000, lastUpdated: 0n, totalInteractions: 10 }),
    getOverallScore: vi.fn().mockResolvedValue(7500),
    checkTier: vi.fn().mockResolvedValue(true),
    listService: vi.fn().mockResolvedValue(tx), purchaseService: vi.fn().mockResolvedValue(tx),
    deliverService: vi.fn().mockResolvedValue(tx), confirmAndRate: vi.fn().mockResolvedValue(tx),
    fileDispute: vi.fn().mockResolvedValue(tx),
    getActiveServices: vi.fn().mockResolvedValue([]), getService: vi.fn(), getOrder: vi.fn().mockResolvedValue(null),
    getAverageRating: vi.fn().mockResolvedValue(420),
    totalServices: vi.fn().mockResolvedValue(4n), totalOrders: vi.fn().mockResolvedValue(0n),
    approveUSDC: vi.fn().mockResolvedValue(tx), balanceOfUSDC: vi.fn().mockResolvedValue(0n),
    getTreasuryBalance: vi.fn().mockResolvedValue(0n),
    stakeUSDC: vi.fn().mockResolvedValue(tx), unstakeUSDC: vi.fn().mockResolvedValue(tx),
    getStakeInfo: vi.fn().mockResolvedValue({ stakedAmount: 10_000_000n, multiplier: 12000, stakedAt: 0n, lastSlashedAt: 0n }),
    getTotalStaked: vi.fn().mockResolvedValue(16_000_000n), isStaked: vi.fn().mockResolvedValue(true),
  };
}

function mockMP(): Marketplace {
  const tx = { hash: '0xabc' as `0x${string}`, blockNumber: 1n, gasUsed: 21000n, status: 'success' as const };
  return {
    listService: vi.fn().mockResolvedValue(tx),
    purchaseService: vi.fn().mockResolvedValue(tx),
    deliverService: vi.fn().mockResolvedValue('0xhash'),
    rateService: vi.fn(),
    fileDispute: vi.fn(),
  };
}

describe('Integration', () => {
  it('creates 5 agents', () => {
    const agents = createAllAgents(mockOKX(), mockCC(), mockMP());
    expect(agents.length).toBe(5);
  });

  it('cycle produces actions', async () => {
    const agents = createAllAgents(mockOKX(), mockCC(), mockMP());
    const result = await runMarketplaceCycle(agents, null, 1);
    expect(result.cycleNumber).toBe(1);
    expect(result.agentResults.length).toBe(5);
  });

  it('agents register successfully', async () => {
    const cc = mockCC();
    const agents = createAllAgents(mockOKX(), cc, mockMP());
    for (const agent of agents) {
      await agent.register();
    }
    expect(cc.registerAgent).toHaveBeenCalledTimes(5);
  });

  it('trust oracle returns agent profile', async () => {
    const cc = mockCC();
    cc.isRegistered = vi.fn().mockResolvedValue(true);
    const oracle = createTrustOracle(cc);
    const port = 39100 + Math.floor(Math.random() * 900);
    oracle.start(port);

    try {
      await new Promise(r => setTimeout(r, 100));
      const res = await fetch(`http://localhost:${port}/api/v1/trust/0x1234567890123456789012345678901234567890`);
      const data = await res.json();
      expect(data.registered).toBe(true);
      expect(data.trustScore).toBeDefined();
      expect(data.trustScore.overall).toBe(7500);
      expect(data.staking).toBeDefined();
      expect(data.staking.isStaked).toBe(true);
      expect(data.sybilRisk).toBeDefined();
      expect(data.queriedAt).toBeDefined();
    } finally {
      oracle.stop();
    }
  });

  it('trust oracle returns unregistered for unknown address', async () => {
    const cc = mockCC();
    cc.isRegistered = vi.fn().mockResolvedValue(false);
    const oracle = createTrustOracle(cc);
    const port = 39100 + Math.floor(Math.random() * 900);
    oracle.start(port);

    try {
      await new Promise(r => setTimeout(r, 100));
      const res = await fetch(`http://localhost:${port}/api/v1/trust/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`);
      const data = await res.json();
      expect(data.registered).toBe(false);
    } finally {
      oracle.stop();
    }
  });
});
