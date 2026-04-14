import { describe, it, expect, vi } from 'vitest';
import { registerAgentIfNeeded } from '../src/identity/agent-registrar.js';
import type { ContractClient } from '../src/utils/contract-client.js';

function createMockContractClient(overrides: Partial<ContractClient> = {}): ContractClient {
  return {
    registerAgent: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    getAgentInfo: vi.fn().mockResolvedValue({ owner: '0x1', tier: 1, registeredAt: 0n, lastActive: 0n, agentURI: 'test' }),
    getAgentTier: vi.fn().mockResolvedValue(1),
    getAgentByAddress: vi.fn().mockResolvedValue(1n),
    isRegistered: vi.fn().mockResolvedValue(false),
    totalAgents: vi.fn().mockResolvedValue(1n),
    updateLastActive: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    updateScore: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    getScore: vi.fn().mockResolvedValue({ overall: 5000, tradePerformance: 5000, securityHygiene: 5000, peerRating: 5000, uptime: 5000, lastUpdated: 0n, totalInteractions: 0 }),
    getOverallScore: vi.fn().mockResolvedValue(5000),
    checkTier: vi.fn().mockResolvedValue(true),
    listService: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    purchaseService: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    deliverService: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    confirmAndRate: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    fileDispute: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    getActiveServices: vi.fn().mockResolvedValue([]),
    getService: vi.fn().mockResolvedValue(null),
    getOrder: vi.fn().mockResolvedValue(null),
    getAverageRating: vi.fn().mockResolvedValue(0),
    totalServices: vi.fn().mockResolvedValue(0n),
    totalOrders: vi.fn().mockResolvedValue(0n),
    approveUSDC: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    balanceOfUSDC: vi.fn().mockResolvedValue(0n),
    getTreasuryBalance: vi.fn().mockResolvedValue(0n),
    stakeUSDC: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    unstakeUSDC: vi.fn().mockResolvedValue({ hash: '0xabc', blockNumber: 1n, gasUsed: 21000n, status: 'success' }),
    getStakeInfo: vi.fn().mockResolvedValue({ stakedAmount: 0n, multiplier: 10000, stakedAt: 0n, lastSlashedAt: 0n }),
    getTotalStaked: vi.fn().mockResolvedValue(0n),
    isStaked: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe('Identity', () => {
  it('registers new agent', async () => {
    const client = createMockContractClient();
    const result = await registerAgentIfNeeded(client, '0x1234567890123456789012345678901234567890', 'test-uri');
    expect(client.registerAgent).toHaveBeenCalledWith('test-uri');
    expect(result.alreadyRegistered).toBe(false);
  });

  it('detects already registered', async () => {
    const client = createMockContractClient({
      isRegistered: vi.fn().mockResolvedValue(true),
    });
    const result = await registerAgentIfNeeded(client, '0x1234567890123456789012345678901234567890', 'test-uri');
    expect(client.registerAgent).not.toHaveBeenCalled();
    expect(result.alreadyRegistered).toBe(true);
  });

  it('gets agent info correctly', async () => {
    const mockInfo = { owner: '0xabc', tier: 2, registeredAt: 100n, lastActive: 200n, agentURI: 'my-agent' };
    const client = createMockContractClient({
      getAgentInfo: vi.fn().mockResolvedValue(mockInfo),
    });
    const info = await client.getAgentInfo(1n);
    expect(info.tier).toBe(2);
    expect(info.agentURI).toBe('my-agent');
  });
});
