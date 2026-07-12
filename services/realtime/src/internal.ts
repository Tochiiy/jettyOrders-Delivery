import { Router, Request, Response } from "express"
import { getIO } from "./sockets.js"

const router = Router()

// --- INTERNAL EVENT EMITTER ---
// Other microservices (restaurant, utils, etc.) call this endpoint
// to broadcast real-time events through Socket.IO.
// Protected by an internal API key so external clients can't use it.
router.post("/emit", (req: Request, res: Response) => {
  // --- INTERNAL AUTH ---
  // Every inter-service request should include an `x-internal-key` header
  // matching the `INTERNAL_SERVICE_KEY` env var.
  // This prevents unauthorized access to the emit endpoint.
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ message: "Forbidden" })
  }

  // --- REQUEST BODY ---
  // `event`   — the Socket.IO event name (e.g., "order:placed", "rider:assigned")
  // `room`    — the room to broadcast to (e.g., "restaurant-123", or a userId)
  // `payload` — optional data to send with the event
  const { event, room, payload } = req.body

  if (!event || !room) {
    return res.status(400).json({ message: "Event and room are required" })
  }

  try {
    // Get the Socket.IO server instance (throws if not initialized)
    const io = getIO()

    console.log(`Emitting event "${event}" to room "${room}"`)

    // `io.to(room).emit(event, data)` sends the event to ALL sockets
    // that have joined that specific room.
    // If the room has no connected sockets, this silently does nothing.
    io.to(room).emit(event, payload ?? {})

    return res.status(200).json({ message: "Event emitted successfully", success: true })
  } catch (error) {
    console.error("Failed to emit event:", error)
    return res.status(500).json({ message: "Socket.IO not initialized" })
  }
})

export default router
