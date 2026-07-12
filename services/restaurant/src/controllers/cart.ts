import { Response } from "express";
import TryCatch from "../middlewares/tryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import Cart from "../models/CartModel.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";

const DELIVERY_FEE = 2.99;
const PLATFORM_FEE_PERCENT = 0.05;

const calculateCartTotal = (items: Array<{ price?: number; quantity: number }>) => {
    return items.reduce((sum, item) => sum + ((item.price ?? 0) * item.quantity), 0);
};

const calculateFees = (subtotal: number) => {
    const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENT * 100) / 100;
    const deliveryFee = subtotal > 0 ? DELIVERY_FEE : 0;
    const grandTotal = Math.round((subtotal + platformFee + deliveryFee) * 100) / 100;
    return { subtotal, platformFee, deliveryFee, grandTotal };
};

const getCart = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const cart = await Cart.findOne({ userId: user._id });
    const responseCart = cart || { items: [] };
    const subtotal = calculateCartTotal(responseCart.items);
    const { platformFee, deliveryFee, grandTotal } = calculateFees(subtotal);
    res.status(200).json({ cart: responseCart, subtotal, platformFee, deliveryFee, cartTotal: grandTotal });
});

const addCartItem = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { menuItemId, quantity = 1 } = req.body;
    if (!menuItemId) return res.status(400).json({ message: "menuItemId is required" });

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
    }

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) return res.status(404).json({ message: "Menu item not found" });
    if (!menuItem.isAvailable) return res.status(400).json({ message: "Menu item is not available" });


    let cart = await Cart.findOneAndUpdate(
        { userId: user._id, "items.menuItemId": menuItem._id },
        { $inc: { "items.$.quantity": qty } },
        { returnDocument: "after" }
    );

    if (cart) {
        const subtotal = calculateCartTotal(cart.items);
        const { platformFee, deliveryFee, grandTotal } = calculateFees(subtotal);
        return res.status(200).json({ message: "Item added to cart", cart, subtotal, platformFee, deliveryFee, cartTotal: grandTotal });
    }


    const existingCart = await Cart.findOne({ userId: user._id });
    if (existingCart && existingCart.items.length > 0) {
        const existingRestaurantId = existingCart.items[0].restaurantId?.toString();
        if (existingRestaurantId && existingRestaurantId !== menuItem.restaurantId.toString()) {
            return res.status(400).json({
                message: "Your cart already contains items from a different restaurant. Please clear your cart before adding items from another restaurant.",
            });
        }
    }

    const restaurant = await Restaurant.findById(menuItem.restaurantId);

    
    cart = await Cart.findOneAndUpdate(
        { userId: user._id },
        {
            $push: {
                items: {
                    menuItemId: menuItem._id,
                    quantity: qty,
                    name: menuItem.name,
                    price: menuItem.price,
                    image: menuItem.image,
                    category: menuItem.category,
                    restaurantId: menuItem.restaurantId,
                    restaurantName: restaurant?.name,
                },
            },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    const subtotal = calculateCartTotal(cart!.items);
    const { platformFee, deliveryFee, grandTotal } = calculateFees(subtotal);
    res.status(200).json({ message: "Item added to cart", cart, subtotal, platformFee, deliveryFee, cartTotal: grandTotal });
});

const updateCartItem = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { menuItemId } = req.params;
    const { quantity } = req.body;
    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty < 0) {
        return res.status(400).json({ message: "Quantity must be 0 or greater" });
    }

    const cartExists = await Cart.exists({ userId: user._id });
    if (!cartExists) return res.status(404).json({ message: "Cart not found" });

    let cart;
    if (qty === 0) {
        
        cart = await Cart.findOneAndUpdate(
            { userId: user._id, "items.menuItemId": menuItemId },
            { $pull: { items: { menuItemId } } },
            { returnDocument: "after" }
        );
    } else {
        cart = await Cart.findOneAndUpdate(
            { userId: user._id, "items.menuItemId": menuItemId },
            { $set: { "items.$.quantity": qty } },
            { returnDocument: "after" }
        );
    }

    if (!cart) return res.status(404).json({ message: "Cart item not found" });

    const subtotal = calculateCartTotal(cart.items);
    const { platformFee, deliveryFee, grandTotal } = calculateFees(subtotal);
    res.status(200).json({ message: "Cart updated", cart, subtotal, platformFee, deliveryFee, cartTotal: grandTotal });
});

const removeCartItem = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { menuItemId } = req.params;

    const cart = await Cart.findOne({ userId: user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemExists = cart.items.some((item) => item.menuItemId.toString() === menuItemId);
    if (!itemExists) return res.status(404).json({ message: "Cart item not found" });

    
    const updatedCart = await Cart.findOneAndUpdate(
        { userId: user._id },
        { $pull: { items: { menuItemId } } },
        { returnDocument: "after" }
    );

    const subtotal = calculateCartTotal(updatedCart!.items);
    const { platformFee, deliveryFee, grandTotal } = calculateFees(subtotal);
    res.status(200).json({ message: "Item removed from cart", cart: updatedCart, subtotal, platformFee, deliveryFee, cartTotal: grandTotal });
});

const clearCart = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const cart = await Cart.findOneAndUpdate(
        { userId: user._id },
        { $set: { items: [] } },
        { returnDocument: "after" }
    );

    if (!cart) {
        return res.status(200).json({ message: "Cart already empty", cart: { items: [] }, subtotal: 0, platformFee: 0, deliveryFee: 0, cartTotal: 0 });
    }

    res.status(200).json({ message: "Cart cleared", cart, subtotal: 0, platformFee: 0, deliveryFee: 0, cartTotal: 0 });
});

export { getCart, addCartItem, updateCartItem, removeCartItem, clearCart };