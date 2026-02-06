/**
 * Redis-backed Cache for AgentLayer OS
 *
 * Production: Upstash Redis via Vercel (HTTP REST API)
 * Local: Redis via ioredis (redis:// protocol)
 *
 * Fast, persistent, TTL-based caching with stale-while-revalidate
 */

import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';

interface CacheMetadata {
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  ttl: number; // Fresh TTL in seconds
  staleTime: number; // Additional time to serve stale while revalidating
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60, // 5 minutes fresh
  staleTime: 55 * 60, // 55 minutes stale (60 min total)
};

// Initialize Redis client (Upstash for production, IORedis for local)
const isProduction = !!process.env.UPSTASH_REDIS_REST_URL;

let redis: UpstashRedis | IORedis;

if (isProduction) {
  redis = new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });
} else {
  redis = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: (times) => {
      // Reconnect after
      return Math.min(times * 50, 2000);
    },
    lazyConnect: true,
  });

  // Connect and handle errors
  (async () => {
    try {
      await (redis as IORedis).connect();
      console.log('✅ Connected to local Redis');
    } catch (err) {
      console.warn('⚠️ Failed to connect to local Redis:', err);
    }
  })();
}

// Track in-flight requests to prevent duplicate fetches
const inflightRequests = new Map<string, Promise<unknown>>();

// Track failed refresh attempts to implement backoff
const failedRefreshes = new Map<string, { timestamp: number; attempts: number }>();
const REFRESH_COOLDOWN_MS = 60000; // 1 minute cooldown after failed refresh

// Adapter functions to normalize Upstash vs IORedis APIs
async function get<T>(key: string): Promise<T | null> {
  if (isProduction) {
    return (redis as UpstashRedis).get<T>(key);
  } else {
    const data = await (redis as IORedis).get(key);
    return data ? JSON.parse(data) : null;
  }
}

async function set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (isProduction) {
    await (redis as UpstashRedis).set(key, value, { ex: ttlSeconds });
  } else {
    await (redis as IORedis).setex(key, ttlSeconds, JSON.stringify(value));
  }
}

async function del(...keys: string[]): Promise<void> {
  if (isProduction) {
    await (redis as UpstashRedis).del(...keys);
  } else {
    if (keys.length > 0) {
      await (redis as IORedis).del(...keys);
    }
  }
}

async function keys(pattern: string): Promise<string[]> {
  if (isProduction) {
    return (redis as UpstashRedis).keys(pattern);
  } else {
    return (redis as IORedis).keys(pattern);
  }
}

async function exists(key: string): Promise<number> {
  if (isProduction) {
    return (redis as UpstashRedis).exists(key);
  } else {
    return (redis as IORedis).exists(key);
  }
}

