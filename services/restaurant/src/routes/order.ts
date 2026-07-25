import express from "express";
import { createOrder, fetchOrderForPayment, getMyOrders, fetchRestaurantOrders, updateOrderStatus, fetchSingleOrder, getCurrentOrdersForRider, updateStatusRider, assignRiderToOrder } from "../controllers/order.js";
import { isAuth, isSeller } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/create", isAuth, createOrder);
router.get("/payment/:orderId", fetchOrderForPayment);
router.get("/my-orders", isAuth, getMyOrders);
router.get("/restaurant/:restaurantId", isAuth, isSeller, fetchRestaurantOrders);
router.post("/current/rider", getCurrentOrdersForRider);
router.put("/rider/status", updateStatusRider);
router.put("/assign-rider", assignRiderToOrder);
router.get("/:orderId", isAuth, fetchSingleOrder);
router.put("/:orderId/status", isAuth, isSeller, updateOrderStatus);

export default router;
