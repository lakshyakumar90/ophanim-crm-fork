"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message = "Failed to load this page. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
