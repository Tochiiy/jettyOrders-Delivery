import { getChannel } from "../config/rabbitmq.js";


const publishPaymentSuccess = async (payload: {
    orderId: string;
    paymentId: string;
    provider: "stripe";
}) => { 
    const channel = await getChannel();
    try {
    channel.sendToQueue(process.env.PAYMENT_QUEUE as string, Buffer.from(JSON.stringify({
        type: "PAYMENT_SUCCESS",
        data: payload
    })), {
        persistent: true
    });
        console.log("Payment Producer initialized");
    } catch (err) {
        console.error("Payment Producer error:", err);
        
          }

}


export { publishPaymentSuccess };