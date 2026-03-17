"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  Trash2,
  Edit2,
  Send,
  StickyNote,
  Lock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function PrivateNotes({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Filter to only show the current user's own notes
        const allNotes: Note[] = data.data || [];
        setNotes(allNotes.filter((n) => n.user?.id === user?.id));
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

  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) return;
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContent }),
      });
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
    if (!confirm("Delete this note?")) return;
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
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

  return (
    <div className="space-y-6">
      {/* New note form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Write a private note for yourself..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="resize-none min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !newNote.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Save Note
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notes list */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="opacity-50">
              <CardContent className="h-20" />
            </Card>
          ))
        ) : notes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <StickyNote className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>No personal notes yet.</p>
            <p className="text-xs mt-1">Only you can see notes written here.</p>
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
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
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                      </span>

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
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditContent(note.content);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDelete(note.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {editingNoteId === note.id ? (
                      <div className="mt-2 space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex items-center gap-2 justify-end">
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
                    ) : (
                      <div className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default function ProjectNotesPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="flex flex-col gap-4 p-6 mx-auto">
      <div className="flex items-center gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            My Notes
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Lock className="h-3 w-3" /> Private
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Personal notes only visible to you for this project.
          </p>
        </div>
      </div>
      <PrivateNotes projectId={id} />
    </div>
  );
}
