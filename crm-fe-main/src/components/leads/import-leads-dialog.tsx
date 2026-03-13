"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Upload,
  X,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  SkipForward,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import useSWR from "swr";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { csvApi, usersApi } from "@/lib/api";
import { UserSelector } from "@/components/shared/user-selector";
import { useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { LEAD_STATUS_CONFIG } from "@/config/constants";
import type { LeadStatus } from "@/config/constants";

interface DuplicateCheckRow {
  rowIndex: number;
  leadName: string;
  email: string | null;
  phone: string | null;
  isDuplicate: boolean;
  duplicateLeadId: string | null;
  duplicateLeadName: string | null;
  action: "import" | "skip" | "update";
}

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultAssignTo?: string;
}

type Step = "upload" | "preview" | "importing";

export function ImportLeadsDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultAssignTo,
}: ImportLeadsDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<string>(defaultAssignTo || "");
  const [importStatus, setImportStatus] = useState<LeadStatus>("fresh_lead");
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<DuplicateCheckRow[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();

  const { data: usersData } = useSWR(
    (isAdmin || isManager) && open ? "users-for-import" : null,
    () => usersApi.list({ limit: 500 }),
  );
  const users = usersData?.data || [];

  useEffect(() => {
    if (open && defaultAssignTo) {
      setAssignTo(defaultAssignTo);
    }
  }, [open, defaultAssignTo]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setFileName(null);
      setCsvContent(null);
      setPreviewRows([]);
      setDuplicateCount(0);
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      let content = "";

      if (file.name.endsWith(".csv")) {
        content = await file.text();
      } else if (file.name.match(/\.xlsx?$|\.xls$/)) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        content = XLSX.utils.sheet_to_csv(worksheet, {
          FS: ",",
          RS: "\n",
          blankrows: false,
        });
      } else {
        throw new Error("Invalid file format. Please upload CSV or Excel.");
      }

      setCsvContent(content);
    } catch (error: any) {
      console.error("File read error:", error);
      toast.error(error.message || "Failed to read file");
      clearFile();
    }
  };

  const clearFile = () => {
    setFileName(null);
    setCsvContent(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCheckDuplicates = async () => {
    if (!csvContent) {
      toast.error("Please select a file first");
      return;
    }

    setIsChecking(true);
    try {
      const res = await csvApi.previewCheck(csvContent);
      const payload = res.data?.data ?? res.data;
      const rows: DuplicateCheckRow[] = payload.rows;
      setPreviewRows(rows);
      setDuplicateCount(payload.duplicateCount ?? 0);
      setStep("preview");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to check for duplicates",
      );
    } finally {
      setIsChecking(false);
    }
  };

  const setRowAction = (
    rowIndex: number,
    action: "import" | "skip" | "update",
  ) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? { ...r, action } : r)),
    );
  };

  const handleImport = async () => {
    if (!csvContent) return;

    setIsImporting(true);
    setStep("importing");

    // Build rowActions map from preview
    const rowActions: Record<number, "import" | "skip" | "update"> = {};
    previewRows.forEach((r) => {
      rowActions[r.rowIndex] = r.action;
    });

    try {
      const res = await csvApi.importLeads(
        csvContent,
        assignTo || undefined,
        importStatus,
        rowActions,
      );
      const result = res.data?.data ?? res.data;
      const successCount = result.successful ?? 0;
      const failCount = result.failed ?? 0;
      toast.success(
        `Import complete: ${successCount} imported${failCount > 0 ? `, ${failCount} failed` : ""}`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to import leads",
      );
      setStep("preview");
    } finally {
      setIsImporting(false);
    }
  };

  const actionIcon = (row: DuplicateCheckRow) => {
    if (row.action === "skip") return <SkipForward className="h-3.5 w-3.5" />;
    if (row.action === "update")
      return <RefreshCw className="h-3.5 w-3.5" />;
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  };

  const actionColor = (action: string) => {
    if (action === "skip") return "secondary";
    if (action === "update") return "outline";
    return "default";
  };

  const importCount = previewRows.filter((r) => r.action === "import").length;
  const skipCount = previewRows.filter((r) => r.action === "skip").length;
  const updateCount = previewRows.filter((r) => r.action === "update").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          step === "preview" ? "sm:max-w-3xl" : "sm:max-w-[450px]"
        }
      >
        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <>
            <DialogHeader>
              <DialogTitle>Import Leads</DialogTitle>
              <DialogDescription>
                Upload a CSV or Excel file to import leads. The file must match
                the required template.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  fileName
                    ? "border-primary/50 bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isChecking}
                />
                {fileName ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div className="text-sm font-medium">{fileName}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearFile}
                      className="h-6 w-6"
                      disabled={isChecking}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer flex flex-col items-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to select file</p>
                    <p className="text-xs text-muted-foreground">
                      CSV or Excel files supported
                    </p>
                  </div>
                )}
              </div>

              {/* Import Status Selector */}
              <div className="space-y-2">
                <Label>Import As</Label>
                <Select
                  value={importStatus}
                  onValueChange={(val) => setImportStatus(val as LeadStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUS_CONFIG.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assign To User Selector */}
              {(isAdmin || isManager) && (
                <div className="space-y-2">
                  <Label htmlFor="assignTo">Assign Imported Leads To</Label>
                  <UserSelector
                    users={users}
                    value={assignTo}
                    onValueChange={setAssignTo}
                    placeholder="Select user (optional)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to import as unassigned leads
                  </p>
                </div>
              )}

              {/* Download Template Link */}
              <div className="flex justify-center">
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs"
                  onClick={async () => {
                    try {
                      const response = await csvApi.getTemplate();
                      const blob = new Blob([response.data], {
                        type: "text/csv",
                      });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "leads_import_template.csv";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } catch {
                      toast.error("Failed to download template");
                    }
                  }}
                >
                  Download Template
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isChecking}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckDuplicates}
                disabled={isChecking || !csvContent}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Next
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2: Preview ── */}
        {step === "preview" && (
          <>
            <DialogHeader>
              <DialogTitle>Review Import</DialogTitle>
              <DialogDescription>
                {duplicateCount > 0 ? (
                  <span className="text-amber-600 font-medium">
                    {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""}{" "}
                    detected.
                  </span>
                ) : (
                  "No duplicates found."
                )}{" "}
                Choose an action for each row, then click Import.
              </DialogDescription>
            </DialogHeader>

            {/* Summary badges */}
            <div className="flex gap-2 flex-wrap text-xs pt-1">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {importCount} to import
              </Badge>
              {duplicateCount > 0 && (
                <>
                  <Badge variant="secondary" className="gap-1">
                    <SkipForward className="h-3 w-3" />
                    {skipCount} to skip
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <RefreshCw className="h-3 w-3" />
                    {updateCount} to update
                  </Badge>
                </>
              )}
            </div>

            <ScrollArea className="h-72 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Email / Phone</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow
                      key={row.rowIndex}
                      className={
                        row.isDuplicate ? "bg-amber-50 dark:bg-amber-950/20" : ""
                      }
                    >
                      <TableCell className="text-muted-foreground text-xs">
                        {row.rowIndex}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {row.leadName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{row.email || ""}</div>
                        <div>{row.phone || ""}</div>
                      </TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
                          <div className="flex items-center gap-1 text-amber-600 text-xs">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[100px]">
                              {row.duplicateLeadName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
                          <Select
                            value={row.action}
                            onValueChange={(v) =>
                              setRowAction(
                                row.rowIndex,
                                v as "import" | "skip" | "update",
                              )
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Skip</SelectItem>
                              <SelectItem value="update">Update</SelectItem>
                              <SelectItem value="import">Import</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={actionColor(row.action) as any}
                            className="gap-1 text-xs"
                          >
                            {actionIcon(row)}
                            Import
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                disabled={isImporting}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || importCount + updateCount === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {importCount + updateCount} lead
                    {importCount + updateCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 3: Importing (spinner only) ── */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Importing leads, please wait...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
