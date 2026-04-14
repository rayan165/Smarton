import type { ScoringConfig, TrustScore } from '../types.js';
import type { OKXClient } from '../utils/okx-client.js';
import type { ContractClient } from '../utils/contract-client.js';
import { runScoringCycle } from './composite-scorer.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('scoring-engine');

export interface ScoringEngine {
  scoreAgent: (agentId: bigint, wallet: `0x${string}`, tokens: string[]) => Promise<TrustScore>;
  scoreAllAgents: (agents: Array<{ agentId: bigint; wallet: `0x${string}`; tokens: string[] }>) => Promise<void>;
}

export function createScoringEngine(
  config: ScoringConfig,
  okxClient: OKXClient,
  contractClient: ContractClient,
): ScoringEngine {
  return {
    async scoreAgent(agentId, wallet, tokens) {
      return runScoringCycle(config, okxClient, contractClient, agentId, wallet, tokens);
    },

    async scoreAllAgents(agents) {
      for (const agent of agents) {
        try {
          await runScoringCycle(config, okxClient, contractClient, agent.agentId, agent.wallet, agent.tokens);
        } catch (err) {
          log.error('Failed to score agent', { agentId: agent.agentId.toString(), error: String(err) });
        }
      }
    },
  };
}

export { computeCompositeScore, determineTier } from './composite-scorer.js';
export { computeTradePerformance } from './trade-performance.js';
export { computeSecurityHygiene } from './security-hygiene.js';
export { computePeerRating } from './peer-ratings.js';
export { computeUptime } from './uptime-tracker.js';
