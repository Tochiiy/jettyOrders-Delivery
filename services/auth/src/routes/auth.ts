import express from "express";
import { loginUser, addUserRole, registerUser, forgotPassword, resetPassword, refreshUserToken, logoutUser } from "../controllers/auth.js";
import { isAuth } from "../middlewares/isAuth.js";
import {myProfile} from "../controllers/auth.js"
import { authLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/login", authLimiter, loginUser)
router.post("/register", authLimiter, registerUser)
router.post("/refresh", authLimiter, refreshUserToken)
router.post("/forgot-password", authLimiter, forgotPassword)
router.post("/reset-password", authLimiter, resetPassword)
router.post("/add/role", isAuth, addUserRole)
router.post("/logout", isAuth, logoutUser)
router.get("/me", isAuth, myProfile)

export default router
