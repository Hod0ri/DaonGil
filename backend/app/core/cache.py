import redis.asyncio as redis
from app.core.config import settings

redis_client = None

async def init_redis():
    global redis_client
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        decode_responses=True
    )

async def get_redis():
    return redis_client

async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
