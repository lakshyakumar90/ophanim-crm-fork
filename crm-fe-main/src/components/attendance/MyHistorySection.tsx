"use client";

import { format } from "date-fns";
import { formatHoursToReadable, formatStoredTime } from "@/lib/date-utils";
import { statusColors, formatStatusLabel } from "@/lib/attendance-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type MyHistorySectionProps = {
  myHistoryYear: number;
  myHistoryMonth: number;
  myHistoryMode: "month" | "custom";
  onMyHistoryModeChange: (mode: "month" | "custom") => void;
  myHistoryCustomRange: { from: Date; to: Date };
  onMyHistoryCustomRangeChange: (range: { from: Date; to: Date }) => void;
  myHistoryCalOpen: boolean;
  onMyHistoryCalOpenChange: (open: boolean) => void;
  onNavigateMonth: (delta: number) => void;
  isMHCurrent: boolean;
  myHistoryData: {
    records?: Record<string, unknown>[];
    summary?: Record<string, number>;
  } | null | undefined;
  myMonthSummary: Record<string, number> | null | undefined;
  loadingMyHistory: boolean;
  loadingMyMonthSummary: boolean;
  oneYearAgo: Date;
};

export function MyHistorySection({
  myHistoryYear,
  myHistoryMonth,
  myHistoryMode,
  onMyHistoryModeChange,
  myHistoryCustomRange,
  onMyHistoryCustomRangeChange,
  myHistoryCalOpen,
  onMyHistoryCalOpenChange,
  onNavigateMonth,
  isMHCurrent,
  myHistoryData,
  myMonthSummary,
  loadingMyHistory,
  loadingMyMonthSummary,
  oneYearAgo,
}: MyHistorySectionProps) {
  const stats = myHistoryMode === "month" ? myMonthSummary : myHistoryData?.summary;
  const loadingStats =
    myHistoryMode === "month" ? loadingMyMonthSummary : loadingMyHistory;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            My Attendance History
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {myHistoryMode === "month" ? (
              <>
                <Button variant="outline" size="sm" onClick={() => onNavigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {format(new Date(myHistoryYear, myHistoryMonth - 1), "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateMonth(1)}
                  disabled={isMHCurrent}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Popover open={myHistoryCalOpen} onOpenChange={onMyHistoryCalOpenChange}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(myHistoryCustomRange.from, "MMM d")} –{" "}
                    {format(myHistoryCustomRange.to, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <Calendar
                    mode="range"
                    selected={{
                      from: myHistoryCustomRange.from,
                      to: myHistoryCustomRange.to,
                    }}
                    onSelect={(range) => {
                      if (range?.from) {
                        onMyHistoryCustomRangeChange({
                          from: range.from,
                          to: range.to || range.from,
                        });
                        if (range.from && range.to) onMyHistoryCalOpenChange(false);
                      }
                    }}
                    disabled={(date) => date > new Date() || date < oneYearAgo}
                    numberOfMonths={1}
                    captionLayout="dropdown"
                    startMonth={oneYearAgo}
                    endMonth={new Date()}
                  />
                </PopoverContent>
              </Popover>
            )}
            <Button
              variant={myHistoryMode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                onMyHistoryModeChange(myHistoryMode === "custom" ? "month" : "custom")
              }
            >
              {myHistoryMode === "custom" ? "Month View" : "Custom Range"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingStats ? (
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
            <div className="text-center p-2 bg-green-50 rounded">
              <p className="text-lg font-bold text-green-600">{stats.present || 0}</p>
              <p className="text-[10px] text-muted-foreground">Present</p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded">
              <p className="text-lg font-bold text-amber-600">{stats.late || 0}</p>
              <p className="text-[10px] text-muted-foreground">Late</p>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded">
              <p className="text-lg font-bold text-orange-600">
                {(stats as { halfDay?: number; half_day?: number }).halfDay ??
                  (stats as { half_day?: number }).half_day ??
                  0}
              </p>
              <p className="text-[10px] text-muted-foreground">Half Day</p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <p className="text-lg font-bold text-red-600">{stats.absent || 0}</p>
              <p className="text-[10px] text-muted-foreground">Absent</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <p className="text-lg font-bold text-blue-600">{stats.leave || 0}</p>
              <p className="text-[10px] text-muted-foreground">On Leave</p>
            </div>
            {myHistoryMode === "month" && (
              <div className="text-center p-2 bg-muted rounded">
                <p className="text-lg font-bold text-slate-600">
                  {(stats as { week_off?: number }).week_off || 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Week Off</p>
              </div>
            )}
            <div className="text-center p-2 bg-indigo-50 rounded">
              <p className="text-lg font-bold text-indigo-600">
                {formatHoursToReadable(stats.totalHours || 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">Total hrs</p>
            </div>
          </div>
        ) : null}

        {loadingMyHistory ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (myHistoryData?.records?.length ?? 0) > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Clock In</TableHead>
                  <TableHead className="hidden sm:table-cell">Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myHistoryData!.records!.map((rec) => (
                  <TableRow key={rec.id as string}>
                    <TableCell className="font-mono text-sm">
                      {rec.date
                        ? format(new Date(`${rec.date as string}T12:00:00`), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rec.date
                        ? format(new Date(`${rec.date as string}T12:00:00`), "EEE")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusColors[rec.status as string] || "bg-muted text-muted-foreground"
                        }
                      >
                        {formatStatusLabel(rec.status as string)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm">
                      {rec.clockInTime
                        ? formatStoredTime(rec.clockInTime as string)
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm">
                      {rec.clockOutTime
                        ? formatStoredTime(rec.clockOutTime as string)
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {typeof rec.totalHours === "number"
                        ? formatHoursToReadable(rec.totalHours)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No attendance records found for this period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
