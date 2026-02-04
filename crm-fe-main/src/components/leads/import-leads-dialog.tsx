"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, X, FileSpreadsheet, Loader2 } from "lucide-react";
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
import { csvApi } from "@/lib/api";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportLeadsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportLeadsDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);

    try {
      let csvContent = "";

      if (file.name.endsWith(".csv")) {
        csvContent = await file.text();
      } else if (file.name.match(/\.xlsx?$|\.xls$/)) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Use defval to ensure empty cells are handled properly
        // This prevents the leading comma issue
        csvContent = XLSX.utils.sheet_to_csv(worksheet, {
          FS: ",", // Force comma as field separator
          RS: "\n", // Force newline as record separator
          blankrows: false, // Skip blank rows
        });
      } else {
        throw new Error("Invalid file format. Please upload CSV or Excel.");
      }

      await csvApi.importLeads(csvContent);
      toast.success("Leads imported successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Failed to import leads");
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import leads. The file must match the
            required template.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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

            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Importing leads...
                </p>
              </div>
            ) : fileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="text-sm font-medium">{fileName}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  className="h-6 w-6"
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
      </DialogContent>
    </Dialog>
  );
}
