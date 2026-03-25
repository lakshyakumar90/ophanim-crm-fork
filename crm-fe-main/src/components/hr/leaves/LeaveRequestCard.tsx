"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { LeaveRequestDto } from "@/types/hr-leaves";
import {
  formatLeaveDate,
  formatLeaveRelative,
  leaveStatusLabel,
} from "@/lib/hr-leave-utils";
import { cn } from "@/lib/utils";

function typeColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 13) % 360;
  return `hsl(${h} 55% 92%)`;
}

function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function LeaveRequestCard({
  leave,
  selectable,
  selected,
  onSelectChange,
  showApprove,
  showReject,
  onApprove,
  onReject,
}: {
  leave: LeaveRequestDto;
  selectable: boolean;
  selected: boolean;
  onSelectChange: (id: string, v: boolean) => void;
  showApprove: boolean;
  showReject: boolean;
  onApprove: (id: string) => void;
  onReject: (leave: LeaveRequestDto) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const reason = leave.reason || "";
  const truncated = reason.length > 140 && !expanded;

  return (
    <Card className="transition-all duration-300">
      <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
        {selectable ? (
          <div className="pt-1">
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectChange(leave.id, v === true)}
            />
          </div>
        ) : null}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback>{initials(leave.employeeName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{leave.employeeName || "Employee"}</span>
            <Badge variant="outline" className="text-[10px]">
              {leave.employeeEmail}
            </Badge>
            <Badge
              className="text-[10px] border-0"
              style={{ backgroundColor: typeColor(leave.leaveTypeName || "Leave") }}
            >
              {leave.leaveTypeName || "Leave"}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {leaveStatusLabel(leave.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatLeaveDate(leave.startDate)} – {formatLeaveDate(leave.endDate)}
            <span className="ml-2 font-medium text-foreground">({leave.totalDays} days)</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Submitted {formatLeaveRelative(leave.createdAt)}
          </p>
          {reason ? (
            <div>
              <p className={cn("text-sm whitespace-pre-wrap", truncated && "line-clamp-2")}>
                {truncated ? `${reason.slice(0, 140)}…` : reason}
              </p>
              {reason.length > 140 ? (
                <button
                  type="button"
                  className="text-xs text-primary mt-1"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? "Show less" : "Expand"}
                </button>
              ) : null}
            </div>
          ) : null}
          {leave.overlapWarning ? (
            <p className="text-xs text-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1">
              {leave.overlapWarning}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 shrink-0 sm:w-[140px]">
          {showApprove ? (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(leave.id)}>
              Approve
            </Button>
          ) : null}
          {showReject ? (
            <Button size="sm" variant="destructive" onClick={() => onReject(leave)}>
              Reject
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
