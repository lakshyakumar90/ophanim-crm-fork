"use client";

import { Fragment } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TaskList } from "./TaskList";
import {
  employeeDisplayName,
  completionBadgeClass,
  countOverdueTasks,
  doneTaskCount,
} from "@/lib/onboarding-utils";
import type { HREmployeeOption, OnboardingChecklist, ChecklistTaskStatusApi } from "@/types/onboarding";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface OnboardingChecklistCardProps {
  checklist: OnboardingChecklist;
  directory?: HREmployeeOption | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onViewFull: () => void;
  canUpdateTasks: boolean;
  onTaskUpdate: (
    checklistId: string,
    taskIndex: number,
    body: { status: ChecklistTaskStatusApi; notes?: string },
  ) => Promise<void>;
  showExitInterview?: boolean;
  onViewExit?: () => void;
  showTaskActions?: boolean;
}

export function OnboardingChecklistCard({
  checklist,
  directory,
  expanded,
  onToggleExpand,
  onViewFull,
  canUpdateTasks,
  onTaskUpdate,
  showExitInterview,
  onViewExit,
  showTaskActions = true,
}: OnboardingChecklistCardProps) {
  const name = employeeDisplayName(checklist);
  const dept = directory?.departmentName ?? "—";
  const designation = directory?.jobTitle ?? "—";
  const overdue = countOverdueTasks(checklist.tasks);
  const done = doneTaskCount(checklist.tasks);
  const total = checklist.tasks.length;
  const milestoneMode = checklist.type === "onboarding" && !showTaskActions && total === 0;
  const isSimpleOffboarding = checklist.type === "offboarding";
  const rate = checklist.completion_rate;
  const templateLabel = checklist.template?.name ?? "Custom / No template";

  const joinOrLwd =
    checklist.type === "offboarding"
      ? checklist.exit_details?.last_working_day
      : checklist.joining_date;

  const dateFmt =
    joinOrLwd && isValid(parseISO(joinOrLwd)) ? format(parseISO(joinOrLwd), "d MMM yyyy") : "—";

  return (
    <Fragment>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {dept} · {designation}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm flex-1">
            <div>
              <p className="text-muted-foreground text-xs">
                {checklist.type === "offboarding" ? "Last working day" : "Joining"}
              </p>
              <p className="font-medium">{dateFmt}</p>
            </div>
            {isSimpleOffboarding ? (
              <div className="col-span-2 sm:col-span-3 flex items-center">
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-800 border-orange-200">
                  Ready for archive and offboarding PDF
                </Badge>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground text-xs">Template</p>
                  <p className="font-medium truncate" title={templateLabel}>
                    {templateLabel}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  {milestoneMode ? (
                    <>
                      <p className="text-muted-foreground text-xs mb-1">Workflow</p>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200">
                        Milestone based
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Profile details
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground text-xs mb-1">Progress</p>
                      <div className="flex items-center gap-2">
                        <Progress value={rate} className="h-2 flex-1" />
                        <Badge variant="outline" className={`shrink-0 text-xs ${completionBadgeClass(rate)}`}>
                          {rate}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {done}/{total} tasks
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {overdue > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {overdue} overdue
                    </Badge>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {isSimpleOffboarding && onViewExit ? (
              <Button variant="outline" size="sm" onClick={onViewExit}>
                Exit details
              </Button>
            ) : null}
            {showTaskActions ? (
              <>
                <Button variant="ghost" size="sm" onClick={onToggleExpand} className="gap-1">
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Manage tasks
                </Button>
                <Button variant="secondary" size="sm" onClick={onViewFull}>
                  Full checklist
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {expanded && showTaskActions ? (
          <div className="border-t bg-muted/20 p-4">
            <TaskList
              checklistId={checklist.id}
              tasks={checklist.tasks}
              canEdit={canUpdateTasks}
              onUpdate={onTaskUpdate}
            />
          </div>
        ) : null}
      </div>
    </Fragment>
  );
}
