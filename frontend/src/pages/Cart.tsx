import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { BsTrash, BsPlusLg, BsDashLg } from "react-icons/bs";
import { BiPackage, BiCreditCard, BiBus, BiTag, BiPlusCircle } from "react-icons/bi";
import { toast } from "react-hot-toast";
import * as restaurantService from "../services/restaurantService";

const Cart = () => {
    const navigate = useNavigate();
    const { cartItems, cartTotal, subtotal, platformFee, deliveryFee, cartLoading, updateCartItem, removeFromCart, clearCart, user } = useAppData();

    const formattedSubtotal = useMemo(() => {
        return subtotal.toFixed(2);
    }, [subtotal]);

    const formattedPlatformFee = useMemo(() => {
        return platformFee.toFixed(2);
    }, [platformFee]);

    const formattedDeliveryFee = useMemo(() => {
        return deliveryFee.toFixed(2);
    }, [deliveryFee]);

    const formattedTotal = useMemo(() => {
        return cartTotal.toFixed(2);
    }, [cartTotal]);

    const [restaurantClosed, setRestaurantClosed] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);

    if (user?.role === "seller") return <Navigate to="/" replace />;

    const hasItems = cartItems.length > 0;

    const checkRestaurantStatus = async () => {
        if (!hasItems) return;
        const restaurantId = cartItems[0].restaurantId;
        if (!restaurantId) return;
        
        setCheckingStatus(true);
        try {
            const token = localStorage.getItem("token") || undefined;
            const { data } = await restaurantService.getRestaurantById(restaurantId, token);
            if (data.restaurant && data.restaurant.isOpen === false) {
                setRestaurantClosed(true);
            }
        } catch (err) {
            console.error("Failed to check restaurant status:", err);
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleCheckout = async () => {
        if (restaurantClosed) return;
        await checkRestaurantStatus();
        if (restaurantClosed) return;
        navigate("/order");
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between relative">
                    {cartLoading && (
                        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-3xl" aria-busy="true" aria-live="polite">
                            <svg className="animate-spin h-8 w-8 text-[#E23744]" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">My Cart</h1>
                        <p className="mt-2 text-sm text-slate-500">Review your selected meals before checkout.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{cartItems.length} item{cartItems.length !== 1 ? "s" : ""}</span>
                        {hasItems && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm("Clear all items from your cart?")) {
                                        clearCart();
                                    }
                                }}
                                disabled={cartLoading}
                                className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear cart
                            </button>
                        )}
                    </div>
                </header>

                {hasItems ? (
                    <div className="grid gap-8 lg:grid-cols-[1.45fr_0.85fr]">
                        <div className="space-y-4">
                            {cartItems.map((item) => (
                                <article key={item.menuItemId} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-20 w-20 overflow-hidden rounded-3xl bg-gray-100">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-gray-400">No image</div>
                                                )}
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-slate-900">{item.name}</h2>
                                                {item.category && <p className="mt-1 text-sm text-slate-500">{item.category}</p>}
                                                {item.restaurantName && <p className="mt-2 text-sm text-slate-500">From {item.restaurantName}</p>}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-start gap-3 sm:items-end">
                                            <span className="text-xl font-bold text-[#E23744]">${item.price.toFixed(2)}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.menuItemId)}
                                                disabled={cartLoading}
                                                className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <BsTrash className="h-4 w-4" /> Remove
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3 rounded-3xl bg-white p-2 shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => updateCartItem(item.menuItemId, item.quantity - 1)}
                                                disabled={cartLoading || item.quantity <= 1}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <BsDashLg className="h-4 w-4" />
                                            </button>
                                            <span className="min-w-[2rem] text-center text-lg font-semibold text-slate-900">{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateCartItem(item.menuItemId, item.quantity + 1)}
                                                disabled={cartLoading}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <BsPlusLg className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            Subtotal: <span className="font-semibold text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="space-y-4">
                                {restaurantClosed && (
                                    <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
                                        <BiPlusCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-red-800">Restaurant is closed</p>
                                            <p className="text-sm text-red-700 mt-1">This restaurant is currently not accepting orders. Please try again later or choose another restaurant.</p>
                                        </div>
                                    </div>
                                )}
                                {checkingStatus && !restaurantClosed && (
                                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-2">
                                        <span className="animate-spin h-4 w-4 border-2 border-[#E23744] border-t-transparent rounded-full" />
                                        Verifying restaurant status...
                                    </div>
                                )}
                                <div className="space-y-2 border-b border-slate-200 pb-4">
                                    <div className="flex items-center justify-between text-sm text-slate-500">
                                        <span className="flex items-center gap-2"><BiPackage className="h-4 w-4" />Items total</span>
                                        <span>${formattedSubtotal}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-slate-500">
                                        <span className="flex items-center gap-2"><BiBus className="h-4 w-4" />Delivery fee</span>
                                        <span>${formattedDeliveryFee}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-slate-500">
                                        <span className="flex items-center gap-2"><BiCreditCard className="h-4 w-4" />Platform fee</span>
                                        <span>${formattedPlatformFee}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                                    <span className="flex items-center gap-2"><BiTag className="h-5 w-5 text-[#E23744]" />Total</span>
                                    <span className="text-[#E23744]">${formattedTotal}</span>
                                </div>
                                <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-500">
                                    <p className="font-medium text-slate-900">Need anything else?</p>
                                    <p className="mt-2 text-sm leading-6">You can adjust quantities or remove items before proceeding to checkout.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCheckout}
                                    disabled={cartLoading || restaurantClosed || checkingStatus}
                                    className="w-full rounded-3xl bg-[#E23744] px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {checkingStatus ? "Checking status..." : restaurantClosed ? "Restaurant Closed" : "Proceed to Checkout"}
                                </button>
                            </div>
                        </aside>
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                        <h2 className="text-2xl font-semibold text-slate-900">Your cart is empty</h2>
                        <p className="mt-3 text-sm text-slate-500">Browse the menu to add tasty meals to your cart.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;
