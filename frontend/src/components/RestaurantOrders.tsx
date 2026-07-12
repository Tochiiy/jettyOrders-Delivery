import { useState, useRef, useEffect } from 'react'
import type { IOrder } from '../types/types'
import { useSocket } from "../context/SocketContext"
import { getRestaurantOrders } from "../services/orderService"
import audio from '../assets/notification-951.wav'
import OrderCard from './OrderCard'
const ACTIVE_STATUS = [
                "placed",
                "accepted",
                "preparing",
                "ready_for_pickup",
                "rider_assigned",
                "delivered",
            ]
const RestaurantOrders = ({ restaurantId }: { restaurantId: string }) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setloading] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const { socket } = useSocket()
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audio)
    audioRef.current.load()
  }, [])
  
  useEffect(() => {
    if (!socket) return;
    
    const onNewOrder = () => {
      console.log("New order received");

      if (audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
        })
      }

      fetchOrders();
    }

    socket.on("order:new", onNewOrder);
    return () => {
      socket.off("order:new", onNewOrder);
    }
  }, [socket, audioUnlocked])

  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current!.pause();
        audioRef.current!.currentTime = 0;
        setAudioUnlocked(true);
        console.log("Audio unlocked");
      }).catch((error) => {
        console.error("Error unlocking audio:", error);
      }); 
    }
  }


  const fetchOrders = async () => {
    try {
      const { data } = await getRestaurantOrders(restaurantId)
      setOrders(data.orders || [])
    } catch (err) {
      console.error("Failed to fetch orders:", err)
    } finally {
      setloading(false)
    }
  }
  

  useEffect(() => {
    fetchOrders()
  }, [restaurantId])

  if (loading) return <p className="text-grey-500">Loading...</p>
  
  const activeOrders = orders.filter((order) => ACTIVE_STATUS.includes(order.status))
  const completedOrders = orders.filter((order) => !ACTIVE_STATUS.includes(order.status))

  return <div className="space-y-6">
    {(!audioUnlocked && <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-center gap-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔔</span>
        <div> 
          <p className="font-medium text-blue-900">Enable Sound Notification</p>
          <p className="text-sm text-blue-700">Get notified when a new order is placed</p>
      </div>
      </div>

      <button onClick={unlockAudio} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
        Enable Sound
      </button>
    </div>
    
    )}

    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Active Orders</h3>
      {activeOrders.length === 0 ? <p className="text-sm text-grey-500">No Active Orders</p> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {
            activeOrders.map((order) => (
             <OrderCard key={order._id} order={order} onstatusUpdate={fetchOrders}/>
            ))
          }
      </div>}
    </div>


    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Completed Orders</h3>
      {completedOrders.length === 0 ? <p className="text-sm text-grey-500">No Completed Orders</p> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {
            completedOrders.map((order) => (
             <OrderCard key={order._id} order={order} onstatusUpdate={fetchOrders}/>
            ))
          }
      </div>}
    </div>





  </div>
}

export default RestaurantOrders
