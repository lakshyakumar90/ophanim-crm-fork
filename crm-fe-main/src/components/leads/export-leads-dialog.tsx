"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { csvApi, usersApi } from "@/lib/api";
import { getAllStatuses } from "@/lib/lead-status-config";
import { UserSelector } from "@/components/shared/user-selector";
import { useIsAdmin, useIsManager } from "@/providers/auth-provider";

interface ExportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExportLeadsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ExportLeadsDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [exportScope, setExportScope] = useState<"all" | "user">("all");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [removeAfterExport, setRemoveAfterExport] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const canFilterByUser = isAdmin || isManager;

  const { data: usersData } = useSWR(
    canFilterByUser && open ? "users-for-export" : null,
    () => usersApi.list({ limit: 500 }),
  );
  const users = usersData?.data || [];

  const handleExport = async () => {
    // If remove is checked, show confirmation first
    if (removeAfterExport && !showConfirmDialog) {
      setShowConfirmDialog(true);
      return;
    }

    setIsExporting(true);
    setShowConfirmDialog(false);

    try {
      const params: Record<string, string> = {};
      if (selectedStatus !== "all") {
        params.status = selectedStatus;
      }
      if (exportScope === "user" && assignedTo) {
        params.assignedTo = assignedTo;
      }
      if (removeAfterExport) {
        params.removeAfterExport = "true";
      }

      const response = await csvApi.exportLeads(params);

      // Create download link
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Check headers for counts
      const exportedCount = response.headers?.["x-exported-count"] || "0";
      const removedCount = response.headers?.["x-removed-count"] || "0";

      if (removeAfterExport && parseInt(removedCount) > 0) {
        toast.success(
          `Exported ${exportedCount} leads and removed ${removedCount} from database`,
        );
      } else {
        toast.success(`Exported ${exportedCount} leads successfully`);
      }

      onSuccess?.();
      onOpenChange(false);
      setSelectedStatus("all");
      setExportScope("all");
      setAssignedTo("");
      setRemoveAfterExport(false);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export leads");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export Leads</DialogTitle>
            <DialogDescription>
              Export leads to CSV file. Filter by status or export leads
              assigned to a specific user.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Export Scope - only for admin/manager */}
            {canFilterByUser && (
              <div className="space-y-2">
                <Label>Export Scope</Label>
                <div className="flex rounded-md border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setExportScope("all"); setAssignedTo(""); }}
                    className={`flex-1 px-3 py-1.5 text-sm transition-colors ${
                      exportScope === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    All Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportScope("user")}
                    className={`flex-1 px-3 py-1.5 text-sm transition-colors border-l ${
                      exportScope === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    User Wise
                  </button>
                </div>
              </div>
            )}

            {/* User Selector - shown when scope is "user" */}
            {canFilterByUser && exportScope === "user" && (
              <div className="space-y-2">
                <Label>Select User</Label>
                <UserSelector
                  users={users}
                  value={assignedTo}
                  onValueChange={setAssignedTo}
                  placeholder="Select a user..."
                />
              </div>
            )}

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {getAllStatuses().map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Remove after export option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="removeAfterExport"
                checked={removeAfterExport}
                onCheckedChange={(checked) =>
                  setRemoveAfterExport(checked === true)
                }
              />
              <Label
                htmlFor="removeAfterExport"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remove leads from database after export
              </Label>
            </div>

            {removeAfterExport && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Warning: Exported leads will be permanently removed from the
                  database.
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Lead Removal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove leads from the database after
              exporting? This action cannot be undone. The leads will be
              soft-deleted and won't appear in your CRM anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Export and Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
