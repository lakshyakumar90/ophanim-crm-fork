import { api } from "@/lib/api";
import type { CompensationHistory, HREmployee } from "@/types/hr.types";

type Envelope<T> = { data: T };

function unwrap<T>(res: { data: Envelope<T> }): T {
  return res.data.data;
}

/** Preserve triple-fallback for inconsistent envelopes */
export function unwrapEmployeeList(raw: unknown): HREmployee[] {
  const data = raw as { data?: unknown };
  if (Array.isArray(data?.data)) return data.data as HREmployee[];
  const inner = (data?.data as { data?: unknown } | undefined)?.data;
  if (Array.isArray(inner)) return inner as HREmployee[];
  return [];
}

export async function fetchHrEmployees(): Promise<HREmployee[]> {
  const res = await api.get("/hr/employees");
  return unwrapEmployeeList(res.data);
}

export function unwrapSingleEmployee(raw: unknown): HREmployee {
  const r = raw as { data?: unknown };
  const d = r?.data;
  if (d && typeof d === "object" && "id" in (d as object)) return d as HREmployee;
  const inner = (d as { data?: unknown } | undefined)?.data;
  if (inner && typeof inner === "object" && "id" in (inner as object)) return inner as HREmployee;
  throw new Error("Invalid employee response");
}

export async function fetchHrEmployeeById(id: string): Promise<HREmployee> {
  const res = await api.get(`/hr/employees/${id}`);
  return unwrapSingleEmployee(res.data);
}

export function normalizeCompensationRow(row: Record<string, unknown>): CompensationHistory {
  const g = (k: string, alt?: string) =>
    (row[k] ?? (alt ? row[alt] : undefined)) as string | number | null | undefined;
  const approved = row.approved_by_user as { full_name?: string } | undefined;
  return {
    id: String(g("id") ?? ""),
    employeeId: String(g("employee_id", "employeeId") ?? ""),
    previousCtc: (g("previous_ctc", "previousCtc") as number | null) ?? null,
    newCtc: Number(g("new_ctc", "newCtc") ?? 0),
    changeReason: (g("reason", "change_reason") as string | null) ?? null,
    effectiveDate: String(g("effective_date", "effectiveDate") ?? ""),
    changedBy: (g("approved_by", "approvedBy") as string | null) ?? null,
    changedByName: approved?.full_name ?? (g("changed_by_name") as string | undefined) ?? null,
    notes: (g("notes") as string | null) ?? null,
    changePercentage: (g("change_percentage", "changePercentage") as number | null) ?? null,
    createdAt: String(g("created_at", "createdAt") ?? ""),
  };
}

function unwrapArrayPayload(res: { data?: unknown }): unknown[] {
  const d = (res.data as { data?: unknown } | undefined)?.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object" && Array.isArray((d as { data?: unknown }).data)) {
    return (d as { data: unknown[] }).data;
  }
  return [];
}

export async function fetchEmployeeCompensationHistory(employeeId: string): Promise<CompensationHistory[]> {
  const res = await api.get(`/hr/employees/${employeeId}/compensation-history`);
  const raw = unwrapArrayPayload(res);
  return raw.map((r) => normalizeCompensationRow(r as Record<string, unknown>));
}

export async function updateHrEmployee(
  id: string,
  body: {
    email?: string;
    fullName?: string;
    phone?: string | null;
    role?: "admin" | "manager" | "employee" | "hr";
    departmentId?: string | null;
    jobTitle?: string | null;
    teamId?: string | null;
    managerId?: string | null;
    isActive?: boolean;
    shiftType?: string | null;
    currentCtc?: number | null;
    salaryComponents?: {
      basic_pct?: number;
      hra_pct?: number;
      allowance_pct?: number;
    };
    timezone?: string | null;
    country?: string | null;
    address?: string | null;
  },
): Promise<HREmployee> {
  // Keep payload aligned with backend update schema; drop unknown keys defensively.
  const payload: Record<string, unknown> = {};
  const allowedKeys = [
    "email",
    "fullName",
    "phone",
    "role",
    "departmentId",
    "jobTitle",
    "teamId",
    "managerId",
    "isActive",
    "shiftType",
    "currentCtc",
    "salaryComponents",
    "timezone",
    "country",
    "address",
  ] as const;
  for (const key of allowedKeys) {
    const value = body[key];
    if (value !== undefined) payload[key] = value;
  }
  const res = await api.put(`/hr/employees/${id}`, payload);
  return unwrapSingleEmployee(res.data);
}
