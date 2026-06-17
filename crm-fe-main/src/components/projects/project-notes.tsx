"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/providers/auth-provider";
import { getProjectNotes, getProjectById } from "@/lib/supabase-queries";
import { UserSelector } from "@/components/shared/user-selector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import {
  MoreVertical,
  Pin,
  PinOff,
  Send,
  MessageSquare,
  Paperclip,
  Download,
  File,
  FileText,
  FileImage,
  Loader2,
  AtSign,
  CheckCheck,
  X,
  ChevronDown,
  ChevronUp,
  Upload,
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isProjectManagerFor } from "@/lib/projects-scope";

interface Note {
  id: string;
  projectId?: string;
  content: string;
  isPinned: boolean;
  userId: string | null;
  userName: string;
  userAvatar: string | null;
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
const USER_MENTION_REGEX = /@\[(.+?)\]\(user:([0-9a-fA-F-]{36})\)/g;

function getFileIcon(fileType: string | null) {
  if (!fileType) return <File className="h-3.5 w-3.5" />;
  if (fileType.startsWith("image/")) return <FileImage className="h-3.5 w-3.5 text-blue-400" />;
  if (fileType.includes("pdf")) return <FileText className="h-3.5 w-3.5 text-red-400" />;
  return <File className="h-3.5 w-3.5 text-slate-400" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

interface FileChipProps {
  name: string;
  fileId: string;
  projectId: string;
  isOwn?: boolean;
}

function FileChip({ name, fileId, projectId, isOwn }: FileChipProps) {
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
      className={cn(
        "inline-flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 hover:opacity-80 transition-opacity cursor-pointer border mt-1",
        isOwn
          ? "bg-white/15 text-white border-white/25"
          : "bg-slate-100 text-slate-700 border-slate-200",
      )}
    >
      <Paperclip className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[140px]">{name}</span>
      <Download className="h-3 w-3 opacity-60 shrink-0" />
    </button>
  );
}

function renderNoteContent(
  content: string,
  projectId: string,
  isOwn: boolean,
  mentionUserMap?: Map<string, { fullName: string; email?: string; avatarUrl?: string; role?: string }>,
) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(
    `${FILE_REF_REGEX.source}|${USER_MENTION_REGEX.source}`,
    "g",
  );

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap break-words">
          {content.slice(lastIndex, match.index)}
        </span>,
      );
    }
    if (match[2]) {
      parts.push(
        <FileChip
          key={`file-${match[2]}-${match.index}`}
          name={match[1]}
          fileId={match[2]}
          projectId={projectId}
          isOwn={isOwn}
        />,
      );
    } else if (match[4]) {
      const mentionUserId = match[4];
      const mentionName = match[3];
      const userInfo = mentionUserMap?.get(mentionUserId);
      const pill = (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold cursor-default",
            isOwn ? "bg-white/20 text-white" : "bg-primary/10 text-primary",
          )}
        >
          @{mentionName}
        </span>
      );
      parts.push(
        userInfo ? (
          <HoverCard key={`mention-${mentionUserId}-${match.index}`} openDelay={300}>
            <HoverCardTrigger asChild>{pill}</HoverCardTrigger>
            <HoverCardContent className="w-56 p-3" side="top">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userInfo.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {userInfo.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{userInfo.fullName}</p>
                  {userInfo.role && (
                    <p className="text-xs text-muted-foreground truncate">{userInfo.role}</p>
                  )}
                  {userInfo.email && (
                    <p className="text-xs text-muted-foreground truncate">{userInfo.email}</p>
                  )}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        ) : (
          <span key={`mention-${mentionUserId}-${match.index}`}>{pill}</span>
        ),
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key="text-end" className="whitespace-pre-wrap break-words">
        {content.slice(lastIndex)}
      </span>,
    );
  }

  return parts.length > 0 ? <>{parts}</> : <span className="whitespace-pre-wrap break-words">{content}</span>;
}

