import type { IncrementResponse, Store } from "express-rate-limit";
import { getRedis } from "../config/redis.js";

type MemoryEntry = { count: number; reset: number };

export class UpstashStore implements Store {
    localKeys = false;

    private readonly keyPrefix: string;
    private readonly windowMs: number;
    private readonly memory = new Map<string, MemoryEntry>();
    private warned = false;

    constructor(prefix: string, windowMs: number) {
        this.keyPrefix = prefix;
        this.windowMs = windowMs;
    }

    async increment(key: string): Promise<IncrementResponse> {
        const redis = getRedis();

        if (redis) {
            try {
                const result = (await redis.eval(
                    `local total = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { total, ttl }`,
                    [this.keyPrefix + key],
                    [String(this.windowMs)],
                )) as [number, number];

                const totalHits = Number(result?.[0] ?? 1);
                const ttl = Number(result?.[1] ?? this.windowMs);

                return { totalHits, resetTime: new Date(Date.now() + Math.max(ttl, 0)) };
            } catch (err) {
                if (!this.warned) {
                    this.warned = true;
                    console.error(`[rate-limit] Upstash unavailable (${(err as Error).message}); using in-memory fallback`);
                }
            }
        }

        return this.memoryIncrement(key);
    }

    async decrement(key: string): Promise<void> {
        const redis = getRedis();
        const redisKey = this.keyPrefix + key;

        if (redis) {
            try {
                await redis.eval(
                    'if redis.call("EXISTS", KEYS[1]) == 1 then redis.call("DECR", KEYS[1]) end return 1',
                    [redisKey],
                    [],
                );
                return;
            } catch {
                // fall through to memory
            }
        }

        const entry = this.memory.get(redisKey);
        if (entry && entry.count > 0) entry.count -= 1;
    }

    async resetKey(key: string): Promise<void> {
        const redis = getRedis();
        const redisKey = this.keyPrefix + key;

        if (redis) {
            try {
                await redis.del(redisKey);
            } catch {
                // fall through to memory
            }
        }

        this.memory.delete(redisKey);
    }

    private memoryIncrement(key: string): IncrementResponse {
        const now = Date.now();
        const redisKey = this.keyPrefix + key;

        if (this.memory.size > 10_000) {
            for (const [entryKey, entry] of this.memory) {
                if (entry.reset <= now) this.memory.delete(entryKey);
            }
        }

        const current = this.memory.get(redisKey);
        if (!current || current.reset <= now) {
            const reset = now + this.windowMs;
            this.memory.set(redisKey, { count: 1, reset });
            return { totalHits: 1, resetTime: new Date(reset) };
        }

        current.count += 1;
        return { totalHits: current.count, resetTime: new Date(current.reset) };
    }
}
