"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Users } from "lucide-react";
import { getAllStatuses } from "@/lib/lead-status-config";
import type { AssignmentFilter } from "@/hooks/sales/useLeadsTable";

interface UserStat {
  id: string;
  fullName: string;
  leadCount?: number;
  total?: number;
}

interface LeadsFiltersToolbarProps {
  viewMode: "table" | "kanban";
  isAdmin: boolean;
  isManager: boolean;
  assignedToUserId: string;
  onAssignedToUserIdChange: (value: string) => void;
  assignmentFilter: AssignmentFilter;
  onAssignmentFilterChange: (value: AssignmentFilter) => void;
  status: string;
  onStatusChange: (value: string) => void;
  onPageReset: () => void;
  userStats: { users: UserStat[]; unassignedCount: number };
  kanbanTeamId?: string;
  onKanbanTeamIdChange?: (value: string) => void;
  teams?: Array<{ id: string; name: string }>;
  kanbanTotalLeads?: number;
}

export function LeadsFiltersToolbar({
  viewMode,
  isAdmin,
  isManager,
  assignedToUserId,
  onAssignedToUserIdChange,
  assignmentFilter,
  onAssignmentFilterChange,
  status,
  onStatusChange,
  onPageReset,
  userStats,
  kanbanTeamId,
  onKanbanTeamIdChange,
  teams = [],
  kanbanTotalLeads,
}: LeadsFiltersToolbarProps) {
  if (viewMode === "table") {
    return (
      <div className="p-4 flex items-center justify-end">
        <div className="flex flex-col sm:flex-row gap-4">
          {(isAdmin || (isManager && userStats.users.length > 0)) && (
            <Select
              value={assignedToUserId}
              onValueChange={(v) => {
                onAssignedToUserIdChange(v);
                onAssignmentFilterChange("all");
                onPageReset();
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter by User" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Users</SelectItem>
                {isAdmin && userStats.unassignedCount > 0 && (
                  <SelectItem value="_unassigned">
                    Unassigned ({userStats.unassignedCount})
                  </SelectItem>
                )}
                {userStats.users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.leadCount ?? user.total ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isAdmin && (
            <Select
              value={assignmentFilter}
              onValueChange={(v: AssignmentFilter) => {
                onAssignmentFilterChange(v);
                onAssignedToUserIdChange("all");
                onPageReset();
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select
            value={status}
            onValueChange={(v) => {
              onStatusChange(v);
              onPageReset();
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {getAllStatuses().map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 bg-muted/30 rounded-lg">
      <div className="flex flex-wrap gap-3 items-center">
        {(isAdmin || isManager) && (
          <Select
            value={assignedToUserId}
            onValueChange={onAssignedToUserIdChange}
          >
            <SelectTrigger className="w-[180px]">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by User" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All Users</SelectItem>
              {isAdmin && userStats.unassignedCount > 0 && (
                <SelectItem value="_unassigned">
                  Unassigned ({userStats.unassignedCount})
                </SelectItem>
              )}
              {userStats.users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.fullName} ({user.leadCount ?? user.total ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isAdmin && onKanbanTeamIdChange && (
          <Select value={kanbanTeamId} onValueChange={onKanbanTeamIdChange}>
            <SelectTrigger className="w-[180px]">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by Team" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {kanbanTotalLeads !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Total: {kanbanTotalLeads} leads
          </span>
        </div>
      )}
    </div>
  );
}
