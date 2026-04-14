import { createHmac } from 'node:crypto';
import type {
  OKXConfig,
  OKXApiResponse,
  OKXSignalData,
  OKXSecurityData,
  OKXTokenPrice,
  OKXTokenDetail,
  OKXSwapResult,
  OKXTokenBalance,
  OKXCandleData,
  OKXTokenRanking,
  CacheEntry,
  TrustMeshError,
} from '../types.js';
import { createLogger } from './logger.js';

const log = createLogger('okx-client');

function createSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string,
  secretKey: string,
): string {
  const prehash = timestamp + method.toUpperCase() + requestPath + (body || '');
  return createHmac('sha256', secretKey).update(prehash).digest('base64');
}

class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private lastRequest = 0;
  private readonly minInterval = 334;

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const now = Date.now();
    const wait = Math.max(0, this.minInterval - (now - this.lastRequest));
    setTimeout(() => {
      this.lastRequest = Date.now();
      this.processing = false;
      const next = this.queue.shift();
      next?.();
      this.processQueue();
    }, wait);
  }
}

export interface OKXClient {
  getSignals: (chainId: number, tokenAddress: string) => Promise<OKXSignalData[]>;
  getTokenSecurity: (chainId: number, tokenAddress: string) => Promise<OKXSecurityData | null>;
  getTokenPrice: (chainId: number, tokenAddress: string) => Promise<OKXTokenPrice | null>;
  getTokenDetail: (chainId: number, tokenAddress: string) => Promise<OKXTokenDetail | null>;
  getSwapQuote: (chainId: number, from: string, to: string, amount: string, wallet: string) => Promise<OKXSwapResult | null>;
  getPortfolioBalance: (address: string, chainId: number) => Promise<OKXTokenBalance[]>;
  getCandles: (chainId: number, tokenAddress: string, bar: string, limit: number) => Promise<OKXCandleData[]>;
  getTokenRanking: (chainId: number, sortBy: string, limit: number) => Promise<OKXTokenRanking[]>;
}

export function createOKXClient(config: OKXConfig): OKXClient {
  const rateLimiter = new RateLimiter();
  const cache = new Map<string, CacheEntry<unknown>>();

  function getCached<T>(key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  function setCache<T>(key: string, data: T, ttlMs: number): void {
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  function getHeaders(method: string, path: string, body: string = ''): Record<string, string> {
    const timestamp = new Date().toISOString();
    return {
      'OK-ACCESS-KEY': config.apiKey,
      'OK-ACCESS-SIGN': createSignature(timestamp, method, path, body, config.secretKey),
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': config.passphrase,
      'Content-Type': 'application/json',
    };
  }

  function mapOKXError(code: string, msg: string): TrustMeshError {
    return {
      code: `OKX_${code}`,
      message: msg || `OKX API error: ${code}`,
      module: 'okx-client',
      details: { okxCode: code },
    };
  }

  async function request<T>(path: string, cacheTtlMs: number | null, retries = 3): Promise<T[]> {
    if (cacheTtlMs !== null) {
      const cached = getCached<T[]>(path);
      if (cached) return cached;
    }

    await rateLimiter.acquire();

    const url = `${config.baseUrl}${path}`;
    const headers = getHeaders('GET', path);

    let lastError: unknown;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, { headers });
        const json = (await response.json()) as OKXApiResponse<T>;

        if (json.code === '0') {
          const data = json.data as T[];
          if (cacheTtlMs !== null) {
            setCache(path, data, cacheTtlMs);
          }
          return data;
        }

        if (json.code === '82000') return [];

        if (json.code === '50011' && attempt < retries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (json.code === '50001' || json.code === '50013') {
          throw mapOKXError(json.code, json.msg);
        }

        throw mapOKXError(json.code, json.msg);
      } catch (err) {
        lastError = err;
        if ((err as TrustMeshError).code?.startsWith('OKX_')) throw err;
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    log.error('Request failed after retries', { path, error: String(lastError) });
    throw lastError;
  }

  return {
    async getSignals(chainId: number, tokenAddress: string): Promise<OKXSignalData[]> {
      const path = `/api/v5/dex/signal/smart-money?chainIndex=${chainId}&tokenContractAddress=${tokenAddress}`;
      return request<OKXSignalData>(path, 60_000);
    },

    async getTokenSecurity(chainId: number, tokenAddress: string): Promise<OKXSecurityData | null> {
      const path = `/api/v5/dex/security/token?chainIndex=${chainId}&tokenContractAddress=${tokenAddress}`;
      const data = await request<OKXSecurityData>(path, 300_000);
      return data[0] ?? null;
    },

    async getTokenPrice(chainId: number, tokenAddress: string): Promise<OKXTokenPrice | null> {
      const path = `/api/v5/dex/market/price?chainIndex=${chainId}&tokenContractAddress=${tokenAddress}`;
      const data = await request<OKXTokenPrice>(path, 30_000);
      return data[0] ?? null;
    },

    async getTokenDetail(chainId: number, tokenAddress: string): Promise<OKXTokenDetail | null> {
      const path = `/api/v5/dex/token/detail?chainIndex=${chainId}&tokenContractAddress=${tokenAddress}`;
      const data = await request<OKXTokenDetail>(path, 600_000);
      return data[0] ?? null;
    },

    async getSwapQuote(chainId: number, from: string, to: string, amount: string, wallet: string): Promise<OKXSwapResult | null> {
      const path = `/api/v5/dex/aggregator/swap?chainIndex=${chainId}&fromTokenAddress=${from}&toTokenAddress=${to}&amount=${amount}&slippage=0.03&userWalletAddress=${wallet}`;
      const data = await request<OKXSwapResult>(path, null);
      return data[0] ?? null;
    },

    async getPortfolioBalance(address: string, chainId: number): Promise<OKXTokenBalance[]> {
      const path = `/api/v5/dex/balance/token-balances?address=${address}&chainIndex=${chainId}`;
      return request<OKXTokenBalance>(path, 60_000);
    },

    async getCandles(chainId: number, tokenAddress: string, bar: string, limit: number): Promise<OKXCandleData[]> {
      const path = `/api/v5/dex/market/candles?chainIndex=${chainId}&tokenContractAddress=${tokenAddress}&bar=${bar}&limit=${limit}`;
      return request<OKXCandleData>(path, 60_000);
    },

    async getTokenRanking(chainId: number, sortBy: string, limit: number): Promise<OKXTokenRanking[]> {
      const path = `/api/v5/dex/market/token/ranking?chainIndex=${chainId}&sortBy=${sortBy}&limit=${limit}`;
      return request<OKXTokenRanking>(path, 30_000);
    },
  };
}
