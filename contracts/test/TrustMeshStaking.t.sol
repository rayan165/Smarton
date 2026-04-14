// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TrustScorer} from "../src/TrustScorer.sol";
import {TrustGate} from "../src/TrustGate.sol";
import {TrustMeshTreasury} from "../src/TrustMeshTreasury.sol";
import {ServiceRegistry} from "../src/ServiceRegistry.sol";
import {TrustMeshStaking} from "../src/TrustMeshStaking.sol";
import {ITrustMeshStaking} from "../src/interfaces/ITrustMeshStaking.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract TrustMeshStakingTest is Test {
    AgentRegistry public registry;
    TrustScorer public scorer;
    TrustGate public gate;
    TrustMeshTreasury public treasury;
    ServiceRegistry public sr;
    TrustMeshStaking public staking;
    MockUSDC public usdc;

    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public oracle = makeAddr("oracle");

    uint256 public constant ONE_USDC = 1_000_000;

    function setUp() public {
        usdc = new MockUSDC();
        registry = new AgentRegistry();
        scorer = new TrustScorer(registry);
        gate = new TrustGate(registry);
        treasury = new TrustMeshTreasury(usdc);
        sr = new ServiceRegistry(registry, gate, treasury, usdc);
        staking = new TrustMeshStaking(registry, usdc, address(treasury));

        registry.setTrustScorer(address(scorer));
        scorer.setOracle(oracle);
        treasury.setServiceRegistry(address(sr));
        staking.setServiceRegistry(address(sr));
        sr.setStaking(staking);

        // Register agents
        vm.prank(seller);
        registry.registerAgent("seller-agent");
        vm.prank(buyer);
        registry.registerAgent("buyer-agent");

        // Fund accounts
        usdc.mint(seller, 200 * ONE_USDC);
        usdc.mint(buyer, 1000 * ONE_USDC);
        usdc.mint(address(treasury), 10 * ONE_USDC);

        // Approve staking contract
        vm.prank(seller);
        usdc.approve(address(staking), type(uint256).max);
        vm.prank(buyer);
        usdc.approve(address(sr), type(uint256).max);
    }

    function test_StakeUSDC() public {
        vm.prank(seller);
        staking.stake(10 * ONE_USDC);

        uint256 agentId = registry.getAgentByAddress(seller);
        assertEq(staking.getStake(agentId), 10 * ONE_USDC);
        assertEq(staking.getStakeMultiplier(agentId), 12000); // 10+ USDC = 1.2x
    }

    function test_StakeMultiplierTiers() public {
        uint256 agentId = registry.getAgentByAddress(seller);

        // 0.5 USDC → 1.0x
        vm.prank(seller);
        staking.stake(500_000);
        assertEq(staking.getStakeMultiplier(agentId), 10000);

        // +0.5 = 1 USDC → 1.1x
        vm.prank(seller);
        staking.stake(500_000);
        assertEq(staking.getStakeMultiplier(agentId), 11000);

        // +9 = 10 USDC → 1.2x
        vm.prank(seller);
        staking.stake(9 * ONE_USDC);
        assertEq(staking.getStakeMultiplier(agentId), 12000);

        // +90 = 100 USDC → 1.3x
        vm.prank(seller);
        staking.stake(90 * ONE_USDC);
        assertEq(staking.getStakeMultiplier(agentId), 13000);
    }

    function test_UnstakeAfterCooldown() public {
        vm.prank(seller);
        staking.stake(10 * ONE_USDC);

        uint256 balBefore = usdc.balanceOf(seller);

        vm.warp(block.timestamp + 86401); // 24h + 1s
        vm.prank(seller);
        staking.unstake(5 * ONE_USDC);

        assertEq(usdc.balanceOf(seller) - balBefore, 5 * ONE_USDC);

        uint256 agentId = registry.getAgentByAddress(seller);
        assertEq(staking.getStake(agentId), 5 * ONE_USDC);
    }

    function test_CannotUnstakeBeforeCooldown() public {
        vm.prank(seller);
        staking.stake(10 * ONE_USDC);

        vm.prank(seller);
        vm.expectRevert(ITrustMeshStaking.CooldownNotElapsed.selector);
        staking.unstake(5 * ONE_USDC);
    }

    function test_SlashOnDisputeLoss() public {
        // Seller stakes 10 USDC
        vm.prank(seller);
        staking.stake(10 * ONE_USDC);

        // Marketplace flow: list → purchase → deliver → dispute → resolve(refund=true)
        vm.prank(seller);
        uint256 serviceId = sr.listService("signal", "Signals", ONE_USDC, 1);

        vm.prank(buyer);
        uint256 orderId = sr.purchaseService(serviceId);

        vm.prank(seller);
        sr.deliverService(orderId, "QmHash");

        vm.prank(buyer);
        sr.fileDispute(orderId);

        uint256 buyerBalBefore = usdc.balanceOf(buyer);
        uint256 treasuryBalBefore = usdc.balanceOf(address(treasury));

        // Owner resolves dispute in buyer's favor → refund + slash
        sr.resolveDispute(orderId, true);

        uint256 agentId = registry.getAgentByAddress(seller);
        // 50% of 10 USDC slashed = 5 USDC
        assertEq(staking.getStake(agentId), 5 * ONE_USDC);
        // Buyer got: refund (1 USDC) + 60% of slash (3 USDC) = 4 USDC
        assertEq(usdc.balanceOf(buyer) - buyerBalBefore, ONE_USDC + 3 * ONE_USDC);
        // Treasury got: 40% of slash = 2 USDC
        assertEq(usdc.balanceOf(address(treasury)) - treasuryBalBefore, 2 * ONE_USDC);
    }

    function test_CannotUnstakeWhilePostSlashLocked() public {
        // Seller stakes
        vm.prank(seller);
        staking.stake(10 * ONE_USDC);

        // Get slashed via dispute
        vm.prank(seller);
        uint256 serviceId = sr.listService("signal", "Signals", ONE_USDC, 1);
        vm.prank(buyer);
        uint256 orderId = sr.purchaseService(serviceId);
        vm.prank(seller);
        sr.deliverService(orderId, "QmHash");
        vm.prank(buyer);
        sr.fileDispute(orderId);
        sr.resolveDispute(orderId, true);

        // Try to unstake within 7 days of slash — should fail
        vm.warp(block.timestamp + 86401); // past normal cooldown but within post-slash lock
        vm.prank(seller);
        vm.expectRevert(ITrustMeshStaking.CooldownNotElapsed.selector);
        staking.unstake(1 * ONE_USDC);
    }

    function test_OnlyServiceRegistryCanSlash() public {
        vm.prank(seller);
        staking.stake(10 * ONE_USDC);

        uint256 agentId = registry.getAgentByAddress(seller);
        vm.prank(buyer);
        vm.expectRevert(ITrustMeshStaking.NotAuthorizedSlasher.selector);
        staking.slashAgent(agentId, buyer, "unauthorized");
    }

    function test_TotalStakedTracking() public {
        vm.prank(seller);
        staking.stake(10 * ONE_USDC);

        vm.prank(buyer);
        usdc.approve(address(staking), type(uint256).max);
        vm.prank(buyer);
        staking.stake(5 * ONE_USDC);

        assertEq(staking.totalStaked(), 15 * ONE_USDC);

        // Seller unstakes 3
        vm.warp(block.timestamp + 86401);
        vm.prank(seller);
        staking.unstake(3 * ONE_USDC);

        assertEq(staking.totalStaked(), 12 * ONE_USDC);
    }
}
