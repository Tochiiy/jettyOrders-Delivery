import express from "express";
import { fetchOrderForPayment, getCurrentOrdersForRider, updateStatusRider, assignRiderToOrder } from "../controllers/order.js";

const router = express.Router();

router.get("/payment/:orderId", fetchOrderForPayment);
router.post("/current/rider", getCurrentOrdersForRider);
router.put("/rider/status", updateStatusRider);
router.put("/assign-rider", assignRiderToOrder);

export default router;
