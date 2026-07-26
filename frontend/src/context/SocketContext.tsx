import { io, Socket } from "socket.io-client"
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react"
import type { ReactNode } from "react"
import { useAppData } from "./AppContext"
import { REALTIME_API } from "../services/api"

interface SocketContextType {
  socket: Socket | null
}

const SocketContext = createContext<SocketContextType>({ socket: null })

const subscribeToTokenChanges = (callback: () => void) => {
  window.addEventListener("token-changed", callback)
  return () => window.removeEventListener("token-changed", callback)
}

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { isAuth, user } = useAppData()
  const [socket, setSocket] = useState<Socket | null>(null)

  const token = useSyncExternalStore(
    subscribeToTokenChanges,
    () => localStorage.getItem("token")
  )

  useEffect(() => {
    if (!isAuth || !token) {
      socket?.disconnect()
      setSocket(null)
      return
    }

    const newSocket = io(REALTIME_API, {
      auth: { token },
      transports: ["websocket"],
    })

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server")
      setSocket(newSocket)
    })

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server")
      setSocket(null)
    })

    return () => {
      newSocket.disconnect()
      setSocket(null)
    }
  }, [isAuth, user?._id, user?.restaurantId, user?.role, token])

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  )
}

const useSocket = () => useContext(SocketContext)

export { SocketContext, SocketProvider, useSocket }
