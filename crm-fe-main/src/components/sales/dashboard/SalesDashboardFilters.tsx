"use client";

import { format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSelector } from "@/components/shared/user-selector";
import { nowIST } from "@/lib/date-utils";
import { DATE_PRESETS } from "@/lib/sales/sales-dashboard-constants";
import { Calendar as CalendarIcon } from "lucide-react";

interface SalesDashboardFiltersProps {
  date: DateRange | undefined;
  draftDate: DateRange | undefined;
  activePreset: string;
  teamId: string;
  userId: string;
  teams: any[];
  users: any[];
  isAdmin: boolean;
  isManager: boolean;
  isDatePopoverOpen: boolean;
  canApplyDraftRange: boolean;
  isDraftRangeTooLong: boolean;
  onDateChange: (date: DateRange | undefined) => void;
  onDraftDateChange: (date: DateRange | undefined) => void;
  onActivePresetChange: (preset: string) => void;
  onTeamIdChange: (teamId: string) => void;
  onUserIdChange: (userId: string) => void;
  onDatePopoverOpenChange: (open: boolean) => void;
}

export function SalesDashboardFilters({
  date,
  draftDate,
  activePreset,
  teamId,
  userId,
  teams,
  users,
  isAdmin,
  isManager,
  isDatePopoverOpen,
  canApplyDraftRange,
  isDraftRangeTooLong,
  onDateChange,
  onDraftDateChange,
  onActivePresetChange,
  onTeamIdChange,
  onUserIdChange,
  onDatePopoverOpenChange,
}: SalesDashboardFiltersProps) {
  const draftRange = draftDate?.from
    ? { from: draftDate.from, to: draftDate.to || draftDate.from }
    : undefined;

  return (
    <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg border">
      <div className="flex gap-1.5 flex-wrap">
        {DATE_PRESETS.map((p) => (
          <Button
            key={p.value}
            variant={activePreset === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const current = nowIST();
              onActivePresetChange(p.value);
              onDateChange({ from: subDays(current, p.days), to: current });
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <Popover
        open={isDatePopoverOpen}
        onOpenChange={(open) => {
          onDatePopoverOpenChange(open);
          if (open) {
            onDraftDateChange(date);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from
              ? date.to
                ? `${format(date.from, "LLL dd, y")} – ${format(date.to, "LLL dd, y")}`
                : format(date.from, "LLL dd, y")
              : "Pick date range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={draftDate?.from || date?.from}
              selected={draftDate}
              onSelect={(d) => onDraftDateChange(d)}
              numberOfMonths={1}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={nowIST().getFullYear() + 1}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Max custom range: 1 year</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDraftDateChange(date);
                    onDatePopoverOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!canApplyDraftRange}
                  onClick={() => {
                    if (!draftRange?.from || !draftRange?.to) return;
                    if (isDraftRangeTooLong) return;
                    onDateChange({ from: draftRange.from, to: draftRange.to });
                    onActivePresetChange("custom");
                    onDatePopoverOpenChange(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
            {isDraftRangeTooLong && (
              <p className="text-xs text-destructive">
                Date range cannot exceed 1 year.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {(isAdmin || isManager) && (
        <Select value={teamId} onValueChange={onTeamIdChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(isAdmin || isManager) && (
        <>
          <div className="w-[220px]">
            <UserSelector
              users={users.map((u) => ({
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                role: u.role,
                isActive: u.isActive,
              }))}
              value={userId}
              onValueChange={onUserIdChange}
              placeholder="All Users"
            />
          </div>
          {userId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUserIdChange("")}
              className="text-xs text-muted-foreground"
            >
              Clear user
            </Button>
          )}
        </>
      )}
    </div>
  );
}
