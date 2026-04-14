import type { ContractClient } from '../utils/contract-client.js';
import type { TxResult } from '../types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('agent-registrar');

export async function registerAgentIfNeeded(
  contractClient: ContractClient,
  wallet: `0x${string}`,
  agentURI: string,
): Promise<{ agentId: bigint; alreadyRegistered: boolean }> {
  const registered = await contractClient.isRegistered(wallet);
  if (registered) {
    const agentId = await contractClient.getAgentByAddress(wallet);
    log.info('Agent already registered', { wallet, agentId: agentId.toString() });
    return { agentId, alreadyRegistered: true };
  }

  log.info('Registering new agent', { wallet, agentURI });
  const _tx: TxResult = await contractClient.registerAgent(agentURI);
  const agentId = await contractClient.getAgentByAddress(wallet);
  log.info('Agent registered', { agentId: agentId.toString() });
  return { agentId, alreadyRegistered: false };
}
