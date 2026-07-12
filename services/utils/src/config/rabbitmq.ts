import amqp from "amqplib";

let channel: amqp.Channel;
let ready: Promise<void>;

const connectRabbitMQ = async () => {
    ready = new Promise(async (resolve, reject) => {
        try {
            const connection = await amqp.connect(process.env.RABBITMQ_URL as string);
            channel = await connection.createChannel();

            await channel.assertQueue(process.env.PAYMENT_QUEUE as string, {
                durable: true,
            });

            console.log("Connected to RabbitMQ(utils service)🐇");
            resolve();
        } catch (err) {
            reject(err);
        }
    });

    return ready;
};

const getChannel = async () => {
    await ready;
    return channel;
};

export { getChannel, connectRabbitMQ };