export function ProjectNotes({
  projectId,
  fullHeight = false,
}: {
  projectId: string;
  fullHeight?: boolean;
}) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // File picker
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePickerTarget, setFilePickerTarget] = useState<"new" | string>("new");

  // Mention picker
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionPickerTarget, setMentionPickerTarget] = useState<"new" | string>("new");
  const [selectedMentionUserId, setSelectedMentionUserId] = useState("");

  // Prefetch project members for mentions (Supabase direct)
  const { data: projectData, isLoading: isLoadingMentionUsers } = useSWR(
    projectId ? `project-members-${projectId}` : null,
    async () => {
      try {
        const data = await getProjectById(projectId);
        return { data };
      } catch {
        // fallback to backend
        const token = localStorage.getItem("crm_access_token");
        const res = await fetch(`${API_URL}/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load project");
        const json = await res.json();
        return { data: json.data };
      }
    },
    { revalidateOnFocus: false },
  );

  const ROLE_LABELS_DISPLAY: Record<string, string> = {
    project_manager: "Project Manager",
    developer: "Developer",
    designer: "Designer",
    seo_specialist: "SEO Specialist",
    content_writer: "Content Writer",
  };

  const mentionableUsers = useMemo(() => {
    // projectData.data is the camelCase project object from Supabase or backend
    const project = projectData?.data;
    if (!project) return [];
    const list: { id: string; fullName: string; email?: string; avatarUrl?: string; role?: string; departmentName?: string }[] = [];
    if (Array.isArray(project.members)) {
      for (const m of project.members) {
        const uid = m.user?.id || m.userId;
        if (!uid || list.find((x) => x.id === uid)) continue;
        const fullName = m.user?.fullName || m.user?.full_name || m.user?.email || "Unknown";
        const projectRole = m.role ? (ROLE_LABELS_DISPLAY[m.role] || m.role) : undefined;
        list.push({
          id: uid,
          fullName,
          email: m.user?.email,
          avatarUrl: m.user?.avatarUrl || m.user?.avatar_url,
          role: projectRole,
          departmentName: m.user?.departmentName || m.user?.department_name,
        });
      }
    }
    if (project.manager) {
      const mid = project.manager.id;
      if (mid && !list.find((x) => x.id === mid)) {
        list.push({
          id: mid,
          fullName: project.manager.fullName || project.manager.full_name || project.manager.email || "Unknown",
          email: project.manager.email,
          avatarUrl: project.manager.avatarUrl || project.manager.avatar_url,
          role: "Project Manager",
          departmentName: project.manager.departmentName,
        });
      }
    }
    return list;
  }, [projectData]);

  // Build a lookup map for HoverCard info on mentions
  const mentionUserMap = useMemo(() => {
    const map = new Map<string, { fullName: string; email?: string; avatarUrl?: string; role?: string }>();
    for (const u of mentionableUsers) {
      map.set(u.id, { fullName: u.fullName, email: u.email, avatarUrl: u.avatarUrl, role: u.role });
    }
    return map;
  }, [mentionableUsers]);

  const fetchNotes = useCallback(async () => {
    try {
      // Try Supabase direct first — filter to non-private (discussion) messages only
      const raw = await getProjectNotes(projectId);
      // getProjectNotes returns newest-first; reverse for chat (oldest first)
      const chatOrder = [...raw].reverse();
      setNotes(chatOrder);
    } catch {
      // Fallback to backend API (only public discussion messages)
      try {
        const token = localStorage.getItem("crm_access_token");
        const res = await fetch(`${API_URL}/projects/${projectId}/notes?private=false`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotes([...(data.data || [])].reverse());
        }
      } catch (err) {
        console.error("Failed to fetch notes:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading) scrollToBottom("instant");
  }, [loading]);

  // Scroll to bottom when new message added
  const prevNotesLen = useRef(0);
  useEffect(() => {
    if (notes.length > prevNotesLen.current) {
      scrollToBottom("smooth");
    }
    prevNotesLen.current = notes.length;
  }, [notes.length]);

  // Scroll to the currently-shown pinned note when pinnedIndex changes
  useEffect(() => {
    const pinnedNotesList = notes.filter((n) => n.isPinned);
    if (pinnedNotesList.length === 0) return;
    const safeIdx = Math.min(pinnedIndex, pinnedNotesList.length - 1);
    const target = pinnedNotesList[safeIdx];
    if (!target) return;
    // Short delay so the banner updates before scroll
    const tid = setTimeout(() => {
      noteRefsMap.current.get(target.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(tid);
  }, [pinnedIndex]);

  // Show scroll-to-bottom button when scrolled up
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 150);
  };

  const loadProjectFiles = async (force = false) => {
    if (!force && projectFiles.length > 0) return;
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

  const insertFileRef = (file: ProjectFile) => {
    const ref = `\n📎 [${file.name}](file:${file.id})`;
    setNewNote((prev) => prev + ref);
    setShowFilePicker(false);
  };

  const handleDiscussionFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingFile(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/projects/${projectId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error?.message || err?.error || "Upload failed");
        return;
      }

      const data = await res.json();
      const uploaded = data.data as ProjectFile;
      setProjectFiles((prev) => [uploaded, ...prev]);
      insertFileRef(uploaded);
      toast.success("File uploaded and attached");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const openFilePicker = async (target: "new" | string) => {
    setFilePickerTarget(target);
    setShowFilePicker(true);
    await loadProjectFiles(true);
  };

  const openMentionPicker = (target: "new" | string) => {
    setMentionPickerTarget(target);
    setSelectedMentionUserId("");
    setShowMentionPicker(true);
  };

  const insertMentionRef = () => {
    const selectedUser = mentionableUsers.find((c: any) => c.id === selectedMentionUserId);
    if (!selectedUser) return;
    const mention = ` @[${selectedUser.fullName}](user:${selectedUser.id})`;
    setNewNote((prev) => prev + mention);
    setShowMentionPicker(false);
    setSelectedMentionUserId("");
    textareaRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!newNote.trim() || submitting) return;
    setSubmitting(true);
    const content = newNote;
    setNewNote("");

    // Optimistic update — show the message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticNote: Note = {
      id: tempId,
      projectId,
      userId: user?.id || null,
      userName: user?.fullName || user?.email || "You",
      userAvatar: user?.avatarUrl || null,
      content,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [...prev, optimisticNote]);

    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, isPrivate: false }),
      });
      if (res.ok) {
        // Replace optimistic note with real data
        await fetchNotes();
      } else {
        // Remove optimistic note on failure
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
        setNewNote(content);
        toast.error("Failed to send message");
      }
    } catch {
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      setNewNote(content);
      toast.error("Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePin = async (noteId: string, isPinned: boolean) => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(
        `${API_URL}/projects/${projectId}/notes/${noteId}/${isPinned ? "unpin" : "pin"}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        await fetchNotes();
        toast.success(isPinned ? "Message unpinned" : "Message pinned");
      }
    } catch {
      toast.error("Failed to update message");
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const isOwnMessage = (note: Note) => note.userId === user?.id;
  const isProjectManagerOrAdmin =
    user?.role === "admin" ||
    isProjectManagerFor(projectData?.data, user?.id);

  const canPin = (_note?: Note) => isProjectManagerOrAdmin;

  // Group notes by day for date dividers
  const pinnedNotes = notes.filter((n) => n.isPinned);
  // Keep pinnedIndex in bounds
  const safePinnedIndex = pinnedNotes.length > 0 ? Math.min(pinnedIndex, pinnedNotes.length - 1) : 0;
  const regularNotes = notes;

  // Group regular notes by day
  const groupedNotes: { date: string; notes: Note[] }[] = [];
  for (const note of regularNotes) {
    const noteDate = new Date(note.createdAt);
    const lastGroup = groupedNotes[groupedNotes.length - 1];
    if (!lastGroup || !isSameDay(new Date(lastGroup.date), noteDate)) {
      groupedNotes.push({ date: note.createdAt, notes: [note] });
    } else {
      lastGroup.notes.push(note);
    }
  }

  return (
    <div
      className={cn("flex flex-col", fullHeight ? "h-full min-h-0" : "h-full")}
      style={fullHeight ? undefined : { minHeight: "500px" }}
    >
      {/* ── Pinned Messages Banner (WhatsApp-style single navigator) ── */}
      {pinnedNotes.length > 0 && (() => {
        const currentPinned = pinnedNotes[safePinnedIndex];
        return (
          <div className="border-b bg-amber-50 dark:bg-amber-950/20 sticky top-0 z-10">
            <div className="flex items-center gap-2 px-3 py-2">
              <Pin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-amber-700">
                    Pinned
                  </span>
                  <span className="text-xs text-amber-600/70">
                    {safePinnedIndex + 1}/{pinnedNotes.length}
                  </span>
                </div>
                <p className="text-xs text-amber-700/80 truncate leading-relaxed mt-0.5">
                  <span className="font-medium">{currentPinned.userName}: </span>
                  {currentPinned.content
                    .replace(/📎 \[[^\]]+\]\(file:[^)]+\)/g, "📎 [file]")
                    .replace(/@\[(.+?)\]\(user:[^)]+\)/g, "@$1")}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {pinnedNotes.length > 1 && (
                  <>
                    <button
                      onClick={() => setPinnedIndex((i) => (i - 1 + pinnedNotes.length) % pinnedNotes.length)}
                      className="p-1 rounded hover:bg-amber-200/60 text-amber-600 transition-colors"
                      title="Previous pinned message"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setPinnedIndex((i) => (i + 1) % pinnedNotes.length)}
                      className="p-1 rounded hover:bg-amber-200/60 text-amber-600 transition-colors"
                      title="Next pinned message"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {canPin(currentPinned) && (
                  <button
                    onClick={() => togglePin(currentPinned.id, true)}
                    className="p-1 rounded hover:bg-amber-200/60 text-amber-500 hover:text-amber-700 transition-colors ml-0.5"
                    title="Unpin"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Messages Area ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 relative"
        style={{ minHeight: 0 }}
      >
        {loading ? (
          <div className="space-y-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn("flex items-end gap-2", i % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                <div
                  className={cn("rounded-2xl animate-pulse bg-muted", i % 2 === 0 ? "rounded-br-none w-48" : "rounded-bl-none w-64")}
                  style={{ height: 52 }}
                />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-15" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1 opacity-70">Start the team discussion!</p>
          </div>
        ) : (
          groupedNotes.map(({ date, notes: dayNotes }) => (
            <div key={date}>
              {/* Day divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] font-medium text-muted-foreground px-3 py-1 bg-muted/60 rounded-full border">
                  {formatDayLabel(date)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Messages for this day */}
              <div className="space-y-1.5">
                {dayNotes.map((note, idx) => {
                  const isOwn = isOwnMessage(note);
                  const prevNote = dayNotes[idx - 1];
                  const showAvatar = !prevNote || prevNote.userId !== note.userId;
                  const showName = !isOwn && showAvatar;

                  return (
                    <div
                      key={note.id}
                      ref={(el) => {
                        if (el) noteRefsMap.current.set(note.id, el);
                        else noteRefsMap.current.delete(note.id);
                      }}
                      className={cn(
                        "flex items-end gap-2 group",
                        isOwn ? "flex-row-reverse" : "flex-row",
                        showAvatar ? "mt-3" : "mt-0.5",
                      )}
                    >
                      {/* Avatar — only for others, only when sender changes */}
                      {!isOwn ? (
                        <div className="w-8 shrink-0">
                          {showAvatar && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={note.userAvatar || undefined} />
                              <AvatarFallback className="text-xs">
                                {note.userName ? getInitials(note.userName) : "U"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ) : (
                        <div className="w-8 shrink-0" />
                      )}

                      {/* Bubble column */}
                      <div
                        className={cn(
                          "flex flex-col max-w-[72%] min-w-0",
                          isOwn ? "items-end" : "items-start",
                        )}
                      >
                        {/* Sender name */}
                        {showName && (
                          <span className="text-xs font-semibold text-muted-foreground mb-1 ml-1">
                            {note.userName || "Unknown"}
                          </span>
                        )}

                            {/* Message bubble */}
                          <div className="relative">
                            {note.isPinned && (
                              <div className={cn(
                                "flex items-center gap-1 text-[10px] font-medium mb-0.5",
                                isOwn ? "justify-end text-amber-600" : "justify-start text-amber-600",
                              )}>
                                <Pin className="h-2.5 w-2.5" /> Pinned
                              </div>
                            )}
                            <div
                              className={cn(
                                "relative px-3.5 py-2 text-sm leading-relaxed shadow-sm break-words overflow-wrap-anywhere",
                                isOwn
                                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                                  : "bg-card border text-card-foreground rounded-2xl rounded-bl-md",
                                note.isPinned && "ring-2 ring-amber-400/40",
                              )}
                              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                            >
                              <div className="flex flex-col gap-0.5">
                                {renderNoteContent(note.content, projectId, isOwn, mentionUserMap)}
                              </div>
                            </div>

                            {/* Timestamp + pin action row */}
                            <div className={cn(
                              "flex items-center gap-1 mt-0.5 px-1",
                              isOwn ? "flex-row-reverse" : "flex-row",
                            )}>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(note.createdAt), "h:mm a")}
                              </span>
                              {isOwn && <CheckCheck className="h-3 w-3 text-primary/50" />}

                              {/* Pin action — visible on hover, manager/admin only */}
                              {canPin(note) && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-4 w-4">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isOwn ? "end" : "start"} className="min-w-[130px]">
                                      <DropdownMenuItem onClick={() => togglePin(note.id, note.isPinned)}>
                                        {note.isPinned ? (
                                          <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin</>
                                        ) : (
                                          <><Pin className="h-3.5 w-3.5 mr-2" /> Pin</>
                                        )}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </div>
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-background border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Input Bar ── */}
      <div className="border-t bg-background px-4 py-3">
        <div className="flex flex-col gap-1.5 bg-muted/40 border rounded-2xl px-3.5 pt-2.5 pb-2 focus-within:border-primary/50 transition-colors">
          <Textarea
            ref={textareaRef}
            placeholder="Message..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="resize-none min-h-[44px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (newNote.trim()) handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => openMentionPicker("new")}
                title="Mention someone"
              >
                <AtSign className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => openFilePicker("new")}
                title="Attach a project file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                Enter to send · Shift+Enter for newline
              </span>
              <Button
                size="sm"
                disabled={submitting || !newNote.trim()}
                onClick={handleSubmit}
                className="h-7 w-7 p-0 rounded-full"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* File Picker Dialog */}
      <Dialog open={showFilePicker} onOpenChange={setShowFilePicker}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attach a Project File
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 pb-2">
            <p className="text-xs text-muted-foreground">
              Upload a new file or attach an existing one
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0"
              disabled={uploadingFile}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingFile ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleDiscussionFileUpload}
            />
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {loadingFiles ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : projectFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No files uploaded yet.</p>
                <p className="text-xs mt-1">Use Upload above to add a file.</p>
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

      {/* Mention Picker Dialog */}
      <Dialog open={showMentionPicker} onOpenChange={setShowMentionPicker}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Mention a Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingMentionUsers ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading members...</span>
              </div>
            ) : mentionableUsers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AtSign className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No members to mention.</p>
              </div>
            ) : (
              <UserSelector
                users={mentionableUsers}
                value={selectedMentionUserId}
                onValueChange={setSelectedMentionUserId}
                placeholder="Select a member..."
                excludeUserId={user?.id}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMentionPicker(false)}>
                Cancel
              </Button>
              <Button onClick={insertMentionRef} disabled={!selectedMentionUserId || isLoadingMentionUsers}>
                Insert Mention
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
