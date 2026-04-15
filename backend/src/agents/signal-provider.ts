import type { AgentConfig, AgentAction } from '../types.js';
import type { OKXClient } from '../utils/okx-client.js';
import type { ContractClient } from '../utils/contract-client.js';
import type { Marketplace } from '../marketplace/index.js';
import { createBaseAgent, type BaseAgent } from './base-agent.js';

const SIGNAL_CONFIG: AgentConfig = {
  role: 'signal-provider',
  wallet: '0x0000000000000000000000000000000000000001',
  privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
  serviceType: 'signal',
  servicePrice: 5_000n,
  serviceDescription: 'Alpha trading signals for X Layer tokens',
  minBuyerTier: 1,
  cycleIntervalMs: 60_000,
};

export function createSignalProvider(
  okxClient: OKXClient,
  contractClient: ContractClient,
  marketplace: Marketplace,
  configOverrides?: Partial<AgentConfig>,
): BaseAgent {
  const config = { ...SIGNAL_CONFIG, ...configOverrides };

  return createBaseAgent(config, okxClient, contractClient, marketplace, async (_agent, okx) => {
    const actions: AgentAction[] = [];
    try {
      const rankings = await okx.getTokenRanking(196, 'volume24h', 10);
      const topTokens = rankings.slice(0, 3);
      actions.push({
        type: 'scan',
        txHash: null,
        details: `Scanned ${topTokens.length} trending tokens: ${topTokens.map(t => t.tokenSymbol).join(', ')}`,
        timestamp: Date.now(),
      });
    } catch {
      actions.push({ type: 'scan', txHash: null, details: 'Signal scan failed', timestamp: Date.now() });
    }
    return actions;
  });
}
