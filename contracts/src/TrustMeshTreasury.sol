// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TrustMeshTreasury is Ownable {
    IERC20 public immutable usdc;
    address public serviceRegistry;
    uint256 public constant RATING_INCENTIVE = 1000; // 0.001 USDC

    event FeeCollected(uint256 amount);
    event IncentivePaid(address indexed rater, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(IERC20 _usdc) Ownable(msg.sender) {
        usdc = _usdc;
    }

    function setServiceRegistry(address _sr) external onlyOwner {
        serviceRegistry = _sr;
    }

    function collectFee(uint256 amount) external {
        require(msg.sender == serviceRegistry, "Not authorized");
        emit FeeCollected(amount);
    }

    function payRatingIncentive(address rater) external {
        require(msg.sender == serviceRegistry, "Not authorized");
        if (usdc.balanceOf(address(this)) >= RATING_INCENTIVE) {
            usdc.transfer(rater, RATING_INCENTIVE);
            emit IncentivePaid(rater, RATING_INCENTIVE);
        }
    }

    function withdraw(address to, uint256 amount) external onlyOwner {
        usdc.transfer(to, amount);
        emit FundsWithdrawn(to, amount);
    }

    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
