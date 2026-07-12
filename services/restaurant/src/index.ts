import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import restaurantRoutes from "./routes/restaurant.js";
import menuItemRoutes from "./routes/menuitem.js";
import cartRoutes from "./routes/cart.js";
import addressRoutes from "./routes/address.js";
import orderRoutes from "./routes/order.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startPaymentConsumer } from "./events/paymentConsumer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api/restaurant", restaurantRoutes);
app.use("/api/menu-item", menuItemRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/order", orderRoutes);

app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found", error: { code: "NOT_FOUND", message: "Route not found" } });
});

const startServer = async () => {
    await connectDB();
    connectRabbitMQ().catch((err) =>
        console.error("RabbitMQ connection failed:", err)
    );
    startPaymentConsumer().catch((err) =>
        console.error("Payment consumer failed:", err)
    );
    app.listen(PORT, () => {
        console.log(`Restaurant service running on port ${PORT}`);
    });
};

startServer();
