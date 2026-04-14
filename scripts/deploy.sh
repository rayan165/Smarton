#!/bin/bash
set -e

echo "Building contracts..."
cd contracts && forge build

echo "Running tests..."
forge test -vvv

echo "Deploying to X Layer mainnet..."
forge script script/Deploy.s.sol \
  --rpc-url ${XLAYER_RPC_URL:-https://rpc.xlayer.tech} \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY

echo "Deployment complete! Update .env with contract addresses from broadcast output."
