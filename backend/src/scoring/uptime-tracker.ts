import type { OKXClient } from '../utils/okx-client.js';
import type { UptimeData } from '../types.js';

export async function computeUptime(
  okxClient: OKXClient,
  agentWallet: `0x${string}`,
  chainId: number,
): Promise<UptimeData> {
  try {
    const balances = await okxClient.getPortfolioBalance(agentWallet, chainId);
    const totalUsd = balances.reduce((sum, b) => sum + parseFloat(b.balanceUsd || '0'), 0);

    const score = totalUsd > 0 ? 8000 : 4000;

    return {
      agentWallet,
      balanceHistory: [{ timestamp: Date.now(), balanceUsd: totalUsd }],
      volatility: 0.2,
      hasRugPattern: false,
      activeDays: 1,
      score,
    };
  } catch {
    return {
      agentWallet,
      balanceHistory: [{ timestamp: Date.now(), balanceUsd: 0 }],
      volatility: 0.5,
      hasRugPattern: false,
      activeDays: 0,
      score: 4000,
    };
  }
}
