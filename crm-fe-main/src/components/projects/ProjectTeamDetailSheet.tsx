"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { ExternalLink } from "lucide-react";

type TeamMember = {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email?: string;
  };
};

export type ProjectTeamDetail = {
  id: string;
  name: string;
  status: string;
  manager?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email?: string;
  };
  members?: TeamMember[];
};

function getRoleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProjectTeamDetailSheet({
  project,
  open,
  onOpenChange,
  onMemberClick,
}: {
  project: ProjectTeamDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberClick?: (userId: string) => void;
}) {
  const allPeople: { id: string; fullName: string; email?: string; avatarUrl: string | null; role: string }[] =
    [];

  if (project?.manager) {
    allPeople.push({
      id: project.manager.id,
      fullName: project.manager.fullName,
      email: project.manager.email,
      avatarUrl: project.manager.avatarUrl,
      role: "project_manager",
    });
  }

  for (const m of project?.members || []) {
    if (!m.user) continue;
    if (allPeople.some((p) => p.id === m.user.id)) continue;
    allPeople.push({
      id: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
    });
  }

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={project?.name || "Project team"}
      description="Team members and roles"
      size="lg"
      footer={
        project ? (
          <Button asChild variant="outline">
            <Link href={`/projects/${project.id}/overview`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open project
            </Link>
          </Button>
        ) : null
      }
    >
      {project ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {project.status.replace(/_/g, " ")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {allPeople.length} member{allPeople.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-2">
            {allPeople.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members assigned.</p>
            ) : (
              allPeople.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onMemberClick?.(person.id)}
                  className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={person.avatarUrl || undefined} />
                    <AvatarFallback>{getInitials(person.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{person.fullName}</p>
                    {person.email ? (
                      <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {getRoleLabel(person.role)}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </FormSideSheet>
  );
}