export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  fallbackFn: (() => Promise<T>) | null = null,
  config: CacheConfig = DEFAULT_CONFIG
): Promise<T> {
  const cacheKey = `agentlayer:${key}`;
  const metaKey = `${cacheKey}:meta`;

  try {
    // Try to get data from Redis
    const [data, metaRaw] = await Promise.all([
      get<T>(cacheKey),
      get<CacheMetadata>(metaKey),
    ]);

    const now = Math.floor(Date.now() / 1000);

    // Fresh cache hit
    if (data && metaRaw && now - metaRaw.timestamp < config.ttl) {
      console.log(`✅ Cache HIT (fresh) for ${key} - age: ${now - metaRaw.timestamp}s`);
      return data;
    }

    // Stale cache - serve stale while revalidating in background
    if (data && metaRaw && now - metaRaw.timestamp < config.ttl + config.staleTime) {
      console.log(`⚡ Cache HIT (stale) for ${key} - refreshing in background`);

      // Check if we recently failed to refresh this key
      const failedRefresh = failedRefreshes.get(key);
      const nowMs = Date.now();
      if (failedRefresh && nowMs - failedRefresh.timestamp < REFRESH_COOLDOWN_MS) {
        console.log(`⏸️  Skipping refresh for ${key} (cooldown: ${Math.ceil((REFRESH_COOLDOWN_MS - (nowMs - failedRefresh.timestamp)) / 1000)}s remaining)`);
        return data;
      }

      // Trigger background refresh (don't await)
      refreshInBackground(cacheKey, metaKey, key, fetchFn, config).catch(err => {
        console.error(`Background refresh failed for ${key}:`, err);
      });
      return data;
    }
  } catch (redisError) {
    console.error(`Redis error for ${key}:`, redisError);
    // Fall through to fetch
  }

  // No cache or expired - fetch now
  // Check if there's already an in-flight request for this key
  const inFlight = inflightRequests.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  // Start new fetch
  const fetchPromise = (async () => {
    try {
      console.log(`🔄 Cache MISS for ${key} - fetching from Explorer API...`);
      const data = await fetchFn();

      // Save to Redis with TTL
      await saveToRedis(cacheKey, metaKey, data, config);
      console.log(`💾 Saved ${key} to Redis (TTL: ${config.ttl}s fresh, ${config.staleTime}s stale)`);

      return data;
    } catch (error) {
      console.error(`Fetch failed for ${key}:`, error);

      // Try fallback if provided (local dev static files)
      if (fallbackFn) {
        try {
          console.log(`📁 Using fallback (local JSON) for ${key}`);
          const fallbackData = await fallbackFn();
          // Cache fallback with shorter TTL
          await saveToRedis(cacheKey, metaKey, fallbackData, { ttl: 60, staleTime: 300 });
          console.log(`💾 Cached fallback data for ${key} (TTL: 60s)`);
          return fallbackData;
        } catch (fallbackError) {
          console.error(`Fallback failed for ${key}:`, fallbackError);
        }
      }

      // Try to return stale data from Redis as last resort
      try {
        const staleData = await get<T>(cacheKey);
        if (staleData) {
          console.warn(`Returning stale cache for ${key} due to fetch failure`);
          return staleData;
        }
      } catch {}

      throw error;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, fetchPromise);
  return fetchPromise;
}

async function saveToRedis<T>(
  cacheKey: string,
  metaKey: string,
  data: T,
  config: CacheConfig
): Promise<void> {
  const totalTtl = config.ttl + config.staleTime;
  const metadata: CacheMetadata = {
    timestamp: Math.floor(Date.now() / 1000),
    ttl: config.ttl,
  };

  await Promise.all([
    set(cacheKey, data, totalTtl),
    set(metaKey, metadata, totalTtl),
  ]);
}

async function refreshInBackground<T>(
  cacheKey: string,
  metaKey: string,
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig
): Promise<void> {
  try {
    const data = await fetchFn();
    await saveToRedis(cacheKey, metaKey, data, config);
    console.log(`🔄 Background refresh completed for ${key}`);
    // Clear failed refresh tracking on success
    failedRefreshes.delete(key);
  } catch (error) {
    console.error(`Background refresh failed:`, error);
    // Track failed refresh with timestamp
    const existing = failedRefreshes.get(key);
    failedRefreshes.set(key, {
      timestamp: Date.now(),
      attempts: (existing?.attempts || 0) + 1,
    });
    // Keep serving stale data on error
  }
}

export async function invalidate(key: string): Promise<void> {
  const cacheKey = `agentlayer:${key}`;
  const metaKey = `${cacheKey}:meta`;
  await del(cacheKey, metaKey);
  inflightRequests.delete(key);
  failedRefreshes.delete(key);
}

export async function invalidateAll(): Promise<void> {
  // Delete all keys matching pattern
  const pattern = 'agentlayer:*';
  const cacheKeys = await keys(pattern);
  if (cacheKeys.length > 0) {
    await del(...cacheKeys);
  }
  inflightRequests.clear();
  failedRefreshes.clear();
}

export async function getCacheStatus(key: string): Promise<{
  exists: boolean;
  age: number | null;
  isStale: boolean;
  ttl: number | null;
}> {
  const cacheKey = `agentlayer:${key}`;
  const metaKey = `${cacheKey}:meta`;

  try {
    const [existsCount, meta] = await Promise.all([
      exists(cacheKey),
      get<CacheMetadata>(metaKey),
    ]);

    if (!existsCount || !meta) {
      return { exists: false, age: null, isStale: false, ttl: null };
    }

    const now = Math.floor(Date.now() / 1000);
    const age = now - meta.timestamp;
    const isStale = age >= meta.ttl;

    return {
      exists: true,
      age,
      isStale,
      ttl: meta.ttl,
    };
  } catch (error) {
    console.error(`Failed to get cache status for ${key}:`, error);
    return { exists: false, age: null, isStale: false, ttl: null };
  }
}

export async function getAllCacheStatus(): Promise<Record<string, Awaited<ReturnType<typeof getCacheStatus>>>> {
  const pattern = 'agentlayer:*';
  const cacheKeys = await keys(pattern);

  const datasetKeys = cacheKeys
    .filter(k => !k.endsWith(':meta'))
    .map(k => k.replace('agentlayer:', ''));

  const statuses: Record<string, Awaited<ReturnType<typeof getCacheStatus>>> = {};

  await Promise.all(
    datasetKeys.map(async (key) => {
      statuses[key] = await getCacheStatus(key);
    })
  );

  return statuses;
}
