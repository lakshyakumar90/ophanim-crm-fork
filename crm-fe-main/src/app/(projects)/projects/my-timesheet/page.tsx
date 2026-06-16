"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { Clock, Plus } from "lucide-react";
import { timeEntriesApi, projectsApi, type TimeEntry } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { LogTimeSheet } from "@/components/projects/LogTimeSheet";

export default function MyTimesheetPage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logTimeOpen, setLogTimeOpen] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    user ? ["my-timesheet", user.id] : null,
    () => timeEntriesApi.list({ userId: user?.id }),
  );

  const { data: projects } = useSWR(user ? ["projects-list"] : null, () =>
    projectsApi.list(),
  );

  const entries: TimeEntry[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const projectList = Array.isArray(projects) ? projects : (projects as any)?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  const handleSubmit = async (id: string) => {
    try {
      await timeEntriesApi.submit(id);
      toast.success("Submitted for approval");
      mutate();
    } catch {
      toast.error("Failed to submit");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Clock className="h-6 w-6 text-primary" />
            My Timesheet
          </h1>
          <p className="text-muted-foreground">Log and submit your work hours</p>
        </div>
        <Button onClick={() => setLogTimeOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Time
        </Button>
        <LogTimeSheet
          open={logTimeOpen}
          onOpenChange={setLogTimeOpen}
          projects={projectList.map((p: any) => ({ id: p.id, name: p.name }))}
          onLogged={() => mutate()}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No time entries yet
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {format(new Date(entry.entryDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{entry.project?.name ?? entry.projectId}</TableCell>
                  <TableCell>{entry.hours}h</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => handleSubmit(entry.id)}>
                        Submit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
