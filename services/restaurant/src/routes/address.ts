import express from "express";
import { addAddress, getAddresses, updateAddress, deleteAddress } from "../controllers/address.js";
import { isAuth, isCustomer } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/add", isAuth, isCustomer, addAddress);
router.get("/all", isAuth, isCustomer, getAddresses);
router.put("/:id", isAuth, isCustomer, updateAddress);
router.delete("/:id", isAuth, isCustomer, deleteAddress);

export default router;
