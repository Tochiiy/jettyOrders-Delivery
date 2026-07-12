import express from "express";
import { addMenuItem, getMenuItems, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability, getPublicMenuItems, getAllAvailableItems } from "../controllers/menuitem.js";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post("/new", isAuth, isSeller, uploadFile, addMenuItem);
router.get("/all", isAuth, getMenuItems);
router.get("/public/:restaurantId", getPublicMenuItems);
router.get("/all-available", getAllAvailableItems);
router.put("/:id", isAuth, isSeller, uploadFile, updateMenuItem);
router.patch("/:id/status", isAuth, isSeller, toggleMenuItemAvailability);
router.delete("/:id", isAuth, isSeller, deleteMenuItem);

export default router;
