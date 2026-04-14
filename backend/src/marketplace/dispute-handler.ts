import type { ContractClient } from '../utils/contract-client.js';

export async function fileAgentDispute(
  contractClient: ContractClient,
  orderId: bigint,
): Promise<void> {
  await contractClient.fileDispute(orderId);
}
