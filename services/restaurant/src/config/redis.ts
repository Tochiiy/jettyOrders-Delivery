import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

export const getRedis = (): Redis | null => {
    if (client !== undefined) return client;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    client = url && token
        ? new Redis({
            url,
            token,
            retry: { retries: 1, backoff: () => 100 },
        })
        : null;

    return client;
};
