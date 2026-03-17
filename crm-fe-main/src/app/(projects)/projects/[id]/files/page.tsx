"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Upload,
  Download,
  Trash2,
  File,
  FileText,
  FileImage,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
  uploadedBy: string | null;
  description: string | null;
  createdAt: string;
  uploader?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return <File className="h-5 w-5" />;
  if (fileType.startsWith("image/"))
    return <FileImage className="h-5 w-5 text-blue-500" />;
  if (fileType.includes("pdf"))
    return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-slate-500" />;
}

export default function ProjectFilesPage() {
  const params = useParams();
  const id = params.id as string;

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Upload dialog state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDescription, setPendingDescription] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${id}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch files", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingDescription("");
    setShowUploadDialog(true);
    e.target.value = "";
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile) return;
    setIsUploading(true);
    setShowUploadDialog(false);

    try {
      const token = localStorage.getItem("crm_access_token");
      const formData = new FormData();
      formData.append("file", pendingFile);
      if (pendingDescription.trim()) {
        formData.append("description", pendingDescription.trim());
      }

      const res = await fetch(`${API_URL}/projects/${id}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        toast.success("File uploaded successfully");
        fetchFiles();
      } else {
        const err = await res.json();
        toast.error(err.error || "Upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload file");
      console.error(error);
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      setPendingDescription("");
    }
  };

  const handleUploadCancel = () => {
    setShowUploadDialog(false);
    setPendingFile(null);
    setPendingDescription("");
  };

  const handleDownload = async (file: ProjectFile) => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(
        `${API_URL}/projects/${id}/files/${file.id}/download`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        window.open(data.data.downloadUrl, "_blank");
      } else {
        toast.error("Failed to get download URL");
      }
    } catch (error) {
      toast.error("Download failed");
      console.error(error);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${id}/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("File deleted");
        fetchFiles();
      } else {
        toast.error("Failed to delete file");
      }
    } catch (error) {
      toast.error("Delete failed");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Project Files</CardTitle>
            <CardDescription>
              Upload and manage project documents
            </CardDescription>
          </div>
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <label htmlFor="file-upload">
              <Button
                asChild
                size="sm"
                disabled={isUploading}
                className="cursor-pointer gap-1"
              >
                <span>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? "Uploading..." : "Upload File"}
                </span>
              </Button>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No files uploaded yet.</p>
              <p className="text-xs mt-1">
                Upload documents, images, or other files.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                      {getFileIcon(file.fileType)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      {file.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                          {file.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>·</span>
                        <span>{file.uploader?.fullName || "Unknown"}</span>
                        <span>·</span>
                        <span>
                          {format(new Date(file.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.id)}
                      title="Delete"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => !open && handleUploadCancel()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                {getFileIcon(pendingFile?.type || null)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{pendingFile?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(pendingFile?.size ?? null)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-description">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="file-description"
                placeholder="Add a description for this file..."
                value={pendingDescription}
                onChange={(e) => setPendingDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleUploadCancel}>
              Cancel
            </Button>
            <Button onClick={handleUploadConfirm} className="gap-1">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
