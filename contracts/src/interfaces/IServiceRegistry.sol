// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

enum ServiceStatus { Listed, Escrowed, Delivered, Completed, Disputed, Refunded }

struct ServiceListing {
    uint256 serviceId;
    uint256 sellerAgentId;
    address sellerWallet;
    string serviceType;
    string description;
    uint256 priceUSDC;
    uint8 minBuyerTier;
    bool active;
}

struct ServiceOrder {
    uint256 orderId;
    uint256 serviceId;
    uint256 buyerAgentId;
    address buyerWallet;
    uint256 sellerAgentId;
    address sellerWallet;
    uint256 amount;
    ServiceStatus status;
    uint64 createdAt;
    uint64 deliveredAt;
    uint64 completedAt;
    uint8 buyerRating;
    string deliveryHash;
}

interface IServiceRegistry {
    error ServiceNotFound();
    error InsufficientPayment();
    error ServiceAlreadyCompleted();
    error NotBuyer();
    error NotSeller();
    error BuyerCannotBeSeller();
    error DisputeWindowExpired();
    error DisputeAlreadyFiled();
    error RatingOutOfRange();
    error OrderNotInExpectedStatus(ServiceStatus expected, ServiceStatus actual);

    event ServiceListed(uint256 indexed serviceId, uint256 indexed sellerAgentId, string serviceType, uint256 price);
    event ServiceDelisted(uint256 indexed serviceId);
    event OrderCreated(uint256 indexed orderId, uint256 indexed serviceId, uint256 indexed buyerAgentId, uint256 amount);
    event ServiceDelivered(uint256 indexed orderId, string deliveryHash);
    event OrderCompleted(uint256 indexed orderId, uint8 rating);
    event DisputeFiled(uint256 indexed orderId, address indexed filer);
    event DisputeResolved(uint256 indexed orderId, bool refunded);

    function listService(string calldata serviceType, string calldata description, uint256 priceUSDC, uint8 minBuyerTier) external returns (uint256 serviceId);
    function delistService(uint256 serviceId) external;
    function deliverService(uint256 orderId, string calldata deliveryHash) external;

    function purchaseService(uint256 serviceId) external returns (uint256 orderId);
    function confirmAndRate(uint256 orderId, uint8 rating) external;
    function fileDispute(uint256 orderId) external;

    function resolveDispute(uint256 orderId, bool refund) external;
    function completeExpiredOrder(uint256 orderId) external;

    function getService(uint256 serviceId) external view returns (ServiceListing memory);
    function getOrder(uint256 orderId) external view returns (ServiceOrder memory);
    function getActiveServices() external view returns (ServiceListing[] memory);
    function getAgentServices(uint256 agentId) external view returns (ServiceListing[] memory);
    function getAgentOrders(uint256 agentId) external view returns (ServiceOrder[] memory);
    function getAverageRating(uint256 agentId) external view returns (uint16);
    function totalServices() external view returns (uint256);
    function totalOrders() external view returns (uint256);
}
