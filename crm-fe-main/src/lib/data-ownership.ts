export type DataOwner = "frontend-supabase" | "backend-api" | "conditional-after-rls";

// This contract is the single source of truth for read-path placement decisions.
export const DATA_OWNERSHIP: Record<string, DataOwner> = {
  "leads/reminders/count": "frontend-supabase",
  "leads/reminders/all": "frontend-supabase",
  projects: "frontend-supabase",
  departments: "frontend-supabase",
  teams: "frontend-supabase",
  holidays: "frontend-supabase",
  attendance: "backend-api",
  search: "backend-api",
  csv: "backend-api",
  approvals: "backend-api",
  "leads/page-data": "backend-api",
  activities: "conditional-after-rls",
  analytics: "conditional-after-rls",
  "performance/reminder-counts": "conditional-after-rls",
};

export function getDataOwner(routeKey: string): DataOwner | undefined {
  const normalized = routeKey.toLowerCase();

  const exact = DATA_OWNERSHIP[normalized];
  if (exact) return exact;

  const prefixMatch = Object.entries(DATA_OWNERSHIP).find(([prefix]) =>
    normalized.startsWith(prefix),
  );

  return prefixMatch?.[1];
}
