import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cloudinary from "cloudinary";
import uploadRoutes from "./routes/cloudinary.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import paymentRoutes from "./routes/payment.js";
dotenv.config();


    
const app = express();

const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("Missing Cloudinary credentials");
    process.exit(1);
}

cloudinary.v2.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

app.use("/api/upload", uploadRoutes);
app.use("/api/payment", paymentRoutes);
connectRabbitMQ().catch((err) => console.error("RabbitMQ connection failed:", err));

app.listen(PORT, () => {
    console.log(`utils is running on port ${PORT}`);
});
