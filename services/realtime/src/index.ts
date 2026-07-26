import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import rateLimit from "express-rate-limit"
import { initSocketServer } from "./sockets.js"
import internalRoutes from "./internal.js"

dotenv.config()

const REQUIRED_ENV = ["JWT_SECRET", "RIDER_SERVICE_URL", "INTERNAL_SERVICE_KEY"]
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`Missing required env var: ${key}`)
        process.exit(1)
    }
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

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" })
})

const server = http.createServer(app)

initSocketServer(server)

server.listen(PORT, () => {
  console.log(`Realtime service running on port ${PORT}`)
})
