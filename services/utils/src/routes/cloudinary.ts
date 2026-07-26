import express from "express";
import cloudinary from "cloudinary";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/", isAuth, async (req, res) => {
    try {
        const { buffer } = req.body;
        if (!buffer || typeof buffer !== "string") {
            return res.status(400).json({ error: "buffer is required and must be a string" });
        }
        if (buffer.length > 20_000_000) {
            return res.status(400).json({ error: "Image too large" });
        }
        const cloud = await cloudinary.v2.uploader.upload(buffer);
        res.status(200).json({ url: cloud.secure_url });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: "Error uploading image" });
    }
});

export default router;