"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import {
  Send,
  Pencil,
  Clock,
  MoreVertical,
  Pin,
} from "lucide-react";
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
  isPinned?: boolean;
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

  // Mention state removed

  const {
    data: notesData,
    isLoading,
    error,
    mutate,
  } = useSWR(teamId ? `team-notes-${teamId}` : null, () =>
    teamNotesApi.list(teamId),
  );

  const getSortedNotes = () => {
    if (!notesData || !Array.isArray(notesData)) return [];
    
    // Create a copy to sort
    const sorted = [...notesData];
    // Separate pinned and unpinned to keep them chronologically valid but pinned at top
    // Wait, let's just render them. If the user wants similar to project discussion:
    return sorted.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  const notes: TeamNote[] = getSortedNotes();

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

  const handleTogglePin = async (noteId: string, isCurrentlyPinned: boolean) => {
    const originalNotes = notesData;

    // Optimistic update
    mutate(
      (currentNotes: any) => {
        if (!currentNotes) return currentNotes;
        const dataArray = Array.isArray(currentNotes) ? currentNotes : currentNotes.data;
        if (!dataArray) return currentNotes;
        
        const newData = dataArray.map((n: TeamNote) =>
          n.id === noteId ? { ...n, isPinned: !isCurrentlyPinned } : n,
        );
        
        return Array.isArray(currentNotes) ? newData : { ...currentNotes, data: newData };
      },
      { revalidate: false },
    );

    try {
      if (isCurrentlyPinned) {
        await teamNotesApi.unpin(noteId);
      } else {
        await teamNotesApi.pin(noteId);
      }
      toast.success(`Message ${isCurrentlyPinned ? "unpinned" : "pinned"} successfully`);
    } catch (error: any) {
      // Revert
      mutate(originalNotes, { revalidate: false });
      toast.error(
        error.response?.data?.error?.message || `Failed to ${isCurrentlyPinned ? "unpin" : "pin"} message`,
      );
    }
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
    <div className="flex flex-col h-[calc(100vh-250px)] min-h-[400px] border rounded-lg bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="font-semibold">Team Discussion</h3>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {notes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Send className="w-6 h-6 rotate-45 ml-1 opacity-50" />
            </div>
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          notes.slice().reverse().map((note) => {
            const isOwn = note.userId === user?.id;
            const canManage = isOwn || isAdmin;

            return (
              <div
                key={note.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  <AvatarImage src={note.user?.avatarUrl || ""} />
                  <AvatarFallback className="text-[10px]">
                    {note.user?.fullName ? getInitials(note.user.fullName) : "?"}
                  </AvatarFallback>
                </Avatar>

                {/* Message Content */}
                <div
                  className={`flex flex-col max-w-[80%] ${
                    isOwn ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-medium">
                      {isOwn ? "You" : note.user?.fullName || "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(note.createdAt), "h:mm a")}
                    </span>
                  </div>

                  <div className={`group relative flex items-start gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      } ${note.isPinned ? "ring-2 ring-amber-500/50" : ""}`}
                    >
                      {note.isPinned && (
                        <div className={`flex items-center gap-1 text-[10px] uppercase font-bold mb-1 opacity-80 ${isOwn ? "text-primary-foreground" : "text-amber-600"}`}>
                          <Pin className="h-3 w-3" /> Pinned
                        </div>
                      )}
                      {note.content}
                    </div>

                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-1"
                          >
                            <MoreVertical className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isOwn ? "end" : "start"}>
                          <DropdownMenuItem onClick={() => handleTogglePin(note.id, !!note.isPinned)}>
                            <Pin className="h-4 w-4 mr-2" />
                            {note.isPinned ? "Unpin Message" : "Pin Message"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-muted/10">
        <div className="flex gap-4">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user?.avatarUrl || ""} />
            <AvatarFallback className="text-[10px]">
              {user?.fullName ? getInitials(user.fullName) : "Y"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              placeholder="Type a message..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[40px] h-[40px] py-2 resize-none rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateNote();
                }
              }}
            />
            <Button
              size="icon"
              className="shrink-0 h-10 w-10 rounded-xl"
              onClick={handleCreateNote}
              disabled={isSubmitting || !newNote.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
