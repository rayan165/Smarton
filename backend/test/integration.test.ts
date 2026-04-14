import { describe, it, expect, vi } from 'vitest';
import { createAllAgents } from '../src/agents/index.js';
import { runMarketplaceCycle } from '../src/engine/cycle-runner.js';
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
    registerAgent: vi.fn().mockResolvedValue(tx), getAgentInfo: vi.fn(),
    getAgentTier: vi.fn().mockResolvedValue(1), getAgentByAddress: vi.fn().mockResolvedValue(1n),
    isRegistered: vi.fn().mockResolvedValue(false), totalAgents: vi.fn().mockResolvedValue(5n),
    updateLastActive: vi.fn().mockResolvedValue(tx), updateScore: vi.fn().mockResolvedValue(tx),
    getScore: vi.fn(), getOverallScore: vi.fn().mockResolvedValue(5000),
    checkTier: vi.fn().mockResolvedValue(true),
    listService: vi.fn().mockResolvedValue(tx), purchaseService: vi.fn().mockResolvedValue(tx),
    deliverService: vi.fn().mockResolvedValue(tx), confirmAndRate: vi.fn().mockResolvedValue(tx),
    fileDispute: vi.fn().mockResolvedValue(tx),
    getActiveServices: vi.fn().mockResolvedValue([]), getService: vi.fn(), getOrder: vi.fn(),
    getAverageRating: vi.fn().mockResolvedValue(0),
    totalServices: vi.fn().mockResolvedValue(4n), totalOrders: vi.fn().mockResolvedValue(10n),
    approveUSDC: vi.fn().mockResolvedValue(tx), balanceOfUSDC: vi.fn().mockResolvedValue(0n),
    getTreasuryBalance: vi.fn().mockResolvedValue(0n),
    stakeUSDC: vi.fn().mockResolvedValue(tx), unstakeUSDC: vi.fn().mockResolvedValue(tx),
    getStakeInfo: vi.fn().mockResolvedValue({ stakedAmount: 0n, multiplier: 10000, stakedAt: 0n, lastSlashedAt: 0n }),
    getTotalStaked: vi.fn().mockResolvedValue(0n), isStaked: vi.fn().mockResolvedValue(false),
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
});
