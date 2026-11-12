import express from "express";
import dotenv from "dotenv";
import http from "http";
import httpProxy from "http-proxy";
import { pinoHttp } from "pino-http";
import * as Sentry from "@sentry/node";
import { getServiceTarget } from "./config/services.js";
import logger from "./utils/logger.js";

dotenv.config();

const REQUIRED_ENV = [
    "AUTH_SERVICE_URL",
    "RESTAURANT_SERVICE_URL",
    "UTILS_SERVICE_URL",
    "AI_SERVICE_URL",
    "RIDER_SERVICE_URL",
    "ADMIN_SERVICE_URL",
    "REALTIME_SERVICE_URL",
];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        logger.error(`Missing required env var: ${key}`);
        process.exit(1);
    }
}

if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    logger.info("Sentry initialized");
}

const app = express();
const PORT = process.env.PORT || 5007;

app.set("trust proxy", 1);

app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "gateway" });
});

const proxy = httpProxy.createProxyServer({ xfwd: true });

proxy.on("error", (err, _req, res) => {
    logger.error({ err }, "Gateway proxy error");

    if (!res) return;

    if ("writeHead" in res) {
        if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
        }
        res.end(JSON.stringify({ message: "Upstream service unavailable" }));
        return;
    }

    res.destroy();
});

app.use((req, res, next) => {
    const target = getServiceTarget(req.path);

    if (!target) {
        next();
        return;
    }

    proxy.web(req, res, { target });
});

Sentry.setupExpressErrorHandler(app);

app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
});

const server = http.createServer(app);

server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/socket.io")) {
        proxy.ws(req, socket, head, {
            target: process.env.REALTIME_SERVICE_URL!,
            xfwd: true,
        });
        return;
    }

    socket.destroy();
});

server.listen(PORT, () => {
    logger.info(`Gateway service running on port ${PORT}`);
});
