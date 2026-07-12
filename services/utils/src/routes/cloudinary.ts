import express from "express";
import cloudinary from "cloudinary";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { buffer } = req.body;
        const cloud = await cloudinary.v2.uploader.upload(buffer);
        res.status(200).json({ url: cloud.secure_url });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: "Error uploading image" });
    }
});

export default router;