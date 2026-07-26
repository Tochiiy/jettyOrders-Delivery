import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authService from "../services/authService";
import type { AppContextType, User, LocationData } from "../types/types";
import { useCart, CartProvider } from "./CartContext";

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProviderInner = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuth, setIsAuth] = useState(false);
    const [loading, setLoading] = useState(true);

    const [location, setLocation] = useState<LocationData | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [city, setCity] = useState("fetching location...");
    const {
        cartItems,
        cartTotal,
        subtotal,
        platformFee,
        deliveryFee,
        cartQuantity,
        loading: cartLoading,
        fetchCart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
    } = useCart();

    async function fetchUser() {
        try {
            setLoading(true);

            const { data } = await authService.fetchMe();
            const fetchedUser = data.user;
            setUser(fetchedUser);
            setIsAuth(true);
            if (fetchedUser.role === "customer") await fetchCart();
        } catch (error: any) {
            if (error?.response?.status === 401) {
                const refreshToken = localStorage.getItem("refreshToken");
                if (refreshToken) {
                    try {
                        const { data: refreshData } = await authService.refreshAccessToken(refreshToken);
                        localStorage.setItem("token", refreshData.token);
                        localStorage.setItem("refreshToken", refreshData.refreshToken);
                        window.dispatchEvent(new Event("token-changed"));
                        const { data: retryData } = await authService.fetchMe();
                        setUser(retryData.user);
                        setIsAuth(true);
                        if (retryData.user.role === "customer") await fetchCart();
                        setLoading(false);
                        return;
                    } catch {
                        localStorage.removeItem("token");
                        localStorage.removeItem("refreshToken");
                        setUser(null);
                        setIsAuth(false);
                    }
                } else {
                    localStorage.removeItem("token");
                    setUser(null);
                    setIsAuth(false);
                }
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) fetchUser();
        else setLoading(false);
    }, []);

    useEffect(() => {
        if (!navigator.geolocation) {
            setLoadingLocation(false);
            return;
        }
        setLoadingLocation(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
                    const d = await res.json();

                    setLocation({
                        latitude,
                        longitude,
                        formattedAddress: d.display_name || "current location"
                    })
                    setCity(d.address.city || d.address.town || d.address.village || "Your location...");
                } catch {
                    setLocation({ latitude, longitude, formattedAddress: "current location" })
                    setCity("failed to fetch location");
                } finally {
                    setLoadingLocation(false);
                }
            },
            () => {
                setCity("location denied");
                setLoadingLocation(false);
            }
        )
    }, []);

    return (
        <AppContext.Provider
            value={{
                user,
                isAuth,
                loading,
                setUser,
                setIsAuth,
                setLoading,
                location,
                city,
                loadingLocation,
                cartItems,
                addToCart,
                updateCartItem,
                removeFromCart,
                clearCart,
                cartQuantity,
                cartTotal,
                subtotal,
                platformFee,
                deliveryFee,
                cartLoading,
                fetchCart,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
    return (
        <CartProvider>
            <AppProviderInner>
                {children}
            </AppProviderInner>
        </CartProvider>
    );
}

export const useAppData = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppData must be used within a AppProvider");
    }
    return context;
}
