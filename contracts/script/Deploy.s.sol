// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TrustScorer} from "../src/TrustScorer.sol";
import {TrustGate} from "../src/TrustGate.sol";
import {SmartonTreasury} from "../src/SmartonTreasury.sol";
import {ServiceRegistry} from "../src/ServiceRegistry.sol";
import {SmartonStaking} from "../src/SmartonStaking.sol";

contract Deploy is Script {
    function run() external {
        address usdc = vm.envAddress("USDC_ADDRESS");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        AgentRegistry agentRegistry = new AgentRegistry();
        TrustScorer trustScorer = new TrustScorer(agentRegistry);
        TrustGate trustGate = new TrustGate(agentRegistry);
        SmartonTreasury treasury = new SmartonTreasury(IERC20(usdc));
        ServiceRegistry serviceRegistry = new ServiceRegistry(
            agentRegistry,
            trustGate,
            treasury,
            IERC20(usdc)
        );
        SmartonStaking staking = new SmartonStaking(
            agentRegistry,
            IERC20(usdc),
            address(treasury)
        );

        agentRegistry.setTrustScorer(address(trustScorer));
        treasury.setServiceRegistry(address(serviceRegistry));
        staking.setServiceRegistry(address(serviceRegistry));
        serviceRegistry.setStaking(staking);

        vm.stopBroadcast();

        console.log("AgentRegistry:", address(agentRegistry));
        console.log("TrustScorer:", address(trustScorer));
        console.log("TrustGate:", address(trustGate));
        console.log("SmartonTreasury:", address(treasury));
        console.log("ServiceRegistry:", address(serviceRegistry));
        console.log("SmartonStaking:", address(staking));
    }
}
