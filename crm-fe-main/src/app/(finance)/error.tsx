"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function FinanceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-full min-h-screen flex items-center justify-center p-6">
      <ErrorState title="Finance page error" onRetry={reset} />
    </div>
  );
}
