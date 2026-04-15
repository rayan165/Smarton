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
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const PURPLE = '\x1b[35m';

function progressBar(value: number, max: number, width: number): string {
  const filled = Math.round((value / max) * width);
  return GREEN + '\u2588'.repeat(filled) + DIM + '\u2591'.repeat(width - filled) + RESET;
}

function printLeaderboard(cycle: number): void {
  console.log(`\n${BOLD}${CYAN}\u2550\u2550\u2550 Smarton Cycle ${cycle} \u2550\u2550\u2550${RESET}\n`);
  console.log(`${BOLD}  # Agent           Tier       Score     Orders  Rating${RESET}`);
  console.log(`${DIM}  ${'\u2500'.repeat(58)}${RESET}`);

  const sorted = [...DEMO_AGENTS].sort((a, b) => b.score.overall - a.score.overall);
  sorted.forEach((agent, i) => {
    const tier = `${TIER_COLORS[agent.tier]}${TIER_NAMES[agent.tier]}${RESET}`;
    const bar = progressBar(agent.score.overall, 10000, 15);
    const scoreStr = (agent.score.overall / 100).toFixed(2);
    const ratingStr = agent.averageRating > 0 ? `${agent.averageRating.toFixed(1)}\u2605` : '  -';
    console.log(`  ${i + 1} ${agent.name.padEnd(16)} ${tier.padEnd(20)} ${bar} ${scoreStr.padStart(6)} ${String(agent.completedOrders).padStart(6)}  ${ratingStr}`);
  });
}

function printStaking(): void {
  console.log(`\n  ${BOLD}${PURPLE}\uD83D\uDD12 Staking:${RESET}`);
  const totalStaked = DEMO_AGENTS.reduce((sum, a) => sum + a.staking.stakedUSDC, 0);

  for (const agent of DEMO_AGENTS) {
    if (agent.staking.stakedUSDC > 0) {
      console.log(`  ${agent.name.padEnd(16)} staked ${agent.staking.stakedUSDC.toFixed(2).padStart(6)} USDC  (${agent.staking.multiplier} multiplier)`);
    }
  }
  console.log(`  ${DIM}Total protocol stake: $${totalStaked.toFixed(2)} USDC${RESET}`);
}

function printSybilMonitor(): void {
  console.log(`\n  ${BOLD}${CYAN}\uD83D\uDEE1\uFE0F  Sybil Monitor:${RESET}`);

  for (const agent of DEMO_AGENTS) {
    const pct = agent.sybil.diversityPct;
    if (pct === null) {
      console.log(`  ${agent.name.padEnd(16)} diversity: N/A (no trades)`);
      continue;
    }
    const barWidth = 10;
    const filled = Math.round((pct / 100) * barWidth);
    const bar = GREEN + '\u2588'.repeat(filled) + DIM + '\u2591'.repeat(barWidth - filled) + RESET;

    let riskStr: string;
    if (agent.sybil.riskLevel === 'low') {
      riskStr = `${GREEN}LOW RISK${RESET}`;
    } else if (agent.sybil.riskLevel === 'medium') {
      const patternStr = agent.sybil.patterns.length > 0 ? ` \u2014 ${agent.sybil.patterns.join(', ')}` : '';
      riskStr = `${YELLOW}\u26A0\uFE0F  MEDIUM${patternStr}${RESET}`;
    } else {
      riskStr = `\x1b[31mHIGH RISK${RESET}`;
    }
    console.log(`  ${agent.name.padEnd(16)} diversity: ${String(pct).padStart(2)}% ${bar} ${riskStr}`);
  }
}

function printCycleResults(results: readonly AgentCycleResult[]): void {
  console.log(`\n${DIM}  Activity:${RESET}`);
  for (const r of results) {
    for (const a of r.actions) {
      console.log(`  ${DIM}[${r.agentRole}]${RESET} ${a.details}`);
    }
  }
}

export async function createDemoSmarton(demoConfig?: Partial<DemoConfig>): Promise<void> {
  const config: DemoConfig = {
    cycleCount: demoConfig?.cycleCount ?? 3,
    cycleDelayMs: demoConfig?.cycleDelayMs ?? 2000,
    prettyOutput: demoConfig?.prettyOutput ?? true,
  };

  console.log(`${BOLD}${CYAN}`);
  console.log('  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2557   \u2588\u2588\u2557');
  console.log('  \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551');
  console.log('  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2554\u2588\u2588\u2557 \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2588\u2588\u2557 \u2588\u2588\u2551');
  console.log('  \u255A\u2550\u2550\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557   \u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2557\u2588\u2588\u2551');
  console.log('  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551 \u255A\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551   \u2588\u2588\u2551   \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551 \u255A\u2588\u2588\u2588\u2588\u2551');
  console.log('  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D   \u255A\u2550\u255D    \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u2550\u2550\u255D');
  console.log(`${RESET}`);
  console.log(`${DIM}  Demo Mode \u2014 ${config.cycleCount} cycles | Staking \u00B7 Sybil-Proof \u00B7 Open Oracle${RESET}\n`);

  const okxClient = createMockOKXClient();
  const contractClient = createMockContractClient();
  const marketplace = createMarketplace(DEFAULT_MARKETPLACE_CONFIG, contractClient);
  const agents = createAllAgents(okxClient, contractClient, marketplace);

  void DEMO_SERVICE_TYPES;

  console.log(`${DIM}  Registering ${agents.length} agents...${RESET}`);
  for (const agent of agents) {
    await agent.register();
  }

  console.log(`${DIM}  Listing ${DEMO_SERVICE_TYPES.length} services...${RESET}`);
  for (const agent of agents) {
    await agent.listService();
  }

  for (let i = 1; i <= config.cycleCount; i++) {
    printLeaderboard(i);

    const result = await runMarketplaceCycle(agents, null, i);
    printCycleResults(result.agentResults);

    printStaking();
    printSybilMonitor();

    if (i < config.cycleCount) {
      await new Promise(r => setTimeout(r, config.cycleDelayMs));
    }
  }

  console.log(`\n${BOLD}${CYAN}\u2550\u2550\u2550 Demo Complete \u2550\u2550\u2550${RESET}\n`);
}
