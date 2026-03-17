"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  MoreVertical,
  Pin,
  PinOff,
  Trash2,
  Edit2,
  Send,
  MessageSquare,
  Paperclip,
  Download,
  File,
  FileText,
  FileImage,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Regex: 📎 [filename](file:fileId)
const FILE_REF_REGEX = /📎 \[([^\]]+)\]\(file:([^)]+)\)/g;

function getFileIcon(fileType: string | null) {
  if (!fileType) return <File className="h-4 w-4" />;
  if (fileType.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
  if (fileType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-slate-500" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileChipProps {
  name: string;
  fileId: string;
  projectId: string;
}

function FileChip({ name, fileId, projectId }: FileChipProps) {
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
      className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors cursor-pointer"
    >
      <Paperclip className="h-3 w-3" />
      {name}
      <Download className="h-3 w-3 opacity-60" />
    </button>
  );
}

function renderNoteContent(content: string, projectId: string) {
  // Split by file references and render them as chips
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
      <FileChip
        key={`file-${match[2]}-${match.index}`}
        name={match[1]}
        fileId={match[2]}
        projectId={projectId}
      />,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-end`} className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>,
    );
  }

  return parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{content}</span>;
}

export function ProjectNotes({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // File picker state
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  // Track which textarea is active for file insertion: "new" | noteId
  const [filePickerTarget, setFilePickerTarget] = useState<"new" | string>("new");

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [projectId]);

  const loadProjectFiles = async () => {
    if (projectFiles.length > 0) return; // already loaded
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
    } catch (error) {
      console.error("Failed to fetch project files:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const openFilePicker = async (target: "new" | string) => {
    setFilePickerTarget(target);
    setShowFilePicker(true);
    await loadProjectFiles();
  };

  const insertFileRef = (file: ProjectFile) => {
    const ref = `\n📎 [${file.name}](file:${file.id})`;
    if (filePickerTarget === "new") {
      setNewNote((prev) => prev + ref);
    } else {
      // editing mode
      setEditContent((prev) => prev + ref);
    }
    setShowFilePicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newNote }),
      });

      if (res.ok) {
        setNewNote("");
        fetchNotes();
        toast.success("Note added");
      } else {
        toast.error("Failed to add note");
      }
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(
        `${API_URL}/projects/${projectId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: editContent }),
        },
      );

      if (res.ok) {
        setEditingNoteId(null);
        setEditContent("");
        fetchNotes();
        toast.success("Note updated");
      } else {
        toast.error("Failed to update note");
      }
    } catch {
      toast.error("Failed to update note");
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(
        `${API_URL}/projects/${projectId}/notes/${noteId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        fetchNotes();
        toast.success("Note deleted");
      } else {
        toast.error("Failed to delete note");
      }
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const togglePin = async (noteId: string, isPinned: boolean) => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const action = isPinned ? "unpin" : "pin";
      const res = await fetch(
        `${API_URL}/projects/${projectId}/notes/${noteId}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        fetchNotes();
        toast.success(isPinned ? "Note unpinned" : "Note pinned");
      } else {
        toast.error("Failed to update note status");
      }
    } catch {
      toast.error("Failed to update note status");
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Project Discussion
          </h2>
          <p className="text-sm text-muted-foreground">
            Team notes, updates, and discussions.
          </p>
        </div>
      </div>

      {/* Add Note Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Add a note, update, or question..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="resize-none min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => openFilePicker("new")}
              >
                <Paperclip className="h-4 w-4" />
                Attach file
              </Button>
              <Button type="submit" disabled={submitting || !newNote.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Post Note
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="opacity-50">
              <CardContent className="h-24" />
            </Card>
          ))
        ) : notes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>No notes yet. Start the discussion!</p>
          </div>
        ) : (
          notes.map((note) => (
            <Card
              key={note.id}
              className={cn(
                "transition-all",
                note.isPinned && "border-primary/50 bg-primary/5",
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={note.user?.avatarUrl || undefined} />
                    <AvatarFallback>
                      {note.user?.fullName ? getInitials(note.user.fullName) : "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {note.user?.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                        {note.isPinned && (
                          <div className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                            <Pin className="h-3 w-3" /> Pinned
                          </div>
                        )}
                      </div>

                      {(user?.role === "admin" ||
                        user?.role === "manager" ||
                        user?.id === note.user?.id) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 -mr-2"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(user?.role === "admin" || user?.role === "manager") && (
                              <DropdownMenuItem
                                onClick={() => togglePin(note.id, note.isPinned)}
                              >
                                {note.isPinned ? (
                                  <><PinOff className="h-4 w-4 mr-2" /> Unpin</>
                                ) : (
                                  <><Pin className="h-4 w-4 mr-2" /> Pin Note</>
                                )}
                              </DropdownMenuItem>
                            )}
                            {user?.id === note.user?.id && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditContent(note.content);
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => handleDelete(note.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {editingNoteId === note.id ? (
                      <div className="mt-2 space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[100px]"
                        />
                        <div className="flex items-center justify-between">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-muted-foreground"
                            onClick={() => openFilePicker(note.id)}
                          >
                            <Paperclip className="h-4 w-4" />
                            Attach file
                          </Button>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingNoteId(null)}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleUpdate(note.id)}>
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm mt-1 leading-relaxed flex flex-wrap gap-1 items-center">
                        {renderNoteContent(note.content, projectId)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* File Picker Dialog */}
      <Dialog open={showFilePicker} onOpenChange={setShowFilePicker}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attach a Project File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {loadingFiles ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : projectFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No files uploaded to this project yet.</p>
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
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize)}
                      </p>
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
