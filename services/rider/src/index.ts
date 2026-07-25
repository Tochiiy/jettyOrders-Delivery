import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import riderRoutes from "./routes/rider.js"
import { connectRabbitMQ } from "./config/rabbitmq.js"
import { startOrderConsumer } from "./events/order.consumer.js"
import { apiLimiter, internalLimiter } from "./middlewares/rateLimiter.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5004

app.use(cors())
app.use(express.json())

app.use("/api/rider", apiLimiter, riderRoutes)
app.use("/api/rider/internal", internalLimiter)

app.get("/", (_req, res) => {
  res.send("Rider service is running")
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
