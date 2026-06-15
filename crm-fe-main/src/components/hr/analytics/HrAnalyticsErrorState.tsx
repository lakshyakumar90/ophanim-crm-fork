"use client";

import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HrAnalyticsErrorStateProps {
  onRetry: () => void;
}

export function HrAnalyticsErrorState({ onRetry }: HrAnalyticsErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">Failed to load analytics data</p>
      <Button onClick={onRetry} className="mt-4">
        Retry
      </Button>
    </div>
  );
}
