import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { pinoHttp } from "pino-http"
import * as Sentry from "@sentry/node"
import connectDB from "./config/db.js"
import riderRoutes from "./routes/rider.js"
import { connectRabbitMQ } from "./config/rabbitmq.js"
import { startOrderConsumer } from "./events/order.consumer.js"
import { apiLimiter, internalLimiter } from "./middlewares/rateLimiter.js"
import logger from "./utils/logger.js"

dotenv.config()

const REQUIRED_ENV = ["JWT_SECRET", "MONGO_URI", "INTERNAL_SERVICE_KEY", "RESTAURANT_SERVICE", "UTILS_SERVICE", "RABBITMQ_URL", "REALTIME_SERVICE_URL", "ORDER_EVENT_QUEUE"]
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        logger.error(`Missing required env var: ${key}`)
        process.exit(1)
    }
}

if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN })
    logger.info("Sentry initialized")
}

const app = express()
const PORT = process.env.PORT || 5004

app.set("trust proxy", 1)

app.use(pinoHttp({ logger }))
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
}))
app.use(express.json({ limit: "10mb" }))

app.use("/api/rider", apiLimiter, riderRoutes)
app.use("/api/rider/internal", internalLimiter)

app.get("/", (_req, res) => {
  res.send("Rider service is running")
})

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

Sentry.setupExpressErrorHandler(app)

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." })
    }
    if (err?.message?.includes("Invalid file type")) {
        return res.status(400).json({ message: err.message })
    }
    logger.error({ err }, "Unhandled error")
    res.status(500).json({ message: "Server error" })
})

connectDB().then(() => {
  connectRabbitMQ().then(() => {
    startOrderConsumer().catch((err) =>
      logger.error({ err }, "Order consumer failed")
    )
  }).catch((err) =>
    logger.error({ err }, "RabbitMQ connection failed")
  )
  app.listen(PORT, () => {
    logger.info(`Rider service running on port ${PORT}`)
  })
})
