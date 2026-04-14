import type { AgentRole, AgentConfig, AgentCycleResult, AgentAction } from '../types.js';
import type { OKXClient } from '../utils/okx-client.js';
import type { ContractClient } from '../utils/contract-client.js';
import type { Marketplace } from '../marketplace/index.js';
import { createLogger } from '../utils/logger.js';

export interface BaseAgent {
  role: AgentRole;
  wallet: `0x${string}`;
  agentId: bigint | null;
  register: () => Promise<void>;
  listService: () => Promise<void>;
  runCycle: () => Promise<AgentCycleResult>;
  stop: () => void;
}

export function createBaseAgent(
  agentConfig: AgentConfig,
  okxClient: OKXClient,
  contractClient: ContractClient,
  marketplace: Marketplace,
  cycleHandler: (agent: BaseAgent, okxClient: OKXClient, contractClient: ContractClient, marketplace: Marketplace) => Promise<AgentAction[]>,
): BaseAgent {
  const log = createLogger(agentConfig.role);
  let agentId: bigint | null = null;
  let running = true;

  const agent: BaseAgent = {
    role: agentConfig.role,
    wallet: agentConfig.wallet,
    get agentId() { return agentId; },

    async register(): Promise<void> {
      const registered = await contractClient.isRegistered(agentConfig.wallet);
      if (registered) {
        agentId = await contractClient.getAgentByAddress(agentConfig.wallet);
        log.info('Already registered', { agentId: agentId.toString() });
      } else {
        await contractClient.registerAgent(agentConfig.serviceDescription);
        agentId = await contractClient.getAgentByAddress(agentConfig.wallet);
        log.info('Registered', { agentId: agentId.toString() });
      }
    },

    async listService(): Promise<void> {
      if (agentConfig.serviceType === null) return;
      await marketplace.listService(
        agentConfig.serviceType,
        agentConfig.serviceDescription,
        agentConfig.servicePrice,
        agentConfig.minBuyerTier,
      );
      log.info('Service listed', { type: agentConfig.serviceType, price: agentConfig.servicePrice.toString() });
    },

    async runCycle(): Promise<AgentCycleResult> {
      if (!running) {
        return { agentRole: agentConfig.role, timestamp: Date.now(), actions: [], ordersProcessed: 0, revenueEarned: 0n, transactionCount: 0 };
      }
      const actions = await cycleHandler(agent, okxClient, contractClient, marketplace);
      return {
        agentRole: agentConfig.role,
        timestamp: Date.now(),
        actions,
        ordersProcessed: actions.filter(a => a.type === 'deliver_service').length,
        revenueEarned: 0n,
        transactionCount: actions.length,
      };
    },

    stop(): void {
      running = false;
    },
  };

  return agent;
}
