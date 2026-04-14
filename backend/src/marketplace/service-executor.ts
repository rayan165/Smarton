import type { ContractClient } from '../utils/contract-client.js';
import { keccak256, toBytes } from 'viem';

export async function deliverAgentService(
  contractClient: ContractClient,
  orderId: bigint,
  deliveryData: unknown,
): Promise<string> {
  const json = JSON.stringify(deliveryData);
  const hash = keccak256(toBytes(json));
  await contractClient.deliverService(orderId, hash);
  return hash;
}
