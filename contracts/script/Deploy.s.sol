// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TrustScorer} from "../src/TrustScorer.sol";
import {TrustGate} from "../src/TrustGate.sol";
import {TrustMeshTreasury} from "../src/TrustMeshTreasury.sol";
import {ServiceRegistry} from "../src/ServiceRegistry.sol";

contract Deploy is Script {
    function run() external {
        address usdc = vm.envAddress("USDC_ADDRESS");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        AgentRegistry agentRegistry = new AgentRegistry();
        TrustScorer trustScorer = new TrustScorer(agentRegistry);
        TrustGate trustGate = new TrustGate(agentRegistry);
        TrustMeshTreasury treasury = new TrustMeshTreasury(IERC20(usdc));
        ServiceRegistry serviceRegistry = new ServiceRegistry(
            agentRegistry,
            trustGate,
            treasury,
            IERC20(usdc)
        );

        agentRegistry.setTrustScorer(address(trustScorer));
        treasury.setServiceRegistry(address(serviceRegistry));

        vm.stopBroadcast();

        console.log("AgentRegistry:", address(agentRegistry));
        console.log("TrustScorer:", address(trustScorer));
        console.log("TrustGate:", address(trustGate));
        console.log("TrustMeshTreasury:", address(treasury));
        console.log("ServiceRegistry:", address(serviceRegistry));
    }
}
