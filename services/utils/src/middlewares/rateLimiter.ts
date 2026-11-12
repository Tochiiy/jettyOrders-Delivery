import rateLimit from "express-rate-limit";
import { UpstashStore } from "./upstashStore.js";

const API_WINDOW = 15 * 60 * 1000;
const INTERNAL_WINDOW = 60 * 1000;

export const apiLimiter = rateLimit({
  windowMs: API_WINDOW,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
  store: new UpstashStore("rl:utils:api:", API_WINDOW),
  passOnStoreError: true,
});

export const internalLimiter = rateLimit({
  windowMs: INTERNAL_WINDOW,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many internal requests" },
  store: new UpstashStore("rl:utils:internal:", INTERNAL_WINDOW),
  passOnStoreError: true,
});
