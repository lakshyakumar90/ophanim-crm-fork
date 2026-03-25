"use client";
import { format, parseISO, isValid } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TaskList } from "./TaskList";
import { TaskTimeline } from "./TaskTimeline";
import {
  employeeDisplayName,
} from "@/lib/onboarding-utils";
import type { HREmployeeOption, OnboardingChecklist, ChecklistTaskStatusApi } from "@/types/onboarding";
import { useOffboarding } from "@/hooks/useOffboarding";
import { downloadOffboardingPdf } from "@/lib/onboarding-api";
import { toast } from "sonner";
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts";

interface ChecklistDetailPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  checklist: OnboardingChecklist | null;
  directory?: HREmployeeOption | null;
  canUpdateTasks: boolean;
  canArchive: boolean;
  updateChecklistTask: (
    checklistId: string,
    taskIndex: number,
    body: { status: ChecklistTaskStatusApi; notes?: string },
  ) => Promise<OnboardingChecklist>;
  onTasksChanged: (c: OnboardingChecklist) => void;
  onArchived: () => void;
}

export function ChecklistDetailPanel({
  open,
  onOpenChange,
  checklist,
  directory,
  canUpdateTasks,
  canArchive,
  updateChecklistTask,
  onTasksChanged,
  onArchived,
}: ChecklistDetailPanelProps) {
  const { archive, busy } = useOffboarding();

  if (!checklist) return null;

  const name = employeeDisplayName(checklist);
  const dept = directory?.departmentName ?? "—";
  const team = directory?.teamName ?? "—";
  const designation = directory?.jobTitle ?? "—";
  const email = directory?.email || checklist.employee?.email || "—";
  const isArchived = String(directory?.hrStatus ?? "").toLowerCase() === "archived";
  const hasMissingBasics = !directory?.departmentName || !directory?.teamName || !directory?.jobTitle;
  const dateLabel =
    checklist.type === "offboarding"
      ? checklist.exit_details?.last_working_day &&
        isValid(parseISO(checklist.exit_details.last_working_day))
        ? format(parseISO(checklist.exit_details.last_working_day), "d MMM yyyy")
        : "—"
      : checklist.joining_date && isValid(parseISO(checklist.joining_date))
        ? format(parseISO(checklist.joining_date), "d MMM yyyy")
        : "—";

  const done = checklist.done_tasks ?? checklist.tasks.filter((t) => t.status === "done").length;
  const total = checklist.total_tasks ?? checklist.tasks.length;
  const rate = checklist.completion_rate;
  const pieData = [
    { name: "Done", value: done },
    { name: "Remaining", value: Math.max(0, total - done) },
  ];
  const COLORS = ["#10b981", "#e5e7eb"];

  const exit = checklist.exit_details;
  const canArchiveNow = canArchive && checklist.type === "offboarding";

  const handleArchive = async () => {
    if (isArchived) {
      toast.info(`${name} is already archived`);
      return;
    }

    try {
      await archive(checklist.employee_id);
      toast.success(`${name} archived`);
      onOpenChange(false);
      onArchived();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadOffboardingPdf(checklist.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `offboarding-${name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to download offboarding PDF");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-4 sm:px-6">
          <SheetHeader>
            <SheetTitle className="text-left">{name}</SheetTitle>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>{dept}</span>
              <span>·</span>
              <span>{team}</span>
              <span>·</span>
              <span>{designation}</span>
            </div>
            <p className="text-sm text-muted-foreground">{email}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge
                variant="outline"
                className={
                  checklist.type === "onboarding"
                    ? "bg-blue-50 text-blue-800 border-blue-200"
                    : "bg-orange-50 text-orange-800 border-orange-200"
                }
              >
                {checklist.type === "onboarding" ? "Onboarding" : "Offboarding"}
              </Badge>
              {isArchived ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                  Archived
                </Badge>
              ) : null}
              <span className="text-sm text-muted-foreground">
                {checklist.type === "offboarding" ? "Last working day" : "Joining"}: {dateLabel}
              </span>
            </div>
          </SheetHeader>

          {checklist.type === "onboarding" && hasMissingBasics ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Basic profile details are incomplete (department/team/designation). Update this employee in the HR directory to complete onboarding setup.
            </div>
          ) : null}

          {checklist.type !== "offboarding" ? (
            <div className="mt-6 flex items-center gap-4 sm:gap-6 rounded-xl border bg-muted/20 p-4">
              <div className="h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={48}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-2xl font-semibold">{rate}%</p>
                <p className="text-sm text-muted-foreground">
                  {done} of {total} tasks completed
                </p>
                <Progress value={rate} className="h-2" />
              </div>
            </div>
          ) : null}

          {checklist.type === "offboarding" && exit ? (
            <div className="mt-6 rounded-lg border p-4 sm:p-5 space-y-3 text-sm">
              <h3 className="font-semibold">Exit details</h3>
              <p>
                <span className="text-muted-foreground">Resignation date: </span>
                {exit.resignation_date && isValid(parseISO(exit.resignation_date))
                  ? format(parseISO(exit.resignation_date), "d MMM yyyy")
                  : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Last working day: </span>
                {exit.last_working_day && isValid(parseISO(exit.last_working_day))
                  ? format(parseISO(exit.last_working_day), "d MMM yyyy")
                  : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Reason: </span>
                {exit.reason || "—"}
              </p>
              {isArchived ? (
                <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  This employee is already archived.
                </p>
              ) : null}
              <div className="pt-3 border-t flex flex-wrap gap-2">
                {canArchive ? (
                  <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                    Download offboarding PDF
                  </Button>
                ) : null}
                {canArchiveNow ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy || isArchived}
                    onClick={() => void handleArchive()}
                  >
                    {isArchived ? "Already archived" : "Archive employee"}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {checklist.tasks.length > 0 ? (
            <Tabs defaultValue="table" className="mt-6">
              <TabsList>
                <TabsTrigger value="table">Tasks</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              <TabsContent value="table" className="mt-4">
                <TaskList
                  checklistId={checklist.id}
                  tasks={checklist.tasks}
                  canEdit={canUpdateTasks}
                  onUpdate={async (id, idx, body) => {
                    const updated = await updateChecklistTask(id, idx, body);
                    onTasksChanged(updated);
                  }}
                />
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <TaskTimeline tasks={checklist.tasks} />
              </TabsContent>
            </Tabs>
          ) : null}

          {canArchiveNow && checklist.type !== "offboarding" ? (
            <Button
              variant="destructive"
              className="w-full mt-6 mb-2"
              disabled={busy}
              onClick={() => void handleArchive()}
            >
              Archive employee
            </Button>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
