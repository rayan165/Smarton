import { describe, it, expect, vi } from 'vitest';
import { createSignalProvider } from '../src/agents/signal-provider.js';
import { createSecurityScanner } from '../src/agents/security-scanner.js';
import { createTradeExecutor } from '../src/agents/trade-executor.js';
import { createAnalyst } from '../src/agents/analyst.js';
import { createHerald } from '../src/agents/herald.js';
import type { OKXClient } from '../src/utils/okx-client.js';
import type { ContractClient } from '../src/utils/contract-client.js';
import type { Marketplace } from '../src/marketplace/index.js';

function mockOKX(): OKXClient {
  return {
    getSignals: vi.fn().mockResolvedValue([]),
    getTokenSecurity: vi.fn().mockResolvedValue({ riskLevel: 'low', isHoneypot: false }),
    getTokenPrice: vi.fn().mockResolvedValue({ price: '1.00' }),
    getTokenDetail: vi.fn().mockResolvedValue({ tokenSymbol: 'USDC' }),
    getSwapQuote: vi.fn().mockResolvedValue({ routerResult: { toTokenAmount: '999000', estimatedGas: '200000' }, tx: {} }),
    getPortfolioBalance: vi.fn().mockResolvedValue([]),
    getCandles: vi.fn().mockResolvedValue([]),
    getTokenRanking: vi.fn().mockResolvedValue([
      { tokenContractAddress: '0x1', tokenSymbol: 'HOT', price: '0.01', volume24h: '5000000', priceChange24h: '15', marketCap: '10000000' },
    ]),
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

describe('Agents', () => {
  it('signal provider scans tokens', async () => {
    const agent = createSignalProvider(mockOKX(), mockCC(), mockMP());
    const result = await agent.runCycle();
    expect(result.agentRole).toBe('signal-provider');
    expect(result.actions.length).toBeGreaterThan(0);
  });

  it('security scanner performs scan', async () => {
    const agent = createSecurityScanner(mockOKX(), mockCC(), mockMP());
    const result = await agent.runCycle();
    expect(result.agentRole).toBe('security-scanner');
    expect(result.actions[0].type).toBe('scan');
  });

  it('trade executor gets quote', async () => {
    const agent = createTradeExecutor(mockOKX(), mockCC(), mockMP());
    const result = await agent.runCycle();
    expect(result.agentRole).toBe('trade-executor');
    expect(result.actions[0].type).toBe('trade');
  });

  it('analyst produces report', async () => {
    const agent = createAnalyst(mockOKX(), mockCC(), mockMP());
    const result = await agent.runCycle();
    expect(result.agentRole).toBe('analyst');
    expect(result.actions[0].details).toContain('USDC');
  });

  it('herald generates ecosystem report', async () => {
    const agent = createHerald(mockOKX(), mockCC(), mockMP());
    const result = await agent.runCycle();
    expect(result.agentRole).toBe('herald');
    expect(result.actions[0].type).toBe('post_report');
  });
});
