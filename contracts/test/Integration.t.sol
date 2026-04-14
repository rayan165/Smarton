// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TrustScorer} from "../src/TrustScorer.sol";
import {TrustGate} from "../src/TrustGate.sol";
import {TrustMeshTreasury} from "../src/TrustMeshTreasury.sol";
import {ServiceRegistry} from "../src/ServiceRegistry.sol";
import {ServiceOrder, ServiceStatus} from "../src/interfaces/IServiceRegistry.sol";
import {TrustScore} from "../src/interfaces/ITrustScorer.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract IntegrationTest is Test {
    AgentRegistry public registry;
    TrustScorer public scorer;
    TrustGate public gate;
    TrustMeshTreasury public treasury;
    ServiceRegistry public sr;
    MockUSDC public usdc;

    address public agentA = makeAddr("agentA");
    address public agentB = makeAddr("agentB");
    address public oracle = makeAddr("oracle");

    function setUp() public {
        usdc = new MockUSDC();
        registry = new AgentRegistry();
        scorer = new TrustScorer(registry);
        gate = new TrustGate(registry);
        treasury = new TrustMeshTreasury(usdc);
        sr = new ServiceRegistry(registry, gate, treasury, usdc);

        registry.setTrustScorer(address(scorer));
        scorer.setOracle(oracle);
        treasury.setServiceRegistry(address(sr));
    }

    function test_FullLifecycle() public {
        // 1. Register 2 agents
        vm.prank(agentA);
        uint256 idA = registry.registerAgent("agent-a-uri");
        vm.prank(agentB);
        uint256 idB = registry.registerAgent("agent-b-uri");
        assertEq(idA, 1);
        assertEq(idB, 2);

        // 2. Agent A lists service
        vm.prank(agentA);
        uint256 serviceId = sr.listService("signal", "Alpha signals", 1_000_000, 1);

        // 3. Agent B purchases
        usdc.mint(agentB, 10_000_000);
        vm.prank(agentB);
        usdc.approve(address(sr), type(uint256).max);
        usdc.mint(address(treasury), 1_000_000);

        vm.prank(agentB);
        uint256 orderId = sr.purchaseService(serviceId);

        // 4. Agent A delivers
        vm.prank(agentA);
        sr.deliverService(orderId, "QmDeliveryHash");

        // 5. Agent B rates 5 stars
        vm.prank(agentB);
        sr.confirmAndRate(orderId, 5);

        // Verify payments
        assertEq(usdc.balanceOf(agentA), 980_000); // 98% of 1 USDC
        assertGt(usdc.balanceOf(agentB), 0); // got incentive

        // 6. Oracle updates score for agent A
        vm.prank(oracle);
        scorer.updateScore(idA, 8000, 7000, 9000, 6000);

        TrustScore memory ts = scorer.getScore(idA);
        assertEq(ts.overall, 7600);
        assertEq(ts.totalInteractions, 1);

        // Verify average rating
        uint16 avgRating = sr.getAverageRating(idA);
        assertEq(avgRating, 500); // 5.00 * 100
    }
}
