// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {ITrustGate} from "./interfaces/ITrustGate.sol";
import {TrustMeshTreasury} from "./TrustMeshTreasury.sol";
import {IServiceRegistry, ServiceListing, ServiceOrder, ServiceStatus} from "./interfaces/IServiceRegistry.sol";

contract ServiceRegistry is Ownable, ReentrancyGuard, IServiceRegistry {
    uint256 public constant PROTOCOL_FEE_BPS = 200;
    uint64 public constant DISPUTE_WINDOW = 3600;

    IAgentRegistry public immutable agentRegistry;
    ITrustGate public immutable trustGate;
    TrustMeshTreasury public immutable treasury;
    IERC20 public immutable usdc;

    uint256 private _nextServiceId = 1;
    uint256 private _nextOrderId = 1;
    mapping(uint256 => ServiceListing) private _services;
    mapping(uint256 => ServiceOrder) private _orders;
    mapping(uint256 => uint256[]) private _agentServices;
    mapping(uint256 => uint256[]) private _agentOrders;

    constructor(
        IAgentRegistry _agentRegistry,
        ITrustGate _trustGate,
        TrustMeshTreasury _treasury,
        IERC20 _usdc
    ) Ownable(msg.sender) {
        agentRegistry = _agentRegistry;
        trustGate = _trustGate;
        treasury = _treasury;
        usdc = _usdc;
    }

    function listService(
        string calldata serviceType,
        string calldata description,
        uint256 priceUSDC,
        uint8 minBuyerTier
    ) external returns (uint256 serviceId) {
        require(agentRegistry.isRegistered(msg.sender), "Not registered");
        uint256 sellerAgentId = agentRegistry.getAgentByAddress(msg.sender);

        serviceId = _nextServiceId++;
        _services[serviceId] = ServiceListing({
            serviceId: serviceId,
            sellerAgentId: sellerAgentId,
            sellerWallet: msg.sender,
            serviceType: serviceType,
            description: description,
            priceUSDC: priceUSDC,
            minBuyerTier: minBuyerTier,
            active: true
        });
        _agentServices[sellerAgentId].push(serviceId);

        emit ServiceListed(serviceId, sellerAgentId, serviceType, priceUSDC);
    }

    function delistService(uint256 serviceId) external {
        ServiceListing storage svc = _services[serviceId];
        if (svc.serviceId == 0) revert ServiceNotFound();
        if (msg.sender != svc.sellerWallet) revert NotSeller();
        svc.active = false;
        emit ServiceDelisted(serviceId);
    }

    function purchaseService(uint256 serviceId) external nonReentrant returns (uint256 orderId) {
        ServiceListing storage svc = _services[serviceId];
        if (svc.serviceId == 0 || !svc.active) revert ServiceNotFound();
        require(agentRegistry.isRegistered(msg.sender), "Not registered");
        trustGate.requireTier(msg.sender, svc.minBuyerTier);
        if (msg.sender == svc.sellerWallet) revert BuyerCannotBeSeller();

        uint256 buyerAgentId = agentRegistry.getAgentByAddress(msg.sender);

        usdc.transferFrom(msg.sender, address(this), svc.priceUSDC);

        orderId = _nextOrderId++;
        _orders[orderId] = ServiceOrder({
            orderId: orderId,
            serviceId: serviceId,
            buyerAgentId: buyerAgentId,
            buyerWallet: msg.sender,
            sellerAgentId: svc.sellerAgentId,
            sellerWallet: svc.sellerWallet,
            amount: svc.priceUSDC,
            status: ServiceStatus.Escrowed,
            createdAt: uint64(block.timestamp),
            deliveredAt: 0,
            completedAt: 0,
            buyerRating: 0,
            deliveryHash: ""
        });
        _agentOrders[buyerAgentId].push(orderId);
        _agentOrders[svc.sellerAgentId].push(orderId);

        emit OrderCreated(orderId, serviceId, buyerAgentId, svc.priceUSDC);
    }

    function deliverService(uint256 orderId, string calldata deliveryHash) external {
        ServiceOrder storage order = _orders[orderId];
        if (msg.sender != order.sellerWallet) revert NotSeller();
        if (order.status != ServiceStatus.Escrowed) {
            revert OrderNotInExpectedStatus(ServiceStatus.Escrowed, order.status);
        }
        order.status = ServiceStatus.Delivered;
        order.deliveredAt = uint64(block.timestamp);
        order.deliveryHash = deliveryHash;

        emit ServiceDelivered(orderId, deliveryHash);
    }

    function confirmAndRate(uint256 orderId, uint8 rating) external nonReentrant {
        ServiceOrder storage order = _orders[orderId];
        if (msg.sender != order.buyerWallet) revert NotBuyer();
        if (order.status != ServiceStatus.Delivered) {
            revert OrderNotInExpectedStatus(ServiceStatus.Delivered, order.status);
        }
        if (rating < 1 || rating > 5) revert RatingOutOfRange();

        uint256 fee = (order.amount * PROTOCOL_FEE_BPS) / 10000;
        uint256 sellerPayout = order.amount - fee;

        usdc.transfer(order.sellerWallet, sellerPayout);
        usdc.transfer(address(treasury), fee);
        treasury.collectFee(fee);
        treasury.payRatingIncentive(order.buyerWallet);

        order.status = ServiceStatus.Completed;
        order.buyerRating = rating;
        order.completedAt = uint64(block.timestamp);

        emit OrderCompleted(orderId, rating);
    }

    function fileDispute(uint256 orderId) external {
        ServiceOrder storage order = _orders[orderId];
        if (msg.sender != order.buyerWallet) revert NotBuyer();
        if (order.status != ServiceStatus.Delivered) {
            revert OrderNotInExpectedStatus(ServiceStatus.Delivered, order.status);
        }
        if (block.timestamp - order.deliveredAt > DISPUTE_WINDOW) revert DisputeWindowExpired();
        order.status = ServiceStatus.Disputed;

        emit DisputeFiled(orderId, msg.sender);
    }

    function resolveDispute(uint256 orderId, bool refund) external onlyOwner nonReentrant {
        ServiceOrder storage order = _orders[orderId];
        if (order.status != ServiceStatus.Disputed) {
            revert OrderNotInExpectedStatus(ServiceStatus.Disputed, order.status);
        }

        if (refund) {
            usdc.transfer(order.buyerWallet, order.amount);
            order.status = ServiceStatus.Refunded;
        } else {
            uint256 fee = (order.amount * PROTOCOL_FEE_BPS) / 10000;
            uint256 sellerPayout = order.amount - fee;
            usdc.transfer(order.sellerWallet, sellerPayout);
            usdc.transfer(address(treasury), fee);
            treasury.collectFee(fee);
            order.status = ServiceStatus.Completed;
        }
        order.completedAt = uint64(block.timestamp);

        emit DisputeResolved(orderId, refund);
    }

    function completeExpiredOrder(uint256 orderId) external nonReentrant {
        ServiceOrder storage order = _orders[orderId];
        if (order.status != ServiceStatus.Delivered) {
            revert OrderNotInExpectedStatus(ServiceStatus.Delivered, order.status);
        }
        require(block.timestamp - order.deliveredAt > DISPUTE_WINDOW, "Window not expired");

        uint256 fee = (order.amount * PROTOCOL_FEE_BPS) / 10000;
        uint256 sellerPayout = order.amount - fee;
        usdc.transfer(order.sellerWallet, sellerPayout);
        usdc.transfer(address(treasury), fee);
        treasury.collectFee(fee);

        order.status = ServiceStatus.Completed;
        order.buyerRating = 5;
        order.completedAt = uint64(block.timestamp);

        emit OrderCompleted(orderId, 5);
    }

    function getService(uint256 serviceId) external view returns (ServiceListing memory) {
        return _services[serviceId];
    }

    function getOrder(uint256 orderId) external view returns (ServiceOrder memory) {
        return _orders[orderId];
    }

    function getActiveServices() external view returns (ServiceListing[] memory) {
        uint256 count = 0;
        uint256 max = _nextServiceId;
        for (uint256 i = 1; i < max && count < 100; i++) {
            if (_services[i].active) count++;
        }
        ServiceListing[] memory result = new ServiceListing[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i < max && idx < count; i++) {
            if (_services[i].active) {
                result[idx++] = _services[i];
            }
        }
        return result;
    }

    function getAgentServices(uint256 agentId) external view returns (ServiceListing[] memory) {
        uint256[] storage ids = _agentServices[agentId];
        ServiceListing[] memory result = new ServiceListing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _services[ids[i]];
        }
        return result;
    }

    function getAgentOrders(uint256 agentId) external view returns (ServiceOrder[] memory) {
        uint256[] storage ids = _agentOrders[agentId];
        ServiceOrder[] memory result = new ServiceOrder[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _orders[ids[i]];
        }
        return result;
    }

    function getAverageRating(uint256 agentId) external view returns (uint16) {
        uint256[] storage ids = _agentOrders[agentId];
        uint256 sum = 0;
        uint256 count = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            ServiceOrder storage o = _orders[ids[i]];
            if (o.sellerAgentId == agentId && o.buyerRating > 0) {
                sum += o.buyerRating;
                count++;
            }
        }
        if (count == 0) return 0;
        return uint16((sum * 100) / count);
    }

    function totalServices() external view returns (uint256) {
        return _nextServiceId - 1;
    }

    function totalOrders() external view returns (uint256) {
        return _nextOrderId - 1;
    }
}
