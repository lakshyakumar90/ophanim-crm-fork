"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function GlobalGroupError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-full min-h-screen flex items-center justify-center p-6">
      <ErrorState title="Global page error" onRetry={reset} />
    </div>
  );
}
