"use client";

import { Fragment } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, Eye, MoreHorizontal, Pencil, UserX, UserCheck } from "lucide-react";
import type { HREmployee } from "@/types/hr.types";
import type { CompensationHistory } from "@/types/hr.types";
import {
  formatJoinedDisplay,
  normalizeHrStatus,
  shiftBadgeClass,
  shiftLabel,
  statusBadgeClass,
} from "@/lib/employeeHelpers";
import type { ShiftType } from "@/types/hr.types";
import { CompensationHistoryExpand } from "./CompensationHistoryExpand";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleBadge(emp: HREmployee) {
  const r = emp.role;
  if (r === "admin") return <Badge variant="destructive">Admin</Badge>;
  if (r === "manager") return <Badge className="bg-blue-600 hover:bg-blue-600">Manager</Badge>;
  if (r === "hr") return <Badge className="bg-violet-600 hover:bg-violet-600">HR</Badge>;
  return <Badge variant="secondary">Employee</Badge>;
}

export function EmployeeTableRow({
  emp,
  selected,
  onSelect,
  expanded,
  onToggleExpand,
  historyRows,
  historyLoading,
  canFetchCompHistory,
  canSeeCTC,
  canEdit,
  onView,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  emp: HREmployee;
  selected: boolean;
  onSelect: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  historyRows?: CompensationHistory[];
  historyLoading: boolean;
  canFetchCompHistory: boolean;
  canSeeCTC: boolean;
  canEdit: boolean;
  onView: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  const st = normalizeHrStatus(emp);
  const joined = emp.dateOfJoining || emp.createdAt;

  return (
    <Fragment>
      <TableRow className="hover:bg-muted/40">
        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(emp.id)}
            aria-label={`Select ${emp.fullName}`}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3 min-w-[200px]">
            <Avatar className="h-9 w-9">
              <AvatarImage src={emp.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">{initials(emp.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{emp.fullName}</span>
                {st === "on_leave" ? (
                  <span className="h-2 w-2 rounded-full bg-amber-500" title="On leave" />
                ) : null}
                {st === "probation" ? (
                  <span className="h-2 w-2 rounded-full bg-violet-500" title="Probation" />
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">{emp.email}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>{roleBadge(emp)}</TableCell>
        <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
          {emp.departmentName || "—"}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
          {emp.teamName || "—"}
        </TableCell>
        <TableCell className="text-sm max-w-[140px] truncate">
          {emp.jobTitle?.replace(/_/g, " ") || "—"}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={shiftBadgeClass(emp.shiftType as ShiftType)}>
            {shiftLabel(emp.shiftType as ShiftType)}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge className={statusBadgeClass(st)}>{st.replace(/_/g, " ")}</Badge>
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          <span
            className="cursor-default border-b border-dotted border-muted-foreground"
            title={joined ? formatDistanceToNow(new Date(joined), { addSuffix: true }) : undefined}
          >
            {formatJoinedDisplay(joined)}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggleExpand} aria-label="Expand row">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onView} aria-label="View profile">
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit ? (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                ) : null}
                {canEdit && emp.isActive ? (
                  <DropdownMenuItem className="text-destructive" onClick={onDeactivate}>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate
                  </DropdownMenuItem>
                ) : null}
                {canEdit && !emp.isActive ? (
                  <DropdownMenuItem onClick={onActivate}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/20 p-4">
            <p className="text-sm font-medium mb-2">Compensation history</p>
            {!canFetchCompHistory ? (
              <p className="text-sm text-muted-foreground">
                You don&apos;t have permission to view compensation history.
              </p>
            ) : (
              <CompensationHistoryExpand
                rows={historyRows}
                loading={historyLoading}
                canSeeAmounts={canSeeCTC}
              />
            )}
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}
