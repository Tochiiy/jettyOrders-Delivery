import express from "express";
import { createPaymentIntentHandler, confirmPayment } from "../controllers/payment.js";

const router = express.Router();

router.post("/create-payment-intent", createPaymentIntentHandler);
router.post("/confirm", confirmPayment);

export default router;
