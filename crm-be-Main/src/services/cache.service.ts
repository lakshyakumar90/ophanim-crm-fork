import { Redis } from "@upstash/redis";

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

/**
 * Cache key prefixes for different data types
 */
export const CACHE_KEYS = {
  DASHBOARD_ADMIN: "dashboard:admin",
  DASHBOARD_MANAGER: "dashboard:manager",
  DASHBOARD_EMPLOYEE: "dashboard:employee",
  DASHBOARD_ENHANCED: "dashboard:enhanced",
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

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache (non-blocking)
  try {
    await redisClient.set(key, data, { ex: ttlSeconds });
  } catch (error) {
    console.warn(`Cache: Error writing key ${key}:`, error);
    // Don't fail the request, just log the error
  }

  return data;
}

/**
 * Invalidate cache for a specific key or pattern
 */
export async function invalidateCache(key: string): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

  try {
    await redisClient.del(key);
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
      await redisClient.del(...keys);
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
