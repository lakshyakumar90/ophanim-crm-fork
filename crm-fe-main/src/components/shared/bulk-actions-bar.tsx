"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type BulkActionsBarProps = {
  count: number;
  label?: string;
  children: ReactNode;
  onClear: () => void;
  className?: string;
};

export function BulkActionsBar({
  count,
  label,
  children,
  onClear,
  className,
}: BulkActionsBarProps) {
  if (count < 1) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-foreground px-4 py-2.5 text-background elevation-floating transition-interactive",
        className,
      )}
    >
      <span className="text-xs font-medium whitespace-nowrap">
        {label ?? `${count} selected`}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="h-7 w-7 text-background hover:bg-background/20 hover:text-background"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
