import type { OKXClient } from '../utils/okx-client.js';
import type { TradePerformanceData } from '../types.js';

export async function computeTradePerformance(
  okxClient: OKXClient,
  agentWallet: `0x${string}`,
  chainId: number,
): Promise<TradePerformanceData> {
  try {
    const signals = await okxClient.getSignals(chainId, agentWallet);

    if (!signals || signals.length === 0) {
      return {
        agentWallet,
        totalTrades: 0,
        profitableTrades: 0,
        winRate: 0.5,
        totalPnlUsd: 0,
        maxDrawdownPct: 0,
        score: 5000,
      };
    }

    const totalTrades = signals.length;
    const profitableTrades = signals.filter((s) => parseFloat(s.winRate) > 0.5).length;
    const winRate = profitableTrades / totalTrades;
    const maxDrawdownPct = 0.1; // simplified

    const rawScore = winRate * 7000 + (1 - maxDrawdownPct) * 3000;
    const score = Math.max(0, Math.min(10000, Math.round(rawScore)));

    return {
      agentWallet,
      totalTrades,
      profitableTrades,
      winRate,
      totalPnlUsd: 0,
      maxDrawdownPct,
      score,
    };
  } catch {
    return {
      agentWallet,
      totalTrades: 0,
      profitableTrades: 0,
      winRate: 0.5,
      totalPnlUsd: 0,
      maxDrawdownPct: 0,
      score: 5000,
    };
  }
}
