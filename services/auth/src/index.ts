import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pinoHttp } from "pino-http";
import * as Sentry from "@sentry/node";
import connectDB from "./config/db.js";
import authroutes from "./routes/auth.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";
import logger from "./utils/logger.js";

dotenv.config();

const REQUIRED_ENV = ["JWT_SECRET", "MONGO_URI", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
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

const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

app.use(pinoHttp({ logger }));
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
}));
app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api/auth", apiLimiter, authroutes);

Sentry.setupExpressErrorHandler(app);

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        logger.info(`auth running on port ${PORT}`);
    });
};

startServer();
