# OKX Onchain OS API Reference for TrustMesh

## Authentication

HMAC-SHA256 signature. **CRITICAL**: The prehash string MUST include query parameters as part of the path.

```typescript
import { createHmac } from 'node:crypto';

function createSignature(
  timestamp: string,
  method: string,
  requestPath: string, // MUST include query string, e.g. "/api/v5/dex/market/price?chainIndex=196&..."
  body: string,
  secretKey: string
): string {
  const prehash = timestamp + method.toUpperCase() + requestPath + (body || '');
  return createHmac('sha256', secretKey).update(prehash).digest('base64');
}

// Usage
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
```

**Common signing mistake**: Signing `/api/v5/dex/market/price` without the query params will produce a 401. Always sign the FULL path including `?chainIndex=196&tokenContractAddress=0x...`.

## Response Wrapper

All OKX API responses follow this structure:

```json
{
  "code": "0",
  "msg": "",
  "data": [ ... ]
}
```

- `code === "0"` means success
- `code !== "0"` means error (see Error Handling section)
- `data` is always an array (even for single results)
- Empty `data: []` means no results found (not an error)

## Endpoints Used by TrustMesh (9 capabilities)

### 1. Smart Money / Signal API — Trust Scoring (Trade Performance)

```
GET /api/v5/dex/signal/smart-money?chainIndex={chainId}&tokenContractAddress={tokenAddress}
```

**Purpose**: Evaluate trading performance — checks if trades align with smart money moves.

**Response** (inside `data[]`):
```json
{
  "walletAddress": "0x...",
  "action": "buy",
  "amount": "50000",
  "timestamp": "1712700000",
  "isKOL": true,
  "winRate": "0.72"
}
```

**Notes**:
- `winRate` is a string decimal (0-1 range)
- `amount` is in token's native decimals
- May return empty array for wallets with no tracked activity
- Use `chainIndex=196` for X Layer

**TrustMesh usage**: Query top traded tokens on X Layer, cross-reference agent wallet activity to derive trade performance score.

---

### 2. Token Security Check — Trust Scoring (Security Hygiene)

```
GET /api/v5/dex/security/token?chainIndex={chainId}&tokenContractAddress={tokenAddress}
```

**Purpose**: Check if tokens an agent has traded are safe.

**Response** (inside `data[]`):
```json
{
  "isHoneypot": false,
  "ownerIsRenounced": true,
  "buyTax": "0",
  "sellTax": "0",
  "isProxy": false,
  "hasMintFunction": false,
  "riskLevel": "low"
}
```

**Notes**:
- `riskLevel`: "low" | "medium" | "high" | "critical" — not all tokens have this field
- `buyTax`/`sellTax` are string percentages (e.g. "5" means 5%)
- `isHoneypot: true` is the strongest red flag
- Some fields may be missing for unverified tokens — treat missing as "unknown" (risky)

**TrustMesh usage**: For each token in agent's trade history, check security. `safeRatio = safeTokens / totalTokens`. Any honeypot interaction caps score at 5000.

---

### 3. Token Price — Marketplace (Service Valuation)

```
GET /api/v5/dex/market/price?chainIndex={chainId}&tokenContractAddress={tokenAddress}
```

**Response** (inside `data[]`):
```json
{
  "price": "1.234",
  "priceChange24h": "5.67",
  "volume24h": "1000000",
  "timestamp": "1712700000"
}
```

**Notes**:
- `price` is in USD as string
- `priceChange24h` is percentage
- Returns error code `82000` if token not found

---

### 4. Token Detail — Marketplace (Analysis Service)

```
GET /api/v5/dex/token/detail?chainIndex={chainId}&tokenContractAddress={tokenAddress}
```

**Response** (inside `data[]`):
```json
{
  "tokenContractAddress": "0x...",
  "tokenSymbol": "TOKEN",
  "tokenName": "Token Name",
  "decimals": "18",
  "totalSupply": "1000000000000000000000000",
  "holderCount": "1234",
  "marketCap": "5000000"
}
```

**Notes**:
- `decimals`, `totalSupply` are strings
- `holderCount` and `marketCap` may be "0" for new tokens

---

### 5. DEX Aggregator Swap — Marketplace (Trade Execution Service)

```
GET /api/v5/dex/aggregator/swap?chainIndex={chainId}&fromTokenAddress={from}&toTokenAddress={to}&amount={amount}&slippage=0.03&userWalletAddress={wallet}
```

**Purpose**: Get swap quote and unsigned transaction data.

**Response** (inside `data[]`):
```json
{
  "routerResult": {
    "toTokenAmount": "999000",
    "estimatedGas": "200000"
  },
  "tx": {
    "to": "0x...",
    "data": "0x...",
    "value": "0",
    "gasLimit": "250000"
  }
}
```

**Notes**:
- `amount` is in source token's smallest unit (e.g. for USDC with 6 decimals: "1000000" = 1 USDC)
- `slippage` is decimal (0.03 = 3%)
- `userWalletAddress` is the wallet executing the swap
- The `tx` object can be signed and broadcast directly
- For TrustMesh trade executor: get the quote data, don't actually execute (the buyer's wallet would need to sign)

