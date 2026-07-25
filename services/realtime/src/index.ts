import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import rateLimit from "express-rate-limit"
import { initSocketServer } from "./sockets.js"
import internalRoutes from "./internal.js"

dotenv.config()

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

app.use(cors())
app.use(express.json())

app.get("/", (_req, res) => {
  res.send("Realtime service is running")
})

app.use("/api/internal", internalLimiter, internalRoutes)

const server = http.createServer(app)

initSocketServer(server)

server.listen(PORT, () => {
  console.log(`Realtime service running on port ${PORT}`)
})
