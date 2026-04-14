async function main(): Promise<void> {
  if (process.env.DEMO_MODE === 'true') {
    console.log('\n  Starting TrustMesh in DEMO mode...\n');
    const { createDemoTrustMesh } = await import('../backend/src/demo/index.js');
    await createDemoTrustMesh();
  } else {
    console.log('\n  Starting TrustMesh LIVE engine...\n');
    const { createTrustMesh } = await import('../backend/src/index.js');
    const engine = createTrustMesh();
    await engine.start();
    process.on('SIGINT', () => { engine.stop(); process.exit(0); });
  }
}

main().catch(console.error);
