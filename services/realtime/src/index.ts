import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import rateLimit from "express-rate-limit"
import { pinoHttp } from "pino-http"
import * as Sentry from "@sentry/node"
import { initSocketServer } from "./sockets.js"
import internalRoutes from "./internal.js"
import logger from "./utils/logger.js"

dotenv.config()

const REQUIRED_ENV = ["JWT_SECRET", "RIDER_SERVICE_URL", "INTERNAL_SERVICE_KEY"]
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
const PORT = process.env.PORT || 5005

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
})

const internalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many internal requests" },
})

app.set("trust proxy", 1)

app.use(pinoHttp({ logger }))
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
}))
app.use(express.json({ limit: "10mb" }))

app.get("/", (_req, res) => {
  res.send("Realtime service is running")
})

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

app.use("/api/internal", internalLimiter, internalRoutes)

Sentry.setupExpressErrorHandler(app)

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" })
})

const server = http.createServer(app)

initSocketServer(server)

server.listen(PORT, () => {
  logger.info(`Realtime service running on port ${PORT}`)
})
