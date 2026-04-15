// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAgentRegistry, AgentInfo} from "./interfaces/IAgentRegistry.sol";

contract AgentRegistry is ERC721, Ownable, IAgentRegistry {
    uint256 private _nextAgentId = 1;
    mapping(uint256 => AgentInfo) private _agents;
    mapping(address => uint256) private _walletToAgent;
    address public trustScorer;

    constructor() ERC721("Smarton Agent", "SMAR") Ownable(msg.sender) {}

    function registerAgent(string calldata agentURI) external returns (uint256 agentId) {
        if (bytes(agentURI).length == 0) revert InvalidAgentURI();
        if (_walletToAgent[msg.sender] != 0) revert AgentAlreadyRegistered();

        agentId = _nextAgentId++;
        _mint(msg.sender, agentId);
        _agents[agentId] = AgentInfo({
            owner: msg.sender,
            tier: 1,
            registeredAt: uint64(block.timestamp),
            lastActive: uint64(block.timestamp),
            agentURI: agentURI
        });
        _walletToAgent[msg.sender] = agentId;

        emit AgentRegistered(agentId, msg.sender, agentURI);
    }

    function updateTier(uint256 agentId, uint8 newTier) external {
        if (msg.sender != trustScorer) revert NotAuthorizedScorer();
        uint8 oldTier = _agents[agentId].tier;
        _agents[agentId].tier = newTier;
        emit AgentTierUpdated(agentId, oldTier, newTier);
    }

    function updateLastActive(uint256 agentId) external {
        if (msg.sender != _agents[agentId].owner) revert NotAgentOwner();
        _agents[agentId].lastActive = uint64(block.timestamp);
    }

    function setTrustScorer(address _scorer) external onlyOwner {
        trustScorer = _scorer;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert SoulboundTransferBlocked();
        return super._update(to, tokenId, auth);
    }

    function getAgentInfo(uint256 agentId) external view returns (AgentInfo memory) {
        return _agents[agentId];
    }

    function getAgentTier(uint256 agentId) external view returns (uint8) {
        return _agents[agentId].tier;
    }

    function getAgentByAddress(address wallet) external view returns (uint256) {
        return _walletToAgent[wallet];
    }

    function isRegistered(address wallet) external view returns (bool) {
        return _walletToAgent[wallet] != 0;
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }
}
