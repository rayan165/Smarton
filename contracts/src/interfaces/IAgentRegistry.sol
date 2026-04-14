// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct AgentInfo {
    address owner;
    uint8 tier;
    uint64 registeredAt;
    uint64 lastActive;
    string agentURI;
}

interface IAgentRegistry {
    error NotAgentOwner();
    error AgentAlreadyRegistered();
    error InvalidAgentURI();
    error AgentNotFound();
    error NotAuthorizedScorer();
    error SoulboundTransferBlocked();

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);
    event AgentTierUpdated(uint256 indexed agentId, uint8 oldTier, uint8 newTier);

    function registerAgent(string calldata agentURI) external returns (uint256 agentId);
    function updateTier(uint256 agentId, uint8 newTier) external;
    function updateLastActive(uint256 agentId) external;
    function setTrustScorer(address scorer) external;

    function getAgentInfo(uint256 agentId) external view returns (AgentInfo memory);
    function getAgentTier(uint256 agentId) external view returns (uint8);
    function getAgentByAddress(address wallet) external view returns (uint256);
    function isRegistered(address wallet) external view returns (bool);
    function totalAgents() external view returns (uint256);
}
