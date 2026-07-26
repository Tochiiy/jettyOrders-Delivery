import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authroutes from "./routes/auth.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";

dotenv.config();

const REQUIRED_ENV = ["JWT_SECRET", "MONGO_URI", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`Missing required env var: ${key}`);
        process.exit(1);
    }
}

const app = express();

const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
}));
app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api/auth", apiLimiter, authroutes);

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`auth is running on port ${PORT}`);
    });
};

startServer();
