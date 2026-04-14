// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct TrustScore {
    uint16 overall;
    uint16 tradePerformance;
    uint16 securityHygiene;
    uint16 peerRating;
    uint16 uptime;
    uint64 lastUpdated;
    uint32 totalInteractions;
}

interface ITrustScorer {
    error AgentNotRegistered();
    error ScoreOutOfRange();
    error CallerNotAuthorized();
    error CooldownNotElapsed();

    event ScoreUpdated(uint256 indexed agentId, uint16 oldScore, uint16 newScore, uint32 interactions);
    event TierUpgrade(uint256 indexed agentId, uint8 oldTier, uint8 newTier);
    event TierDowngrade(uint256 indexed agentId, uint8 oldTier, uint8 newTier);

    function updateScore(uint256 agentId, uint16 tradePerformance, uint16 securityHygiene, uint16 peerRating, uint16 uptime) external;
    function setOracle(address oracle) external;

    function getScore(uint256 agentId) external view returns (TrustScore memory);
    function getOverallScore(uint256 agentId) external view returns (uint16);
    function getScoreHistory(uint256 agentId) external view returns (uint16[10] memory);
    function computeComposite(uint16 trade, uint16 security, uint16 peer, uint16 up) external pure returns (uint16);
}
