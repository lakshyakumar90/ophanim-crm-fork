"use client";

import { Button } from "@/components/ui/button";

export function BulkActionsBar({
  count,
  onExportSelected,
  onDeactivateSelected,
  onClear,
  canDeactivate,
}: {
  count: number;
  onExportSelected: () => void;
  onDeactivateSelected: () => void;
  onClear: () => void;
  canDeactivate: boolean;
}) {
  if (count < 1) return null;
  return (
    <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 bg-muted/20">
      <span className="text-sm font-medium">{count} employees selected</span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onExportSelected}>
          Export selected
        </Button>
        {canDeactivate ? (
          <Button type="button" size="sm" variant="destructive" onClick={onDeactivateSelected}>
            Deactivate selected
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
