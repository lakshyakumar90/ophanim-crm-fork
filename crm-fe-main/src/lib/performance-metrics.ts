import {
  CALL_BUDGETS,
  EXCEPTION_REGISTRY,
  normalizeSWRKey,
  resolveWorkloadExceptionFromRequest,
} from "@/lib/request-guardrails";

interface PageBudgetState {
  firstSeenAt: number;
  totalCalls: number;
  initialCalls: number;
  exceptionCalls: number;
  warnedInitial: boolean;
  warnedInteraction: boolean;
}

const INITIAL_WINDOW_MS = 4000;
const pageStates = new Map<string, PageBudgetState>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function inDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function getCurrentPageKey(): string {
  if (!isBrowser()) return "server";
  return window.location.pathname || "unknown";
}

function getState(pageKey: string): PageBudgetState {
  const existing = pageStates.get(pageKey);
  if (existing) return existing;

  const next: PageBudgetState = {
    firstSeenAt: Date.now(),
    totalCalls: 0,
    initialCalls: 0,
    exceptionCalls: 0,
    warnedInitial: false,
    warnedInteraction: false,
  };
  pageStates.set(pageKey, next);
  return next;
}

function warn(message: string) {
  if (!inDev()) return;
  console.warn(`[guardrail] ${message}`);
}

export function recordSWRRequest(key: unknown): void {
  if (!inDev()) return;
  const normalized = normalizeSWRKey(key);
  if (!normalized) return;
  console.info(`[guardrail] swr-fetch key=${normalized}`);
}

export function recordHttpRequest(
  url: string | undefined,
  method: string | undefined,
  params?: unknown,
): void {
  if (!isBrowser()) return;

  const pageKey = getCurrentPageKey();
  const state = getState(pageKey);
  const now = Date.now();

  state.totalCalls += 1;

  if (now - state.firstSeenAt <= INITIAL_WINDOW_MS) {
    state.initialCalls += 1;
  }

  const exceptionId = resolveWorkloadExceptionFromRequest(url, method, params);

  if (exceptionId) {
    state.exceptionCalls += 1;
    return;
  }

  if (!state.warnedInitial && state.initialCalls > CALL_BUDGETS.maxInitialCallsPerPage) {
    state.warnedInitial = true;
    warn(
      `initial-call budget exceeded page=${pageKey} initial=${state.initialCalls} budget=${CALL_BUDGETS.maxInitialCallsPerPage} method=${method || "get"} url=${url || "unknown"}`,
    );
  }

  if (!state.warnedInteraction && state.totalCalls > CALL_BUDGETS.maxTotalCallsPerInteraction) {
    state.warnedInteraction = true;
    warn(
      `interaction-call budget exceeded page=${pageKey} total=${state.totalCalls} budget=${CALL_BUDGETS.maxTotalCallsPerInteraction} method=${method || "get"} url=${url || "unknown"}`,
    );
  }
}

export function getCurrentPageMetrics() {
  const key = getCurrentPageKey();
  const state = pageStates.get(key);

  return {
    page: key,
    totalCalls: state?.totalCalls ?? 0,
    initialCalls: state?.initialCalls ?? 0,
    exceptionCalls: state?.exceptionCalls ?? 0,
    configuredExceptions: Object.values(EXCEPTION_REGISTRY).map(
      (item) => item.description,
    ),
  };
}
