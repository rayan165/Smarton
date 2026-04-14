import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Transport,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { XLayerConfig, ContractAddresses, TxResult } from '../types.js';
import { createLogger } from './logger.js';

const log = createLogger('contract-client');

const AGENT_REGISTRY_ABI = [
  { type: 'function', name: 'registerAgent', inputs: [{ name: 'agentURI', type: 'string' }], outputs: [{ name: 'agentId', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getAgentInfo', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'owner', type: 'address' }, { name: 'tier', type: 'uint8' }, { name: 'registeredAt', type: 'uint64' }, { name: 'lastActive', type: 'uint64' }, { name: 'agentURI', type: 'string' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getAgentTier', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getAgentByAddress', inputs: [{ name: 'wallet', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'isRegistered', inputs: [{ name: 'wallet', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'totalAgents', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'updateLastActive', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

const TRUST_SCORER_ABI = [
  { type: 'function', name: 'updateScore', inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'tradePerformance', type: 'uint16' }, { name: 'securityHygiene', type: 'uint16' }, { name: 'peerRating', type: 'uint16' }, { name: 'uptime', type: 'uint16' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getScore', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'overall', type: 'uint16' }, { name: 'tradePerformance', type: 'uint16' }, { name: 'securityHygiene', type: 'uint16' }, { name: 'peerRating', type: 'uint16' }, { name: 'uptime', type: 'uint16' }, { name: 'lastUpdated', type: 'uint64' }, { name: 'totalInteractions', type: 'uint32' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getOverallScore', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ name: '', type: 'uint16' }], stateMutability: 'view' },
  { type: 'function', name: 'computeComposite', inputs: [{ name: 'trade', type: 'uint16' }, { name: 'security', type: 'uint16' }, { name: 'peer', type: 'uint16' }, { name: 'up', type: 'uint16' }], outputs: [{ name: '', type: 'uint16' }], stateMutability: 'pure' },
] as const;

const TRUST_GATE_ABI = [
  { type: 'function', name: 'checkTier', inputs: [{ name: 'agent', type: 'address' }, { name: 'requiredTier', type: 'uint8' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'requireTier', inputs: [{ name: 'agent', type: 'address' }, { name: 'requiredTier', type: 'uint8' }], outputs: [], stateMutability: 'view' },
] as const;

const SERVICE_REGISTRY_ABI = [
  { type: 'function', name: 'listService', inputs: [{ name: 'serviceType', type: 'string' }, { name: 'description', type: 'string' }, { name: 'priceUSDC', type: 'uint256' }, { name: 'minBuyerTier', type: 'uint8' }], outputs: [{ name: 'serviceId', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'purchaseService', inputs: [{ name: 'serviceId', type: 'uint256' }], outputs: [{ name: 'orderId', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'deliverService', inputs: [{ name: 'orderId', type: 'uint256' }, { name: 'deliveryHash', type: 'string' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'confirmAndRate', inputs: [{ name: 'orderId', type: 'uint256' }, { name: 'rating', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'fileDispute', inputs: [{ name: 'orderId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getActiveServices', inputs: [], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'serviceId', type: 'uint256' }, { name: 'sellerAgentId', type: 'uint256' }, { name: 'sellerWallet', type: 'address' }, { name: 'serviceType', type: 'string' }, { name: 'description', type: 'string' }, { name: 'priceUSDC', type: 'uint256' }, { name: 'minBuyerTier', type: 'uint8' }, { name: 'active', type: 'bool' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getService', inputs: [{ name: 'serviceId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'serviceId', type: 'uint256' }, { name: 'sellerAgentId', type: 'uint256' }, { name: 'sellerWallet', type: 'address' }, { name: 'serviceType', type: 'string' }, { name: 'description', type: 'string' }, { name: 'priceUSDC', type: 'uint256' }, { name: 'minBuyerTier', type: 'uint8' }, { name: 'active', type: 'bool' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getOrder', inputs: [{ name: 'orderId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'orderId', type: 'uint256' }, { name: 'serviceId', type: 'uint256' }, { name: 'buyerAgentId', type: 'uint256' }, { name: 'buyerWallet', type: 'address' }, { name: 'sellerAgentId', type: 'uint256' }, { name: 'sellerWallet', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint64' }, { name: 'deliveredAt', type: 'uint64' }, { name: 'completedAt', type: 'uint64' }, { name: 'buyerRating', type: 'uint8' }, { name: 'deliveryHash', type: 'string' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getAverageRating', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ name: '', type: 'uint16' }], stateMutability: 'view' },
  { type: 'function', name: 'totalServices', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalOrders', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

const ERC20_ABI = [
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

const TREASURY_ABI = [
  { type: 'function', name: 'getBalance', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

export interface ContractClient {
  // Agent Registry
  registerAgent: (agentURI: string) => Promise<TxResult>;
  getAgentInfo: (agentId: bigint) => Promise<{ owner: Address; tier: number; registeredAt: bigint; lastActive: bigint; agentURI: string }>;
  getAgentTier: (agentId: bigint) => Promise<number>;
  getAgentByAddress: (wallet: Address) => Promise<bigint>;
  isRegistered: (wallet: Address) => Promise<boolean>;
  totalAgents: () => Promise<bigint>;
  updateLastActive: (agentId: bigint) => Promise<TxResult>;
  // Trust Scorer
  updateScore: (agentId: bigint, trade: number, security: number, peer: number, uptime: number) => Promise<TxResult>;
  getScore: (agentId: bigint) => Promise<{ overall: number; tradePerformance: number; securityHygiene: number; peerRating: number; uptime: number; lastUpdated: bigint; totalInteractions: number }>;
  getOverallScore: (agentId: bigint) => Promise<number>;
  // Trust Gate
  checkTier: (agent: Address, requiredTier: number) => Promise<boolean>;
  // Service Registry
  listService: (serviceType: string, description: string, priceUSDC: bigint, minBuyerTier: number) => Promise<TxResult>;
  purchaseService: (serviceId: bigint) => Promise<TxResult>;
  deliverService: (orderId: bigint, deliveryHash: string) => Promise<TxResult>;
  confirmAndRate: (orderId: bigint, rating: number) => Promise<TxResult>;
  fileDispute: (orderId: bigint) => Promise<TxResult>;
  getActiveServices: () => Promise<unknown[]>;
  getService: (serviceId: bigint) => Promise<unknown>;
  getOrder: (orderId: bigint) => Promise<unknown>;
  getAverageRating: (agentId: bigint) => Promise<number>;
  totalServices: () => Promise<bigint>;
  totalOrders: () => Promise<bigint>;
  // ERC20
  approveUSDC: (spender: Address, amount: bigint) => Promise<TxResult>;
  balanceOfUSDC: (account: Address) => Promise<bigint>;
  // Treasury
  getTreasuryBalance: () => Promise<bigint>;
}

export function createContractClient(
  xlayer: XLayerConfig,
  contracts: ContractAddresses,
  privateKey: `0x${string}`,
): ContractClient {
  const chain: Chain = {
    id: xlayer.chainId,
    name: 'X Layer',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: { default: { http: [xlayer.rpcUrl] } },
  };

  const account = privateKeyToAccount(privateKey);

  const publicClient: PublicClient<Transport, Chain> = createPublicClient({
    chain,
    transport: http(xlayer.rpcUrl),
  });

  const walletClient: WalletClient = createWalletClient({
    account,
    chain,
    transport: http(xlayer.rpcUrl),
  });

  async function writeContract(address: Address, abi: readonly unknown[], functionName: string, args: unknown[]): Promise<TxResult> {
    const { request } = await publicClient.simulateContract({
      address,
      abi: abi as never,
      functionName,
      args,
      account,
    } as never);
    const hash = await walletClient.writeContract(request as never);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    log.info(`tx ${functionName}`, { hash, blockNumber: receipt.blockNumber.toString() });
    return {
      hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status,
    };
  }

  async function readContract(address: Address, abi: readonly unknown[], functionName: string, args: unknown[] = []): Promise<unknown> {
    return publicClient.readContract({
      address,
      abi: abi as never,
      functionName,
      args,
    } as never);
  }

  return {
    // Agent Registry
    registerAgent: (agentURI) => writeContract(contracts.agentRegistry, AGENT_REGISTRY_ABI, 'registerAgent', [agentURI]),
    getAgentInfo: (agentId) => readContract(contracts.agentRegistry, AGENT_REGISTRY_ABI, 'getAgentInfo', [agentId]) as never,
    getAgentTier: (agentId) => readContract(contracts.agentRegistry, AGENT_REGISTRY_ABI, 'getAgentTier', [agentId]) as Promise<number>,
    getAgentByAddress: (wallet) => readContract(contracts.agentRegistry, AGENT_REGISTRY_ABI, 'getAgentByAddress', [wallet]) as Promise<bigint>,
    isRegistered: (wallet) => readContract(contracts.agentRegistry, AGENT_REGISTRY_ABI, 'isRegistered', [wallet]) as Promise<boolean>,
    totalAgents: () => readContract(contracts.agentRegistry, AGENT_REGISTRY_ABI, 'totalAgents') as Promise<bigint>,
    updateLastActive: (agentId) => writeContract(contracts.agentRegistry, AGENT_REGISTRY_ABI, 'updateLastActive', [agentId]),
    // Trust Scorer
    updateScore: (agentId, trade, security, peer, uptime) => writeContract(contracts.trustScorer, TRUST_SCORER_ABI, 'updateScore', [agentId, trade, security, peer, uptime]),
    getScore: (agentId) => readContract(contracts.trustScorer, TRUST_SCORER_ABI, 'getScore', [agentId]) as never,
    getOverallScore: (agentId) => readContract(contracts.trustScorer, TRUST_SCORER_ABI, 'getOverallScore', [agentId]) as Promise<number>,
    // Trust Gate
    checkTier: (agent, requiredTier) => readContract(contracts.trustGate, TRUST_GATE_ABI, 'checkTier', [agent, requiredTier]) as Promise<boolean>,
    // Service Registry
    listService: (serviceType, description, priceUSDC, minBuyerTier) => writeContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'listService', [serviceType, description, priceUSDC, minBuyerTier]),
    purchaseService: (serviceId) => writeContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'purchaseService', [serviceId]),
    deliverService: (orderId, deliveryHash) => writeContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'deliverService', [orderId, deliveryHash]),
    confirmAndRate: (orderId, rating) => writeContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'confirmAndRate', [orderId, rating]),
    fileDispute: (orderId) => writeContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'fileDispute', [orderId]),
    getActiveServices: () => readContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'getActiveServices') as Promise<unknown[]>,
    getService: (serviceId) => readContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'getService', [serviceId]),
    getOrder: (orderId) => readContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'getOrder', [orderId]),
    getAverageRating: (agentId) => readContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'getAverageRating', [agentId]) as Promise<number>,
    totalServices: () => readContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'totalServices') as Promise<bigint>,
    totalOrders: () => readContract(contracts.serviceRegistry, SERVICE_REGISTRY_ABI, 'totalOrders') as Promise<bigint>,
    // ERC20
    approveUSDC: (spender, amount) => writeContract(xlayer.usdcAddress, ERC20_ABI, 'approve', [spender, amount]),
    balanceOfUSDC: (account) => readContract(xlayer.usdcAddress, ERC20_ABI, 'balanceOf', [account]) as Promise<bigint>,
    // Treasury
    getTreasuryBalance: () => readContract(contracts.treasury, TREASURY_ABI, 'getBalance') as Promise<bigint>,
  };
}
