import { DateRange } from "react-day-picker";
import { nowIST } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { UserSelector } from "@/components/shared/user-selector";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  DATE_PRESETS,
  type Interval,
  type TeamOption,
  type UserOption,
} from "@/hooks/sales/useSalesAnalytics";

interface AnalyticsFiltersBarProps {
  activePreset: string;
  date: DateRange | undefined;
  dateLabel: string;
  interval: Interval;
  teamId: string;
  userId: string;
  teams: TeamOption[];
  users: UserOption[];
  isManagerOrAbove: boolean;
  isEmployee: boolean;
  isDatePopoverOpen: boolean;
  draftDate: DateRange | undefined;
  canApplyDraftRange: boolean;
  isDraftRangeTooLong: boolean;
  draftRange: { from: Date; to: Date } | undefined;
  onApplyPreset: (preset: string) => void;
  onSetActivePreset: (preset: string) => void;
  onSetDate: (date: DateRange | undefined) => void;
  onSetInterval: (interval: Interval) => void;
  onSetTeamId: (teamId: string) => void;
  onSetUserId: (userId: string) => void;
  onSetIsDatePopoverOpen: (open: boolean) => void;
  onSetDraftDate: (date: DateRange | undefined) => void;
}

export function AnalyticsFiltersBar({
  activePreset,
  date,
  dateLabel,
  interval,
  teamId,
  userId,
  teams,
  users,
  isManagerOrAbove,
  isEmployee,
  isDatePopoverOpen,
  draftDate,
  canApplyDraftRange,
  isDraftRangeTooLong,
  draftRange,
  onApplyPreset,
  onSetActivePreset,
  onSetDate,
  onSetInterval,
  onSetTeamId,
  onSetUserId,
  onSetIsDatePopoverOpen,
  onSetDraftDate,
}: AnalyticsFiltersBarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center bg-card border rounded-xl p-3">
      <div className="flex gap-1">
        {DATE_PRESETS.map((p) => (
          <Button
            key={p.value}
            variant={activePreset === p.value ? "default" : "outline"}
            size="sm"
            className="text-xs h-8"
            onClick={() => onApplyPreset(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="h-5 w-px bg-border mx-1" />

      <Popover
        open={isDatePopoverOpen}
        onOpenChange={(open) => {
          onSetIsDatePopoverOpen(open);
          if (open) {
            onSetDraftDate(date);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 text-xs h-8" onClick={() => onSetActivePreset("")}>
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{dateLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-3">
            <Calendar
              mode="range"
              defaultMonth={draftDate?.from || date?.from}
              selected={draftDate}
              onSelect={(d) => onSetDraftDate(d)}
              numberOfMonths={1}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={nowIST().getFullYear() + 1}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Max custom range: 1 year
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onSetDraftDate(date);
                    onSetIsDatePopoverOpen(false);
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
                    onSetDate({ from: draftRange.from, to: draftRange.to });
                    onSetActivePreset("");
                    onSetIsDatePopoverOpen(false);
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

      <Select value={interval} onValueChange={(v) => onSetInterval(v as Interval)}>
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>

      {isManagerOrAbove && (
        <Select value={teamId} onValueChange={onSetTeamId}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
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

      {isManagerOrAbove && (
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
            onValueChange={onSetUserId}
            placeholder="All Users"
            showAllOption
            allOptionLabel="All Users"
          />
        </div>
      )}

      {isEmployee && (
        <span className="text-xs text-muted-foreground ml-auto">
          Showing your personal analytics only
        </span>
      )}
    </div>
  );
}
