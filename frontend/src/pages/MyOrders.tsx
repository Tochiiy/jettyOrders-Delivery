import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import * as orderService from "../services/orderService";
import type { IOrder } from "../types/types";
import { BiArrowBack, BiPackage, BiBus, BiCreditCard, BiTag, BiTime, BiCheckCircle } from "react-icons/bi";

const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "ready_for_pickup", "ready_for_rider", "rider_assigned", "pickedUp"]

const statusColor: Record<string, string> = {
    placed: "text-blue-600 bg-blue-100",
    accepted: "text-indigo-600 bg-indigo-100",
    preparing: "text-yellow-600 bg-yellow-100",
    ready_for_pickup: "text-orange-600 bg-orange-100",
    ready_for_rider: "text-purple-600 bg-purple-100",
    rider_assigned: "text-purple-600 bg-purple-100",
    pickedUp: "text-cyan-600 bg-cyan-100",
    delivered: "text-green-600 bg-green-100",
    cancelled: "text-red-600 bg-red-100",
    canceled: "text-red-600 bg-red-100",
};

const statusLabel: Record<string, string> = {
    placed: "Placed",
    accepted: "Accepted",
    preparing: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    ready_for_rider: "Ready for Rider",
    rider_assigned: "Rider Assigned",
    pickedUp: "Picked Up",
    delivered: "Delivered",
    cancelled: "Cancelled",
    canceled: "Cancelled",
};

const MyOrders = () => {
    const navigate = useNavigate();
    const { user } = useAppData();
    const [orders, setOrders] = useState<IOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"active" | "completed">("active");
    const { socket } = useSocket()

    const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
    const completedOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status))

    const fetchOrders = async () => {
        try {
            const { data } = await orderService.getMyOrders();
            setOrders(data.orders || []);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === "seller") {
            navigate("/seller/orders", { replace: true });
            return;
        }
        fetchOrders();
    }, [user, navigate]);

    useEffect(() => { 
        if (!socket) return;
        socket.on("order:update", fetchOrders)
        return () => {
            socket.off("order:update", fetchOrders)
         }
    }, [socket])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-10">
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin h-8 w-8 border-2 border-[#E23744] border-t-transparent rounded-full" />
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
                    <h1 className="text-xl font-bold text-slate-900">Your Orders</h1>
                </div>

                {orders.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                        <BiPackage className="mx-auto h-12 w-12 text-slate-300" />
                        <h2 className="mt-4 text-xl font-semibold text-slate-900">No orders yet</h2>
                        <p className="mt-2 text-sm text-slate-500">Place your first order to see it here.</p>
                        <button
                            onClick={() => navigate("/")}
                            className="mt-6 rounded-3xl bg-[#E23744] px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            Browse Restaurants
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2 border-b border-slate-200 pb-2">
                            <button onClick={() => setTab("active")}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === "active" ? "bg-white text-[#E23744] border-b-2 border-[#E23744]" : "text-slate-500 hover:text-slate-700"}`}>
                                Active ({activeOrders.length})
                            </button>
                            <button onClick={() => setTab("completed")}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === "completed" ? "bg-white text-[#E23744] border-b-2 border-[#E23744]" : "text-slate-500 hover:text-slate-700"}`}>
                                Completed ({completedOrders.length})
                            </button>
                        </div>

                        {tab === "active" ? (
                            activeOrders.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-8">No active orders</p>
                            ) : (
                                activeOrders.map((order) => (
                                <div key={order._id} onClick={() => navigate(`/order/${order._id}`)} className="cursor-pointer rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900">{order.restuarantName}</h2>
                                            <p className="mt-1 text-xs text-slate-400">Order #{order._id.slice(-8)}</p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[order.status] || "text-slate-600 bg-slate-100"}`}>
                                            {statusLabel[order.status] || order.status}
                                        </span>
                                    </div>

                                    <div className="divide-y divide-slate-100 py-3">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-2">
                                                <span className="text-sm text-slate-500">{item.quantity}x {item.name}</span>
                                                <span className="text-sm font-medium text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-500">
                                        <div className="flex justify-between">
                                            <span className="flex items-center gap-1.5"><BiPackage className="h-3.5 w-3.5" />Items</span>
                                            <span>${order.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="flex items-center gap-1.5"><BiBus className="h-3.5 w-3.5" />Delivery</span>
                                            <span>${order.deliveryFee.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="flex items-center gap-1.5"><BiCreditCard className="h-3.5 w-3.5" />Platform</span>
                                            <span>${order.platformFee.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                                            <span className="flex items-center gap-1.5"><BiTag className="h-4 w-4 text-[#E23744]" />Total</span>
                                            <span className="text-[#E23744]">${order.totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                                        <BiTime className="h-3.5 w-3.5" />
                                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                                            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                        })}
                                        {order.paymentStatus === "paid" && (
                                            <span className="ml-auto flex items-center gap-1 text-green-600">
                                                <BiCheckCircle className="h-3.5 w-3.5" /> Paid
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-2 text-xs text-slate-400">{order.deliveryAddress.formattedAddress}</p>
                                </div>
                            ))
                            )
                        ) : (
                            completedOrders.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-8">No completed orders</p>
                            ) : (
                                completedOrders.map((order) => (
                                    <OrderRow key={order._id} order={order} onClick={() => navigate(`/order/${order._id}`)} />
                                ))
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const OrderRow = ({order, onClick}: {order: IOrder, onClick: () => void}) => {
    return (
        <div onClick={onClick} className="cursor-pointer rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">{order.restuarantName}</h2>
                    <p className="mt-1 text-xs text-slate-400">Order #{order._id.slice(-8)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[order.status] || "text-slate-600 bg-slate-100"}`}>
                    {statusLabel[order.status] || order.status}
                </span>
            </div>
        </div>
     )
}

export default MyOrders;
