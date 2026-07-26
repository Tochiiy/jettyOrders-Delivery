import { Request, Response } from "express";
import stripe, { createPaymentIntent } from "../config/stripepay.js";
import { publishPaymentSuccess } from "../events/paymentProducer.js";
import axios from "axios";

const createPaymentIntentHandler = async (req: Request, res: Response) => {
    try {
        const { orderId, amount } = req.body;
        if (!orderId) return res.status(400).json({ message: "orderId is required" });
        if (typeof amount !== "number" || amount <= 0 || !Number.isFinite(amount)) {
            return res.status(400).json({ message: "amount must be a positive number" });
        }

        const paymentIntent = await createPaymentIntent(amount);

        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (err) {
        console.error("Create payment intent error:", err);
        res.status(500).json({ message: "Failed to create payment intent" });
    }
};

const confirmPayment = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const { paymentIntentId, orderId } = req.body;
        if (!paymentIntentId || !orderId) {
            return res.status(400).json({ message: "paymentIntentId and orderId are required" });
        }

        const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
        const userId = decoded.userId;
        if (!userId) return res.status(401).json({ message: "Invalid token" });

        const { data: orderData } = await axios.get(
            `${process.env.RESTAURANT_SERVICE}/api/order/internal/payment/${orderId}`,
            { headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY } }
        );

        if (orderData.userId !== userId) {
            return res.status(403).json({ message: "Order does not belong to you" });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({ message: `Payment not completed. Status: ${paymentIntent.status}` });
        }

        if (paymentIntent.amount !== Math.round(orderData.amount * 100)) {
            return res.status(400).json({ message: "Payment amount mismatch" });
        }

        await publishPaymentSuccess({
            orderId,
            paymentId: paymentIntentId,
            provider: "stripe",
        });

        res.status(200).json({ message: "Payment confirmed and order placed" });
    } catch (err: any) {
        if (err?.response?.status === 404) {
            return res.status(404).json({ message: "Order not found" });
        }
        console.error("Payment confirm error:", err);
        res.status(500).json({ message: "Failed to confirm payment" });
    }
};

export { createPaymentIntentHandler, confirmPayment };
