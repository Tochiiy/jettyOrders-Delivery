import express from "express";
import { getCart, addCartItem, updateCartItem, removeCartItem, clearCart } from "../controllers/cart.js";
import { isAuth, isCustomer } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/all", isAuth, isCustomer, getCart);
router.post("/add", isAuth, isCustomer, addCartItem);
router.delete("/clear", isAuth, isCustomer, clearCart);
router.put("/:menuItemId", isAuth, isCustomer, updateCartItem);
router.delete("/:menuItemId", isAuth, isCustomer, removeCartItem);

export default router;
