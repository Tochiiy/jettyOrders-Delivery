import express from "express";
import { createOrder, fetchOrderForPayment, getMyOrders, fetchRestaurantOrders, updateOrderStatus, fetchSingleOrder } from "../controllers/order.js";
import { isAuth, isSeller } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/create", isAuth, createOrder);
router.get("/payment/:orderId", fetchOrderForPayment);
router.get("/my-orders", isAuth, getMyOrders);
router.get("/restaurant/:restaurantId", isAuth, isSeller, fetchRestaurantOrders);
router.get("/:orderId", isAuth, fetchSingleOrder);
router.put("/:orderId/status", isAuth, isSeller, updateOrderStatus);

export default router;
