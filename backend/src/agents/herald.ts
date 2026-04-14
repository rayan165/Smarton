import type { AgentConfig, AgentAction, HeraldReport } from '../types.js';
import type { OKXClient } from '../utils/okx-client.js';
import type { ContractClient } from '../utils/contract-client.js';
import type { Marketplace } from '../marketplace/index.js';
import { createBaseAgent, type BaseAgent } from './base-agent.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('herald');

const HERALD_CONFIG: AgentConfig = {
  role: 'herald',
  wallet: '0x0000000000000000000000000000000000000005',
  privateKey: '0x0000000000000000000000000000000000000000000000000000000000000005',
  serviceType: null,
  servicePrice: 0n,
  serviceDescription: 'TrustMesh ecosystem reporter',
  minBuyerTier: 0,
  cycleIntervalMs: 60_000,
};

export function createHerald(
  okxClient: OKXClient,
  contractClient: ContractClient,
  marketplace: Marketplace,
  configOverrides?: Partial<AgentConfig>,
): BaseAgent {
  const config = { ...HERALD_CONFIG, ...configOverrides };

  return createBaseAgent(config, okxClient, contractClient, marketplace, async () => {
    const actions: AgentAction[] = [];
    try {
      const totalAgents = await contractClient.totalAgents();
      const totalOrders = await contractClient.totalOrders();
      const totalServices = await contractClient.totalServices();

      const report: HeraldReport = {
        content: `=== TrustMesh Ecosystem Report ===\nAgents: ${totalAgents}\nServices: ${totalServices}\nOrders: ${totalOrders}\n`,
        timestamp: Date.now(),
        type: 'hourly_report',
        data: {
          agentCount: Number(totalAgents),
          topAgent: null,
          orderCount: Number(totalOrders),
          volumeUSDC: 0n,
        },
      };

      log.info(report.content);
      actions.push({ type: 'post_report', txHash: null, details: report.content, timestamp: Date.now() });
    } catch {
      actions.push({ type: 'post_report', txHash: null, details: 'Herald report failed', timestamp: Date.now() });
    }
    return actions;
  });
}
