import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import { initSocketServer } from "./sockets.js"
import internalRoutes from "./internal.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5005

app.use(cors())
app.use(express.json())

// Health check route
app.get("/", (_req, res) => {
  res.send("Realtime service is running")
})

app.use("/api/internal", internalRoutes)
// Create an HTTP server from Express, so Socket.IO can attach to it
const server = http.createServer(app)

// Initialize Socket.IO on the same HTTP server
initSocketServer(server)

// Start the server
server.listen(PORT, () => {
  console.log(`Realtime service running on port ${PORT}`)
})
