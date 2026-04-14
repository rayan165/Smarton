import type { OKXClient } from '../utils/okx-client.js';
import type { SecurityHygieneData } from '../types.js';

export async function computeSecurityHygiene(
  okxClient: OKXClient,
  agentWallet: `0x${string}`,
  chainId: number,
  recentTokens: string[],
): Promise<SecurityHygieneData> {
  if (recentTokens.length === 0) {
    return {
      agentWallet,
      totalTokensTraded: 0,
      safeTokens: 0,
      riskyTokens: 0,
      honeypotInteractions: 0,
      safeRatio: 1,
      score: 7500,
    };
  }

  let safeCount = 0;
  let riskyCount = 0;
  let honeypotCount = 0;

  for (const token of recentTokens) {
    try {
      const security = await okxClient.getTokenSecurity(chainId, token);
      if (security) {
        const isSafe =
          (security.riskLevel === 'low' || security.riskLevel === 'medium') &&
          !security.isHoneypot;
        if (isSafe) {
          safeCount++;
        } else {
          riskyCount++;
          if (security.isHoneypot) honeypotCount++;
        }
      } else {
        riskyCount++;
      }
    } catch {
      riskyCount++;
    }
  }

  const total = safeCount + riskyCount;
  const safeRatio = total > 0 ? safeCount / total : 0;
  let score = Math.round(safeRatio * 10000);
  if (honeypotCount > 0) {
    score = Math.min(score, 5000);
  }

  return {
    agentWallet,
    totalTokensTraded: total,
    safeTokens: safeCount,
    riskyTokens: riskyCount,
    honeypotInteractions: honeypotCount,
    safeRatio,
    score,
  };
}
