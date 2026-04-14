import type { ContractClient } from '../utils/contract-client.js';
import type { AgentTier } from '../types.js';

export async function getAgentTier(contractClient: ContractClient, agentId: bigint): Promise<AgentTier> {
  const tier = await contractClient.getAgentTier(agentId);
  return tier as AgentTier;
}

export function tierName(tier: AgentTier): string {
  switch (tier) {
    case 0: return 'Unregistered';
    case 1: return 'Registered';
    case 2: return 'Proven';
    case 3: return 'Trusted';
  }
}
