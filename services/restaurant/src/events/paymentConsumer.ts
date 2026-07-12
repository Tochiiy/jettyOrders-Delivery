import { getChannel } from "../config/rabbitmq.js";
import Order from "../models/Order.js";
import Cart from "../models/CartModel.js";
import axios from "axios";

const startPaymentConsumer = async () => {
    const channel = await getChannel();

    channel.consume(process.env.PAYMENT_QUEUE as string, async (msg) => {
        if (!msg) return;

        try {
            const event = JSON.parse(msg.content.toString());
            console.log("Payment event received:", event);

            if (event.type === "PAYMENT_SUCCESS") {
                const { orderId } = event.data;

                const order = await Order.findOneAndUpdate(
                    { _id: orderId, paymentStatus: { $ne: "paid" } },
                    { $set: { paymentStatus: "paid", status: "placed" }, $unset: { expiresAt: "" } },
                    { returnDocument: "after" }
                );

                if (!order) {
                    console.log("Order already paid or not found:", orderId);
                    channel.ack(msg);
                    return;
                }

                await Cart.deleteOne({ userId: order.userId });

                console.log("Payment Success - order placed:", orderId);

                // Notify the restaurant in real-time via Socket.IO
                await axios.post(`${process.env.REALTIME_SERVICE_URL}/api/internal/emit`, {
                    event: "order:new",
                    room: `restaurant-${order.restaurantId}`,
                    payload: {
                        orderId: order._id.toString(),
                    },
                }, {
                    headers: {
                        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
                    },
                });
            }

            channel.ack(msg);
        } catch (err) {
            console.error("Payment consumer error:", err);
            channel.nack(msg, false, false);
        }
    });

    console.log("Payment consumer started 🐇");
};

export { startPaymentConsumer };
