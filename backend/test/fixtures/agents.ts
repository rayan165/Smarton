import type { AgentConfig } from '../../src/types.js';

export const MOCK_AGENT_CONFIGS: AgentConfig[] = [
  { role: 'signal-provider', wallet: '0x0000000000000000000000000000000000000001', privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001', serviceType: 'signal', servicePrice: 10_000n, serviceDescription: 'Trading signals', minBuyerTier: 1, cycleIntervalMs: 60_000 },
  { role: 'security-scanner', wallet: '0x0000000000000000000000000000000000000002', privateKey: '0x0000000000000000000000000000000000000000000000000000000000000002', serviceType: 'security-scan', servicePrice: 20_000n, serviceDescription: 'Security scans', minBuyerTier: 1, cycleIntervalMs: 60_000 },
  { role: 'trade-executor', wallet: '0x0000000000000000000000000000000000000003', privateKey: '0x0000000000000000000000000000000000000000000000000000000000000003', serviceType: 'execution', servicePrice: 50_000n, serviceDescription: 'Trade execution', minBuyerTier: 2, cycleIntervalMs: 60_000 },
  { role: 'analyst', wallet: '0x0000000000000000000000000000000000000004', privateKey: '0x0000000000000000000000000000000000000000000000000000000000000004', serviceType: 'analysis', servicePrice: 30_000n, serviceDescription: 'Token analysis', minBuyerTier: 1, cycleIntervalMs: 60_000 },
  { role: 'herald', wallet: '0x0000000000000000000000000000000000000005', privateKey: '0x0000000000000000000000000000000000000000000000000000000000000005', serviceType: null, servicePrice: 0n, serviceDescription: 'Ecosystem reporter', minBuyerTier: 0, cycleIntervalMs: 60_000 },
];
