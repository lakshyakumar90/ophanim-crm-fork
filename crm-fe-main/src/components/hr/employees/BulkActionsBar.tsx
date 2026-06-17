"use client";

import { Button } from "@/components/ui/button";
import { BulkActionsBar as SharedBulkActionsBar } from "@/components/shared/bulk-actions-bar";

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
  return (
    <SharedBulkActionsBar
      count={count}
      label={`${count} employee${count === 1 ? "" : "s"} selected`}
      onClear={onClear}
    >
      <Button type="button" size="sm" variant="secondary" onClick={onExportSelected}>
        Export selected
      </Button>
      {canDeactivate ? (
        <Button type="button" size="sm" variant="destructive" onClick={onDeactivateSelected}>
          Deactivate selected
        </Button>
      ) : null}
    </SharedBulkActionsBar>
  );
}
