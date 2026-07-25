import { Server, Socket } from "socket.io"
import http from "http"
import jwt from "jsonwebtoken"
import axios from "axios"

let io: Server

interface DecodedUser {
  userId: string
  restaurantId?: string
}

const initSocketServer = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    },
  })

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token

      if (!token) {
        return next(new Error("Authentication error"))
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as jwt.JwtPayload & DecodedUser

      if (!decoded || !decoded.userId) {
        return next(new Error("Authentication error"))
      }

      socket.data.user = {
        userId: decoded.userId,
        restaurantId: decoded.restaurantId,
      }

      next()
    } catch (error) {
      console.error("Socket auth error:", error)
      next(new Error("Authentication error"))
    }
  })

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as DecodedUser | undefined

    console.log("User connected:", user)

    if (!user) {
      socket.disconnect()
      return
    }

    const userId = user.userId

    socket.join(`user:${userId}`)

    if (user.restaurantId) {
      socket.join(`restaurant-${user.restaurantId}`)
    }

    console.log("User connected:", userId)
    console.log("User joined rooms:", socket.rooms)

    socket.on("disconnect", () => {
      console.log("User disconnected:", userId)
      console.log("User left rooms:", socket.rooms)
    })

    socket.on("location:update", (data: { restaurantId?: string; lat: number; lng: number }) => {
      if (data.restaurantId) {
        io.to(`restaurant-${data.restaurantId}`).emit("rider:location", {
          riderId: userId,
          lat: data.lat,
          lng: data.lng,
        })
      }

      const riderServiceUrl = process.env.RIDER_SERVICE_URL
      if (riderServiceUrl) {
        axios.put(`${riderServiceUrl}/api/rider/internal/location`, {
          userId,
          latitude: data.lat,
          longitude: data.lng,
        }, {
          headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
        }).catch(() => {})
      }
    })
  })

  console.log("Socket.IO initialized")
}

const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO not initialized — call initSocketServer() first")
  }
  return io
}

export { initSocketServer, getIO }
