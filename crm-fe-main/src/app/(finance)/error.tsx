"use client";

import { Button } from "@/components/ui/button";

export default function FinanceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-full min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <h2 className="text-lg font-semibold">Finance page error</h2>
        <Button onClick={reset}>Retry</Button>
      </div>
    </div>
  );
}
