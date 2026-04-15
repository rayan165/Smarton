import type { AgentConfig, AgentAction } from '../types.js';
import type { OKXClient } from '../utils/okx-client.js';
import type { ContractClient } from '../utils/contract-client.js';
import type { Marketplace } from '../marketplace/index.js';
import { createBaseAgent, type BaseAgent } from './base-agent.js';

const SCANNER_CONFIG: AgentConfig = {
  role: 'security-scanner',
  wallet: '0x0000000000000000000000000000000000000002',
  privateKey: '0x0000000000000000000000000000000000000000000000000000000000000002',
  serviceType: 'security-scan',
  servicePrice: 5_000n,
  serviceDescription: 'Token security analysis and risk reports',
  minBuyerTier: 1,
  cycleIntervalMs: 60_000,
};

export function createSecurityScanner(
  okxClient: OKXClient,
  contractClient: ContractClient,
  marketplace: Marketplace,
  configOverrides?: Partial<AgentConfig>,
): BaseAgent {
  const config = { ...SCANNER_CONFIG, ...configOverrides };

  return createBaseAgent(config, okxClient, contractClient, marketplace, async (_agent, okx) => {
    const actions: AgentAction[] = [];
    try {
      const usdc = '0x74b7f16337b8972027f6196a17a631ac6de26d22';
      const security = await okx.getTokenSecurity(196, usdc);
      actions.push({
        type: 'scan',
        txHash: null,
        details: `Security scan: ${security ? `riskLevel=${security.riskLevel}` : 'no data'}`,
        timestamp: Date.now(),
      });
    } catch {
      actions.push({ type: 'scan', txHash: null, details: 'Security scan failed', timestamp: Date.now() });
    }
    return actions;
  });
}
