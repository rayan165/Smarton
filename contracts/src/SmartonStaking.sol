// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {ISmartonStaking} from "./interfaces/ISmartonStaking.sol";

contract SmartonStaking is Ownable, ISmartonStaking {
    struct StakeInfo {
        uint256 amount;
        uint16 multiplier;
        uint64 stakedAt;
        uint64 lastSlashedAt;
    }

    IAgentRegistry public immutable agentRegistry;
    IERC20 public immutable usdc;
    address public immutable treasury;
    address public serviceRegistry;

    mapping(uint256 => StakeInfo) private _stakes;
    uint256 private _totalStaked;

    uint64 public constant UNSTAKE_COOLDOWN = 86400;
    uint64 public constant POST_SLASH_LOCK = 604800;
    uint256 public constant SLASH_PERCENT = 50;
    uint256 public constant SLASH_BUYER_SHARE = 60;
    uint256 public constant SLASH_TREASURY_SHARE = 40;

    constructor(IAgentRegistry _agentRegistry, IERC20 _usdc, address _treasury) Ownable(msg.sender) {
        agentRegistry = _agentRegistry;
        usdc = _usdc;
        treasury = _treasury;
    }

    function setServiceRegistry(address _sr) external onlyOwner {
        serviceRegistry = _sr;
    }

    function stake(uint256 amount) external {
        if (!agentRegistry.isRegistered(msg.sender)) revert AgentNotRegistered();
        if (amount == 0) revert InsufficientStake();

        uint256 agentId = agentRegistry.getAgentByAddress(msg.sender);
        usdc.transferFrom(msg.sender, address(this), amount);

        StakeInfo storage s = _stakes[agentId];
        s.amount += amount;
        if (s.stakedAt == 0) {
            s.stakedAt = uint64(block.timestamp);
        }
        s.multiplier = _computeMultiplier(s.amount);
        _totalStaked += amount;

        emit Staked(agentId, msg.sender, amount, s.amount);
        emit StakeMultiplierUpdated(agentId, s.multiplier);
    }

    function unstake(uint256 amount) external {
        if (!agentRegistry.isRegistered(msg.sender)) revert AgentNotRegistered();

        uint256 agentId = agentRegistry.getAgentByAddress(msg.sender);
        StakeInfo storage s = _stakes[agentId];

        if (s.amount == 0) revert NoStakeFound();
        if (amount > s.amount) revert InsufficientStake();
        if (block.timestamp - s.stakedAt < UNSTAKE_COOLDOWN) revert CooldownNotElapsed();
        if (s.lastSlashedAt != 0 && block.timestamp - s.lastSlashedAt < POST_SLASH_LOCK) revert CooldownNotElapsed();

        s.amount -= amount;
        s.multiplier = _computeMultiplier(s.amount);
        _totalStaked -= amount;

        usdc.transfer(msg.sender, amount);

        emit Unstaked(agentId, msg.sender, amount, s.amount);
        emit StakeMultiplierUpdated(agentId, s.multiplier);
    }

    function slashAgent(uint256 agentId, address buyer, string calldata reason) external {
        if (msg.sender != serviceRegistry) revert NotAuthorizedSlasher();

        StakeInfo storage s = _stakes[agentId];
        if (s.amount == 0) revert NoStakeFound();

        uint256 slashAmount = (s.amount * SLASH_PERCENT) / 100;
        uint256 buyerShare = (slashAmount * SLASH_BUYER_SHARE) / 100;
        uint256 treasuryShare = slashAmount - buyerShare;

        s.amount -= slashAmount;
        s.lastSlashedAt = uint64(block.timestamp);
        s.multiplier = _computeMultiplier(s.amount);
        _totalStaked -= slashAmount;

        usdc.transfer(buyer, buyerShare);
        usdc.transfer(treasury, treasuryShare);

        emit Slashed(agentId, slashAmount, buyerShare, treasuryShare, reason);
        emit StakeMultiplierUpdated(agentId, s.multiplier);
    }

    function _computeMultiplier(uint256 stakedAmount) internal pure returns (uint16) {
        if (stakedAmount >= 100_000_000) return 13000;
        if (stakedAmount >= 10_000_000) return 12000;
        if (stakedAmount >= 1_000_000) return 11000;
        return 10000;
    }

    function getStake(uint256 agentId) external view returns (uint256) {
        return _stakes[agentId].amount;
    }

    function getStakeMultiplier(uint256 agentId) external view returns (uint16) {
        return _stakes[agentId].multiplier;
    }

    function getStakeInfo(uint256 agentId) external view returns (uint256 stakedAmount, uint16 multiplier, uint64 stakedAt, uint64 lastSlashedAt) {
        StakeInfo storage s = _stakes[agentId];
        return (s.amount, s.multiplier, s.stakedAt, s.lastSlashedAt);
    }

    function totalStaked() external view returns (uint256) {
        return _totalStaked;
    }

    function isStaked(uint256 agentId) external view returns (bool) {
        return _stakes[agentId].amount > 0;
    }
}
