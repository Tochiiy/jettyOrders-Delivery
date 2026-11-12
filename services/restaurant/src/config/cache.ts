import { getRedis } from "./redis.js";

let warned = false;

const warn = (message: string, err: unknown) => {
    if (warned) return;
    warned = true;
    console.error(`[cache] ${message}: ${(err as Error).message}`);
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
    const redis = getRedis();
    if (!redis) return null;

    try {
        return (await redis.get<T>(key)) ?? null;
    } catch (err) {
        warn("read failed", err);
        return null;
    }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
    const redis = getRedis();
    if (!redis) return;

    try {
        await redis.set(key, value, { ex: ttlSeconds });
    } catch (err) {
        warn("write failed", err);
    }
};

export const cacheDel = async (...keys: string[]): Promise<void> => {
    if (keys.length === 0) return;

    const redis = getRedis();
    if (!redis) return;

    try {
        await redis.del(...keys);
    } catch (err) {
        warn("delete failed", err);
    }
};

export const cacheInvalidatePattern = async (pattern: string): Promise<void> => {
    const redis = getRedis();
    if (!redis) return;

    try {
        let cursor = "0";
        do {
            const [next, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
            if (keys.length > 0) await redis.del(...keys);
            cursor = next;
        } while (cursor !== "0");
    } catch (err) {
        warn("invalidate failed", err);
    }
};

export const TTL = {
    LIST: 60,
    NEARBY: 30,
    MENU: 60,
    SINGLE: 60,
} as const;
