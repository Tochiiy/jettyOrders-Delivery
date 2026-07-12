import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authroutes from "./routes/auth.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;


app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());


app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});


app.use("/api/auth", authroutes);


const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`auth is running on port ${PORT}`);
    });
};

startServer();
