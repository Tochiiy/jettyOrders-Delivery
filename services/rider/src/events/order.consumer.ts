import { getChannel } from "../config/rabbitmq.js";
import Rider from "../models/Rider.js";
import axios from "axios";

interface OrderEvent {
  type: string;
  data: {
    orderId: string;
    restaurantId: string;
    userId: string;
    riderId?: string | null;
    deliveryAddress: {
      latitude: number;
      longitude: number;
      formattedAddress: string;
    };
    restaurantLocation: {
      latitude: number;
      longitude: number;
    };
    distance: number;
    riderAmount: number;
  };
}

const startOrderConsumer = async () => {
  const channel = await getChannel();
  const queue = process.env.ORDER_EVENT_QUEUE as string;

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const event: OrderEvent = JSON.parse(msg.content.toString());
      console.log("Order event received:", event.type, event.data.orderId);

      if (event.type === "ORDER_PLACED") {
        const { restaurantLocation, deliveryAddress, riderAmount, restaurantId } = event.data;

        const nearbyRiders = await Rider.find({
          isAvailable: true,
          isVerified: true,
          currentLocation: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [restaurantLocation.longitude, restaurantLocation.latitude],
              },
              $maxDistance: 500,
            },
          },
        });

        if (nearbyRiders.length === 0) {
          console.log("No available riders near restaurant:", restaurantId);
          channel.ack(msg);
          return;
        }

        for (const rider of nearbyRiders) {
          try {
            await axios.post(`${process.env.REALTIME_SERVICE_URL}/api/internal/emit`, {
              event: "rider:order_available",
              room: `user:${rider.userId}`,
              payload: {
                orderId: event.data.orderId,
                restaurantId,
                pickupLat: restaurantLocation.latitude,
                pickupLng: restaurantLocation.longitude,
                dropoffLat: deliveryAddress.latitude,
                dropoffLng: deliveryAddress.longitude,
                distance: event.data.distance,
                riderAmount,
              },
            }, {
              headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
            });
          } catch {
            console.warn("Failed to notify rider:", rider.userId);
          }
        }

        console.log(`Notified ${nearbyRiders.length} rider(s) for order ${event.data.orderId}`);
      }

      channel.ack(msg);
    } catch (err) {
      console.error("Order consumer error:", err);
      channel.nack(msg, false, true);
    }
  });

  console.log("Order consumer started");
};

export { startOrderConsumer };
