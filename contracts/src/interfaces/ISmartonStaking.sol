// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISmartonStaking {
    error AgentNotRegistered();
    error InsufficientStake();
    error StakeAlreadyExists();
    error NoStakeFound();
    error CooldownNotElapsed();
    error NotAuthorizedSlasher();
    error SlashAmountExceedsStake();

    event Staked(uint256 indexed agentId, address indexed wallet, uint256 amount, uint256 totalStake);
    event Unstaked(uint256 indexed agentId, address indexed wallet, uint256 amount, uint256 remaining);
    event Slashed(uint256 indexed agentId, uint256 amount, uint256 toBuyer, uint256 toTreasury, string reason);
    event StakeMultiplierUpdated(uint256 indexed agentId, uint16 multiplier);

    function stake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function getStake(uint256 agentId) external view returns (uint256);
    function getStakeMultiplier(uint256 agentId) external view returns (uint16);

    function slashAgent(uint256 agentId, address buyer, string calldata reason) external;

    function getStakeInfo(uint256 agentId) external view returns (uint256 stakedAmount, uint16 multiplier, uint64 stakedAt, uint64 lastSlashedAt);
    function totalStaked() external view returns (uint256);
    function isStaked(uint256 agentId) external view returns (bool);
}
