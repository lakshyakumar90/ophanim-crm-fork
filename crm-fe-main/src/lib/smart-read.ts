export type QueryStrategy =
  | "backend-only"
  | "supabase-only"
  | "supabase-with-fallback";

export interface SmartReadOptions<TSource, TNormalized = TSource> {
  routeKey: string;
  strategy: QueryStrategy;
  supabaseQuery?: () => Promise<TSource>;
  backendQuery?: () => Promise<TSource>;
  normalize?: (value: TSource) => TNormalized;
  shouldFallback?: (value: TNormalized) => boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 11000;

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function logFallback(routeKey: string, reason: string) {
  if (isDev()) {
    console.warn(`[smart-read] fallback route=${routeKey} reason=${reason}`);
  }
}

function logSource(routeKey: string, source: "supabase" | "backend") {
  if (isDev()) {
    console.info(`[smart-read] source route=${routeKey} source=${source}`);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function ensureQuery<T>(query: (() => Promise<T>) | undefined, kind: "supabase" | "backend", routeKey: string) {
  if (!query) {
    throw new Error(`[smart-read] missing ${kind} query for route=${routeKey}`);
  }
  return query;
}

export async function smartRead<TSource, TNormalized = TSource>(
  options: SmartReadOptions<TSource, TNormalized>,
): Promise<TNormalized> {
  const {
    routeKey,
    strategy,
    supabaseQuery,
    backendQuery,
    normalize,
    shouldFallback,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const normalizeValue = ((value: TSource) =>
    (normalize ? normalize(value) : (value as unknown as TNormalized)));

  if (strategy === "backend-only") {
    const backend = ensureQuery(backendQuery, "backend", routeKey);
    const value = await withTimeout(backend(), timeoutMs, `${routeKey}:backend`);
    const normalized = normalizeValue(value);
    logSource(routeKey, "backend");
    return normalized;
  }

  if (strategy === "supabase-only") {
    const supabase = ensureQuery(supabaseQuery, "supabase", routeKey);
    const value = await withTimeout(supabase(), timeoutMs, `${routeKey}:supabase`);
    const normalized = normalizeValue(value);
    logSource(routeKey, "supabase");
    return normalized;
  }

  const supabase = ensureQuery(supabaseQuery, "supabase", routeKey);
  const backend = ensureQuery(backendQuery, "backend", routeKey);

  try {
    const value = await withTimeout(supabase(), timeoutMs, `${routeKey}:supabase`);
    const normalized = normalizeValue(value);

    if (shouldFallback?.(normalized)) {
      logFallback(routeKey, "predicate");
      const fallbackValue = await withTimeout(backend(), timeoutMs, `${routeKey}:backend`);
      const fallbackNormalized = normalizeValue(fallbackValue);
      logSource(routeKey, "backend");
      return fallbackNormalized;
    }

    logSource(routeKey, "supabase");
    return normalized;
  } catch (error: any) {
    const reason = error?.message || error?.code || "supabase-error";
    logFallback(routeKey, String(reason));
    const fallbackValue = await withTimeout(backend(), timeoutMs, `${routeKey}:backend`);
    const fallbackNormalized = normalizeValue(fallbackValue);
    logSource(routeKey, "backend");
    return fallbackNormalized;
  }
}
