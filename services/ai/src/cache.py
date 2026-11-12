import hashlib
import json
from typing import Any

from config import settings

try:
    from upstash_redis.asyncio import Redis
except Exception:  # optional dependency; cache is disabled without it
    Redis = None  # type: ignore[assignment]


def _key(prefix: str, payload: Any) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    digest = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    return f"ai:{prefix}:{digest}"


_redis = None
if Redis is not None and settings.upstash_redis_rest_url and settings.upstash_redis_rest_token:
    _redis = Redis(
        url=settings.upstash_redis_rest_url,
        token=settings.upstash_redis_rest_token,
    )


async def cache_get(prefix: str, payload: Any) -> str | None:
    if _redis is None:
        return None

    try:
        value = await _redis.get(_key(prefix, payload))
        return value if isinstance(value, str) else None
    except Exception:
        return None


async def cache_set(prefix: str, payload: Any, value: str, ttl: int = 3600) -> None:
    if _redis is None:
        return

    try:
        await _redis.set(_key(prefix, payload), value, ex=ttl)
    except Exception:
        pass
