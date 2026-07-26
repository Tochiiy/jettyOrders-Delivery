import amqp from "amqplib";

let channel: amqp.Channel;
let connection: amqp.Connection;
let ready: Promise<void> | null = null;

const connectRabbitMQ = async () => {
    ready = new Promise(async (resolve, reject) => {
        try {
            connection = await amqp.connect(process.env.RABBITMQ_URL as string);
            channel = await connection.createChannel();
            await channel.prefetch(1);

            await channel.assertQueue(process.env.ORDER_EVENT_QUEUE as string, { durable: true });

            connection.on("close", () => {
                console.warn("RabbitMQ connection closed, reconnecting in 5s...");
                setTimeout(connectRabbitMQ, 5000);
            });

            connection.on("error", (err) => {
                console.error("RabbitMQ connection error:", err.message);
            });

            console.log("Connected to RabbitMQ (rider service)");
            resolve();
        } catch (err) {
            console.error("RabbitMQ connection failed, retrying in 5s...", (err as Error).message);
            setTimeout(() => connectRabbitMQ().then(resolve).catch(reject), 5000);
        }
    });

    return ready;
};

const getChannel = async () => {
    if (!ready) throw new Error("RabbitMQ not connected");
    await ready;
    return channel;
};

export { getChannel, connectRabbitMQ };
