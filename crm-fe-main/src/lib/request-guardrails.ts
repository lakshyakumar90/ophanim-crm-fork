export const CALL_BUDGETS = {
  maxInitialCallsPerPage: 3,
  maxTotalCallsPerInteraction: 6,
} as const;

export const PAGINATION_RULES = {
  defaultMin: 10,
  defaultMax: 20,
  hardMax: 50,
} as const;

export const HEAVY_ENDPOINTS = [
  "dashboard",
  "analytics",
  "attendance-summary",
  "lead-page-data",
] as const;

export type ExceptionId = "sales-leads-kanban";

export interface BudgetException {
  id: ExceptionId;
  description: string;
  workloadKey: string;
}

export const EXCEPTION_REGISTRY: Record<ExceptionId, BudgetException> = {
  "sales-leads-kanban": {
    id: "sales-leads-kanban",
    description:
      "Sales leads Kanban intentionally fetches per-status columns with controlled load-more increments.",
    workloadKey: "kanban-leads",
  },
};

export function normalizeSWRKey(key: unknown): string {
  if (key == null) return "";

  if (Array.isArray(key)) {
    return key
      .map((part) => {
        if (typeof part === "string") return part;
        try {
          return JSON.stringify(part);
        } catch {
          return String(part);
        }
      })
      .join("|");
  }

  if (typeof key === "string") return key;

  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

export function resolveWorkloadExceptionFromKey(key: unknown): ExceptionId | null {
  const normalized = normalizeSWRKey(key).toLowerCase();

  if (normalized.includes(EXCEPTION_REGISTRY["sales-leads-kanban"].workloadKey)) {
    return "sales-leads-kanban";
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function resolveWorkloadExceptionFromRequest(
  url: string | undefined,
  method: string | undefined,
  params?: unknown,
): ExceptionId | null {
  const normalizedUrl = (url || "").toLowerCase();
  const normalizedMethod = (method || "get").toLowerCase();

  // Kanban fetches fan out into one GET /leads call per status column.
  if (normalizedMethod === "get" && normalizedUrl.includes("/leads") && isRecord(params)) {
    const hasStatus = typeof params.status === "string" && params.status.length > 0;
    const hasNumericLimit =
      typeof params.limit === "number" ||
      (typeof params.limit === "string" && Number.isFinite(Number(params.limit)));

    if (hasStatus && hasNumericLimit) {
      return "sales-leads-kanban";
    }
  }

  return null;
}
