"use client";

import { Button } from "@/components/ui/button";

export default function GlobalGroupError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-full min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <h2 className="text-lg font-semibold">Global page error</h2>
        <Button onClick={reset}>Retry</Button>
      </div>
    </div>
  );
}
