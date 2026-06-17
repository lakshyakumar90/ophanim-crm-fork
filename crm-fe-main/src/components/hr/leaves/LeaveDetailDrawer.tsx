"use client";

import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { LeaveRequestDto } from "@/types/hr-leaves";
import {
  formatLeaveDate,
  formatLeaveRelative,
  leaveStatusBadgeClass,
  leaveStatusLabel,
} from "@/lib/hr-leave-utils";

function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function LeaveDetailDrawer({
  leave,
  open,
  onOpenChange,
  canApprove,
  onApprove,
  onReject,
}: {
  leave: LeaveRequestDto | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canApprove: boolean;
  onApprove: (id: string) => void;
  onReject: (l: LeaveRequestDto) => void;
}) {
  if (!leave) return null;
  const pendingHr =
    leave.status === "pending" || leave.status === "manager_approved";

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Leave request"
      description={leave.employeeName}
      size="xl"
      footer={
        pendingHr && canApprove ? (
          <>
            <Button variant="destructive" onClick={() => onReject(leave)}>
              Reject
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(leave.id)}>
              Approve
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{initials(leave.employeeName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{leave.employeeName}</p>
            <p className="text-xs text-muted-foreground">{leave.employeeEmail}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{leave.leaveTypeName}</Badge>
          <Badge className={leaveStatusBadgeClass(leave.status)}>
            {leaveStatusLabel(leave.status)}
          </Badge>
        </div>
        <div className="text-sm">
          <p>
            <span className="text-muted-foreground">Dates: </span>
            {formatLeaveDate(leave.startDate)} – {formatLeaveDate(leave.endDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Days: </span>
            {leave.totalDays}
          </p>
        </div>
        <div className="rounded-md border border-border p-3 text-xs space-y-1">
          <p>
            <span className="text-muted-foreground">Submitted: </span>
            {formatLeaveRelative(leave.createdAt)}
          </p>
          {leave.managerApprovedAt ? (
            <p>
              <span className="text-muted-foreground">Manager: </span>
              {leave.managerName || "—"} ({formatLeaveRelative(leave.managerApprovedAt)})
            </p>
          ) : null}
          {leave.hrApprovedAt ? (
            <p>
              <span className="text-muted-foreground">HR decision: </span>
              {leave.hrApproverName || "—"} ({formatLeaveRelative(leave.hrApprovedAt)})
            </p>
          ) : null}
        </div>
        {leave.reason ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
            <p className="text-sm whitespace-pre-wrap">{leave.reason}</p>
          </div>
        ) : null}
        {leave.status === "rejected" && leave.hrNotes ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
              Rejection notes
            </p>
            <p className="whitespace-pre-wrap">{leave.hrNotes}</p>
          </div>
        ) : null}
      </div>
    </FormSideSheet>
  );
}
