import type { OKXClient } from '../utils/okx-client.js';
import type { ContractClient } from '../utils/contract-client.js';
import type { Marketplace } from '../marketplace/index.js';
import type { AgentConfig } from '../types.js';
import type { BaseAgent } from './base-agent.js';
import { createSignalProvider } from './signal-provider.js';
import { createSecurityScanner } from './security-scanner.js';
import { createTradeExecutor } from './trade-executor.js';
import { createAnalyst } from './analyst.js';
import { createHerald } from './herald.js';

export function createAllAgents(
  okxClient: OKXClient,
  contractClient: ContractClient,
  marketplace: Marketplace,
  configOverrides?: Partial<AgentConfig>,
): BaseAgent[] {
  return [
    createSignalProvider(okxClient, contractClient, marketplace, configOverrides),
    createSecurityScanner(okxClient, contractClient, marketplace, configOverrides),
    createTradeExecutor(okxClient, contractClient, marketplace, configOverrides),
    createAnalyst(okxClient, contractClient, marketplace, configOverrides),
    createHerald(okxClient, contractClient, marketplace, configOverrides),
  ];
}

export type { BaseAgent } from './base-agent.js';
