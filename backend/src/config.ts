import type {
  TrustMeshConfig,
  ScoringWeights,
  ScoringConfig,
  MarketplaceConfig,
  TrustMeshError,
} from './types.js';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  tradePerformance: 2500,
  securityHygiene: 2000,
  peerRating: 2000,
  uptime: 1000,
  diversity: 1500,
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: DEFAULT_SCORING_WEIGHTS,
  updateIntervalMs: 300_000,
  tier2Threshold: 6000,
  tier2Interactions: 50,
  tier3Threshold: 8500,
  tier3Interactions: 500,
};

export const DEFAULT_MARKETPLACE_CONFIG: MarketplaceConfig = {
  protocolFeeBps: 200,
  ratingIncentive: 1000n,
  disputeWindowSec: 3600,
  cycleIntervalMs: 60_000,
};

const ZERO_ADDRESS: `0x${string}` = '0x0000000000000000000000000000000000000000';

export function createConfig(overrides?: Partial<TrustMeshConfig>): TrustMeshConfig {
  const demoMode = process.env.DEMO_MODE === 'true';

  const apiKey = process.env.OKX_API_KEY ?? '';
  const secretKey = process.env.OKX_SECRET_KEY ?? '';
  const passphrase = process.env.OKX_PASSPHRASE ?? '';

  if (!demoMode && (!apiKey || !secretKey || !passphrase)) {
    const err: TrustMeshError = {
      code: 'CONFIG_MISSING',
      message: 'OKX API credentials are required in live mode',
      module: 'config',
    };
    throw err;
  }

  const config: TrustMeshConfig = {
    okx: {
      apiKey,
      secretKey,
      passphrase,
      baseUrl: process.env.OKX_BASE_URL ?? 'https://www.okx.com',
      ...overrides?.okx,
    },
    xlayer: {
      rpcUrl: process.env.XLAYER_RPC_URL ?? 'https://rpc.xlayer.tech',
      chainId: Number(process.env.XLAYER_CHAIN_ID ?? '196'),
      usdcAddress: (process.env.USDC_ADDRESS as `0x${string}`) ?? '0x74b7f16337b8972027f6196a17a631ac6de26d22',
      ...overrides?.xlayer,
    },
    contracts: {
      agentRegistry: (process.env.AGENT_REGISTRY_ADDRESS as `0x${string}`) ?? ZERO_ADDRESS,
      trustScorer: (process.env.TRUST_SCORER_ADDRESS as `0x${string}`) ?? ZERO_ADDRESS,
      trustGate: (process.env.TRUST_GATE_ADDRESS as `0x${string}`) ?? ZERO_ADDRESS,
      serviceRegistry: (process.env.SERVICE_REGISTRY_ADDRESS as `0x${string}`) ?? ZERO_ADDRESS,
      treasury: (process.env.TREASURY_ADDRESS as `0x${string}`) ?? ZERO_ADDRESS,
      staking: (process.env.STAKING_ADDRESS as `0x${string}`) ?? ZERO_ADDRESS,
      ...overrides?.contracts,
    },
    scoring: {
      ...DEFAULT_SCORING_CONFIG,
      ...overrides?.scoring,
    },
    marketplace: {
      ...DEFAULT_MARKETPLACE_CONFIG,
      ...overrides?.marketplace,
    },
  };

  return config;
}
