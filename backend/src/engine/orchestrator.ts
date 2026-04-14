import type { TrustMeshConfig, EngineState, MarketplaceStats } from '../types.js';
import { createConfig } from '../config.js';
import { createOKXClient } from '../utils/okx-client.js';
import { createContractClient } from '../utils/contract-client.js';
import { createMarketplace } from '../marketplace/index.js';
import { createScoringEngine, type ScoringEngine } from '../scoring/index.js';
import { createAllAgents, type BaseAgent } from '../agents/index.js';
import { runMarketplaceCycle } from './cycle-runner.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('orchestrator');

export interface Orchestrator {
  start: () => Promise<void>;
  stop: () => void;
  getState: () => EngineState;
  runOneCycle: () => Promise<void>;
}

export function createOrchestrator(configOverrides?: Partial<TrustMeshConfig>): Orchestrator {
  const config = createConfig(configOverrides);
  const okxClient = createOKXClient(config.okx);
  const contractClient = createContractClient(config.xlayer, config.contracts, process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` ?? '0x01');
  const marketplace = createMarketplace(config.marketplace, contractClient);
  const scoringEngine: ScoringEngine = createScoringEngine(config.scoring, okxClient, contractClient);
  const agents: BaseAgent[] = createAllAgents(okxClient, contractClient, marketplace);

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let cycleCount = 0;
  let startedAt: number | null = null;

  const emptyStats: MarketplaceStats = {
    totalServices: 0, activeServices: 0, totalOrders: 0, completedOrders: 0,
    totalVolumeUSDC: 0n, averageRating: 0, activeAgents: agents.length, totalStaked: 0n,
  };

  return {
    async start(): Promise<void> {
      log.info('Starting TrustMesh engine');
      startedAt = Date.now();

      for (const agent of agents) {
        await agent.register();
        await agent.listService();
      }

      intervalId = setInterval(async () => {
        cycleCount++;
        await runMarketplaceCycle(agents, scoringEngine, cycleCount);
      }, config.marketplace.cycleIntervalMs);

      // Run first cycle immediately
      cycleCount++;
      await runMarketplaceCycle(agents, scoringEngine, cycleCount);
    },

    stop(): void {
      if (intervalId) clearInterval(intervalId);
      agents.forEach(a => a.stop());
      log.info('Engine stopped', { totalCycles: cycleCount });
    },

    getState(): EngineState {
      return {
        running: intervalId !== null,
        startedAt,
        totalCycles: cycleCount,
        agents: agents.map(a => ({
          role: a.role,
          agentId: a.agentId ?? 0n,
          wallet: a.wallet,
          tier: 1 as const,
          trustScore: 5000,
          lastCycle: Date.now(),
          ordersCompleted: 0,
          totalRevenue: 0n,
          stakedAmount: 0n,
        })),
        marketplace: emptyStats,
      };
    },

    async runOneCycle(): Promise<void> {
      cycleCount++;
      await runMarketplaceCycle(agents, scoringEngine, cycleCount);
    },
  };
}
