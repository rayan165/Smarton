// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {ITrustScorer, TrustScore} from "./interfaces/ITrustScorer.sol";

contract TrustScorer is Ownable, ITrustScorer {
    uint16 public constant TIER_2_THRESHOLD = 6000;
    uint32 public constant TIER_2_INTERACTIONS = 50;
    uint16 public constant TIER_3_THRESHOLD = 8500;
    uint32 public constant TIER_3_INTERACTIONS = 500;
    uint64 public constant UPDATE_COOLDOWN = 300;

    IAgentRegistry public immutable agentRegistry;
    address public oracle;
    mapping(uint256 => TrustScore) private _scores;
    mapping(uint256 => uint16[10]) private _scoreHistory;
    mapping(uint256 => uint8) private _historyIndex;

    constructor(IAgentRegistry _agentRegistry) Ownable(msg.sender) {
        agentRegistry = _agentRegistry;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function updateScore(
        uint256 agentId,
        uint16 trade,
        uint16 security,
        uint16 peer,
        uint16 up
    ) external {
        if (msg.sender != oracle) revert CallerNotAuthorized();
        if (trade > 10000 || security > 10000 || peer > 10000 || up > 10000) revert ScoreOutOfRange();
        if (agentRegistry.getAgentTier(agentId) == 0) revert AgentNotRegistered();

        TrustScore storage s = _scores[agentId];
        if (s.lastUpdated != 0 && block.timestamp - s.lastUpdated < UPDATE_COOLDOWN) {
            revert CooldownNotElapsed();
        }

        uint16 oldOverall = s.overall;
        uint16 newOverall = computeComposite(trade, security, peer, up);

        s.overall = newOverall;
        s.tradePerformance = trade;
        s.securityHygiene = security;
        s.peerRating = peer;
        s.uptime = up;
        s.lastUpdated = uint64(block.timestamp);
        s.totalInteractions++;

        _scoreHistory[agentId][_historyIndex[agentId] % 10] = newOverall;
        _historyIndex[agentId]++;

        emit ScoreUpdated(agentId, oldOverall, newOverall, s.totalInteractions);

        _checkAndUpdateTier(agentId);
    }

    function _checkAndUpdateTier(uint256 agentId) internal {
        uint8 currentTier = agentRegistry.getAgentTier(agentId);
        TrustScore memory s = _scores[agentId];

        uint8 targetTier;
        if (s.overall >= TIER_3_THRESHOLD && s.totalInteractions >= TIER_3_INTERACTIONS) {
            targetTier = 3;
        } else if (s.overall >= TIER_2_THRESHOLD && s.totalInteractions >= TIER_2_INTERACTIONS) {
            targetTier = 2;
        } else {
            targetTier = 1;
        }

        if (targetTier != currentTier) {
            agentRegistry.updateTier(agentId, targetTier);
            if (targetTier > currentTier) {
                emit TierUpgrade(agentId, currentTier, targetTier);
            } else {
                emit TierDowngrade(agentId, currentTier, targetTier);
            }
        }
    }

    function computeComposite(uint16 t, uint16 s, uint16 p, uint16 u) public pure returns (uint16) {
        return uint16((uint256(t) * 3000 + uint256(s) * 2500 + uint256(p) * 2500 + uint256(u) * 2000) / 10000);
    }

    function getScore(uint256 agentId) external view returns (TrustScore memory) {
        return _scores[agentId];
    }

    function getOverallScore(uint256 agentId) external view returns (uint16) {
        return _scores[agentId].overall;
    }

    function getScoreHistory(uint256 agentId) external view returns (uint16[10] memory) {
        return _scoreHistory[agentId];
    }
}
