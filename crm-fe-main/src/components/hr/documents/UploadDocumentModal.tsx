"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSelector } from "@/components/shared/user-selector";
import type { HrDocumentTypeDto } from "@/types/hr-documents";
import type { HrEmployeeDirectoryRow } from "@/types/hr-leaves";
import { uploadHrDocument } from "@/lib/documentService";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { cn } from "@/lib/utils";
import { Upload, FileUp } from "lucide-react";
import { UPLOAD_MAX_BYTES, UPLOAD_ACCEPT, isAllowedUploadFile } from "./document-utils";

const EXPIRY_HINT_SLUGS = new Set([
  "passport",
  "visa",
  "driving_license",
  "aadhar",
  "pan",
  "work_permit",
]);

export function UploadDocumentModal({
  open,
  onOpenChange,
  employees,
  types,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: HrEmployeeDirectoryRow[];
  types: HrDocumentTypeDto[];
  onUploaded: () => Promise<void>;
}) {
  const [userId, setUserId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setUserId("");
      setDocumentType("");
      setDocumentName("");
      setExpiryDate("");
      setNotes("");
      setFile(null);
      setProgress(0);
      setDragOver(false);
    }
  }, [open]);

  const userOptions = employees.map((e) => ({
    id: e.id,
    fullName: e.fullName ?? e.full_name,
    email: e.email,
    departmentName: e.departmentName ?? e.department_name ?? undefined,
    jobTitle: e.jobTitle ?? e.job_title ?? undefined,
  }));

  const activeTypes = types.filter((t) => t.isActive);

  const showExpiryHint =
    documentType && (EXPIRY_HINT_SLUGS.has(documentType) || documentType.includes("visa"));

  const pickFile = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!isAllowedUploadFile(f)) {
      toast.error("Use PDF, JPG, PNG, or DOCX only.");
      return;
    }
    if (f.size > UPLOAD_MAX_BYTES) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }
    setFile(f);
    setDocumentName((n) => n.trim() || f.name.replace(/\.[^.]+$/, ""));
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  const submit = async () => {
    if (!userId || !documentType || !documentName.trim()) {
      toast.error("Employee, document type, and name are required");
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("userId", userId);
    fd.append("documentType", documentType);
    fd.append("documentName", documentName.trim());
    if (expiryDate) fd.append("expiryDate", expiryDate);
    if (notes.trim()) fd.append("notes", notes.trim());

    setUploading(true);
    setProgress(0);
    try {
      await uploadHrDocument(fd, (p) => setProgress(p));
      const emp = employees.find((e) => e.id === userId);
      const nm = emp?.fullName ?? emp?.full_name ?? "Employee";
      toast.success(`Document uploaded for ${nm}`);
      onOpenChange(false);
      await onUploaded();
    } catch (e) {
      if (e instanceof Error && e.message.includes("large")) {
        toast.error("File too large. Maximum size is 10MB.");
      } else {
        toastHrError(e, "Upload failed");
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Employee</Label>
            <UserSelector users={userOptions} value={userId} onValueChange={setUserId} />
          </div>
          <div className="space-y-2">
            <Label>Document type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {activeTypes.map((t) => (
                  <SelectItem key={t.id} value={t.slug}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g. Passport scan"
            />
          </div>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("hr-doc-file")?.click()}
          >
            <input
              id="hr-doc-file"
              type="file"
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drop file here or click to browse (PDF, images, DOCX — max 10MB)
            </p>
            {file ? (
              <p className="text-sm font-medium mt-2">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            ) : null}
            {uploading ? (
              <div className="mt-3 h-2 w-full bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>
              Expiry date
              {showExpiryHint ? (
                <span className="text-muted-foreground font-normal ml-1">
                  (recommended for IDs & visas)
                </span>
              ) : null}
            </Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={uploading} onClick={() => void submit()} className="gap-2">
            {uploading ? (
              <>Uploading… {progress}%</>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
