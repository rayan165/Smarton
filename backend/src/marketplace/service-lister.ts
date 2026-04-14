import type { ContractClient } from '../utils/contract-client.js';
import type { TxResult } from '../types.js';

export async function listAgentService(
  contractClient: ContractClient,
  serviceType: string,
  description: string,
  price: bigint,
  minTier: number,
): Promise<TxResult> {
  return contractClient.listService(serviceType, description, price, minTier);
}
