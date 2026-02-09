"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { Send, Pencil, Trash2, MoreVertical } from "lucide-react";
import { teamNotesApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TeamNote {
  id: string;
  content: string;
  teamId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

interface TeamDiscussionProps {
  teamId: string;
  isAdmin: boolean;
}

export function TeamDiscussion({ teamId, isAdmin }: TeamDiscussionProps) {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNote, setEditingNote] = useState<TeamNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Mention state removed

  const {
    data: notesData,
    isLoading,
    error,
    mutate,
  } = useSWR(teamId ? `team-notes-${teamId}` : null, () =>
    teamNotesApi.list(teamId),
  );

  const notes: TeamNote[] = Array.isArray(notesData) ? notesData : [];

  const handleCreateNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await teamNotesApi.create(teamId, newNote);
      const createdNote = response.data?.data || response.data;

      setNewNote("");

      // Update local cache
      mutate(
        (currentNotes: any) => {
          if (!currentNotes) return [createdNote];
          if (Array.isArray(currentNotes)) return [createdNote, ...currentNotes];
          return [createdNote];
        },
        { revalidate: false },
      );

      toast.success("Note posted successfully");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to post note",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editContent.trim()) return;

    const originalNotes = notesData;
    const updatedNote = { ...editingNote, content: editContent };

    // Optimistic update
    mutate(
      (currentNotes: any) => {
        if (!currentNotes) return currentNotes;
        return {
          ...currentNotes,
          data: currentNotes.data.map((n: TeamNote) =>
            n.id === editingNote.id ? { ...n, content: editContent } : n,
          ),
        };
      },
      { revalidate: false },
    );

    setIsSubmitting(true);
    try {
      await teamNotesApi.update(editingNote.id, editContent);
      setEditingNote(null);
      toast.success("Note updated successfully");
    } catch (error: any) {
      // Revert
      mutate(originalNotes, { revalidate: false });
      toast.error(
        error.response?.data?.error?.message || "Failed to update note",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const originalNotes = notesData;

    // Optimistic update
    mutate(
      (currentNotes: any) => {
        if (!currentNotes) return currentNotes;
        return {
          ...currentNotes,
          data: currentNotes.data.filter((n: TeamNote) => n.id !== id),
        };
      },
      { revalidate: false },
    );

    try {
      await teamNotesApi.delete(id);
      setDeletingNote(null);
      toast.success("Note deleted successfully");
    } catch (error: any) {
      // Revert
      mutate(originalNotes, { revalidate: false });
      toast.error(
        error.response?.data?.error?.message || "Failed to delete note",
      );
    }
  };

  const startEdit = (note: TeamNote) => {
    setEditingNote(note);
    setEditContent(note.content);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading discussion...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load discussion
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">Team Discussion</h3>

        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src={user?.avatarUrl || ""} />
            <AvatarFallback>
              {user?.fullName ? getInitials(user.fullName) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Write a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px]"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleCreateNote}
                disabled={isSubmitting || !newNote.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Post Note
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No notes yet. Be the first to start a discussion!
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-card rounded-lg border shadow-sm p-4 flex gap-4"
            >
              <Avatar>
                <AvatarImage src={note.user?.avatarUrl || ""} />
                <AvatarFallback>
                  {note.user?.fullName ? getInitials(note.user.fullName) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold block">
                      {note.user?.fullName || "Unknown User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(
                        new Date(note.createdAt),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    </span>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEdit(note)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeletingNote(note.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="mt-2 text-sm whitespace-pre-wrap">
                  {note.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={!!editingNote}
        onOpenChange={(open) => !open && setEditingNote(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingNote(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateNote} disabled={isSubmitting}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingNote}
        onOpenChange={(open) => !open && setDeletingNote(null)}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deletingNote && handleDeleteNote(deletingNote)}
      />
    </div>
  );
}
