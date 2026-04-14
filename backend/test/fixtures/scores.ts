import type { OKXSignalData, OKXSecurityData, OKXTokenBalance } from '../../src/types.js';

export const MOCK_SIGNALS_GOOD: OKXSignalData[] = [
  { walletAddress: '0x1', action: 'buy', amount: '1000', timestamp: '1712700000', isKOL: true, winRate: '0.72' },
  { walletAddress: '0x1', action: 'buy', amount: '2000', timestamp: '1712700100', isKOL: false, winRate: '0.68' },
  { walletAddress: '0x1', action: 'sell', amount: '500', timestamp: '1712700200', isKOL: false, winRate: '0.75' },
  { walletAddress: '0x1', action: 'buy', amount: '3000', timestamp: '1712700300', isKOL: true, winRate: '0.80' },
  { walletAddress: '0x1', action: 'buy', amount: '1500', timestamp: '1712700400', isKOL: false, winRate: '0.65' },
  { walletAddress: '0x1', action: 'sell', amount: '800', timestamp: '1712700500', isKOL: false, winRate: '0.71' },
  { walletAddress: '0x1', action: 'buy', amount: '4000', timestamp: '1712700600', isKOL: true, winRate: '0.82' },
];

export const MOCK_SIGNALS_BAD: OKXSignalData[] = [
  { walletAddress: '0x2', action: 'buy', amount: '1000', timestamp: '1712700000', isKOL: false, winRate: '0.30' },
  { walletAddress: '0x2', action: 'sell', amount: '500', timestamp: '1712700100', isKOL: false, winRate: '0.25' },
  { walletAddress: '0x2', action: 'buy', amount: '2000', timestamp: '1712700200', isKOL: false, winRate: '0.40' },
  { walletAddress: '0x2', action: 'sell', amount: '800', timestamp: '1712700300', isKOL: false, winRate: '0.35' },
  { walletAddress: '0x2', action: 'buy', amount: '600', timestamp: '1712700400', isKOL: false, winRate: '0.55' },
];

export const MOCK_SECURITY_SAFE: OKXSecurityData = {
  isHoneypot: false,
  ownerIsRenounced: true,
  buyTax: '0',
  sellTax: '0',
  isProxy: false,
  hasMintFunction: false,
  riskLevel: 'low',
};

export const MOCK_SECURITY_HONEYPOT: OKXSecurityData = {
  isHoneypot: true,
  ownerIsRenounced: false,
  buyTax: '50',
  sellTax: '99',
  isProxy: true,
  hasMintFunction: true,
  riskLevel: 'critical',
};

export const MOCK_BALANCE_HEALTHY: OKXTokenBalance[] = [
  { tokenContractAddress: '0xusdc', tokenSymbol: 'USDC', balance: '1000000000', balanceUsd: '1000' },
  { tokenContractAddress: '0xokb', tokenSymbol: 'OKB', balance: '500000000000000000', balanceUsd: '25' },
];

export const MOCK_BALANCE_EMPTY: OKXTokenBalance[] = [];
