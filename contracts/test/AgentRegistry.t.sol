// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {IAgentRegistry, AgentInfo} from "../src/interfaces/IAgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public scorer = makeAddr("scorer");

    function setUp() public {
        registry = new AgentRegistry();
    }

    function test_RegisterAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("signal-agent-uri");

        assertEq(agentId, 1);
        AgentInfo memory info = registry.getAgentInfo(agentId);
        assertEq(info.owner, alice);
        assertEq(info.tier, 1);
        assertEq(info.agentURI, "signal-agent-uri");
    }

    function test_CannotRegisterTwice() public {
        vm.startPrank(alice);
        registry.registerAgent("first-uri");
        vm.expectRevert(IAgentRegistry.AgentAlreadyRegistered.selector);
        registry.registerAgent("second-uri");
        vm.stopPrank();
    }

    function test_CannotRegisterEmptyURI() public {
        vm.prank(alice);
        vm.expectRevert(IAgentRegistry.InvalidAgentURI.selector);
        registry.registerAgent("");
    }

    function test_SoulboundCannotTransfer() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent("test-uri");

        vm.prank(alice);
        vm.expectRevert(IAgentRegistry.SoulboundTransferBlocked.selector);
        registry.transferFrom(alice, bob, agentId);
    }

    function test_OnlyTrustScorerCanUpdateTier() public {
        vm.prank(alice);
        registry.registerAgent("test-uri");

        vm.prank(bob);
        vm.expectRevert(IAgentRegistry.NotAuthorizedScorer.selector);
        registry.updateTier(1, 2);
    }

    function test_TrustScorerUpdatesTier() public {
        vm.prank(alice);
        registry.registerAgent("test-uri");

        registry.setTrustScorer(scorer);

        vm.prank(scorer);
        registry.updateTier(1, 2);

        assertEq(registry.getAgentTier(1), 2);
    }

    function test_ReverseLookupByWallet() public {
        vm.prank(alice);
        registry.registerAgent("test-uri");

        uint256 agentId = registry.getAgentByAddress(alice);
        assertEq(agentId, 1);
    }

    function test_TotalAgentsIncrements() public {
        vm.prank(alice);
        registry.registerAgent("uri-1");
        vm.prank(bob);
        registry.registerAgent("uri-2");
        vm.prank(charlie);
        registry.registerAgent("uri-3");

        assertEq(registry.totalAgents(), 3);
    }
}
