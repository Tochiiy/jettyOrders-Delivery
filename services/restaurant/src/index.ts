import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pinoHttp } from "pino-http";
import * as Sentry from "@sentry/node";
import connectDB from "./config/db.js";
import restaurantRoutes from "./routes/restaurant.js";
import menuItemRoutes from "./routes/menuitem.js";
import cartRoutes from "./routes/cart.js";
import addressRoutes from "./routes/address.js";
import orderRoutes from "./routes/order.js";
import riderRoutes from "./routes/rider.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startPaymentConsumer } from "./events/paymentConsumer.js";
import { apiLimiter, internalLimiter } from "./middlewares/rateLimiter.js";
import logger from "./utils/logger.js";

dotenv.config();

const REQUIRED_ENV = ["JWT_SECRET", "MONGO_URI", "INTERNAL_SERVICE_KEY", "UTILS_SERVICE", "RABBITMQ_URL", "REALTIME_SERVICE_URL"];
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
const PORT = process.env.PORT || 5001;

app.set("trust proxy", 1);

app.use(pinoHttp({ logger }));
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api/restaurant", apiLimiter, restaurantRoutes);
app.use("/api/menu-item", apiLimiter, menuItemRoutes);
app.use("/api/cart", apiLimiter, cartRoutes);
app.use("/api/address", apiLimiter, addressRoutes);
app.use("/api/order", apiLimiter, orderRoutes);
app.use("/api/order/internal", internalLimiter, riderRoutes);

Sentry.setupExpressErrorHandler(app);

app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found", error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File too large. Maximum size is 5MB." });
    }
    if (err?.message?.includes("Invalid file type")) {
        return res.status(400).json({ success: false, message: err.message });
    }
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ success: false, message: "Server error" });
});

const startServer = async () => {
    await connectDB();
    connectRabbitMQ().then(() => {
        startPaymentConsumer().catch((err) =>
            logger.error({ err }, "Payment consumer failed")
        );
    }).catch((err) =>
        logger.error({ err }, "RabbitMQ connection failed")
    );
    app.listen(PORT, () => {
        logger.info(`Restaurant service running on port ${PORT}`);
    });
};

startServer();
