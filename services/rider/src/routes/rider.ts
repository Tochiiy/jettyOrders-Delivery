import express from "express";
import { registerRider, getMyProfile, updateLocation, toggleAvailability, acceptOrder, getActiveOrders, updateOrderStatus, internalUpdateLocation } from "../controllers/rider.js";
import { isAuth } from "../middlewares/isAuth.js";
import { internalAuth } from "../middlewares/internalAuth.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post("/register", isAuth, uploadFile, registerRider);
router.get("/me", isAuth, getMyProfile);
router.put("/location", isAuth, updateLocation);
router.patch("/availability", isAuth, toggleAvailability);
router.post("/accept-order/:orderId", isAuth, acceptOrder);
router.get("/active-orders", isAuth, getActiveOrders);
router.put("/order-status", isAuth, updateOrderStatus);

router.put("/internal/location", internalAuth, internalUpdateLocation);

export default router;
