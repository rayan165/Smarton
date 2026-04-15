async function main(): Promise<void> {
  if (process.env.DEMO_MODE === 'true') {
    console.log('\n  Starting Smarton in DEMO mode...\n');
    const { createDemoSmarton } = await import('../backend/src/demo/index.js');
    await createDemoSmarton();
  } else {
    console.log('\n  Starting Smarton LIVE engine...\n');
    const { createSmarton } = await import('../backend/src/index.js');
    const engine = createSmarton();
    await engine.start();
    process.on('SIGINT', () => { engine.stop(); process.exit(0); });
  }
}

main().catch(console.error);
