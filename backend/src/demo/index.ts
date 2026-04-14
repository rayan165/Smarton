import type { DemoConfig, AgentCycleResult } from '../types.js';
import { DEMO_AGENTS, DEMO_SERVICE_TYPES } from './mock-data.js';
import { createMockOKXClient, createMockContractClient } from './mock-clients.js';
import { createMarketplace } from '../marketplace/index.js';
import { createAllAgents } from '../agents/index.js';
import { runMarketplaceCycle } from '../engine/cycle-runner.js';
import { DEFAULT_MARKETPLACE_CONFIG } from '../config.js';

const TIER_NAMES = ['', 'Registered', 'Proven', 'Trusted'];
const TIER_COLORS = ['', '\x1b[37m', '\x1b[33m', '\x1b[32m'];
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

function progressBar(value: number, max: number, width: number): string {
  const filled = Math.round((value / max) * width);
  return '\x1b[32m' + '\u2588'.repeat(filled) + DIM + '\u2591'.repeat(width - filled) + RESET;
}

function printLeaderboard(cycle: number): void {
  console.log(`\n${BOLD}${CYAN}═══ TrustMesh Cycle ${cycle} ═══${RESET}\n`);
  console.log(`${BOLD}  # Agent           Tier       Score     Orders  Rating${RESET}`);
  console.log(`${DIM}  ${'─'.repeat(58)}${RESET}`);

  const sorted = [...DEMO_AGENTS].sort((a, b) => b.score.overall - a.score.overall);
  sorted.forEach((agent, i) => {
    const tier = `${TIER_COLORS[agent.tier]}${TIER_NAMES[agent.tier]}${RESET}`;
    const bar = progressBar(agent.score.overall, 10000, 15);
    const scoreStr = (agent.score.overall / 100).toFixed(2);
    const ratingStr = agent.averageRating > 0 ? `${agent.averageRating.toFixed(1)}\u2605` : '  -';
    console.log(`  ${i + 1} ${agent.name.padEnd(16)} ${tier.padEnd(20)} ${bar} ${scoreStr.padStart(6)} ${String(agent.completedOrders).padStart(6)}  ${ratingStr}`);
  });
}

function printCycleResults(results: readonly AgentCycleResult[]): void {
  console.log(`\n${DIM}  Activity:${RESET}`);
  for (const r of results) {
    for (const a of r.actions) {
      console.log(`  ${DIM}[${r.agentRole}]${RESET} ${a.details}`);
    }
  }
}

/** Runs TrustMesh in demo mode with mock data and simulated cycles. */
export async function createDemoTrustMesh(demoConfig?: Partial<DemoConfig>): Promise<void> {
  const config: DemoConfig = {
    cycleCount: demoConfig?.cycleCount ?? 3,
    cycleDelayMs: demoConfig?.cycleDelayMs ?? 2000,
    prettyOutput: demoConfig?.prettyOutput ?? true,
  };

  console.log(`${BOLD}${CYAN}`);
  console.log('  ████████╗██████╗ ██╗   ██╗███████╗████████╗███╗   ███╗███████╗███████╗██╗  ██╗');
  console.log('  ╚══██╔══╝██╔══██╗██║   ██║██╔════╝╚══██╔══╝████╗ ████║██╔════╝██╔════╝██║  ██║');
  console.log('     ██║   ██████╔╝██║   ██║███████╗   ██║   ██╔████╔██║█████╗  ███████╗███████║');
  console.log('     ██║   ██╔══██╗██║   ██║╚════██║   ██║   ██║╚██╔╝██║██╔══╝  ╚════██║██╔══██║');
  console.log('     ██║   ██║  ██║╚██████╔╝███████║   ██║   ██║ ╚═╝ ██║███████╗███████║██║  ██║');
  console.log('     ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝');
  console.log(`${RESET}`);
  console.log(`${DIM}  Demo Mode — ${config.cycleCount} cycles${RESET}\n`);

  const okxClient = createMockOKXClient();
  const contractClient = createMockContractClient();
  const marketplace = createMarketplace(DEFAULT_MARKETPLACE_CONFIG, contractClient);
  const agents = createAllAgents(okxClient, contractClient, marketplace);

  // Suppress DEMO_SERVICE_TYPES unused lint — it's exported for external consumers
  void DEMO_SERVICE_TYPES;

  // Register agents
  console.log(`${DIM}  Registering ${agents.length} agents...${RESET}`);
  for (const agent of agents) {
    await agent.register();
  }

  // List services
  console.log(`${DIM}  Listing ${DEMO_SERVICE_TYPES.length} services...${RESET}`);
  for (const agent of agents) {
    await agent.listService();
  }

  // Run cycles
  for (let i = 1; i <= config.cycleCount; i++) {
    printLeaderboard(i);

    const result = await runMarketplaceCycle(agents, null, i);
    printCycleResults(result.agentResults);

    if (i < config.cycleCount) {
      await new Promise(r => setTimeout(r, config.cycleDelayMs));
    }
  }

  console.log(`\n${BOLD}${CYAN}═══ Demo Complete ═══${RESET}\n`);
}
