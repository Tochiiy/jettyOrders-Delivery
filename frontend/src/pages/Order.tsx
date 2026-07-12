import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import * as addressService from "../services/addressService";
import * as orderService from "../services/orderService";
import * as paymentService from "../services/paymentService";
import { BiArrowBack, BiMapPin, BiPlus, BiPackage, BiBus, BiCreditCard, BiTag, BiErrorCircle } from "react-icons/bi";

interface SavedAddress {
    _id: string;
    formattedAddress: string;
    mobile: number;
    latitude: number;
    longitude: number;
}

const Order = () => {
    const navigate = useNavigate();
    const { cartItems, cartTotal, subtotal, platformFee, deliveryFee, user } = useAppData();

    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [loadingAddresses, setLoadingAddresses] = useState(true);

    const [placing, setPlacing] = useState(false);
    const [placeError, setPlaceError] = useState("");

    useEffect(() => {
        const fetchAddresses = async () => {
            try {
                const { data } = await addressService.getAddresses();
                const list: SavedAddress[] = data.addresses || data.address || [];
                setAddresses(list);
                if (list.length > 0) setSelectedAddressId(list[0]._id);
            } catch (err) {
                console.error("Failed to load addresses:", err);
            } finally {
                setLoadingAddresses(false);
            }
        };
        fetchAddresses();
    }, []);

    const selectedAddress = addresses.find((a) => a._id === selectedAddressId);
    const hasItems = cartItems.length > 0;

    const handlePlaceOrder = async () => {
        if (!selectedAddressId) return;
        setPlacing(true);
        setPlaceError("");

        try {
            const { data } = await orderService.createOrder({
                paymentMethod: "stripe",
                addressId: selectedAddressId,
            });

            const { data: intentData } = await paymentService.createPaymentIntent({
                orderId: data.orderId,
                amount: data.amount,
            });

            const checkoutData = {
                orderId: data.orderId,
                paymentIntentId: intentData.paymentIntentId,
                clientSecret: intentData.clientSecret,
                amount: data.amount,
            };
            sessionStorage.setItem("checkout_data", JSON.stringify(checkoutData));

            navigate("/checkout", { state: checkoutData });
        } catch (err: any) {
            setPlaceError(err?.response?.data?.message || "Failed to place order. Please try again.");
            setPlacing(false);
        }
    };

    if (user?.role === "seller") {
        navigate("/", { replace: true });
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center gap-3">
                    <button onClick={() => navigate("/cart")} className="rounded-2xl bg-white p-2 shadow-sm hover:bg-gray-50">
                        <BiArrowBack className="h-5 w-5 text-slate-700" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Order Review</h1>
                </div>

                {!hasItems ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                        <h2 className="text-2xl font-semibold text-slate-900">Your cart is empty</h2>
                        <p className="mt-3 text-sm text-slate-500">Add items to your cart before placing an order.</p>
                        <button
                            onClick={() => navigate("/")}
                            className="mt-6 rounded-3xl bg-[#E23744] px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            Browse Restaurants
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-6">
                            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <BiMapPin className="h-5 w-5 text-[#E23744]" />
                                        Delivery Address
                                    </h2>
                                    <button
                                        onClick={() => navigate("/address")}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-[#E23744]/10 px-4 py-2 text-sm font-semibold text-[#E23744] transition hover:bg-[#E23744]/20"
                                    >
                                        <BiPlus className="h-4 w-4" />
                                        Add New
                                    </button>
                                </div>

                                {loadingAddresses ? (
                                    <div className="flex items-center justify-center py-8">
                                        <span className="animate-spin h-6 w-6 border-2 border-[#E23744] border-t-transparent rounded-full" />
                                    </div>
                                ) : addresses.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                                        <p className="text-sm text-slate-500">No saved addresses.</p>
                                        <button
                                            onClick={() => navigate("/address")}
                                            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E23744]/10 px-4 py-2 text-sm font-semibold text-[#E23744] transition hover:bg-[#E23744]/20"
                                        >
                                            <BiPlus className="h-4 w-4" />
                                            Add an address
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {addresses.map((addr) => (
                                            <label
                                                key={addr._id}
                                                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                                                    selectedAddressId === addr._id
                                                        ? "border-[#E23744] bg-[#E23744]/5 ring-1 ring-[#E23744]"
                                                        : "border-slate-200 bg-white hover:border-slate-300"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="address"
                                                    value={addr._id}
                                                    checked={selectedAddressId === addr._id}
                                                    onChange={() => setSelectedAddressId(addr._id)}
                                                    className="mt-1 h-4 w-4 accent-[#E23744]"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-900">{addr.formattedAddress}</p>
                                                    <p className="mt-1 text-sm text-slate-500">Phone: {addr.mobile}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="mb-4 text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <BiPackage className="h-5 w-5 text-[#E23744]" />
                                    Order Summary
                                </h2>
                                <div className="divide-y divide-slate-100">
                                    {cartItems.map((item) => (
                                        <div key={item.menuItemId} className="flex items-center justify-between py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-slate-500">{item.quantity}x</span>
                                                <span className="text-sm font-medium text-slate-900">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-900">
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <aside className="space-y-4">
                            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-4 text-lg font-semibold text-slate-900">Fee Details</h3>
                                <div className="space-y-3 border-b border-slate-200 pb-4">
                                    <div className="flex items-center justify-between text-sm text-slate-500">
                                        <span className="flex items-center gap-2"><BiPackage className="h-4 w-4" />Items total</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-slate-500">
                                        <span className="flex items-center gap-2"><BiBus className="h-4 w-4" />Delivery fee</span>
                                        <span>${deliveryFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-slate-500">
                                        <span className="flex items-center gap-2"><BiCreditCard className="h-4 w-4" />Platform fee</span>
                                        <span>${platformFee.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 text-base font-semibold text-slate-900">
                                    <span className="flex items-center gap-2"><BiTag className="h-5 w-5 text-[#E23744]" />Total</span>
                                    <span className="text-[#E23744]">${cartTotal.toFixed(2)}</span>
                                </div>

                                {selectedAddress && (
                                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            <BiMapPin className="h-3.5 w-3.5" />
                                            Delivering to
                                        </p>
                                        <p className="mt-1 text-sm text-slate-700">{selectedAddress.formattedAddress}</p>
                                    </div>
                                )}

                                {placeError && (
                                    <div className="mt-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
                                        <BiErrorCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-700">{placeError}</p>
                                    </div>
                                )}
                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={!selectedAddressId || placing}
                                    className="mt-4 w-full rounded-3xl bg-[#E23744] px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {placing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                            Placing order...
                                        </span>
                                    ) : (
                                        "Place Order"
                                    )}
                                </button>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Order;