---

### 6. Portfolio Balance — Trust Scoring (Uptime & Consistency)

```
GET /api/v5/dex/balance/token-balances?address={walletAddress}&chainIndex={chainId}
```

**Purpose**: Track portfolio stability over time.

**Response** (inside `data[]`):
```json
{
  "tokenContractAddress": "0x...",
  "tokenSymbol": "USDC",
  "balance": "1000000000",
  "balanceUsd": "1000"
}
```

**Notes**:
- Returns all token holdings for the address on the specified chain
- `balance` is in token's smallest unit
- `balanceUsd` is USD equivalent as string
- Empty array if wallet has no holdings

**TrustMesh usage**: Snapshot balance periodically, compute volatility. Sudden drops = rug pattern = low uptime score.

---

### 7. Candlestick / OHLCV — Marketplace (Analysis Service)

```
GET /api/v5/dex/market/candles?chainIndex={chainId}&tokenContractAddress={tokenAddress}&bar=1H&limit=24
```

**Response** (inside `data[]`): Array of arrays:
```json
[
  ["1712700000", "1.23", "1.25", "1.20", "1.24", "500000"],
  ...
]
```

Format: `[timestamp, open, high, low, close, volume]` — all strings.

**Notes**:
- `bar` options: "1m", "5m", "15m", "30m", "1H", "4H", "1D"
- `limit` max is typically 100-200
- Oldest data first (ascending timestamp)

---

### 8. Token Ranking — Marketplace (Signal Service)

```
GET /api/v5/dex/market/token/ranking?chainIndex={chainId}&sortBy=volume24h&limit=50
```

**Purpose**: Find trending tokens for signal generation.

**Response** (inside `data[]`):
```json
{
  "tokenContractAddress": "0x...",
  "tokenSymbol": "HOT",
  "price": "0.0123",
  "volume24h": "5000000",
  "priceChange24h": "15.5",
  "marketCap": "10000000"
}
```

**Notes**:
- `sortBy` options: "volume24h", "priceChange24h", "marketCap"
- `limit` max ~100
- Results are for the specified chain only

---

### 9. x402 Protocol — Underlying Payment Layer

x402 is not a separate API endpoint — it's OKX's gas sponsorship protocol for USDC transfers on X Layer. When agents send USDC on X Layer, x402 subsidizes gas costs, making transfers effectively free.

**For TrustMesh**: The marketplace uses standard ERC-20 `transferFrom` for escrow. x402 makes these transfers gas-free in practice. No special API integration needed — just deploy on X Layer and use USDC.

---

## X Layer Parameters

| Parameter | Value |
|-----------|-------|
| `chainIndex` / `chainId` | `196` |
| USDC address | `0x74b7f16337b8972027f6196a17a631ac6de26d22` |
| RPC URL | `https://rpc.xlayer.tech` |
| Block time | ~3 seconds |
| Gas cost | Near-zero |
| Native token | OKB |

---

## Rate Limits & Caching Strategy

**Rate limit**: 3 requests/second per API key (across all endpoints).

**Caching TTLs**:
| Data Type | TTL | Reason |
|-----------|-----|--------|
| Market price | 30s | Prices change frequently |
| Signal data | 60s | Moderately dynamic |
| Security check | 300s | Rarely changes |
| Token detail | 600s | Static metadata |
| Token ranking | 30s | Trending data is time-sensitive |
| Candles | 60s | Updates per bar interval |
| Portfolio balance | 60s | Balance changes with trades |

**For 5 agents running simultaneously**:
- Share single OKX client instance across all agents (single rate limiter)
- Implement request queue with priority: scoring updates > marketplace queries > herald reads
- Stagger agent cycle start times by 5-10 seconds to avoid burst
- Use Map-based in-memory cache with TTL eviction

**Rate limiter implementation**:
```typescript
class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private lastRequest = 0;
  private readonly minInterval = 334; // ~3 req/s

  async acquire(): Promise<void> {
    return new Promise(resolve => {
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
```

---

## Error Handling

**Common OKX error codes**:
| Code | Meaning | Action |
|------|---------|--------|
| `0` | Success | Process normally |
| `50011` | Rate limit exceeded | Exponential backoff (1s, 2s, 4s, max 3 retries) |
| `50001` | Invalid API key | Check config, abort |
| `50013` | Invalid signature | Check signing logic (query params in path?) |
| `82000` | Token not found | Return null/default, don't retry |
| `82100` | Chain not supported | Skip, log warning |

**Map all to TrustMeshError**:
```typescript
function mapOKXError(code: string, msg: string): TrustMeshError {
  return {
    code: `OKX_${code}`,
    message: msg || `OKX API error: ${code}`,
    module: 'okx-client',
    details: { okxCode: code },
  };
}
```

**Retry strategy**:
- Rate limit (50011): retry with exponential backoff, max 3 attempts
- Auth errors (50001, 50013): don't retry, throw immediately
- Not found (82000): don't retry, return null
- Network errors: retry once after 1s
- All other errors: don't retry, throw with mapped TrustMeshError
