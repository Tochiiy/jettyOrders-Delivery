import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import riderRoutes from "./routes/rider.js"
import { connectRabbitMQ } from "./config/rabbitmq.js"
import { startOrderConsumer } from "./events/order.consumer.js"
import { apiLimiter, internalLimiter } from "./middlewares/rateLimiter.js"

dotenv.config()

const REQUIRED_ENV = ["JWT_SECRET", "MONGO_URI", "INTERNAL_SERVICE_KEY", "RESTAURANT_SERVICE", "UTILS_SERVICE", "RABBITMQ_URL", "REALTIME_SERVICE_URL"]
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`Missing required env var: ${key}`)
        process.exit(1)
    }
}

const app = express()
const PORT = process.env.PORT || 5004

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

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." })
    }
    if (err?.message?.includes("Invalid file type")) {
        return res.status(400).json({ message: err.message })
    }
    console.error("Unhandled error:", err)
    res.status(500).json({ message: "Server error" })
})

connectDB().then(() => {
  connectRabbitMQ().catch((err) =>
    console.error("RabbitMQ connection failed:", err)
  )
  startOrderConsumer().catch((err) =>
    console.error("Order consumer failed:", err)
  )
  app.listen(PORT, () => {
    console.log(`Rider service running on port ${PORT}`)
  })
})
