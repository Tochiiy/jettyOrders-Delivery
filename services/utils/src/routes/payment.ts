import express from "express";
import { createPaymentIntentHandler, confirmPayment } from "../controllers/payment.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/create-payment-intent", isAuth, createPaymentIntentHandler);
router.post("/confirm", isAuth, confirmPayment);

export default router;
