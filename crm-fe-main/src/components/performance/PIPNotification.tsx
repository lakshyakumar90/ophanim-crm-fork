"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp } from "lucide-react";

export function PIPNotification() {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <TrendingUp className="h-4 w-4 text-amber-700" />
      <AlertTitle>Performance improvement plan</AlertTitle>
      <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
        A performance improvement plan has been initiated. Your manager will work with you on a
        focused development plan and next steps. This is an opportunity to align on expectations
        and support your growth.
      </AlertDescription>
    </Alert>
  );
}
