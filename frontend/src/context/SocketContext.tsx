import { io, Socket } from "socket.io-client"
import { createContext, useContext, useEffect, useRef } from "react"
import type { ReactNode } from "react"
import { useAppData } from "./AppContext"
import { REALTIME_API } from "../services/api"

interface SocketContextType {
  socket: Socket | null
}

const SocketContext = createContext<SocketContextType>({ socket: null })

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { isAuth } = useAppData()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuth) {
      socketRef.current?.disconnect()
      socketRef.current = null
      return
    }

    const token = localStorage.getItem("token")
    if (!token) return

    const newSocket = io(REALTIME_API, {
      auth: { token },
      transports: ["websocket"],
    })

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server")
      socketRef.current = newSocket
    })

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected from Socket.IO server:", reason)
      socketRef.current = null
    })

    return () => {
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [isAuth])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  )
}

const useSocket = () => useContext(SocketContext)

export { SocketContext, SocketProvider, useSocket }
