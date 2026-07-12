import { Server, Socket } from "socket.io"
import http from "http"
import jwt from "jsonwebtoken"

let io: Server

interface DecodedUser {
  userId: string
  restaurantId?: string
}

const initSocketServer = (server: http.Server) => {
  // Create the Socket.IO server, attach it to the HTTP server
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    },
  })

  // --- AUTH MIDDLEWARE ---
  // `io.use()` registers a middleware that runs BEFORE every connection attempt.
  // It's like Express middleware but for WebSocket handshakes.
  // If `next()` is called with an Error, the connection is rejected.
  // If `next()` is called with no arguments, the connection proceeds to the "connection" handler.
  io.use((socket: Socket, next) => {
    try {
      // The client sends the token in the `auth` object of the handshake options.
      // On the frontend: const socket = io("http://...", { auth: { token: "..." } })
      const token = socket.handshake.auth?.token

      if (!token) {
        return next(new Error("Authentication error"))
      }

      // Verify the JWT. If invalid/expired, `.verify()` throws.
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as jwt.JwtPayload & DecodedUser

      // Extra safety check in case verify returns something falsy
      if (!decoded || !decoded.userId) {
        return next(new Error("Authentication error"))
      }

      // Store the full decoded user data on the socket so the
      // connection handler and event listeners can access it.
      socket.data.user = {
        userId: decoded.userId,
        restaurantId: decoded.restaurantId,
      }

      // Proceed to the connection handler
      next()
    } catch (error) {
      console.error("Socket auth error:", error)
      next(new Error("Authentication error"))
    }
  })

  // --- CONNECTION HANDLER ---
  // `io.on("connection", ...)` fires every time a client successfully connects
  // (after the middleware above passes). The `socket` parameter represents
  // the connection to that specific client.
  io.on("connection", (socket: Socket) => {
    // `socket.data.user` was set by the middleware above
    const user = socket.data.user as DecodedUser | undefined

    console.log("User connected:", user)

    // Safety check — if somehow the middleware didn't set user data, disconnect
    if (!user) {
      socket.disconnect()
      return
    }

    const userId = user.userId

    // --- ROOMS ---
    // Rooms let you broadcast messages to a subset of connected sockets.
    // `socket.join(roomName)` adds this socket to a room.
    // You can then emit to all sockets in a room with `io.to(roomName).emit(...)`.

    // Join a personal room named after the user's ID.
    // This lets us send targeted messages (e.g., order updates) to a specific user.
    socket.join(`user:${userId}`)

    // If the user is a seller with a restaurant, join a restaurant-specific room.
    // Joining a room per restaurant lets us broadcast events to ALL
    // sockets in that room — useful for sending new order notifications
    // to all staff/devices connected for that restaurant.
    if (user.restaurantId) {
      socket.join(`restaurant-${user.restaurantId}`)
    }

    console.log("User connected:", userId)
    console.log("User joined rooms:", socket.rooms)

    // --- EVENT LISTENERS ---
    // `socket.on(eventName, callback)` listens for events from THIS client.
    // The client emits with `socket.emit("eventName", data)`.

    socket.on("disconnect", () => {
      console.log("User disconnected:", userId)
      console.log("User left rooms:", socket.rooms)
    })

    // Listen for real-time location updates from riders.
    // The rider's frontend emits { restaurantId, lat, lng } periodically.
    // We broadcast the new location to the restaurant's room so the
    // seller can track the rider on a map in real time.
    socket.on("location:update", (data: { restaurantId: string; lat: number; lng: number }) => {
      io.to(`restaurant-${data.restaurantId}`).emit("rider:location", {
        riderId: userId,
        lat: data.lat,
        lng: data.lng,
      })
    })
  })

  console.log("Socket.IO initialized")
}

// Returns the Socket.IO server instance.
// Useful for emitting events OUTSIDE of a connection handler
// (e.g., from an Express route after a payment confirmation).
const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO not initialized — call initSocketServer() first")
  }
  return io
}

export { initSocketServer, getIO }
