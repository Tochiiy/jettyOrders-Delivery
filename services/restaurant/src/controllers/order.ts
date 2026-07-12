import TryCatch from "../middlewares/tryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import Order from "../models/Order.js";
import { Response } from "express";
import Address from "../models/Address.js";
import Cart from "../models/CartModel.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import axios from "axios";

const DELIVERY_FEE = 2.99;
const PLATFORM_FEE_PERCENT = 0.05;

const haversineDistance = (coords1: [number, number], coords2: [number, number]): number => {
    const [lng1, lat1] = coords1;
    const [lng2, lat2] = coords2;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
};

const getMyOrders = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const orders = await Order.find({ userId: user._id.toString(), paymentStatus: "paid" }).sort({ createdAt: -1 });
    res.status(200).json({ orders });
});

const createOrder = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { paymentMethod, addressId } = req.body;
    if (!paymentMethod || !addressId) return res.status(400).json({ message: "Payment method and address are required" });

    const address = await Address.findOne({ _id: addressId.toString(), userId: user._id.toString() });
    if (!address) return res.status(404).json({ message: "Address not found" });

    const cart = await Cart.findOne({ userId: user._id });
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty" });

    const firstItem = cart.items[0];
    if (!firstItem.restaurantId) return res.status(400).json({ message: "Cart item missing restaurant" });

    const restaurant = await Restaurant.findById(firstItem.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    if (!restaurant.isOpen) return res.status(400).json({ message: "Sorry, restaurant is closed" });

    let subtotal = 0;
    const orderItems = [];

    for (const cartItem of cart.items) {
        const menuItem = await MenuItem.findById(cartItem.menuItemId);
        if (!menuItem) return res.status(404).json({ message: `Menu item ${cartItem.menuItemId} not found` });

        const itemTotal = menuItem.price * cartItem.quantity;
        subtotal += itemTotal;

        orderItems.push({
            name: menuItem.name,
            menuItemId: menuItem._id.toString(),
            price: menuItem.price,
            quantity: cartItem.quantity,
        });
    }

    const distance = haversineDistance(
        restaurant.autoLocation.coordinates as [number, number],
        address.location.coordinates as [number, number]
    );
    const riderAmount = Math.ceil(Math.max(distance, 1) * 17);

    const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENT * 100) / 100;
    const deliveryFee = subtotal > 0 ? DELIVERY_FEE : 0;
    const totalAmount = Math.round((subtotal + platformFee + deliveryFee) * 100) / 100;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const [longitude, latitude] = address.location.coordinates;

    const order = await Order.create({
        userId: user._id.toString(),
        restaurantId: restaurant._id.toString(),
        restuarantName: restaurant.name,
        riderId: null,
        riderPhone: null,
        riderName: null,
        distance,
        riderAmount,
        items: orderItems,
        subtotal,
        deliveryFee,
        platformFee,
        totalAmount,
        addressId: address._id.toString(),
        deliveryAddress: {
            formattedAddress: address.formattedAddress,
            mobile: address.mobile,
            latitude,
            longitude,
        },
        paymentMethod,
        paymentStatus: "unpaid",
        status: "placed",
        expiresAt,
    });

    res.status(201).json({
        message: "Order created successfully",
        orderId: order._id.toString(),
        amount: totalAmount,
    });
});

const fetchOrderForPayment = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({ message: "Forbidden" });
    }

    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus === "paid") {
        return res.status(400).json({ message: "Order already paid" });
    }
    res.status(200).json({ orderId: order._id.toString(), amount: order.totalAmount, currency: "USD" });
});


const fetchRestaurantOrders = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    const { restaurantId } = req.params;

    if (!user || user.role !== "seller") return res.status(403).json({ message: "Seller access required" });
    if (!restaurantId) return res.status(400).json({ message: "Restaurant ID is required" });
    
    const  limit = req.query.limit ?  Number(req.query.limit): 0;
    const orders = await Order.find({ restaurantId, paymentStatus: "paid" }).sort({ createdAt: -1 }).limit(limit);

    return res.status(200).json({ 
        success: true,
        count: orders.length,
        orders
    });


})

const ALLOWED_STATUSES = ["accepted", "preparing", "ready_for_rider"] as const;

const updateOrderStatus = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user || user.role !== "seller") return res.status(403).json({ message: "Seller access required" });

    const { orderId } = req.params;
    const { status } = req.body;

    if (!status || !ALLOWED_STATUSES.includes(status))
        return res.status(400).json({ message: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}` });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus !== "paid") return res.status(400).json({ message: "Order is not paid" });

    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    if (restaurant.ownerId !== user._id.toString()) return res.status(403).json({ message: "Not allowed to update your restaurant's order" });

    order.status = status;
    await order.save();

    await axios.post(`${process.env.REALTIME_SERVICE_URL}/api/internal/emit`, {
        event: "order:update",
        room: `user:${order.userId}`,
        payload: {
            orderId: order._id.toString(),
            status: order.status,
        },
    }, {
        headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
    });

    return res.status(200).json({ message: "Order status updated successfully", order });
})

const fetchSingleOrder = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.userId !== user._id.toString()) return res.status(403).json({ message: "Not your order" });

    return res.status(200).json({ order });
});

export { createOrder, fetchOrderForPayment, getMyOrders, fetchRestaurantOrders, updateOrderStatus, fetchSingleOrder };
