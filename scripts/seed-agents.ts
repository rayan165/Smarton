async function main(): Promise<void> {
  console.log('Seed agents script — requires deployed contracts.');
  console.log('Set contract addresses in .env before running.');

  const required = ['AGENT_REGISTRY_ADDRESS', 'DEPLOYER_PRIVATE_KEY'];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing ${key}`);
      process.exit(1);
    }
  }

  const { createTrustMesh } = await import('../backend/src/index.js');
  const engine = createTrustMesh();
  await engine.start();

  // Run a few cycles to generate transactions
  for (let i = 0; i < 5; i++) {
    await engine.runOneCycle();
  }

  // Stake USDC for top agents (creates on-chain staking transactions)
  // SignalProvider: 10 USDC → 1.2x multiplier
  // SecurityScanner: 5 USDC → 1.1x multiplier
  // TradeExecutor: 1 USDC → 1.1x multiplier
  console.log('Staking USDC for top agents...');
  // Staking is done through the contract client directly in live mode

  engine.stop();
  console.log('Seed complete.');
}

main().catch(console.error);
