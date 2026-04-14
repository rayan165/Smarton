import type { ScoreComponents, ScoringWeights, ScoringConfig, AgentTier, TrustScore } from '../types.js';
import type { OKXClient } from '../utils/okx-client.js';
import type { ContractClient } from '../utils/contract-client.js';
import { computeTradePerformance } from './trade-performance.js';
import { computeSecurityHygiene } from './security-hygiene.js';
import { computePeerRating } from './peer-ratings.js';
import { computeUptime } from './uptime-tracker.js';
import { analyzeSybilRisk } from './sybil-detector.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('composite-scorer');

export interface ExtendedScoringWeights extends ScoringWeights {
  readonly diversity: number;
}

export const EXTENDED_DEFAULT_WEIGHTS: ExtendedScoringWeights = {
  tradePerformance: 2500,
  securityHygiene: 2000,
  peerRating: 2000,
  uptime: 1000,
  diversity: 1500,
};

export function computeCompositeScore(
  components: ScoreComponents,
  weights: ScoringWeights,
  stakeMultiplier: number = 10000,
): number {
  const extWeights = weights as ExtendedScoringWeights;
  const diversityWeight = extWeights.diversity ?? 0;
  const diversityValue = components.diversity ?? 5000;

  const rawScore =
    (components.tradePerformance * weights.tradePerformance +
      components.securityHygiene * weights.securityHygiene +
      components.peerRating * weights.peerRating +
      components.uptime * weights.uptime +
      diversityValue * diversityWeight) /
    10000;
  const boostedScore = Math.round((rawScore * stakeMultiplier) / 10000);
  return Math.max(0, Math.min(10000, boostedScore));
}

export function determineTier(score: number, interactions: number, config: ScoringConfig): AgentTier {
  if (score >= config.tier3Threshold && interactions >= config.tier3Interactions) return 3;
  if (score >= config.tier2Threshold && interactions >= config.tier2Interactions) return 2;
  return 1;
}

export async function runScoringCycle(
  config: ScoringConfig,
  okxClient: OKXClient,
  contractClient: ContractClient,
  agentId: bigint,
  agentWallet: `0x${string}`,
  recentTokens: string[],
): Promise<TrustScore> {
  const chainId = 196;

  const [trade, security, peer, uptime, sybil] = await Promise.all([
    computeTradePerformance(okxClient, agentWallet, chainId),
    computeSecurityHygiene(okxClient, agentWallet, chainId, recentTokens),
    computePeerRating(contractClient, agentId),
    computeUptime(okxClient, agentWallet, chainId),
    analyzeSybilRisk(contractClient, agentId),
  ]);

  const components: ScoreComponents = {
    tradePerformance: trade.score,
    securityHygiene: security.score,
    peerRating: peer.score,
    uptime: uptime.score,
    diversity: sybil.diversityScore,
  };

  const overall = computeCompositeScore(components, config.weights);

  log.info('Scoring cycle complete', {
    agentId: agentId.toString(),
    overall,
    trade: trade.score,
    security: security.score,
    peer: peer.score,
    uptime: uptime.score,
    diversity: sybil.diversityScore,
  });

  try {
    await contractClient.updateScore(agentId, trade.score, security.score, peer.score, uptime.score);
  } catch (err) {
    log.warn('Failed to write score on-chain', { error: String(err) });
  }

  return {
    overall,
    tradePerformance: trade.score,
    securityHygiene: security.score,
    peerRating: peer.score,
    uptime: uptime.score,
    lastUpdated: Date.now(),
    totalInteractions: 0,
  };
}
