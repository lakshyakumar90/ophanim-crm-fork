"use client";

import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import type { DateRangeType } from "@/lib/attendance-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";

type TeamOverviewFiltersProps = {
  shiftFilter: string;
  onShiftFilterChange: (value: string) => void;
  dateRange: DateRangeType;
  onDateRangeChange: (value: DateRangeType) => void;
  customDateRange: { from: Date; to: Date };
  onCustomDateRangeChange: (range: { from: Date; to: Date }) => void;
  customDateMode: "single" | "range";
  onCustomDateModeChange: (mode: "single" | "range") => void;
  activeRangeField: "from" | "to";
  onActiveRangeFieldChange: (field: "from" | "to") => void;
  isCalendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  startDate: string;
  endDate: string;
  oneYearAgo: Date;
};

export function TeamOverviewFilters({
  shiftFilter,
  onShiftFilterChange,
  dateRange,
  onDateRangeChange,
  customDateRange,
  onCustomDateRangeChange,
  customDateMode,
  onCustomDateModeChange,
  activeRangeField,
  onActiveRangeFieldChange,
  isCalendarOpen,
  onCalendarOpenChange,
  startDate,
  endDate,
  oneYearAgo,
}: TeamOverviewFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
      <h2 className="text-lg font-semibold mr-4">Team Overview</h2>
      <Select value={shiftFilter} onValueChange={onShiftFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by shift" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Shifts</SelectItem>
          <SelectItem value="day_shift">Day Shift</SelectItem>
          <SelectItem value="night_shift">Night Shift</SelectItem>
        </SelectContent>
      </Select>
      <Tabs
        value={dateRange}
        onValueChange={(v) => onDateRangeChange(v as DateRangeType)}
        className="w-full sm:w-auto"
      >
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
          <TabsTrigger value="yesterday" className="text-xs">Yesterday</TabsTrigger>
          <TabsTrigger value="thisWeek" className="text-xs">This Week</TabsTrigger>
          <TabsTrigger value="thisMonth" className="text-xs">This Month</TabsTrigger>
          <TabsTrigger value="thisQuarter" className="text-xs">Quarter</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
        </TabsList>
      </Tabs>

      {dateRange === "custom" && (
        <Popover open={isCalendarOpen} onOpenChange={onCalendarOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {customDateMode === "single" ||
              customDateRange.from.getTime() === customDateRange.to.getTime()
                ? format(customDateRange.from, "MMM d, yyyy")
                : `${format(customDateRange.from, "MMM d")} - ${format(
                    customDateRange.to,
                    "MMM d, yyyy",
                  )}`}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="flex gap-2 mb-3">
              <Button
                variant={customDateMode === "single" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  onCustomDateModeChange("single");
                  onCustomDateRangeChange({
                    from: customDateRange.from,
                    to: customDateRange.from,
                  });
                }}
              >
                Single Date
              </Button>
              <Button
                variant={customDateMode === "range" ? "default" : "outline"}
                size="sm"
                onClick={() => onCustomDateModeChange("range")}
              >
                Date Range
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Max 1 year range allowed</p>
            {customDateMode === "single" ? (
              <Calendar
                mode="single"
                selected={customDateRange.from}
                onSelect={(date) => {
                  if (date) {
                    onCustomDateRangeChange({ from: date, to: date });
                    onCalendarOpenChange(false);
                  }
                }}
                disabled={(date) => date > new Date() || date < oneYearAgo}
                numberOfMonths={1}
                captionLayout="dropdown"
                fromYear={oneYearAgo.getFullYear()}
                toYear={new Date().getFullYear()}
              />
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`p-2 rounded-md border cursor-pointer text-sm ${
                      activeRangeField === "from"
                        ? "bg-primary/10 border-primary ring-1 ring-primary/20"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => onActiveRangeFieldChange("from")}
                  >
                    <span className="text-xs text-muted-foreground block mb-1">Start Date</span>
                    <div className="font-medium">
                      {format(customDateRange.from, "MMM d, yyyy")}
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded-md border cursor-pointer text-sm ${
                      activeRangeField === "to"
                        ? "bg-primary/10 border-primary ring-1 ring-primary/20"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => onActiveRangeFieldChange("to")}
                  >
                    <span className="text-xs text-muted-foreground block mb-1">End Date</span>
                    <div className="font-medium">
                      {format(customDateRange.to, "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                <Calendar
                  mode="single"
                  selected={
                    activeRangeField === "from"
                      ? customDateRange.from
                      : customDateRange.to
                  }
                  defaultMonth={
                    activeRangeField === "from"
                      ? customDateRange.from
                      : customDateRange.to
                  }
                  onSelect={(date) => {
                    if (!date) return;
                    if (activeRangeField === "from") {
                      if (date > customDateRange.to) {
                        onCustomDateRangeChange({ from: date, to: date });
                        onActiveRangeFieldChange("to");
                      } else if (differenceInDays(customDateRange.to, date) > 365) {
                        toast.error("Range cannot exceed 1 year");
                      } else {
                        onCustomDateRangeChange({ ...customDateRange, from: date });
                        onActiveRangeFieldChange("to");
                      }
                    } else if (date < customDateRange.from) {
                      onCustomDateRangeChange({
                        from: date,
                        to: customDateRange.from,
                      });
                    } else if (differenceInDays(date, customDateRange.from) > 365) {
                      toast.error("Range cannot exceed 1 year");
                    } else {
                      onCustomDateRangeChange({ ...customDateRange, to: date });
                      onCalendarOpenChange(false);
                    }
                  }}
                  disabled={(date) => date > new Date() || date < oneYearAgo}
                  numberOfMonths={1}
                  captionLayout="dropdown"
                  fromYear={oneYearAgo.getFullYear()}
                  toYear={new Date().getFullYear()}
                />
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      <span className="text-sm text-muted-foreground ml-auto">
        {startDate === endDate
          ? format(new Date(startDate), "MMM d, yyyy")
          : `${format(new Date(startDate), "MMM d")} - ${format(
              new Date(endDate),
              "MMM d, yyyy",
            )}`}
      </span>
    </div>
  );
}
