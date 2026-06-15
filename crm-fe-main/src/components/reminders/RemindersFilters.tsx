"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Search, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { RemindersPageState } from "@/hooks/shared/useRemindersPage";
import { getInitials } from "./reminders-utils";

type RemindersFiltersProps = Pick<
  RemindersPageState,
  | "reminderType"
  | "setReminderType"
  | "searchTask"
  | "setSearchTask"
  | "sortOrder"
  | "setSortOrder"
  | "showUserFilter"
  | "selectedUserId"
  | "setSelectedUserId"
  | "userListForDropdown"
  | "searchUser"
  | "setSearchUser"
  | "priority"
  | "setPriority"
  | "departmentId"
  | "setDepartmentId"
  | "canSeeAllFilters"
  | "allowedDepartments"
  | "dateFrom"
  | "setDateFrom"
  | "dateTo"
  | "setDateTo"
>;

export function RemindersFilters(props: RemindersFiltersProps) {
  const {
    reminderType,
    setReminderType,
    searchTask,
    setSearchTask,
    sortOrder,
    setSortOrder,
    showUserFilter,
    selectedUserId,
    setSelectedUserId,
    userListForDropdown,
    searchUser,
    setSearchUser,
    priority,
    setPriority,
    departmentId,
    setDepartmentId,
    canSeeAllFilters,
    allowedDepartments,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = props;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={reminderType} onValueChange={(v) => setReminderType(v as "all" | "tasks" | "leads")}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All reminders</SelectItem>
          <SelectItem value="tasks">Task reminders</SelectItem>
          <SelectItem value="leads">Lead reminders</SelectItem>
        </SelectContent>
      </Select>
      <div className="relative w-[240px]">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Search tasks..."
          value={searchTask}
          onChange={(e) => setSearchTask(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
      >
        <ArrowUpDown className="h-4 w-4" />
      </Button>

      {showUserFilter && (
        <div className="relative w-[220px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <UserIcon className="mr-2 h-4 w-4" />
                {selectedUserId
                  ? userListForDropdown.find((u: any) => u.id === selectedUserId)?.fullName ||
                    userListForDropdown.find((u: any) => u.id === selectedUserId)?.full_name ||
                    "Selected User"
                  : "All Users"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[260px]" align="end">
              <div className="p-2">
                <Input
                  placeholder="Search users..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="h-8"
                />
              </div>
              <DropdownMenuItem onClick={() => setSelectedUserId(undefined)}>All Users</DropdownMenuItem>
              {userListForDropdown.map((u: any) => (
                <DropdownMenuItem key={u.id} onClick={() => setSelectedUserId(u.id)}>
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={u.avatarUrl || u.avatar_url} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(u.fullName || u.full_name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{u.fullName || u.full_name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={departmentId} onValueChange={setDepartmentId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {canSeeAllFilters ? "All departments" : "My departments"}
          </SelectItem>
          <SelectItem value="none">No Department</SelectItem>
          {allowedDepartments.map((d: any) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[160px]" />
      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[160px]" />
    </div>
  );
}
