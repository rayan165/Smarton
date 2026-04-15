// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TrustScorer} from "../src/TrustScorer.sol";
import {TrustGate} from "../src/TrustGate.sol";
import {SmartonTreasury} from "../src/SmartonTreasury.sol";
import {ServiceRegistry} from "../src/ServiceRegistry.sol";
import {IServiceRegistry, ServiceOrder, ServiceStatus} from "../src/interfaces/IServiceRegistry.sol";
import {ITrustGate} from "../src/interfaces/ITrustGate.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract ServiceRegistryTest is Test {
    AgentRegistry public registry;
    TrustScorer public scorer;
    TrustGate public gate;
    SmartonTreasury public treasury;
    ServiceRegistry public sr;
    MockUSDC public usdc;

    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public oracle = makeAddr("oracle");

    uint256 public constant ONE_USDC = 1_000_000;

    function setUp() public {
        usdc = new MockUSDC();
        registry = new AgentRegistry();
        scorer = new TrustScorer(registry);
        gate = new TrustGate(registry);
        treasury = new SmartonTreasury(usdc);
        sr = new ServiceRegistry(registry, gate, treasury, usdc);

        registry.setTrustScorer(address(scorer));
        scorer.setOracle(oracle);
        treasury.setServiceRegistry(address(sr));

        // Register agents
        vm.prank(seller);
        registry.registerAgent("seller-agent-uri");
        vm.prank(buyer);
        registry.registerAgent("buyer-agent-uri");

        // Fund buyer with 1000 USDC
        usdc.mint(buyer, 1_000 * ONE_USDC);
        vm.prank(buyer);
        usdc.approve(address(sr), type(uint256).max);

        // Fund treasury for incentives
        usdc.mint(address(treasury), 10 * ONE_USDC);
    }

    function _listAndPurchase() internal returns (uint256 serviceId, uint256 orderId) {
        vm.prank(seller);
        serviceId = sr.listService("signal", "Trading signals", ONE_USDC, 1);
        vm.prank(buyer);
        orderId = sr.purchaseService(serviceId);
    }

    function test_ListsService() public {
        vm.prank(seller);
        uint256 serviceId = sr.listService("signal", "Trading signals", ONE_USDC, 1);
        assertEq(serviceId, 1);
        assertEq(sr.totalServices(), 1);
    }

    function test_PurchaseEscrowsUSDC() public {
        _listAndPurchase();
        uint256 buyerBal = usdc.balanceOf(buyer);
        assertEq(buyerBal, 999 * ONE_USDC);
        assertEq(usdc.balanceOf(address(sr)), ONE_USDC);
    }

    function test_TierGateBlocksLowTier() public {
        vm.prank(seller);
        sr.listService("premium", "Premium service", ONE_USDC, 2);

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(ITrustGate.TierTooLow.selector, 2, 1));
        sr.purchaseService(1);
    }

    function test_SellerDelivers() public {
        (, uint256 orderId) = _listAndPurchase();

        vm.prank(seller);
        sr.deliverService(orderId, "QmTestHash");

        ServiceOrder memory order = sr.getOrder(orderId);
        assertEq(uint8(order.status), uint8(ServiceStatus.Delivered));
        assertTrue(order.deliveredAt > 0);
    }

    function test_BuyerConfirmsAndRates() public {
        (, uint256 orderId) = _listAndPurchase();

        vm.prank(seller);
        sr.deliverService(orderId, "QmTestHash");

        uint256 sellerBalBefore = usdc.balanceOf(seller);
        vm.prank(buyer);
        sr.confirmAndRate(orderId, 4);

        ServiceOrder memory order = sr.getOrder(orderId);
        assertEq(uint8(order.status), uint8(ServiceStatus.Completed));
        assertEq(order.buyerRating, 4);

        // Seller got 98% of 1 USDC = 980_000
        uint256 sellerGot = usdc.balanceOf(seller) - sellerBalBefore;
        assertEq(sellerGot, 980_000);
    }

    function test_ProtocolFeeCollected() public {
        (, uint256 orderId) = _listAndPurchase();
        vm.prank(seller);
        sr.deliverService(orderId, "QmTestHash");

        uint256 treasuryBalBefore = usdc.balanceOf(address(treasury));
        vm.prank(buyer);
        sr.confirmAndRate(orderId, 4);

        // Treasury got 2% fee = 20_000, minus incentive paid = 1000
        uint256 treasuryGot = usdc.balanceOf(address(treasury)) - treasuryBalBefore;
        assertEq(treasuryGot, 20_000 - 1000);
    }

    function test_RatingIncentivePaid() public {
        (, uint256 orderId) = _listAndPurchase();
        vm.prank(seller);
        sr.deliverService(orderId, "QmTestHash");

        uint256 buyerBalBefore = usdc.balanceOf(buyer);
        vm.prank(buyer);
        sr.confirmAndRate(orderId, 4);

        // Buyer should get 1000 (0.001 USDC) incentive
        uint256 buyerIncentive = usdc.balanceOf(buyer) - buyerBalBefore;
        assertEq(buyerIncentive, 1000);
    }

    function test_CannotRateOutsideRange() public {
        (, uint256 orderId) = _listAndPurchase();
        vm.prank(seller);
        sr.deliverService(orderId, "QmTestHash");

        vm.prank(buyer);
        vm.expectRevert(IServiceRegistry.RatingOutOfRange.selector);
        sr.confirmAndRate(orderId, 0);

        vm.prank(buyer);
        vm.expectRevert(IServiceRegistry.RatingOutOfRange.selector);
        sr.confirmAndRate(orderId, 6);
    }

    function test_DisputeWithinWindow() public {
        (, uint256 orderId) = _listAndPurchase();
        vm.prank(seller);
        sr.deliverService(orderId, "QmTestHash");

        vm.prank(buyer);
        sr.fileDispute(orderId);

        ServiceOrder memory order = sr.getOrder(orderId);
        assertEq(uint8(order.status), uint8(ServiceStatus.Disputed));
    }

    function test_DisputeAfterWindowFails() public {
        (, uint256 orderId) = _listAndPurchase();
        vm.prank(seller);
        sr.deliverService(orderId, "QmTestHash");

        vm.warp(block.timestamp + 3601);
        vm.prank(buyer);
        vm.expectRevert(IServiceRegistry.DisputeWindowExpired.selector);
        sr.fileDispute(orderId);
    }

    function test_OwnerResolvesDisputeRefund() public {
        (, uint256 orderId) = _listAndPurchase();
        vm.prank(seller);
        sr.deliverService(orderId, "QmTestHash");
        vm.prank(buyer);
        sr.fileDispute(orderId);

        uint256 buyerBalBefore = usdc.balanceOf(buyer);
        sr.resolveDispute(orderId, true);

        uint256 buyerGot = usdc.balanceOf(buyer) - buyerBalBefore;
        assertEq(buyerGot, ONE_USDC);

        ServiceOrder memory order = sr.getOrder(orderId);
        assertEq(uint8(order.status), uint8(ServiceStatus.Refunded));
    }

    function test_BuyerCannotBeSeller() public {
        vm.prank(seller);
        sr.listService("signal", "Signals", ONE_USDC, 1);

        usdc.mint(seller, 10 * ONE_USDC);
        vm.startPrank(seller);
        usdc.approve(address(sr), type(uint256).max);
        vm.expectRevert(IServiceRegistry.BuyerCannotBeSeller.selector);
        sr.purchaseService(1);
        vm.stopPrank();
    }

    function test_AutoCompleteAfterWindow() public {
        (, uint256 orderId) = _listAndPurchase();
        vm.prank(seller);
        sr.deliverService(orderId, "QmTestHash");

        vm.warp(block.timestamp + 3601);
        uint256 sellerBalBefore = usdc.balanceOf(seller);
        sr.completeExpiredOrder(orderId);

        ServiceOrder memory order = sr.getOrder(orderId);
        assertEq(uint8(order.status), uint8(ServiceStatus.Completed));
        assertEq(order.buyerRating, 5);

        uint256 sellerGot = usdc.balanceOf(seller) - sellerBalBefore;
        assertEq(sellerGot, 980_000);
    }
}
