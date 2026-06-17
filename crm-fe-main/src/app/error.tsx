"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <ErrorState onRetry={reset} />
      </div>
    </div>
  );
}
