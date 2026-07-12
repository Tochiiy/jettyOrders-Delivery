import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import * as orderService from "../services/orderService";
import { BiArrowBack, BiCheckCircle, BiXCircle, BiTime, BiMapPin } from "react-icons/bi";

interface OrderItem {
    name: string;
    price: number;
    quantity: number;
}

interface Order {
    _id: string;
    userId: string;
    restuarantName: string;
    items: OrderItem[];
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    deliveryAddress: {
        formattedAddress: string;
        mobile: number;
    };
}

const statusFlow: Record<string, string[]> = {
    placed: ["accepted", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["rider_assigned"],
    rider_assigned: ["pickedUp"],
    pickedUp: ["delivered"],
};

const statusLabel: Record<string, string> = {
    placed: "Placed",
    accepted: "Accept",
    preparing: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    rider_assigned: "Assign Rider",
    pickedUp: "Picked Up",
    delivered: "Delivered",
    cancelled: "Cancel",
};

const statusBadge: Record<string, string> = {
    placed: "text-blue-600 bg-blue-100",
    accepted: "text-indigo-600 bg-indigo-100",
    preparing: "text-yellow-600 bg-yellow-100",
    ready_for_pickup: "text-orange-600 bg-orange-100",
    rider_assigned: "text-purple-600 bg-purple-100",
    pickedUp: "text-cyan-600 bg-cyan-100",
    delivered: "text-green-600 bg-green-100",
    cancelled: "text-red-600 bg-red-100",
    canceled: "text-red-600 bg-red-100",
};

const SellerOrders = () => {
    const navigate = useNavigate();
    const { user } = useAppData();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"active" | "completed" | "cancelled">("active");

    useEffect(() => {
        if (!user || user.role !== "seller") {
            navigate("/", { replace: true });
            return;
        }
        if (!user.restaurantId) {
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            try {
                const { data } = await orderService.getRestaurantOrders(user.restaurantId!);
                setOrders(data.orders || []);
            } catch (err) {
                console.error("Failed to fetch orders:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [user, navigate]);

    const handleStatusUpdate = async (orderId: string, status: string) => {
        setUpdating(orderId);
        try {
            await orderService.updateOrderStatus(orderId, status);
            setOrders((prev) =>
                prev.map((o) => (o._id === orderId ? { ...o, status } : o))
            );
        } catch (err) {
            console.error("Failed to update status:", err);
        } finally {
            setUpdating(null);
        }
    };

    const filteredOrders = orders.filter((o) => {
        if (activeTab === "active") return !["delivered", "cancelled", "canceled"].includes(o.status);
        if (activeTab === "completed") return o.status === "delivered";
        return ["cancelled", "canceled"].includes(o.status);
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-10">
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin h-8 w-8 border-2 border-[#E23744] border-t-transparent rounded-full" />
                </div>
            </div>
        );
    }

    if (!user?.restaurantId) {
        return (
            <div className="min-h-screen bg-gray-50 py-10">
                <div className="mx-auto max-w-lg px-4 text-center">
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 shadow-sm">
                        <h2 className="text-xl font-semibold text-slate-900">No restaurant found</h2>
                        <p className="mt-2 text-sm text-slate-500">Create a restaurant to start managing orders.</p>
                        <button
                            onClick={() => navigate("/seller/add")}
                            className="mt-6 rounded-3xl bg-[#E23744] px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            Add Restaurant
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center gap-3">
                    <button onClick={() => navigate("/account")} className="rounded-2xl bg-white p-2 shadow-sm hover:bg-gray-50">
                        <BiArrowBack className="h-5 w-5 text-slate-700" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Manage Orders</h1>
                </div>

                <div className="mb-6 flex gap-2">
                    {(["active", "completed", "cancelled"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                                activeTab === tab
                                    ? "bg-[#E23744] text-white"
                                    : "bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            {tab === "active" ? "Active" : tab === "completed" ? "Completed" : "Cancelled"}
                        </button>
                    ))}
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                        <p className="text-sm text-slate-500">No orders in this tab.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => (
                            <div key={order._id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">Order #{order._id.slice(-8)}</h2>
                                        <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusBadge[order.status] || "text-slate-600 bg-slate-100"}`}>
                                            {statusLabel[order.status] || order.status}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-[#E23744]">${order.totalAmount.toFixed(2)}</span>
                                </div>

                                <div className="mt-3 divide-y divide-slate-100">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-1.5">
                                            <span className="text-sm text-slate-600">{item.quantity}x {item.name}</span>
                                            <span className="text-sm text-slate-800">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                                    <BiTime className="h-3.5 w-3.5" />
                                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                    })}
                                    {order.paymentStatus === "paid" && (
                                        <span className="ml-auto flex items-center gap-1 text-green-600">
                                            <BiCheckCircle className="h-3.5 w-3.5" /> Paid
                                        </span>
                                    )}
                                </div>

                                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                    <BiMapPin className="h-3.5 w-3.5" />
                                    {order.deliveryAddress.formattedAddress}
                                </p>

                                {statusFlow[order.status] && !["delivered", "cancelled", "canceled"].includes(order.status) && (
                                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                                        {statusFlow[order.status].map((nextStatus) => (
                                            <button
                                                key={nextStatus}
                                                onClick={() => handleStatusUpdate(order._id, nextStatus)}
                                                disabled={updating === order._id}
                                                className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                                                    nextStatus === "cancelled"
                                                        ? "border border-red-200 text-red-600 hover:bg-red-50"
                                                        : "bg-[#E23744] text-white hover:bg-red-700"
                                                }`}
                                            >
                                                {updating === order._id ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                        Updating...
                                                    </span>
                                                ) : (
                                                    statusLabel[nextStatus]
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellerOrders;