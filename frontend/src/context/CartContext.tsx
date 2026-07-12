import { createContext, useContext, useState, type ReactNode } from "react";
import * as cartService from "../services/cartService";
import type { ICartItem } from "../types/types";
interface CartContextType {
    cartItems: ICartItem[];
    cartTotal: number;
    subtotal: number;
    platformFee: number;
    deliveryFee: number;
    cartQuantity: number;
    loading: boolean;
    fetchCart: () => Promise<void>;
    addToCart: (item: ICartItem, quantity?: number) => Promise<void>;
    updateCartItem: (itemId: string, quantity: number) => Promise<void>;
    removeFromCart: (itemId: string) => Promise<void>;
    clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<ICartItem[]>([]);
    const [cartTotal, setCartTotal] = useState(0);
    const [subtotal, setSubtotal] = useState(0);
    const [platformFee, setPlatformFee] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchCart = async () => {
        try {
            setLoading(true);
            const { data } = await cartService.fetchCart();
            setCartItems(data.cart?.items || []);
            setSubtotal(data.subtotal || 0);
            setPlatformFee(data.platformFee || 0);
            setDeliveryFee(data.deliveryFee || 0);
            setCartTotal(data.cartTotal || 0);
        } catch (error) {
            console.error("Error fetching cart:", error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (item: ICartItem, quantity = 1) => {
        try {
            setLoading(true);
            const { data } = await cartService.addCartItem(item.menuItemId, quantity);
            setCartItems(data.cart?.items || []);
            setSubtotal(data.subtotal || 0);
            setPlatformFee(data.platformFee || 0);
            setDeliveryFee(data.deliveryFee || 0);
            setCartTotal(data.cartTotal || 0);
        } catch (error) {
            console.error("Error adding to cart:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updateCartItem = async (itemId: string, quantity: number) => {
        if (quantity < 0) return;
        try {
            setLoading(true);
            const { data } = await cartService.updateCartItem(itemId, quantity);
            setCartItems(data.cart?.items || []);
            setSubtotal(data.subtotal || 0);
            setPlatformFee(data.platformFee || 0);
            setDeliveryFee(data.deliveryFee || 0);
            setCartTotal(data.cartTotal || 0);
        } catch (error) {
            console.error("Error updating cart item:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const removeFromCart = async (itemId: string) => {
        try {
            setLoading(true);
            const { data } = await cartService.removeCartItem(itemId);
            setCartItems(data.cart?.items || []);
            setSubtotal(data.subtotal || 0);
            setPlatformFee(data.platformFee || 0);
            setDeliveryFee(data.deliveryFee || 0);
            setCartTotal(data.cartTotal || 0);
        } catch (error) {
            console.error("Error removing cart item:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const clearCart = async () => {
        try {
            setLoading(true);
            const { data } = await cartService.clearCart();
            setCartItems(data.cart?.items || []);
            setSubtotal(data.subtotal || 0);
            setPlatformFee(data.platformFee || 0);
            setDeliveryFee(data.deliveryFee || 0);
            setCartTotal(data.cartTotal || 0);
        } catch (error) {
            console.error("Error clearing cart:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const cartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            cartTotal,
            subtotal,
            platformFee,
            deliveryFee,
            cartQuantity,
            loading,
            fetchCart,
            addToCart,
            updateCartItem,
            removeFromCart,
            clearCart,
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = (): CartContextType => {
    const context = useContext(CartContext);
    if (!context) throw new Error("useCart must be used within a CartProvider");
    return context;
};
