/**
 * 3-Layer Data Cache for AgentLayer OS
 *
 * Layer 1: Static JSON (local dev only) — instant load fallback
 * Layer 2: In-memory module cache — per serverless instance, TTL + stale-while-revalidate
 * Layer 3: Next.js route cache — ISR revalidation on Vercel CDN
 *
 * Flow: Request → Route cache (L3) → In-memory (L2) → Explorer query → Static fallback (L1, dev only)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

interface CacheConfig {
  ttl: number; // Fresh TTL in ms
  staleTime: number; // Additional time to serve stale data while revalidating
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes fresh
  staleTime: 55 * 60 * 1000, // 55 minutes stale-while-revalidate (60 min total)
};

// Module-level in-memory cache
const cache = new Map<string, CacheEntry<unknown>>();

// Track in-flight requests to prevent duplicate fetches
const inflightRequests = new Map<string, Promise<unknown>>();

export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  fallbackFn: (() => Promise<T>) | null = null,
  config: CacheConfig = DEFAULT_CONFIG
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key) as CacheEntry<T> | undefined;

  // Fresh cache hit
  if (cached && now - cached.timestamp < config.ttl) {
    return cached.data;
  }

  // Stale cache - serve stale while revalidating in background
  if (cached && now - cached.timestamp < config.ttl + config.staleTime) {
    // Mark as stale and trigger background refresh
    if (!cached.isStale) {
      cached.isStale = true;
      // Background refresh (don't await)
      refreshInBackground(key, fetchFn, config).catch(err => {
        console.error(`Background refresh failed for ${key}:`, err);
      });
    }
    return cached.data;
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
      const data = await fetchFn();
      cache.set(key, { data, timestamp: Date.now(), isStale: false });
      return data;
    } catch (error) {
      console.error(`Cache fetch failed for ${key}:`, error);

      // Try fallback if provided (local dev static files)
      if (fallbackFn) {
        try {
          const fallbackData = await fallbackFn();
          // Cache fallback with shorter TTL
          cache.set(key, { data: fallbackData, timestamp: Date.now(), isStale: false });
          return fallbackData;
        } catch (fallbackError) {
          console.error(`Fallback failed for ${key}:`, fallbackError);
        }
      }

      // If we have stale data, return it as last resort
      if (cached) {
        console.warn(`Returning expired cache for ${key} due to fetch failure`);
        return cached.data;
      }

      throw error;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, fetchPromise);
  return fetchPromise;
}

async function refreshInBackground<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig
): Promise<void> {
  try {
    const data = await fetchFn();
    cache.set(key, { data, timestamp: Date.now(), isStale: false });
  } catch (error) {
    console.error(`Background refresh failed for ${key}:`, error);
    // Keep serving stale data on error
  }
}

export function invalidate(key: string): void {
  cache.delete(key);
  inflightRequests.delete(key);
}

export function invalidateAll(): void {
  cache.clear();
  inflightRequests.clear();
}

export function getCacheStatus(key: string): {
  exists: boolean;
  age: number | null;
  isStale: boolean;
} {
  const entry = cache.get(key);
  if (!entry) {
    return { exists: false, age: null, isStale: false };
  }
  return {
    exists: true,
    age: Date.now() - entry.timestamp,
    isStale: entry.isStale,
  };
}

export function getAllCacheStatus(): Record<string, ReturnType<typeof getCacheStatus>> {
  const status: Record<string, ReturnType<typeof getCacheStatus>> = {};
  for (const key of cache.keys()) {
    status[key] = getCacheStatus(key);
  }
  return status;
}
