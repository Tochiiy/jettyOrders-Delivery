import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pinoHttp } from "pino-http";
import * as Sentry from "@sentry/node";
import cloudinary from "cloudinary";
import uploadRoutes from "./routes/cloudinary.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import paymentRoutes from "./routes/payment.js";
import { apiLimiter, internalLimiter } from "./middlewares/rateLimiter.js";
import logger from "./utils/logger.js";

dotenv.config();

const REQUIRED_ENV = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "RABBITMQ_URL", "INTERNAL_SERVICE_KEY", "RESTAURANT_SERVICE", "STRIPE_SECRET_KEY", "PAYMENT_QUEUE"];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        logger.error(`Missing required env var: ${key}`);
        process.exit(1);
    }
}

if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    logger.info("Sentry initialized");
}

const app = express();

const PORT = process.env.PORT || 5002;

app.set("trust proxy", 1);

app.use(pinoHttp({ logger }));
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

app.use("/api/upload", apiLimiter, uploadRoutes);
app.use("/api/payment", apiLimiter, paymentRoutes);

Sentry.setupExpressErrorHandler(app);

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

connectRabbitMQ().catch((err) => logger.error({ err }, "RabbitMQ connection failed"));

app.listen(PORT, () => {
    logger.info(`utils running on port ${PORT}`);
});
