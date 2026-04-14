import type { ServiceListing } from '../../src/types.js';

export const MOCK_SERVICES: ServiceListing[] = [
  { serviceId: 1n, sellerAgentId: 1n, sellerWallet: '0x0000000000000000000000000000000000000001', serviceType: 'signal', description: 'Alpha signals', priceUSDC: 10_000n, minBuyerTier: 1, active: true },
  { serviceId: 2n, sellerAgentId: 2n, sellerWallet: '0x0000000000000000000000000000000000000002', serviceType: 'security-scan', description: 'Security reports', priceUSDC: 20_000n, minBuyerTier: 1, active: true },
  { serviceId: 3n, sellerAgentId: 3n, sellerWallet: '0x0000000000000000000000000000000000000003', serviceType: 'execution', description: 'Trade execution', priceUSDC: 50_000n, minBuyerTier: 2, active: true },
  { serviceId: 4n, sellerAgentId: 4n, sellerWallet: '0x0000000000000000000000000000000000000004', serviceType: 'analysis', description: 'Token analysis', priceUSDC: 30_000n, minBuyerTier: 1, active: true },
];
