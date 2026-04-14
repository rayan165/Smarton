import type { ContractClient } from '../utils/contract-client.js';
import type { PeerRatingData } from '../types.js';

export async function computePeerRating(
  contractClient: ContractClient,
  agentId: bigint,
): Promise<PeerRatingData> {
  const avgRatingRaw = await contractClient.getAverageRating(agentId);

  if (avgRatingRaw === 0) {
    return {
      agentId,
      totalRatings: 0,
      averageStars: 3.0,
      ratingDistribution: [0, 0, 0, 0, 0],
      weightedAverage: 3.0,
      score: 5000,
    };
  }

  const averageStars = avgRatingRaw / 100;
  const score = Math.round(((averageStars - 1) / 4) * 10000);

  return {
    agentId,
    totalRatings: 1,
    averageStars,
    ratingDistribution: [0, 0, 0, 0, 0],
    weightedAverage: averageStars,
    score: Math.max(0, Math.min(10000, score)),
  };
}
