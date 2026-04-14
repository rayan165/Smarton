// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITrustGate {
    error AgentNotRegistered();
    error TierTooLow(uint8 required, uint8 actual);

    function checkTier(address agent, uint8 requiredTier) external view returns (bool);
    function requireTier(address agent, uint8 requiredTier) external view;
}
