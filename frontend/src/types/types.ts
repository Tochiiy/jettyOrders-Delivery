import type { Dispatch, SetStateAction } from "react";

export interface User {
    _id: string;
    name: string;
    email: string;
    image: string;
    role: string | null;
    restaurantId?: string;
}


export interface LocationData{
    latitude: number;
    longitude: number;
    formattedAddress: string;
}


export interface AppContextType {
    user: User | null;
    isAuth: boolean;
    loading: boolean;
    city: string;
    location: LocationData | null;
    loadingLocation: boolean;
    setUser: Dispatch<SetStateAction<User | null>>;
    setIsAuth: Dispatch<SetStateAction<boolean>>;
    setLoading: Dispatch<SetStateAction<boolean>>;
    cartItems: ICartItem[];
    addToCart: (item: ICartItem, quantity?: number) => Promise<void>;
    updateCartItem: (itemId: string, quantity: number) => Promise<void>;
removeFromCart: (itemId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    cartQuantity: number;
    cartTotal: number;
    subtotal: number;
    platformFee: number;
    deliveryFee: number;
    cartLoading: boolean;
    fetchCart: () => Promise<void>;
}


export interface IMenuItem {
    _id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    category?: string;
    isAvailable: boolean;
    restaurantId?: string;
    createdAt?: string;
}

export interface ICartItem {
    menuItemId: string;
    name: string;
    price: number;
    image?: string;
    category?: string;
    restaurantId?: string;
    restaurantName?: string;
    quantity: number;
}


export interface IOrderItem {
    name: string;
    menuItemId: string;
    price: number;
    quantity: number;
}

export interface IDeliveryAddress {
    formattedAddress: string;
    mobile: number;
    latitude: number;
    longitude: number;
}

export type OrderStatus = "placed" | "accepted" | "preparing" | "ready_for_pickup" | "rider_assigned" | "pickedUp" | "canceled" | "delivered";

export type PaymentStatus = "paid" | "unpaid";

export interface IOrder {
    _id: string;
    userId: string;
    restaurantId: string;
    restuarantName: string;
    riderId?: string | null;
    riderPhone?: number | null;
    riderName?: string | null;
    distance: number;
    riderAmount: number;
    items: IOrderItem[];
    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    totalAmount: number;
    addressId: string;
    deliveryAddress: IDeliveryAddress;
    status: OrderStatus;
    paymentMethod: "stripe";
    paymentStatus: PaymentStatus;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface IRestaurant {
    _id: string;
    name: string;
    description?: string;
    image: string;
    address: string;
    ownerId: string;
    phone: number;
    isVerified: boolean;
    autoLocation: {
        type: "Point";
        coordinates: [number, number];
        formattedAddress: string;
    }
    isOpen: boolean;
    createdAt: Date;
}