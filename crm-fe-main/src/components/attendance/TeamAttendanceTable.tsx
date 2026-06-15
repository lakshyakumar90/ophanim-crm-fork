"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getInitials } from "@/lib/utils";
import { formatHoursToReadable } from "@/lib/date-utils";
import { statusColors, type UserDaySession, type UsersTodayItem } from "@/lib/attendance-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, ExternalLink, Users } from "lucide-react";

type TeamAttendanceTableProps = {
  allUsersAttendance: UsersTodayItem[];
  usersAttendance: UsersTodayItem[];
  loadingUsers: boolean;
  shiftFilter: string;
};

export function TeamAttendanceTable({
  allUsersAttendance,
  usersAttendance,
  loadingUsers,
  shiftFilter,
}: TeamAttendanceTableProps) {
  const router = useRouter();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Attendance
            {!loadingUsers && (
              <Badge variant="secondary">
                {allUsersAttendance.length} users
                {shiftFilter !== "all" && ` (${usersAttendance.length} filtered)`}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loadingUsers ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : usersAttendance.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No attendance records found for this date.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a different date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Clock In</TableHead>
                  <TableHead className="hidden sm:table-cell">Clock Out</TableHead>
                  <TableHead className="hidden md:table-cell">Hours</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersAttendance.map((item) => {
                  const sessions = Array.isArray(item.attendance?.sessions)
                    ? item.attendance.sessions
                    : [];
                  const firstClockIn =
                    sessions[0]?.clockInTime || item.attendance?.clockInTime || null;
                  const lastClockOut =
                    [...sessions]
                      .reverse()
                      .find((s: UserDaySession) => Boolean(s.clockOutTime))
                      ?.clockOutTime || item.attendance?.clockOutTime || null;
                  const dayHours =
                    typeof item.attendance?.totalHours === "number"
                      ? item.attendance.totalHours
                      : sessions.reduce(
                          (sum: number, s: UserDaySession) =>
                            sum + (typeof s.totalHours === "number" ? s.totalHours : 0),
                          0,
                        );
                  const isExpanded = expandedUserId === item.user.id;

                  return (
                    <Fragment key={item.user.id}>
                      <TableRow className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedUserId(isExpanded ? null : item.user.id)
                              }
                              className="rounded p-1 hover:bg-muted"
                              title="Toggle sessions"
                            >
                              <ChevronRight
                                className={`h-4 w-4 transition-transform ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                              />
                            </button>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={item.user.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(item.user.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {item.user.fullName}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {item.user.designation || item.user.role || "Employee"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.user.shiftType === "night_shift"
                                ? "border-purple-500 text-purple-700"
                                : "border-blue-500 text-blue-700"
                            }
                          >
                            {item.user.shiftType === "day_shift"
                              ? "Day"
                              : item.user.shiftType === "night_shift"
                                ? "Night"
                                : "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              statusColors[item.status] || "bg-gray-100 text-gray-700"
                            }
                          >
                            {item.status?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm">
                          {firstClockIn
                            ? format(new Date(firstClockIn), "h:mm a")
                            : "--:--"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm">
                          {firstClockIn && lastClockOut
                            ? format(new Date(lastClockOut), "h:mm a")
                            : "--:--"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm">
                          {typeof dayHours === "number"
                            ? formatHoursToReadable(dayHours)
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sessions.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {sessions.length} sessions
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/attendance/${item.user.id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              View <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && sessions.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/20">
                            <div className="rounded-md border bg-background p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Sessions ({sessions.length})
                              </p>
                              <div className="space-y-1">
                                {sessions.map((session: UserDaySession, index: number) => (
                                  <div
                                    key={session.id || index}
                                    className="text-xs flex items-center justify-between"
                                  >
                                    <span>
                                      #{index + 1}:{" "}
                                      {session.clockInTime
                                        ? format(new Date(session.clockInTime), "h:mm a")
                                        : "--:--"}{" "}
                                      -{" "}
                                      {session.clockOutTime
                                        ? format(new Date(session.clockOutTime), "h:mm a")
                                        : "Active"}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {typeof session.totalHours === "number"
                                        ? formatHoursToReadable(session.totalHours)
                                        : "--"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
