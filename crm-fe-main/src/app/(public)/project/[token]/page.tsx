"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { publicPortalApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban } from "lucide-react";
import { format } from "date-fns";

interface PublicProject {
  name?: string;
  clientName?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  milestones?: { id: string; title?: string; name?: string; status?: string }[];
}

export default function PublicProjectPage() {
  const params = useParams();
  const token = params.token as string;

  const { data: project, isLoading, error } = useSWR<PublicProject>(
    token ? ["public-project", token] : null,
    () => publicPortalApi.getProjectByToken(token) as Promise<PublicProject>,
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Project not found or link has expired.
        </CardContent>
      </Card>
    );
  }

  const status = String(project.status ?? "unknown").replace(/_/g, " ");
  const milestones = project.milestones ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderKanban className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{String(project.name ?? "Project")}</h1>
          {project.clientName != null && String(project.clientName) !== "" && (
            <p className="text-muted-foreground">{String(project.clientName)}</p>
          )}
        </div>
        <Badge className="ml-auto capitalize">{status}</Badge>
      </div>

      {project.description != null && String(project.description) !== "" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {String(project.description)}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {project.startDate && (
          <Card>
            <CardContent className="py-4 text-sm">
              <p className="text-muted-foreground">Start</p>
              <p className="font-medium">
                {format(new Date(String(project.startDate)), "MMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
        )}
        {project.endDate && (
          <Card>
            <CardContent className="py-4 text-sm">
              <p className="text-muted-foreground">Target End</p>
              <p className="font-medium">
                {format(new Date(String(project.endDate)), "MMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span>{m.title ?? m.name}</span>
                <Badge variant="outline" className="capitalize">
                  {String(m.status ?? "pending").replace(/_/g, " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
