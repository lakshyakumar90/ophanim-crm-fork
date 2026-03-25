import { toastApiError } from "@/lib/api-error";

/** Map axios HR API errors to user-facing toasts (403/404/413/500). */
export function toastHrError(e: unknown, fallback = "Something went wrong. Please try again.") {
  toastApiError(e, {
    fallback,
    statusMessages: {
      403: "You don't have permission for this action",
      404: "Resource not found. It may have been deleted.",
      413: "File too large. Maximum size is 15MB.",
    },
    serverMessage: "Something went wrong. Please try again.",
  });
}
