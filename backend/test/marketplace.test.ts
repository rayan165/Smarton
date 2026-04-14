import { describe, it, expect, vi } from 'vitest';
import { createMarketplace } from '../src/marketplace/index.js';
import type { ContractClient } from '../src/utils/contract-client.js';

function mockCC(overrides: Partial<ContractClient> = {}): ContractClient {
  const txResult = { hash: '0xabc' as `0x${string}`, blockNumber: 1n, gasUsed: 21000n, status: 'success' as const };
  return {
    registerAgent: vi.fn().mockResolvedValue(txResult),
    getAgentInfo: vi.fn(), getAgentTier: vi.fn().mockResolvedValue(1),
    getAgentByAddress: vi.fn().mockResolvedValue(1n),
    isRegistered: vi.fn().mockResolvedValue(true),
    totalAgents: vi.fn().mockResolvedValue(1n),
    updateLastActive: vi.fn().mockResolvedValue(txResult),
    updateScore: vi.fn().mockResolvedValue(txResult),
    getScore: vi.fn(), getOverallScore: vi.fn().mockResolvedValue(5000),
    checkTier: vi.fn().mockResolvedValue(true),
    listService: vi.fn().mockResolvedValue(txResult),
    purchaseService: vi.fn().mockResolvedValue(txResult),
    deliverService: vi.fn().mockResolvedValue(txResult),
    confirmAndRate: vi.fn().mockResolvedValue(txResult),
    fileDispute: vi.fn().mockResolvedValue(txResult),
    getActiveServices: vi.fn().mockResolvedValue([]),
    getService: vi.fn(), getOrder: vi.fn(),
    getAverageRating: vi.fn().mockResolvedValue(0),
    totalServices: vi.fn().mockResolvedValue(0n),
    totalOrders: vi.fn().mockResolvedValue(0n),
    approveUSDC: vi.fn().mockResolvedValue(txResult),
    balanceOfUSDC: vi.fn().mockResolvedValue(0n),
    getTreasuryBalance: vi.fn().mockResolvedValue(0n),
    ...overrides,
  };
}

describe('Marketplace', () => {
  it('lists a service', async () => {
    const cc = mockCC();
    const mp = createMarketplace({ protocolFeeBps: 200, ratingIncentive: 1000n, disputeWindowSec: 3600, cycleIntervalMs: 60000 }, cc);
    await mp.listService('signal', 'Signals', 10000n, 1);
    expect(cc.listService).toHaveBeenCalledWith('signal', 'Signals', 10000n, 1);
  });

  it('purchases a service with approval', async () => {
    const cc = mockCC();
    const mp = createMarketplace({ protocolFeeBps: 200, ratingIncentive: 1000n, disputeWindowSec: 3600, cycleIntervalMs: 60000 }, cc);
    await mp.purchaseService(1n, 10000n, '0xregistry' as `0x${string}`);
    expect(cc.approveUSDC).toHaveBeenCalled();
    expect(cc.purchaseService).toHaveBeenCalledWith(1n);
  });

  it('delivers a service', async () => {
    const cc = mockCC();
    const mp = createMarketplace({ protocolFeeBps: 200, ratingIncentive: 1000n, disputeWindowSec: 3600, cycleIntervalMs: 60000 }, cc);
    const hash = await mp.deliverService(1n, { data: 'test' });
    expect(cc.deliverService).toHaveBeenCalled();
    expect(hash).toBeTruthy();
  });

  it('rates a service', async () => {
    const cc = mockCC();
    const mp = createMarketplace({ protocolFeeBps: 200, ratingIncentive: 1000n, disputeWindowSec: 3600, cycleIntervalMs: 60000 }, cc);
    await mp.rateService(1n, 4);
    expect(cc.confirmAndRate).toHaveBeenCalledWith(1n, 4);
  });

  it('files a dispute', async () => {
    const cc = mockCC();
    const mp = createMarketplace({ protocolFeeBps: 200, ratingIncentive: 1000n, disputeWindowSec: 3600, cycleIntervalMs: 60000 }, cc);
    await mp.fileDispute(1n);
    expect(cc.fileDispute).toHaveBeenCalledWith(1n);
  });
});
