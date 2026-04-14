import type { ContractClient } from '../utils/contract-client.js';
import type { SybilAnalysis } from '../types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('sybil-detector');

export async function analyzeSybilRisk(
  contractClient: ContractClient,
  agentId: bigint,
): Promise<SybilAnalysis> {
  try {
    const totalOrders = await contractClient.totalOrders();
    const counterpartyCount = new Map<string, number>();
    let orderCount = 0;

    for (let i = 1n; i <= totalOrders; i++) {
      try {
        const order = (await contractClient.getOrder(i)) as {
          buyerAgentId: bigint;
          sellerAgentId: bigint;
          buyerWallet: string;
          sellerWallet: string;
          buyerRating: number;
          createdAt: bigint;
        } | null;

        if (!order) continue;

        let counterpartyId: string | null = null;
        if (order.buyerAgentId === agentId) {
          counterpartyId = order.sellerAgentId.toString();
        } else if (order.sellerAgentId === agentId) {
          counterpartyId = order.buyerAgentId.toString();
        }

        if (counterpartyId !== null) {
          orderCount++;
          counterpartyCount.set(counterpartyId, (counterpartyCount.get(counterpartyId) ?? 0) + 1);
        }
      } catch {
        continue;
      }
    }

    if (orderCount === 0) {
      return {
        agentId,
        uniqueCounterparties: 0,
        totalInteractions: 0,
        diversityRatio: 0,
        selfDealingDetected: false,
        suspiciousPatterns: [],
        diversityScore: 5000,
      };
    }

    const uniqueCounterparties = counterpartyCount.size;
    const diversityRatio = uniqueCounterparties / Math.max(1, orderCount);
    const patterns: string[] = [];

    // Check concentrated counterparty (>50% with single party)
    let selfDealingDetected = false;
    for (const [, count] of counterpartyCount) {
      if (count / orderCount > 0.5) {
        selfDealingDetected = true;
        patterns.push('CONCENTRATED_COUNTERPARTY');
        break;
      }
    }

    // Check same owner ring
    try {
      const owners = new Set<string>();
      for (const cpId of counterpartyCount.keys()) {
        const info = await contractClient.getAgentInfo(BigInt(cpId));
        if (info?.owner) owners.add(String(info.owner).toLowerCase());
      }
      if (owners.size === 1 && counterpartyCount.size > 1) {
        patterns.push('SAME_OWNER_RING');
      }
    } catch {
      // Skip owner check on error
    }

    // Compute diversity score
    let diversityScore = Math.round(diversityRatio * 10000);
    if (selfDealingDetected) diversityScore = Math.min(diversityScore, 3000);
    if (patterns.includes('SAME_OWNER_RING')) diversityScore = Math.min(diversityScore, 1000);
    if (patterns.includes('RATING_STUFFING')) diversityScore = Math.max(0, diversityScore - 2000);
    diversityScore = Math.max(0, Math.min(10000, diversityScore));

    log.info('Sybil analysis complete', {
      agentId: agentId.toString(),
      uniqueCounterparties,
      totalInteractions: orderCount,
      diversityRatio,
      selfDealingDetected,
      patterns,
      diversityScore,
    });

    return {
      agentId,
      uniqueCounterparties,
      totalInteractions: orderCount,
      diversityRatio,
      selfDealingDetected,
      suspiciousPatterns: patterns,
      diversityScore,
    };
  } catch (err) {
    log.warn('Sybil analysis failed, returning neutral', { error: String(err) });
    return {
      agentId,
      uniqueCounterparties: 0,
      totalInteractions: 0,
      diversityRatio: 0,
      selfDealingDetected: false,
      suspiciousPatterns: [],
      diversityScore: 5000,
    };
  }
}
