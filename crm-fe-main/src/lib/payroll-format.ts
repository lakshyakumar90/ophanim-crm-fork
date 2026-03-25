import { format, parseISO } from "date-fns";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPreciseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Indian currency — whole rupees by default */
export function formatINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return inrFormatter.format(0);
  }
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (Number.isNaN(n)) return inrFormatter.format(0);
  return inrFormatter.format(n);
}

export function formatINRPrecise(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return inrPreciseFormatter.format(0);
  }
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (Number.isNaN(n)) return inrPreciseFormatter.format(0);
  return inrPreciseFormatter.format(n);
}

export function parseNum(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** "March 2026" from YYYY-MM */
export function formatPayrollMonthLabel(month: string): string {
  try {
    return format(parseISO(`${month}-01`), "MMMM yyyy");
  } catch {
    return month;
  }
}

export function attendanceSummaryDisplay(s: Record<string, number> | null | undefined): {
  workingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  lopDays: number;
} {
  if (!s || typeof s !== "object") {
    return { workingDays: 0, presentDays: 0, lateDays: 0, halfDays: 0, lopDays: 0 };
  }
  const working =
    (s.workingDays as number) ??
    (s as { working_days?: number }).working_days ??
    0;
  const present =
    (s.presentDays as number) ??
    (s as { present_days?: number }).present_days ??
    0;
  const half =
    (s.halfDays as number) ??
    (s as { half_days?: number }).half_days ??
    0;
  const lop =
    (s.lopDays as number) ?? (s as { lop_days?: number }).lop_days ?? 0;
  const late = (s as { lateDays?: number }).lateDays ?? 0;
  return {
    workingDays: working,
    presentDays: present,
    lateDays: late,
    halfDays: half,
    lopDays: lop,
  };
}
