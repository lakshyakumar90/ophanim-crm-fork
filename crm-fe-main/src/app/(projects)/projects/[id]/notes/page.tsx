"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  Save,
  StickyNote,
  Lock,
  Paperclip,
  Download,
  File,
  FileText,
  FileImage,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  content: string;
  isPinned: boolean;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProjectFile {
  id: string;
  name: string;
  fileType: string | null;
  fileSize: number | null;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const FILE_REF_REGEX = /📎 \[([^\]]+)\]\(file:([^)]+)\)/g;

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return <File className="h-3.5 w-3.5" />;
  if (fileType.startsWith("image/")) return <FileImage className="h-3.5 w-3.5 text-blue-500" />;
  if (fileType.includes("pdf")) return <FileText className="h-3.5 w-3.5 text-red-500" />;
  return <File className="h-3.5 w-3.5 text-slate-500" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileChip({ name, fileId, projectId }: { name: string; fileId: string; projectId: string }) {
  const handleDownload = async () => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.data.downloadUrl, "_blank");
      } else {
        toast.error("Failed to get download URL");
      }
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer mt-1"
    >
      <Paperclip className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[160px]">{name}</span>
      <Download className="h-3 w-3 opacity-60 shrink-0" />
    </button>
  );
}

function renderContent(content: string, projectId: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(FILE_REF_REGEX.source, "g");

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.slice(lastIndex, match.index)}
        </span>,
      );
    }
    parts.push(
      <FileChip key={`file-${match[2]}`} name={match[1]} fileId={match[2]} projectId={projectId} />,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key="text-end" className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>,
    );
  }

  return parts.length > 0 ? <>{parts}</> : <span className="whitespace-pre-wrap">{content}</span>;
}

function PrivateNotes({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [composing, setComposing] = useState(false);

  // File picker
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/notes?private=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((data.data || []).reverse());
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchNotes();
  }, [projectId, user]);

  const loadProjectFiles = async () => {
    if (projectFiles.length > 0) return;
    setLoadingFiles(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjectFiles(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFiles(false);
    }
  };

  const openFilePicker = async () => {
    setShowFilePicker(true);
    await loadProjectFiles();
  };

  const insertFileRef = (file: ProjectFile) => {
    const ref = `\n📎 [${file.name}](file:${file.id})`;
    setNewNote((prev) => prev + ref);
    setShowFilePicker(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newNote, isPrivate: true }),
      });
      if (res.ok) {
        setNewNote("");
        setComposing(false);
        await fetchNotes();
        toast.success("Note saved");
      } else {
        toast.error("Failed to save note");
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-4">
      {/* Compose area */}
      {composing ? (
        <div className="border rounded-2xl bg-card shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-4">
              <Textarea
                ref={textareaRef}
                placeholder="Write a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="resize-none min-h-[100px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm bg-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    if (!newNote.trim()) setComposing(false);
                  }
                }}
              />
            </div>
            <div className="border-t px-4 py-2.5 flex items-center justify-between bg-muted/30">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => openFilePicker()}
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach file
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setNewNote("");
                    setComposing(false);
                  }}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting || !newNote.trim()} className="h-7 text-xs gap-1.5">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Note
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setComposing(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all text-muted-foreground text-sm"
        >
          <Plus className="h-4 w-4" />
          Add a note...
        </button>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-15" />
          <p className="text-sm font-medium">No personal notes yet</p>
          <p className="text-xs mt-1 opacity-70">Only you can see notes written here.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group relative flex flex-col bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={note.user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {note.user?.fullName ? getInitials(note.user.fullName) : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(note.createdAt), "MMM d, h:mm a")}
                </span>
              </div>

              {/* Content */}
              <div className="text-sm leading-relaxed text-foreground flex-1 flex flex-col gap-1">
                {renderContent(note.content, projectId)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Picker Dialog */}
      <Dialog open={showFilePicker} onOpenChange={setShowFilePicker}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attach a Project File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {loadingFiles ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : projectFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No files uploaded yet.</p>
              </div>
            ) : (
              projectFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => insertFileRef(file)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="p-1.5 bg-slate-100 rounded shrink-0">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {file.fileSize && (
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProjectNotesPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          My Notes
          <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <Lock className="h-3 w-3" /> Private
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Personal notes only visible to you for this project.
        </p>
      </div>
      <PrivateNotes projectId={id} />
    </div>
  );
}
