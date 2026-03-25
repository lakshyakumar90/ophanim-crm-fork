import { isAxiosError } from "axios";
import { toast } from "sonner";

type ErrorBody = { error?: { message?: string }; message?: string };

export function getApiErrorMessage(
  err: unknown,
  options?: {
    fallback?: string;
    statusMessages?: Record<number, string>;
    serverMessage?: string;
  },
): string {
  const fallback = options?.fallback ?? "Something went wrong";
  if (isAxiosError(err)) {
    const status = err.response?.status;
    if (status && options?.statusMessages?.[status]) {
      return options.statusMessages[status];
    }
    if (status && status >= 500) {
      return options?.serverMessage ?? "Something went wrong. Please try again.";
    }
    const body = err.response?.data as ErrorBody | undefined;
    return body?.error?.message || body?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function toastApiError(
  err: unknown,
  options?: {
    fallback?: string;
    statusMessages?: Record<number, string>;
    serverMessage?: string;
  },
): void {
  toast.error(getApiErrorMessage(err, options));
}
