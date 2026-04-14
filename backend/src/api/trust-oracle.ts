import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { ContractClient } from '../utils/contract-client.js';
import type { TrustOracleResponse, AgentTier } from '../types.js';
import { analyzeSybilRisk } from '../scoring/sybil-detector.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('trust-oracle');

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface TrustOracle {
  start: (port: number) => void;
  stop: () => void;
}

export function createTrustOracle(
  contractClient: ContractClient,
): TrustOracle {
  const cache = new Map<string, CacheEntry<unknown>>();
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  function getCached<T>(key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  function setCache<T>(key: string, data: T, ttlMs: number): void {
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    let entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + 60_000 };
      rateLimitMap.set(ip, entry);
    }
    entry.count++;
    return entry.count <= 100;
  }

  function getClientIp(req: IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.socket.remoteAddress ?? 'unknown';
  }

  function sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status);
    res.end(JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ));
  }

  function getSybilRiskLevel(diversityRatio: number, selfDealing: boolean, patterns: readonly string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (patterns.includes('SAME_OWNER_RING')) return 'critical';
    if (selfDealing) return 'high';
    if (diversityRatio < 0.3) return 'medium';
    return 'low';
  }

  async function handleTrustProfile(address: `0x${string}`, res: ServerResponse): Promise<void> {
    const cacheKey = `trust:${address}`;
    const cached = getCached<TrustOracleResponse>(cacheKey);
    if (cached) { sendJson(res, 200, cached); return; }

    const registered = await contractClient.isRegistered(address);
    if (!registered) {
      sendJson(res, 200, { address, agentId: '0', registered: false, tier: 0, queriedAt: new Date().toISOString() });
      return;
    }

    const agentId = await contractClient.getAgentByAddress(address);
    const tier = await contractClient.getAgentTier(agentId) as AgentTier;
    const scoreData = await contractClient.getScore(agentId);
    const stakeInfo = await contractClient.getStakeInfo(agentId);
    const isStaked = await contractClient.isStaked(agentId);
    const avgRating = await contractClient.getAverageRating(agentId);
    const sybil = await analyzeSybilRisk(contractClient, agentId);

    const response: TrustOracleResponse = {
      address,
      agentId,
      registered: true,
      tier,
      trustScore: {
        overall: scoreData.overall,
        tradePerformance: scoreData.tradePerformance,
        securityHygiene: scoreData.securityHygiene,
        peerRating: scoreData.peerRating,
        uptime: scoreData.uptime,
        diversity: sybil.diversityScore,
      },
      staking: {
        stakedAmount: stakeInfo.stakedAmount,
        multiplier: stakeInfo.multiplier,
        isStaked,
      },
      sybilRisk: {
        diversityRatio: sybil.diversityRatio,
        selfDealingDetected: sybil.selfDealingDetected,
        suspiciousPatterns: sybil.suspiciousPatterns,
        riskLevel: getSybilRiskLevel(sybil.diversityRatio, sybil.selfDealingDetected, sybil.suspiciousPatterns),
      },
      stats: {
        totalOrders: sybil.totalInteractions,
        completedOrders: sybil.totalInteractions,
        averageRating: avgRating / 100,
        uniqueCounterparties: sybil.uniqueCounterparties,
      },
      queriedAt: new Date().toISOString(),
    };

    setCache(cacheKey, response, 30_000);
    sendJson(res, 200, response);
  }

  async function handleScore(address: `0x${string}`, res: ServerResponse): Promise<void> {
    const registered = await contractClient.isRegistered(address);
    if (!registered) { sendJson(res, 200, { address, registered: false }); return; }

    const agentId = await contractClient.getAgentByAddress(address);
    const score = await contractClient.getOverallScore(agentId);
    const tier = await contractClient.getAgentTier(agentId);
    const stakeInfo = await contractClient.getStakeInfo(agentId);

    sendJson(res, 200, { address, score, tier, multiplier: stakeInfo.multiplier });
  }

  async function handleSybil(address: `0x${string}`, res: ServerResponse): Promise<void> {
    const registered = await contractClient.isRegistered(address);
    if (!registered) { sendJson(res, 200, { address, registered: false }); return; }

    const agentId = await contractClient.getAgentByAddress(address);
    const sybil = await analyzeSybilRisk(contractClient, agentId);
    const riskLevel = getSybilRiskLevel(sybil.diversityRatio, sybil.selfDealingDetected, sybil.suspiciousPatterns);

    sendJson(res, 200, { address, riskLevel, diversityRatio: sybil.diversityRatio, patterns: sybil.suspiciousPatterns, selfDealing: sybil.selfDealingDetected });
  }

  async function handleLeaderboard(res: ServerResponse): Promise<void> {
    const cacheKey = 'leaderboard';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { sendJson(res, 200, cached); return; }

    const total = await contractClient.totalAgents();
    const agents: Array<{ agentId: bigint; score: number; tier: number }> = [];

    const limit = total < 20n ? total : 20n;
    for (let i = 1n; i <= limit; i++) {
      try {
        const score = await contractClient.getOverallScore(i);
        const tier = await contractClient.getAgentTier(i);
        agents.push({ agentId: i, score, tier });
      } catch { continue; }
    }

    agents.sort((a, b) => b.score - a.score);
    setCache(cacheKey, agents, 60_000);
    sendJson(res, 200, agents);
  }

  async function handleStats(res: ServerResponse): Promise<void> {
    const totalAgents = await contractClient.totalAgents();
    const totalOrders = await contractClient.totalOrders();
    const totalServices = await contractClient.totalServices();
    const totalStaked = await contractClient.getTotalStaked();

    sendJson(res, 200, { totalAgents, totalOrders, totalServices, totalStaked });
  }

  function handleHealth(res: ServerResponse): void {
    sendJson(res, 200, { status: 'ok', chain: 196, uptime: process.uptime() });
  }

  const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      sendJson(res, 429, { error: { code: 'RATE_LIMIT', message: 'Too many requests' } });
      return;
    }

    try {
      const url = new URL(req.url ?? '/', `http://localhost`);
      const path = url.pathname;

      // /api/v1/trust/:address
      const trustMatch = path.match(/^\/api\/v1\/trust\/(0x[a-fA-F0-9]{40})$/);
      if (trustMatch) { await handleTrustProfile(trustMatch[1] as `0x${string}`, res); return; }

      // /api/v1/trust/:address/score
      const scoreMatch = path.match(/^\/api\/v1\/trust\/(0x[a-fA-F0-9]{40})\/score$/);
      if (scoreMatch) { await handleScore(scoreMatch[1] as `0x${string}`, res); return; }

      // /api/v1/trust/:address/sybil
      const sybilMatch = path.match(/^\/api\/v1\/trust\/(0x[a-fA-F0-9]{40})\/sybil$/);
      if (sybilMatch) { await handleSybil(sybilMatch[1] as `0x${string}`, res); return; }

      if (path === '/api/v1/leaderboard') { await handleLeaderboard(res); return; }
      if (path === '/api/v1/stats') { await handleStats(res); return; }
      if (path === '/api/v1/health') { handleHealth(res); return; }

      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Route not found' } });
    } catch (err) {
      log.error('Request error', { error: String(err) });
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    }
  });

  return {
    start(port: number) {
      server.listen(port, () => {
        log.info(`Trust Oracle API running on http://localhost:${port}`);
      });
    },
    stop() {
      server.close();
    },
  };
}
