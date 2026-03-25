"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchActiveDocumentTypesForSelf,
  fetchUserDocuments,
} from "@/lib/hr-document-api";
import { uploadHrDocument, openDocumentUrl } from "@/lib/documentService";
import type { EmployeeDocumentDto, HrDocumentTypeDto } from "@/types/hr-documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MyDocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<EmployeeDocumentDto[]>([]);
  const [types, setTypes] = useState<HrDocumentTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const [documents, activeTypes] = await Promise.all([
        fetchUserDocuments(userId),
        fetchActiveDocumentTypesForSelf(),
      ]);
      setDocs(documents);
      setTypes(activeTypes);
    } catch {
      setDocs([]);
      setTypes([]);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadData(user.id);
  }, [user]);

  const typeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    types.forEach((t) => map.set(t.slug, t.label));
    return map;
  }, [types]);

  const resetUpload = () => {
    setDocumentType("");
    setDocumentName("");
    setExpiryDate("");
    setNotes("");
    setFile(null);
    setProgress(0);
  };

  const submitUpload = async () => {
    if (!documentType || !documentName.trim() || !file || !user) {
      toast.error("Document type, name, and file are required");
      return;
    }

    const form = new FormData();
    form.append("documentType", documentType);
    form.append("documentName", documentName.trim());
    if (expiryDate) form.append("expiryDate", expiryDate);
    if (notes.trim()) form.append("notes", notes.trim());
    form.append("file", file);

    setUploading(true);
    try {
      await uploadHrDocument(form, (pct) => setProgress(pct), "/hr/documents/my/upload");
      toast.success("Document submitted for HR approval");
      setUploadOpen(false);
      resetUpload();
      await loadData(user.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>My documents</CardTitle>
            <Button onClick={() => setUploadOpen(true)}>Upload document</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{typeLabelMap.get(doc.documentType) || doc.documentType}</TableCell>
                      <TableCell>{doc.documentName}</TableCell>
                      <TableCell>{formatDate(doc.createdAt)}</TableCell>
                      <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                      <TableCell>
                        {doc.isVerified ? (
                          <Badge className="bg-emerald-600">Approved</Badge>
                        ) : (
                          <Badge variant="secondary">Pending HR approval</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-60 truncate" title={doc.notes || ""}>
                        {doc.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openDocumentUrl(doc.fileUrl)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            Uploaded documents are reviewed by HR. You will receive a notification when approved or rejected.
          </p>
        </CardContent>
      </Card>

      <Sheet open={uploadOpen} onOpenChange={(v) => {
        setUploadOpen(v);
        if (!v) resetUpload();
      }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-4">
          <SheetHeader>
            <SheetTitle>Upload document</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Document type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.slug}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document name</Label>
              <Input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g. Passport, PAN Card"
              />
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  setFile(selected);
                  if (selected && !documentName.trim()) {
                    setDocumentName(selected.name.replace(/\.[^.]+$/, ""));
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry date (optional)</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {uploading ? (
              <div className="space-y-1">
                <div className="h-2 w-full bg-muted rounded overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Uploading... {progress}%</p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={() => void submitUpload()} disabled={uploading}>
                {uploading ? "Submitting..." : "Submit for approval"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

