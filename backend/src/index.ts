import { createOrchestrator, type Orchestrator } from './engine/index.js';
import type { TrustMeshConfig } from './types.js';

export function createTrustMesh(overrides?: Partial<TrustMeshConfig>): Orchestrator {
  return createOrchestrator(overrides);
}

export type { TrustMeshConfig, Orchestrator };
export * from './types.js';
