import type { OKXClient } from '../utils/okx-client.js';
import type { ContractClient } from '../utils/contract-client.js';
import type { TxResult } from '../types.js';
import { DEMO_AGENTS } from './mock-data.js';

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(): Promise<void> {
  return delay(100 + Math.random() * 200);
}

function fakeTx(): TxResult {
  const hash = ('0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')) as `0x${string}`;
  return { hash, blockNumber: BigInt(Math.floor(Math.random() * 1000000)), gasUsed: 21000n, status: 'success' };
}

export function createMockOKXClient(): OKXClient {
  return {
    async getSignals() { await randomDelay(); return []; },
    async getTokenSecurity() {
      await randomDelay();
      return { isHoneypot: false, ownerIsRenounced: true, buyTax: '0', sellTax: '0', isProxy: false, hasMintFunction: false, riskLevel: 'low' as const };
    },
    async getTokenPrice() {
      await randomDelay();
      return { price: '1.00', priceChange24h: '0.1', volume24h: '5000000', timestamp: String(Date.now()) };
    },
    async getTokenDetail() {
      await randomDelay();
      return { tokenContractAddress: '0xusdc', tokenSymbol: 'USDC', tokenName: 'USD Coin', decimals: '6', totalSupply: '1000000000000', holderCount: '50000', marketCap: '1000000000' };
    },
    async getSwapQuote() {
      await randomDelay();
      return { routerResult: { toTokenAmount: '999000', estimatedGas: '200000' }, tx: { to: '0xrouter', data: '0x', value: '0', gasLimit: '250000' } };
    },
    async getPortfolioBalance() {
      await randomDelay();
      return [{ tokenContractAddress: '0xusdc', tokenSymbol: 'USDC', balance: '1000000000', balanceUsd: '1000' }];
    },
    async getCandles() { await randomDelay(); return []; },
    async getTokenRanking() {
      await randomDelay();
      return [
        { tokenContractAddress: '0xt1', tokenSymbol: 'HOT', price: '0.01', volume24h: '5000000', priceChange24h: '15.5', marketCap: '10000000' },
        { tokenContractAddress: '0xt2', tokenSymbol: 'FIRE', price: '0.05', volume24h: '3000000', priceChange24h: '8.2', marketCap: '5000000' },
        { tokenContractAddress: '0xt3', tokenSymbol: 'MOON', price: '0.001', volume24h: '2000000', priceChange24h: '-5.1', marketCap: '1000000' },
      ];
    },
  };
}

export function createMockContractClient(): ContractClient {
  const agents = new Map<bigint, { tier: number; uri: string; wallet: string }>();
  const scores = new Map<bigint, { overall: number; t: number; s: number; p: number; u: number }>();
  let nextAgentId = 1n;
  let nextServiceId = 1n;
  let nextOrderId = 1n;

  // Pre-populate with demo agents
  for (const da of DEMO_AGENTS) {
    agents.set(da.agentId, { tier: da.tier, uri: da.name, wallet: da.wallet });
    scores.set(da.agentId, { overall: da.score.overall, t: da.score.tradePerformance, s: da.score.securityHygiene, p: da.score.peerRating, u: da.score.uptime });
    nextAgentId = da.agentId + 1n;
  }

  return {
    async registerAgent(uri) { await randomDelay(); const id = nextAgentId++; agents.set(id, { tier: 1, uri, wallet: '' }); return fakeTx(); },
    async getAgentInfo(id) { await randomDelay(); const a = agents.get(id); return { owner: '0x0' as `0x${string}`, tier: a?.tier ?? 0, registeredAt: 0n, lastActive: 0n, agentURI: a?.uri ?? '' }; },
    async getAgentTier(id) { await randomDelay(); return agents.get(id)?.tier ?? 0; },
    async getAgentByAddress(wallet) { await randomDelay(); for (const [id, a] of agents) { if (a.wallet === wallet) return id; } return nextAgentId; },
    async isRegistered(wallet) { await randomDelay(); for (const a of agents.values()) { if (a.wallet === wallet) return true; } return false; },
    async totalAgents() { await randomDelay(); return BigInt(agents.size); },
    async updateLastActive() { await randomDelay(); return fakeTx(); },
    async updateScore(_id, t, s, p, u) { await randomDelay(); const overall = Math.round((t * 3000 + s * 2500 + p * 2500 + u * 2000) / 10000); scores.set(_id, { overall, t, s, p, u }); return fakeTx(); },
    async getScore(id) { await randomDelay(); const s = scores.get(id); return { overall: s?.overall ?? 5000, tradePerformance: s?.t ?? 5000, securityHygiene: s?.s ?? 5000, peerRating: s?.p ?? 5000, uptime: s?.u ?? 5000, lastUpdated: 0n, totalInteractions: 0 }; },
    async getOverallScore(id) { await randomDelay(); return scores.get(id)?.overall ?? 5000; },
    async checkTier() { await randomDelay(); return true; },
    async listService() { await randomDelay(); nextServiceId++; return fakeTx(); },
    async purchaseService() { await randomDelay(); nextOrderId++; return fakeTx(); },
    async deliverService() { await randomDelay(); return fakeTx(); },
    async confirmAndRate() { await randomDelay(); return fakeTx(); },
    async fileDispute() { await randomDelay(); return fakeTx(); },
    async getActiveServices() { await randomDelay(); return []; },
    async getService() { await randomDelay(); return null; },
    async getOrder() { await randomDelay(); return null; },
    async getAverageRating() { await randomDelay(); return 400; },
    async totalServices() { await randomDelay(); return nextServiceId - 1n; },
    async totalOrders() { await randomDelay(); return nextOrderId - 1n; },
    async approveUSDC() { await randomDelay(); return fakeTx(); },
    async balanceOfUSDC() { await randomDelay(); return 1_000_000_000n; },
    async getTreasuryBalance() { await randomDelay(); return 50_000_000n; },
    async stakeUSDC() { await randomDelay(); return fakeTx(); },
    async unstakeUSDC() { await randomDelay(); return fakeTx(); },
    async getStakeInfo() { await randomDelay(); return { stakedAmount: 10_000_000n, multiplier: 12000, stakedAt: 0n, lastSlashedAt: 0n }; },
    async getTotalStaked() { await randomDelay(); return 16_000_000n; },
    async isStaked() { await randomDelay(); return true; },
  };
}
