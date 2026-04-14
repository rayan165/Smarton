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

  engine.stop();
  console.log('Seed complete.');
}

main().catch(console.error);
