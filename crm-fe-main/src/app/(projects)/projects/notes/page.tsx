"use client";

import { useEffect, useState, useCallback } from "react";
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
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

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
  planned: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  on_hold: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-600",
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

  return (
    <div className="flex flex-col gap-5 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            My Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            Your private notes across all projects
          </p>
        </div>
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
      </div>

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
              Private notes are created inside individual project pages under the Notes tab.
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
    </div>
  );
}
