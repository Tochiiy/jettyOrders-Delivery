import { io } from "socket.io-client"
import { REALTIME_API } from "./api"

export const createSocketConnection = () => {
  const token = localStorage.getItem("token")

  return io(REALTIME_API, {
    auth: { token },
    autoConnect: false,
  })
}
