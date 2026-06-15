import { Redis } from "@upstash/redis";

const CACHE_LOCK_SUFFIX = ":__lock";
const CACHE_SWR_SUFFIX = ":__swr";
const inFlightFetches = new Map<string, Promise<unknown>>();

type StaleCacheEnvelope<T> = {
  value: T;
  staleAt: number;
  expiresAt: number;
};

type StaleCacheOptions = {
  freshTtlSeconds?: number;
  staleTtlSeconds?: number;
};

// Initialize Redis client from environment variables
// Required env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "Cache: Upstash Redis not configured. Caching disabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
    return null;
  }

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch (error) {
    console.error("Cache: Failed to initialize Redis:", error);
    return null;
  }
}

function buildLockKey(key: string): string {
  return `${key}${CACHE_LOCK_SUFFIX}`;
}

function buildSWRKey(key: string): string {
  return `${key}${CACHE_SWR_SUFFIX}`;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireCacheLock(
  redisClient: Redis,
  key: string,
  ttlSeconds: number,
): Promise<boolean> {
  try {
    const result = await redisClient.set(buildLockKey(key), "1", {
      nx: true,
      ex: ttlSeconds,
    });
    return result === "OK";
  } catch (error) {
    console.warn(`Cache: Error acquiring lock for key ${key}:`, error);
    return false;
  }
}

async function releaseCacheLock(redisClient: Redis, key: string): Promise<void> {
  try {
    await redisClient.del(buildLockKey(key));
  } catch (error) {
    console.warn(`Cache: Error releasing lock for key ${key}:`, error);
  }
}

async function waitForCacheFill<T>(
  redisClient: Redis,
  key: string,
  maxRetries: number = 5,
  waitMs: number = 40,
): Promise<T | null> {
  for (let i = 0; i < maxRetries; i += 1) {
    await sleepMs(waitMs);
    try {
      const cached = await redisClient.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function setStaleEnvelope<T>(
  redisClient: Redis,
  key: string,
  value: T,
  freshTtlSeconds: number,
  staleTtlSeconds: number,
): Promise<void> {
  const now = Date.now();
  const envelope: StaleCacheEnvelope<T> = {
    value,
    staleAt: now + freshTtlSeconds * 1000,
    expiresAt: now + staleTtlSeconds * 1000,
  };

  await redisClient.set(buildSWRKey(key), envelope, {
    ex: staleTtlSeconds,
  });
}

async function fetchWithStampedeProtection<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  onFreshData?: (data: T) => Promise<void> | void,
): Promise<T> {
  const redisClient = getRedis();
  if (!redisClient) {
    const data = await fetcher();
    if (onFreshData) {
      await onFreshData(data);
    }
    return data;
  }

  const inFlight = inFlightFetches.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const fetchPromise = (async () => {
    let lockAcquired = false;
    try {
      const lockTtl = Math.max(2, Math.min(ttlSeconds, 15));
      lockAcquired = await acquireCacheLock(redisClient, key, lockTtl);

      if (!lockAcquired) {
        const waited = await waitForCacheFill<T>(redisClient, key);
        if (waited !== null) {
          return waited;
        }
      }

      const data = await fetcher();

      try {
        await redisClient.set(key, data, { ex: ttlSeconds });
      } catch (error) {
        console.warn(`Cache: Error writing key ${key}:`, error);
      }

      if (onFreshData) {
        try {
          await onFreshData(data);
        } catch (error) {
          console.warn(`Cache: Error writing stale envelope for key ${key}:`, error);
        }
      }

      return data;
    } finally {
      inFlightFetches.delete(key);
      if (lockAcquired) {
        await releaseCacheLock(redisClient, key);
      }
    }
  })();

  inFlightFetches.set(key, fetchPromise);
  return fetchPromise;
}

/**
 * Cache key prefixes for different data types
 */
export const CACHE_KEYS = {
  DASHBOARD_ADMIN: "dashboard:admin",
  DASHBOARD_MANAGER: "dashboard:manager",
  DASHBOARD_EMPLOYEE: "dashboard:employee",
  DASHBOARD_ENHANCED: "dashboard:enhanced",
  LEAD_DETAIL_PAGE: "lead:detail:page",
  LEAD_PIPELINE: "leads:pipeline",
  LEAD_SOURCES: "leads:sources",
  PROJECT_STATUS: "projects:status",
  TOP_PERFORMERS: "users:top_performers",
  DEPARTMENT_PERFORMANCE: "departments:performance",
} as const;

/**
 * Default TTL values in seconds
 */
export const CACHE_TTL = {
  DASHBOARD: 60, // 1 minute - dashboard stats
  LEAD_DETAIL_PAGE: 30, // 30 seconds - lead detail gateway payload
  PIPELINE: 30, // 30 seconds - lead pipeline (frequently updated)
  ANALYTICS: 300, // 5 minutes - analytics data
  STATIC: 600, // 10 minutes - relatively static data
} as const;

/**
 * Get cached data or fetch from source
 * Falls back gracefully if Redis is not available
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.DASHBOARD,
): Promise<T> {
  const redisClient = getRedis();

  // If Redis is not available, just fetch directly
  if (!redisClient) {
    return fetcher();
  }

  try {
    // Try to get from cache
    const cached = await redisClient.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (error) {
    console.warn(`Cache: Error reading key ${key}:`, error);
    // Continue to fetch fresh data
  }

  return fetchWithStampedeProtection(key, fetcher, ttlSeconds);
}

/**
 * Get cached data with stale-while-revalidate semantics.
 * - Fresh data is served from primary key.
 * - If primary misses but stale envelope exists, stale value is served instantly
 *   and refresh runs in background.
 */
export async function getCachedStaleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: StaleCacheOptions,
): Promise<T> {
  const redisClient = getRedis();
  const freshTtlSeconds = options?.freshTtlSeconds ?? CACHE_TTL.DASHBOARD;
  const staleTtlSeconds =
    options?.staleTtlSeconds ?? Math.max(freshTtlSeconds * 4, freshTtlSeconds + 30);

  if (!redisClient) {
    return fetcher();
  }

  try {
    const fresh = await redisClient.get<T>(key);
    if (fresh !== null && fresh !== undefined) {
      return fresh;
    }
  } catch (error) {
    console.warn(`Cache: Error reading fresh key ${key}:`, error);
  }

  const swrKey = buildSWRKey(key);
  try {
    const staleEnvelope = await redisClient.get<StaleCacheEnvelope<T>>(swrKey);
    if (
      staleEnvelope &&
      staleEnvelope.value !== undefined &&
      staleEnvelope.expiresAt > Date.now()
    ) {
      void fetchWithStampedeProtection(
        key,
        fetcher,
        freshTtlSeconds,
        async (data) => {
          await setStaleEnvelope(
            redisClient,
            key,
            data,
            freshTtlSeconds,
            staleTtlSeconds,
          );
        },
      );
      return staleEnvelope.value;
    }
  } catch (error) {
    console.warn(`Cache: Error reading stale envelope for key ${key}:`, error);
  }

  return fetchWithStampedeProtection(
    key,
    fetcher,
    freshTtlSeconds,
    async (data) => {
      await setStaleEnvelope(
        redisClient,
        key,
        data,
        freshTtlSeconds,
        staleTtlSeconds,
      );
    },
  );
}

/**
 * Invalidate cache for a specific key or pattern
 */
export async function invalidateCache(key: string): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

  try {
    await redisClient.del(key, buildSWRKey(key), buildLockKey(key));
  } catch (error) {
    console.warn(`Cache: Error invalidating key ${key}:`, error);
  }
}

/**
 * Invalidate multiple cache keys by pattern
 * Use with caution - can be slow with many keys
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

  try {
    // Get all keys matching pattern
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      const expandedKeys = new Set<string>();
      for (const key of keys) {
        expandedKeys.add(key);
        expandedKeys.add(buildSWRKey(key));
        expandedKeys.add(buildLockKey(key));
      }
      await redisClient.del(...Array.from(expandedKeys));
    }
  } catch (error) {
    console.warn(`Cache: Error invalidating pattern ${pattern}:`, error);
  }
}

/**
 * Build cache key with user/department context
 */
export function buildCacheKey(
  prefix: string,
  ...parts: (string | undefined)[]
): string {
  const validParts = parts.filter(Boolean);
  return validParts.length > 0 ? `${prefix}:${validParts.join(":")}` : prefix;
}

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
  return getRedis() !== null;
}

/**
 * Get cache stats (for monitoring)
 */
export async function getCacheStats(): Promise<{
  available: boolean;
  info?: string;
}> {
  const redisClient = getRedis();
  if (!redisClient) {
    return { available: false };
  }

  try {
    // Simple ping to check connection
    const result = await redisClient.ping();
    return { available: result === "PONG", info: "Connected" };
  } catch (error) {
    return { available: false, info: String(error) };
  }
}
