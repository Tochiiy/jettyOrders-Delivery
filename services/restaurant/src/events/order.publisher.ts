import { getChannel } from "../config/rabbitmq.js";

const ORDER_EVENT_QUEUE = process.env.ORDER_EVENT_QUEUE as string;

export type OrderEventType =
  | "ORDER_PLACED"
  | "ORDER_ACCEPTED"
  | "ORDER_PREPARING"
  | "ORDER_READY_FOR_RIDER"
  | "ORDER_RIDER_ASSIGNED"
  | "ORDER_PICKED_UP"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED";

interface OrderEvent {
  type: OrderEventType;
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

const publishOrderEvent = async (event: OrderEvent) => {
  try {
    const channel = await getChannel();
    channel.sendToQueue(ORDER_EVENT_QUEUE, Buffer.from(JSON.stringify(event)), {
      persistent: true,
    });
    console.log(`Order event published: ${event.type} - ${event.data.orderId}`);
  } catch (err) {
    console.error("Failed to publish order event:", err);
  }
};

export { publishOrderEvent, ORDER_EVENT_QUEUE };
