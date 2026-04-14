// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TrustGate} from "../src/TrustGate.sol";
import {ITrustGate} from "../src/interfaces/ITrustGate.sol";

contract TrustGateTest is Test {
    AgentRegistry public registry;
    TrustGate public gate;
    address public agent = makeAddr("agent");
    address public stranger = makeAddr("stranger");

    function setUp() public {
        registry = new AgentRegistry();
        gate = new TrustGate(registry);

        vm.prank(agent);
        registry.registerAgent("test-agent-uri");
    }

    function test_CheckTierSufficient() public view {
        bool result = gate.checkTier(agent, 1);
        assertTrue(result);
    }

    function test_CheckTierInsufficient() public view {
        bool result = gate.checkTier(agent, 2);
        assertFalse(result);
    }

    function test_RequireTierRevertsUnregistered() public {
        vm.expectRevert(ITrustGate.AgentNotRegistered.selector);
        gate.requireTier(stranger, 1);
    }

    function test_RequireTierRevertsTierTooLow() public {
        vm.expectRevert(abi.encodeWithSelector(ITrustGate.TierTooLow.selector, 2, 1));
        gate.requireTier(agent, 2);
    }
}
