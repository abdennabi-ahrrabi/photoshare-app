import Redis from 'ioredis';

let redis: Redis | null = null;
let isConnected = false;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('REDIS_URL not configured - caching disabled');
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('Redis connection failed after 3 retries - caching disabled');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    redis.on('connect', () => {
      console.log('Redis connected');
      isConnected = true;
    });

    redis.on('error', (err) => {
      console.error('Redis error:', err.message);
      isConnected = false;
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
      isConnected = false;
    });

    return redis;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
}

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    if (!client || !isConnected) return null;

    const data = await client.get(key);
    if (!data) return null;

    return JSON.parse(data) as T;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setInCache(key: string, value: unknown, ttlSeconds: number = 60): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client || !isConnected) return;

    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function clearPhotoCache(): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client || !isConnected) return;

    const keys = await client.keys('photos:*');
    if (keys.length > 0) {
      await client.del(...keys);
      console.log(`Cleared ${keys.length} photo cache entries`);
    }
  } catch (error) {
    console.error('Redis clear cache error:', error);
  }
}
