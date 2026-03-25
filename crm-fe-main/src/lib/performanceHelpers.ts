import {
  differenceInCalendarDays,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import type { ReviewStatus } from "@/types/performance";

export function canSeeCalibratedRating(params: {
  isEmployeeSubject: boolean;
  status: ReviewStatus;
  isHrOrManagerViewer: boolean;
}): boolean {
  const { isEmployeeSubject, status, isHrOrManagerViewer } = params;
  if (isEmployeeSubject) {
    return status === "released";
  }
  return isHrOrManagerViewer && ["calibrated", "director_approved", "released"].includes(status);
}

export function goalsWeightTotal(goals: Array<{ weight?: number }>): number {
  return goals.reduce((s, g) => s + Number(g.weight ?? 0), 0);
}

export function reviewStatusLabel(status: ReviewStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "self_submitted":
      return "Awaiting manager";
    case "manager_submitted":
      return "Awaiting calibration";
    case "calibrated":
      return "Calibrated";
    case "director_approved":
      return "Final approval complete";
    case "released":
      return "Released";
    default:
      return status;
  }
}

export function reviewStatusBadgeClass(status: ReviewStatus): string {
  switch (status) {
    case "draft":
      return "bg-muted text-muted-foreground border-border";
    case "self_submitted":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "manager_submitted":
      return "bg-blue-100 text-blue-900 border-blue-200";
    case "calibrated":
      return "bg-violet-100 text-violet-900 border-violet-200";
    case "director_approved":
      return "bg-indigo-100 text-indigo-900 border-indigo-200";
    case "released":
      return "bg-emerald-100 text-emerald-900 border-emerald-200";
    default:
      return "";
  }
}

export type DeadlineUrgency = "ok" | "soon" | "overdue";

export function deadlineUrgency(isoDate: string | null | undefined, cycleCompleted: boolean): DeadlineUrgency {
  if (!isoDate || cycleCompleted) return "ok";
  const d = parseISO(isoDate);
  if (!isValid(d)) return "ok";
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diff = differenceInCalendarDays(target, today);
  if (diff < 0) return "overdue";
  if (diff < 3) return "soon";
  return "ok";
}

export const CALIBRATED_RATING_ORDER = [
  "unsatisfactory",
  "below",
  "meets",
  "exceeds",
  "exceptional",
] as const;

export function calibratedRatingToStars(rating: string | null | undefined): number {
  const idx = CALIBRATED_RATING_ORDER.indexOf(
    (rating || "").toLowerCase() as (typeof CALIBRATED_RATING_ORDER)[number],
  );
  return idx >= 0 ? idx + 1 : 0;
}

export function starsToCalibratedRating(stars: number): string {
  const i = Math.min(5, Math.max(1, Math.round(stars))) - 1;
  return CALIBRATED_RATING_ORDER[i] ?? "meets";
}

export function ratingLabel(rating: string): string {
  const m: Record<string, string> = {
    unsatisfactory: "Below expectations",
    below: "Needs improvement",
    meets: "Meets expectations",
    exceeds: "Exceeds expectations",
    exceptional: "Outstanding",
  };
  return m[rating.toLowerCase()] || rating;
}
