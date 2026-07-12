import { Request, Response } from "express";
import stripe, { createPaymentIntent } from "../config/stripepay.js";
import { publishPaymentSuccess } from "../events/paymentProducer.js";

const createPaymentIntentHandler = async (req: Request, res: Response) => {
    try {
        const { orderId, amount } = req.body;
        if (!orderId || !amount) {
            return res.status(400).json({ message: "orderId and amount are required" });
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
        const { paymentIntentId, orderId } = req.body;
        if (!paymentIntentId || !orderId) {
            return res.status(400).json({ message: "paymentIntentId and orderId are required" });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({ message: `Payment not completed. Status: ${paymentIntent.status}` });
        }

        await publishPaymentSuccess({
            orderId,
            paymentId: paymentIntentId,
            provider: "stripe",
        });

        res.status(200).json({ message: "Payment confirmed and order placed" });
    } catch (err) {
        console.error("Payment confirm error:", err);
        res.status(500).json({ message: "Failed to confirm payment" });
    }
};

export { createPaymentIntentHandler, confirmPayment };
