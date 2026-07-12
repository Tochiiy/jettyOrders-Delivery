import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { getOrderById } from "../services/orderService";
import type { IOrder } from "../types/types";
import { BiArrowBack, BiPackage, BiBus, BiCreditCard, BiTag, BiTime, BiCheckCircle } from "react-icons/bi";

const statusColor: Record<string, string> = {
    placed: "text-blue-600 bg-blue-100",
    accepted: "text-indigo-600 bg-indigo-100",
    preparing: "text-yellow-600 bg-yellow-100",
    ready_for_pickup: "text-orange-600 bg-orange-100",
    ready_for_rider: "text-purple-600 bg-purple-100",
    rider_assigned: "text-purple-600 bg-purple-100",
    pickedUp: "text-cyan-600 bg-cyan-100",
    delivered: "text-green-600 bg-green-100",
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
    canceled: "Cancelled",
};

const OrderConfirmation = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [order, setOrder] = useState<IOrder | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchOrder = async () => {
        if (!orderId) return;
        try {
            const { data } = await getOrderById(orderId);
            setOrder(data.order);
        } catch {
            console.error("Failed to fetch order");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    useEffect(() => {
        if (!socket) return;
        socket.on("order:update", fetchOrder);
        return () => {
            socket.off("order:update", fetchOrder);
        };
    }, [socket]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-10">
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin h-8 w-8 border-2 border-[#E23744] border-t-transparent rounded-full" />
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 py-10">
                <div className="mx-auto max-w-lg px-4 text-center">
                    <p className="text-slate-500">Order not found.</p>
                    <button onClick={() => navigate("/orders")} className="mt-4 text-[#E23744] underline">View all orders</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center gap-3">
                    <button onClick={() => navigate("/orders")} className="rounded-2xl bg-white p-2 shadow-sm hover:bg-gray-50">
                        <BiArrowBack className="h-5 w-5 text-slate-700" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Order Details</h1>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
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
            </div>
        </div>
    );
};

export default OrderConfirmation;
