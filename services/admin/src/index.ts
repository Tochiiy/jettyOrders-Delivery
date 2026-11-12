import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pinoHttp } from "pino-http";
import * as Sentry from "@sentry/node";
import { connectDb } from "./config/db.js";
import adminRoutes from "./routes/admin.js";
import logger from "./utils/logger.js";

dotenv.config();

const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
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

const PORT = process.env.PORT || 5006;

app.set("trust proxy", 1);

app.use(pinoHttp({ logger }));
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/admin", adminRoutes);

Sentry.setupExpressErrorHandler(app);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const startServer = async () => {
  await connectDb();
  app.listen(PORT, () => {
    logger.info(`Admin service running on port ${PORT}`);
  });
};

startServer();
