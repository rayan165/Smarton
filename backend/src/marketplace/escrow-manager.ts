import type { ContractClient } from '../utils/contract-client.js';
import type { TxResult } from '../types.js';

export async function purchaseAgentService(
  contractClient: ContractClient,
  serviceId: bigint,
  servicePrice: bigint,
  serviceRegistryAddress: `0x${string}`,
): Promise<TxResult> {
  await contractClient.approveUSDC(serviceRegistryAddress, servicePrice);
  return contractClient.purchaseService(serviceId);
}
