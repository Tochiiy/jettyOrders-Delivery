import express from "express";
import { fetchOrderForPayment, getCurrentOrdersForRider, updateStatusRider, assignRiderToOrder } from "../controllers/order.js";
import { internalAuth } from "../middlewares/internalAuth.js";

const router = express.Router();

router.use(internalAuth);

router.get("/payment/:orderId", fetchOrderForPayment);
router.post("/current/rider", getCurrentOrdersForRider);
router.put("/rider/status", updateStatusRider);
router.put("/assign-rider", assignRiderToOrder);

export default router;
