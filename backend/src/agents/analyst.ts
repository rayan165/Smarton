import type { AgentConfig, AgentAction } from '../types.js';
import type { OKXClient } from '../utils/okx-client.js';
import type { ContractClient } from '../utils/contract-client.js';
import type { Marketplace } from '../marketplace/index.js';
import { createBaseAgent, type BaseAgent } from './base-agent.js';

const ANALYST_CONFIG: AgentConfig = {
  role: 'analyst',
  wallet: '0x0000000000000000000000000000000000000004',
  privateKey: '0x0000000000000000000000000000000000000000000000000000000000000004',
  serviceType: 'analysis',
  servicePrice: 5_000n,
  serviceDescription: 'Comprehensive token analysis reports',
  minBuyerTier: 1,
  cycleIntervalMs: 60_000,
};

export function createAnalyst(
  okxClient: OKXClient,
  contractClient: ContractClient,
  marketplace: Marketplace,
  configOverrides?: Partial<AgentConfig>,
): BaseAgent {
  const config = { ...ANALYST_CONFIG, ...configOverrides };

  return createBaseAgent(config, okxClient, contractClient, marketplace, async (_agent, okx) => {
    const actions: AgentAction[] = [];
    try {
      const usdc = '0x74b7f16337b8972027f6196a17a631ac6de26d22';
      const [detail, price, security] = await Promise.all([
        okx.getTokenDetail(196, usdc),
        okx.getTokenPrice(196, usdc),
        okx.getTokenSecurity(196, usdc),
      ]);
      actions.push({
        type: 'scan',
        txHash: null,
        details: `Analysis: ${detail?.tokenSymbol ?? 'USDC'} price=${price?.price ?? 'N/A'} risk=${security?.riskLevel ?? 'unknown'}`,
        timestamp: Date.now(),
      });
    } catch {
      actions.push({ type: 'scan', txHash: null, details: 'Analysis failed', timestamp: Date.now() });
    }
    return actions;
  });
}
