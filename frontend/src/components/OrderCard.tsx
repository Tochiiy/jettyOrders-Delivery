import ORDER_ACTIONS from "../utils/orderflow";
import type { IOrder } from "../types/types"
import { useState } from "react";
import axios from "axios";
import { RESTAURANT_API, authHeaders } from "../services/api";
import { toast } from "react-hot-toast";

interface Props {
    order: IOrder
    onstatusUpdate?: () => void;
}

const statusColor = (status: string) => {
  switch (status) {
    case "placed":
      return "bg-yellow-100 text-yellow-700"
    case "accepted":
      return "bg-blue-100 text-blue-700"
    case "preparing":
      return "bg-indigo-100 text-indigo-700"
    case "ready_for_pickup":
    case "ready_for_rider":
      return "bg-purple-100 text-purple-700"
    case "rider_assigned":
      return "bg-cyan-100 text-cyan-700"
    case "pickedUp":
      return "bg-orange-100 text-orange-700"
    case "delivered":
      return "bg-green-100 text-green-700"
    case "canceled":
      return "bg-red-100 text-red-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

const OrderCard = ({ order, onstatusUpdate }: Props) => {
  const [loading, setLoading] = useState(false);

  const actions = ORDER_ACTIONS[order.status] || [];

  const updateStatus = async (status: string) => {
    try {
      setLoading(true);
      await axios.put(`${RESTAURANT_API}/api/order/${order._id}/status`, { status }, { headers: authHeaders() })
      toast.success("Status updated");
      onstatusUpdate?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Order #{order._id.slice(-6)}
        </p>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(order.status)}`}>
          {order.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        {order.items.map((item, i) => (
          <p key={i}>{item.name} x{item.quantity}</p>
        ))}
      </div>

      <div className="flex justify-between text-sm font-medium">
        <span>Total</span>
        <span>${order.totalAmount.toFixed(2)}</span>
      </div>

      <p className="text-xs text-gray-400">Payment: {order.paymentStatus}</p>

      {order.paymentStatus === "paid" && actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {actions.map((status) => (
            <button
              key={status}
              className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
              onClick={() => updateStatus(status)}
              disabled={loading}
            >
              Mark as {status.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default OrderCard
