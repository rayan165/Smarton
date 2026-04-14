// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {ITrustGate} from "./interfaces/ITrustGate.sol";

contract TrustGate is ITrustGate {
    IAgentRegistry public immutable agentRegistry;

    constructor(IAgentRegistry _agentRegistry) {
        agentRegistry = _agentRegistry;
    }

    function checkTier(address agent, uint8 requiredTier) external view returns (bool) {
        uint256 agentId = agentRegistry.getAgentByAddress(agent);
        if (agentId == 0) return false;
        uint8 tier = agentRegistry.getAgentTier(agentId);
        return tier >= requiredTier;
    }

    function requireTier(address agent, uint8 requiredTier) external view {
        uint256 agentId = agentRegistry.getAgentByAddress(agent);
        if (agentId == 0) revert AgentNotRegistered();
        uint8 tier = agentRegistry.getAgentTier(agentId);
        if (tier < requiredTier) revert TierTooLow(requiredTier, tier);
    }
}
