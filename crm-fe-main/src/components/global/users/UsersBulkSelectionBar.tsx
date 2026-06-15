import { Button } from "@/components/ui/button";

type UsersBulkSelectionBarProps = {
  selectedCount: number;
  bulkEditMode: boolean;
  onOpenBulkEdit: () => void;
  onScrollToBulkTable: () => void;
  onExitBulkEdit: () => void;
  onClearSelection: () => void;
};

export function UsersBulkSelectionBar({
  selectedCount,
  bulkEditMode,
  onOpenBulkEdit,
  onScrollToBulkTable,
  onExitBulkEdit,
  onClearSelection,
}: UsersBulkSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/20 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {bulkEditMode
          ? `${selectedCount} selected. Bulk edit table is open below.`
          : `${selectedCount} selected. Open bulk edit table to edit all selected users together.`}
      </p>
      <div className="flex items-center gap-3">
        {bulkEditMode ? (
          <>
            <Button
              variant="default"
              size="sm"
              className="rounded-lg px-4"
              onClick={onScrollToBulkTable}
            >
              Go to bulk table
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-lg px-4"
              onClick={onExitBulkEdit}
            >
              Exit bulk edit
            </Button>
          </>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="rounded-lg px-4"
            onClick={onOpenBulkEdit}
          >
            Bulk Edit Table
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg px-4"
          onClick={onClearSelection}
        >
          Clear selection
        </Button>
      </div>
    </div>
  );
}
