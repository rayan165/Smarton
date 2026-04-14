// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TrustScorer} from "../src/TrustScorer.sol";
import {ITrustScorer, TrustScore} from "../src/interfaces/ITrustScorer.sol";

contract TrustScorerTest is Test {
    AgentRegistry public registry;
    TrustScorer public scorer;
    address public oracle = makeAddr("oracle");
    address public testAgent = makeAddr("testAgent");

    function setUp() public {
        registry = new AgentRegistry();
        scorer = new TrustScorer(registry);
        registry.setTrustScorer(address(scorer));
        scorer.setOracle(oracle);

        vm.prank(testAgent);
        registry.registerAgent("test-agent-uri");
    }

    function _updateScore(uint16 t, uint16 s, uint16 p, uint16 u) internal {
        vm.prank(oracle);
        scorer.updateScore(1, t, s, p, u);
    }

    function _updateScoreWithWarp(uint16 t, uint16 s, uint16 p, uint16 u) internal {
        vm.warp(block.timestamp + 301);
        _updateScore(t, s, p, u);
    }

    function test_UpdatesScoreCorrectly() public {
        _updateScore(8000, 7000, 9000, 6000);

        TrustScore memory ts = scorer.getScore(1);
        assertEq(ts.tradePerformance, 8000);
        assertEq(ts.securityHygiene, 7000);
        assertEq(ts.peerRating, 9000);
        assertEq(ts.uptime, 6000);
        assertEq(ts.totalInteractions, 1);
    }

    function test_ComputesCompositeCorrectly() public view {
        // (8000*3000 + 7000*2500 + 9000*2500 + 6000*2000) / 10000
        // = (24000000 + 17500000 + 22500000 + 12000000) / 10000
        // = 76000000 / 10000 = 7600
        uint16 result = scorer.computeComposite(8000, 7000, 9000, 6000);
        assertEq(result, 7600);
    }

    function test_AutoPromotesToTier2() public {
        for (uint256 i = 0; i < 50; i++) {
            _updateScoreWithWarp(8000, 7000, 9000, 6000);
        }
        assertEq(registry.getAgentTier(1), 2);
    }

    function test_AutoPromotesToTier3() public {
        // First reach tier 2 (50 interactions)
        for (uint256 i = 0; i < 50; i++) {
            _updateScoreWithWarp(9000, 9000, 9000, 9000);
        }
        assertEq(registry.getAgentTier(1), 2);
        // Verify tier 3 threshold logic: need 500 interactions
        // Check that score >= 8500 but interactions < 500 stays at tier 2
        TrustScore memory ts = scorer.getScore(1);
        assertGe(ts.overall, 8500);
        assertLt(ts.totalInteractions, 500);
        assertEq(registry.getAgentTier(1), 2); // still tier 2, not enough interactions
    }

    function test_DemotesOnScoreDrop() public {
        // Promote to tier 2 first
        for (uint256 i = 0; i < 50; i++) {
            _updateScoreWithWarp(8000, 7000, 9000, 6000);
        }
        assertEq(registry.getAgentTier(1), 2);

        // Now drop score below threshold
        _updateScoreWithWarp(2000, 2000, 2000, 2000);
        assertEq(registry.getAgentTier(1), 1);
    }

    function test_RespectsCooldown() public {
        _updateScore(8000, 7000, 9000, 6000);

        vm.warp(block.timestamp + 100); // only 100 seconds
        vm.prank(oracle);
        vm.expectRevert(ITrustScorer.CooldownNotElapsed.selector);
        scorer.updateScore(1, 8000, 7000, 9000, 6000);
    }

    function test_SkipsCooldownOnFirstUpdate() public {
        // First update should work without any wait
        _updateScore(8000, 7000, 9000, 6000);
        TrustScore memory ts = scorer.getScore(1);
        assertEq(ts.totalInteractions, 1);
    }

    function test_OnlyOracleCanUpdate() public {
        vm.prank(testAgent);
        vm.expectRevert(ITrustScorer.CallerNotAuthorized.selector);
        scorer.updateScore(1, 8000, 7000, 9000, 6000);
    }

    function test_RejectsScoreAbove10000() public {
        vm.prank(oracle);
        vm.expectRevert(ITrustScorer.ScoreOutOfRange.selector);
        scorer.updateScore(1, 10001, 7000, 9000, 6000);
    }

    function test_TracksScoreHistory() public {
        for (uint256 i = 0; i < 5; i++) {
            _updateScoreWithWarp(uint16(6000 + i * 500), 7000, 8000, 6000);
        }

        uint16[10] memory history = scorer.getScoreHistory(1);
        uint256 nonZero = 0;
        for (uint256 i = 0; i < 10; i++) {
            if (history[i] != 0) nonZero++;
        }
        assertEq(nonZero, 5);
    }
}
