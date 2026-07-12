import express from "express";
import { addRestaurant, fetchMyRestaurant, toggleRestaurantStatus, editRestaurant, getNearbyRestaurant, getAllRestaurants, fetchSingleRestuarant, deleteRestaurant } from "../controllers/restaurant.js";
import { isAuth, isSeller } from "../middlewares/isAuth.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post("/new", isAuth, isSeller, uploadFile, addRestaurant);
router.get("/my", isAuth, fetchMyRestaurant);
router.put("/status", isAuth, isSeller, toggleRestaurantStatus);
router.put("/edit", isAuth, isSeller, editRestaurant);
router.get("/nearby", getNearbyRestaurant);
router.get("/all", getAllRestaurants);
router.get("/:id", isAuth, fetchSingleRestuarant);
router.delete("/delete", isAuth, isSeller, deleteRestaurant);

export default router;

