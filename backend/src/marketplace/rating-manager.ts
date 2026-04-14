import type { ContractClient } from '../utils/contract-client.js';

export async function rateAgentService(
  contractClient: ContractClient,
  orderId: bigint,
  rating: number,
): Promise<void> {
  await contractClient.confirmAndRate(orderId, rating);
}
