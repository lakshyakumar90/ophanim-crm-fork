"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Upload, X, FileSpreadsheet, Loader2 } from "lucide-react";
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
import { csvApi, usersApi } from "@/lib/api";
import { UserSelector } from "@/components/shared/user-selector";
import { useIsAdmin, useIsManager } from "@/providers/auth-provider";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultAssignTo?: string;
}

export function ImportLeadsDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultAssignTo,
}: ImportLeadsDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<string>(defaultAssignTo || "");
  const [importStatus, setImportStatus] = useState<"fresh_lead" | "cold_lead">(
    "fresh_lead",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();

  // Fetch users for the selector
  const { data: usersData } = useSWR(
    (isAdmin || isManager) && open ? "users-for-import" : null,
    () => usersApi.list({ limit: 500 }),
  );
  const users = usersData?.data || [];

  // Reset assignTo when dialog opens with defaultAssignTo
  useEffect(() => {
    if (open && defaultAssignTo) {
      setAssignTo(defaultAssignTo);
    }
  }, [open, defaultAssignTo]);

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

  const handleImport = async () => {
    if (!csvContent) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);

    try {
      await csvApi.importLeads(csvContent, assignTo || undefined, importStatus);
      toast.success("Leads imported successfully");
      onSuccess();
      onOpenChange(false);
      clearFile();
      setAssignTo("");
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to import leads",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFileName(null);
    setCsvContent(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import leads. The file must match the
            required template.
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
              disabled={isUploading}
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
                  disabled={isUploading}
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
              onValueChange={(val) =>
                setImportStatus(val as "fresh_lead" | "cold_lead")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fresh_lead">Fresh Lead</SelectItem>
                <SelectItem value="cold_lead">Cold Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assign To User Selector - visible to Admin/Manager */}
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
                  const blob = new Blob([response.data], { type: "text/csv" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "leads_import_template.csv";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error("Failed to download template:", error);
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
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isUploading || !csvContent}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
