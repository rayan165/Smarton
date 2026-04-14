import type { BaseAgent } from '../agents/base-agent.js';
import type { ScoringEngine } from '../scoring/index.js';
import type { CycleResult } from '../types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('cycle-runner');

export async function runMarketplaceCycle(
  agents: BaseAgent[],
  scoringEngine: ScoringEngine | null,
  cycleNumber: number,
): Promise<CycleResult> {
  log.info(`Cycle ${cycleNumber} starting`);

  const agentResults = [];
  for (const agent of agents) {
    try {
      const result = await agent.runCycle();
      agentResults.push(result);
    } catch (err) {
      log.error(`Agent ${agent.role} cycle failed`, { error: String(err) });
    }
  }

  if (scoringEngine) {
    const scorableAgents = agents
      .filter(a => a.agentId !== null)
      .map(a => ({ agentId: a.agentId!, wallet: a.wallet, tokens: [] as string[] }));
    try {
      await scoringEngine.scoreAllAgents(scorableAgents);
    } catch (err) {
      log.warn('Scoring cycle failed', { error: String(err) });
    }
  }

  const totalTx = agentResults.reduce((sum, r) => sum + r.transactionCount, 0);
  log.info(`Cycle ${cycleNumber} complete`, { agents: agentResults.length, transactions: totalTx });

  return {
    cycleNumber,
    timestamp: Date.now(),
    agentResults,
    totalOrders: agentResults.reduce((s, r) => s + r.ordersProcessed, 0),
    totalTransactions: totalTx,
    totalRevenue: agentResults.reduce((s, r) => s + r.revenueEarned, 0n),
  };
}
