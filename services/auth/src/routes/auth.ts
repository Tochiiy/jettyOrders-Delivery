import express from "express";
import { loginUser, addUserRole, registerUser, forgotPassword, resetPassword } from "../controllers/auth.js";
import { isAuth } from "../middlewares/isAuth.js";
import {myProfile} from "../controllers/auth.js"

const router = express.Router();

router.post("/login", loginUser)
router.post("/register", registerUser)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.put("/add/role", isAuth, addUserRole)
router.get("/me", isAuth, myProfile)

export default router