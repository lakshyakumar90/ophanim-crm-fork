"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { projectsApi } from "@/lib/projects-api";
import type { Project } from "@/types";
import {
  FileText,
  Loader2,
  ArrowRight,
  Search,
  Lock,
  FolderKanban,
  RefreshCw,
  SortAsc,
  SortDesc,
  PinIcon,
  Plus,
  Save,
  X,
  Paperclip,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ListPageLayout } from "@/components/shared/list-page-layout";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface Note {
  id: string;
  content: string;
  isPinned: boolean;
  user: { id: string; fullName: string; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
}

interface NoteWithProject extends Note {
  projectId: string;
  projectName: string;
  projectStatus: string;
}

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

// Strip file-reference markdown: 📎 [name](file:id)
function stripFileRefs(content: string) {
  return content.replace(/📎 \[[^\]]+\]\(file:[^)]+\)/g, "[attached file]");
}

export default function GlobalNotesPage() {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<NoteWithProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // Compose
  const [composeProjectId, setComposeProjectId] = useState("");
  const [newNote, setNewNote] = useState("");
  const [composing, setComposing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Filters
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  // Load projects once
  useEffect(() => {
    projectsApi
      .list()
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setIsLoadingProjects(false));
  }, []);

  // Fetch notes from all projects, filtered to current user
  const fetchNotes = useCallback(async () => {
    if (!user || projects.length === 0) return;
    setIsLoadingNotes(true);
    const token = localStorage.getItem("crm_access_token");

    const results = await Promise.allSettled(
      projects.map(async (project) => {
        const res = await fetch(`${API_URL}/projects/${project.id}/notes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        const data = await res.json();
        const projectNotes: Note[] = data.data ?? [];
        return projectNotes
          .filter((n) => n.user?.id === user.id)
          .map((n) => ({
            ...n,
            projectId: project.id,
            projectName: project.name,
            projectStatus: project.status,
          }));
      }),
    );

    const merged: NoteWithProject[] = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );
    setNotes(merged);
    setIsLoadingNotes(false);
  }, [user, projects]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  // Apply filters
  const filtered = notes
    .filter((n) => {
      if (projectFilter !== "all" && n.projectId !== projectFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !stripFileRefs(n.content).toLowerCase().includes(q) &&
          !n.projectName.toLowerCase().includes(q)
        )
          return false;
      }
      if (dateFrom) {
        const from = startOfDay(new Date(dateFrom));
        if (isBefore(new Date(n.createdAt), from)) return false;
      }
      if (dateTo) {
        const to = endOfDay(new Date(dateTo));
        if (isAfter(new Date(n.createdAt), to)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned notes always on top
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const diff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === "newest" ? diff : -diff;
    });

  const isLoading = isLoadingProjects || isLoadingNotes;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !composeProjectId) {
      if (!composeProjectId) toast.error("Select a project first");
      return;
    }

    setUploadingFile(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/projects/${composeProjectId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error?.message || "Upload failed");
        return;
      }
      const data = await res.json();
      const uploaded = data.data as { id: string; name: string };
      const ref = `\n📎 [${uploaded.name}](file:${uploaded.id})`;
      setNewNote((prev) => prev + ref);
      textareaRef.current?.focus();
      toast.success("File attached");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !composeProjectId) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${composeProjectId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newNote, isPrivate: true }),
      });
      if (res.ok) {
        setNewNote("");
        setComposing(false);
        setComposeProjectId("");
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
    <ListPageLayout
      className="p-3 lg:p-4"
      title="My Notes"
      description="Your private notes across all projects"
      icon={<Lock className="h-4 w-4 text-muted-foreground" />}
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: "Notes" },
      ]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={fetchNotes}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      {/* Compose */}
      {composing ? (
        <div className="border rounded-2xl bg-card shadow-sm overflow-hidden">
          <form onSubmit={handleSubmitNote}>
            <div className="p-4 space-y-3">
              <Select
                value={composeProjectId}
                onValueChange={setComposeProjectId}
              >
                <SelectTrigger className="h-9">
                  <FolderKanban className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                ref={textareaRef}
                placeholder="Write a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="resize-none min-h-[100px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm bg-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape" && !newNote.trim()) setComposing(false);
                }}
              />
            </div>
            <div className="border-t px-4 py-2.5 flex items-center justify-between gap-2 bg-muted/30">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={!composeProjectId || uploadingFile}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingFile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5" />
                  )}
                  Attach file
                </Button>
              </div>
              <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setNewNote("");
                  setComposeProjectId("");
                  setComposing(false);
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !newNote.trim() || !composeProjectId}
                className="h-7 text-xs gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Note
              </Button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setComposing(true)}
          disabled={isLoadingProjects || projects.length === 0}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all text-muted-foreground text-sm disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus className="h-4 w-4" />
          Add a note...
        </button>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-card border rounded-xl p-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        <Select
          value={projectFilter}
          onValueChange={setProjectFilter}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <FolderKanban className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 text-xs w-[130px]"
          placeholder="From"
          title="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-8 text-xs w-[130px]"
          placeholder="To"
          title="To date"
        />

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
        >
          {sort === "newest" ? (
            <><SortDesc className="h-3.5 w-3.5" /> Newest</>
          ) : (
            <><SortAsc className="h-3.5 w-3.5" /> Oldest</>
          )}
        </Button>

        {(search || projectFilter !== "all" || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              setSearch("");
              setProjectFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-center gap-3">
          <FileText className="h-10 w-10 text-muted-foreground opacity-30" />
          <p className="font-medium text-muted-foreground">
            {notes.length === 0 ? "No private notes yet" : "No notes match your filters"}
          </p>
          {notes.length === 0 && (
            <p className="text-sm text-muted-foreground max-w-xs">
              Create a private note above, or add one from a project&apos;s Notes tab.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground px-1">
            {filtered.length} note{filtered.length !== 1 ? "s" : ""}
            {projectFilter !== "all" || search || dateFrom || dateTo ? " matching filters" : ""}
          </p>
          {filtered.map((note) => (
            <Card
              key={`${note.projectId}-${note.id}`}
              className={cn(
                "transition-colors hover:bg-muted/30",
                note.isPinned && "border-primary/40 bg-primary/5",
              )}
            >
              <CardContent className="p-4 space-y-2">
                {/* Project label + date */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] gap-1",
                      STATUS_COLORS[note.projectStatus] || "",
                    )}
                  >
                    <FolderKanban className="h-2.5 w-2.5" />
                    {note.projectName}
                  </Badge>
                  {note.isPinned && (
                    <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 rounded-full px-1.5 py-0.5 font-medium">
                      <PinIcon className="h-2.5 w-2.5" /> Pinned
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {format(new Date(note.createdAt), "MMM d, yyyy · h:mm a")}
                  </span>
                </div>

                {/* Note content */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {stripFileRefs(note.content)}
                </p>

                {/* Link to project notes */}
                <div className="flex justify-end pt-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                    <Link href={`/projects/${note.projectId}/notes`}>
                      Open in project <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ListPageLayout>
  );
}
