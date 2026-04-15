import { createOrchestrator, type Orchestrator } from './engine/index.js';
import type { SmartonConfig } from './types.js';

export function createSmarton(overrides?: Partial<SmartonConfig>): Orchestrator {
  return createOrchestrator(overrides);
}

export type { SmartonConfig, Orchestrator };
export * from './types.js';
