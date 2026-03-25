import type { HREmployee, EmployeeStatus, ShiftType } from "@/types/hr.types";

export function canSeeFullCTC(permissions: string[] | undefined | null): boolean {
  const p = permissions ?? [];
  if (p.includes("crm:admin")) return true;
  return p.some((x) => x === "hr:employees_edit" || x === "hr:manage" || x === "hr:compensation_edit");
}

/** Backend route uses hr:compensation_view | hr:view | hr:manage */
export function canFetchCompensationHistory(permissions: string[] | undefined | null): boolean {
  const p = permissions ?? [];
  if (p.includes("crm:admin")) return true;
  return p.some(
    (x) =>
      x === "hr:compensation_view" ||
      x === "hr:view" ||
      x === "hr:manage" ||
      x === "hr:compensation_edit",
  );
}

export function canEditEmployees(permissions: string[] | undefined | null): boolean {
  const p = permissions ?? [];
  if (p.includes("crm:admin")) return true;
  return p.some((x) => x === "hr:employees_edit" || x === "hr:manage");
}

export function canViewEmployees(permissions: string[] | undefined | null): boolean {
  const p = permissions ?? [];
  if (p.includes("crm:admin")) return true;
  return p.some((x) => x === "hr:employees_view" || x === "hr:view" || x === "hr:manage");
}

const MASK = "₹**,**,***";

export function formatCTC(amount: number | null | undefined, canSee: boolean): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  if (!canSee) return MASK;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRRange(prev: number | null, next: number, canSee: boolean): string {
  if (!canSee) return `${MASK} → ${MASK}`;
  const a = prev != null ? formatCTC(prev, true) : "—";
  const b = formatCTC(next, true);
  return `${a} → ${b}`;
}

export function pctChange(prev: number | null, next: number): number | null {
  if (prev == null || prev === 0) return null;
  return ((next - prev) / prev) * 100;
}

export function normalizeHrStatus(emp: HREmployee): EmployeeStatus {
  if (!emp.isActive) return "inactive";
  const s = (emp.hrStatus || "active").toLowerCase();
  if (s === "archived") return "archived";
  if (s === "on_leave" || s === "on leave") return "on_leave";
  if (s === "probation") return "probation";
  return s as EmployeeStatus;
}

export function statusBadgeClass(status: EmployeeStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-600 hover:bg-emerald-600";
    case "inactive":
      return "bg-red-600 hover:bg-red-600";
    case "on_leave":
      return "bg-amber-500 hover:bg-amber-500";
    case "probation":
      return "bg-violet-600 hover:bg-violet-600";
    case "archived":
      return "bg-muted text-muted-foreground line-through";
    default:
      return "bg-secondary";
  }
}

export function shiftLabel(shift: ShiftType): string {
  if (!shift) return "—";
  const m: Record<string, string> = {
    day_shift: "Day",
    night_shift: "Night",
    morning: "Morning",
    evening: "Evening",
    night: "Night",
    flexible: "Flexible",
    unassigned: "—",
  };
  return m[shift] || String(shift).replace(/_/g, " ");
}

export function shiftBadgeClass(shift: ShiftType): string {
  if (!shift || shift === "unassigned") return "border-muted-foreground/40 text-muted-foreground";
  if (shift === "morning" || shift === "day_shift") return "border-amber-400 text-amber-800 bg-amber-50";
  if (shift === "evening") return "border-orange-400 text-orange-800 bg-orange-50";
  if (shift === "night" || shift === "night_shift") return "border-indigo-400 text-indigo-800 bg-indigo-50";
  if (shift === "flexible") return "border-teal-400 text-teal-800 bg-teal-50";
  return "border-muted-foreground/40";
}

export type KPIFilterPreset =
  | "all"
  | "active"
  | "on_leave"
  | "probation"
  | "inactive_archived";

export function employeeMatchesKpiPreset(emp: HREmployee, preset: KPIFilterPreset): boolean {
  const st = normalizeHrStatus(emp);
  if (preset === "all") return true;
  if (preset === "active") return emp.isActive && st !== "archived" && st !== "on_leave";
  if (preset === "on_leave") return st === "on_leave";
  if (preset === "probation") return st === "probation";
  if (preset === "inactive_archived") return !emp.isActive || st === "archived";
  return true;
}

export function buildEmployeeCSV(
  rows: HREmployee[],
  includeCTC: boolean,
): string {
  const headers = [
    "Name",
    "Email",
    "Role",
    "Department",
    "Team",
    "Designation",
    "Shift",
    "Status",
    "Joined Date",
    ...(includeCTC ? ["Current CTC"] : []),
  ];
  const lines = rows.map((e) => {
    const st = normalizeHrStatus(e);
    const base = [
      escapeCsv(e.fullName),
      escapeCsv(e.email),
      escapeCsv(e.role),
      escapeCsv(e.departmentName || ""),
      escapeCsv(e.teamName || ""),
      escapeCsv(e.jobTitle || ""),
      escapeCsv(shiftLabel(e.shiftType as ShiftType)),
      escapeCsv(st),
      escapeCsv(e.dateOfJoining || e.createdAt?.slice(0, 10) || ""),
    ];
    if (includeCTC) {
      base.push(e.currentCtc != null ? String(e.currentCtc) : "");
    }
    return base.join(",");
  });
  return [headers.join(","), ...lines].join("\n");
}

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function formatJoinedDisplay(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}
