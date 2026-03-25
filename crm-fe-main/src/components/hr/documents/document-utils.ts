import { format, parseISO, isValid } from "date-fns";

/** Display dates as "24 Mar 2026". */
export function formatDocDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd MMM yyyy");
  } catch {
    return "—";
  }
}

/** Urgency styling for expiry column. */
export function getExpiryTone(expiry: string | null | undefined): "muted" | "ok" | "soon" | "past" {
  if (!expiry) return "muted";
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "past";
  if (days <= 30) return "soon";
  return "ok";
}

export function slugToLabel(slug: string) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Backend has no is_required flag yet — treat these slugs as “required for everyone”
 * for completeness matrix + KPIs. Adjust as your org defines policy.
 */
export const DEFAULT_REQUIRED_DOCUMENT_SLUGS = [
  "aadhar",
  "pan",
  "offer_letter",
] as const;

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isAllowedUploadFile(file: File): boolean {
  const okExt = /\.(pdf|png|jpe?g|docx)$/i.test(file.name);
  const okMime =
    file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return okExt || okMime;
}
