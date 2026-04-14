import type { ContractClient } from '../utils/contract-client.js';
import type { MarketplaceConfig, TxResult } from '../types.js';
import { listAgentService } from './service-lister.js';
import { purchaseAgentService } from './escrow-manager.js';
import { deliverAgentService } from './service-executor.js';
import { rateAgentService } from './rating-manager.js';
import { fileAgentDispute } from './dispute-handler.js';

export interface Marketplace {
  listService: (serviceType: string, description: string, price: bigint, minTier: number) => Promise<TxResult>;
  purchaseService: (serviceId: bigint, price: bigint, registryAddress: `0x${string}`) => Promise<TxResult>;
  deliverService: (orderId: bigint, data: unknown) => Promise<string>;
  rateService: (orderId: bigint, rating: number) => Promise<void>;
  fileDispute: (orderId: bigint) => Promise<void>;
}

export function createMarketplace(config: MarketplaceConfig, contractClient: ContractClient): Marketplace {
  return {
    listService: (type, desc, price, tier) => listAgentService(contractClient, type, desc, price, tier),
    purchaseService: (id, price, addr) => purchaseAgentService(contractClient, id, price, addr),
    deliverService: (id, data) => deliverAgentService(contractClient, id, data),
    rateService: (id, rating) => rateAgentService(contractClient, id, rating),
    fileDispute: (id) => fileAgentDispute(contractClient, id),
  };
}
