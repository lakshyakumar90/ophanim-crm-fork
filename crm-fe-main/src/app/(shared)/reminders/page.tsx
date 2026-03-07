"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import useSWR, { mutate as globalMutate } from "swr";
import { format } from "date-fns";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { leadsApi, usersApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  CalendarClock,
  MoreVertical,
  CheckCircle2,
  Trash2,
  ArrowUpDown,
  Search,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

export default function RemindersPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const showOwnerColumn = isAdmin || isManager;
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState("reminder_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchUser, setSearchUser] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    undefined,
  );
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "sent">(
    "pending",
  );

  // Fetch users for admin filter
  const { data: usersData } = useSWR(
    isAdmin ? ["users-list", searchUser] : null,
    () => usersApi.list({ search: searchUser, limit: 10 }),
  );

  const {
    data: remindersData,
    mutate,
    isLoading,
  } = useSWR(
    ["reminders", page, limit, selectedUserId, sortBy, sortOrder, filterStatus],
    () =>
      leadsApi.getAllReminders({
        page,
        limit,
        userId: selectedUserId,
        sortBy,
        sortOrder,
        status: filterStatus,
      }),
  );

  const refreshRemindersData = useCallback(async () => {
    await Promise.all([
      mutate(),
      globalMutate((key) => Array.isArray(key) && key[0] === "users-list"),
    ]);
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshRemindersData,
  });

  const reminders = remindersData?.data || [];
  const meta = remindersData?.meta;

  const getReminderLeadId = (reminder: any): string | undefined =>
    reminder?.leadId || reminder?.lead_id || reminder?.lead?.id || reminder?.leads?.id;

  const getReminderLeadName = (reminder: any): string =>
    reminder?.lead?.leadName ||
    reminder?.lead?.lead_name ||
    reminder?.leads?.leadName ||
    reminder?.leads?.lead_name ||
    "Unknown Lead";

  const getReminderAt = (reminder: any): string =>
    reminder?.reminderAt || reminder?.reminder_at;

  const handleDelete = async (leadId: string, reminderId: string) => {
    const originalData = remindersData;

    // Optimistic update
    mutate(
      (currentData: any) => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          data: currentData.data.filter((r: any) => r.id !== reminderId),
        };
      },
      { revalidate: false },
    );

    try {
      await leadsApi.deleteReminder(leadId, reminderId);
      toast.success("Reminder deleted");
    } catch (error) {
      toast.error("Failed to delete reminder");
      // Revert optimization on error
      mutate(originalData, { revalidate: false });
    }
  };

  const handleMarkDone = async (reminderId: string) => {
    const originalData = remindersData;

    // Optimistic update - remove from pending list
    mutate(
      (currentData: any) => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          data: currentData.data.filter((r: any) => r.id !== reminderId),
        };
      },
      { revalidate: false },
    );

    try {
      await leadsApi.markReminderDone(reminderId);
      toast.success("Reminder marked as done");
      mutate(); // Revalidate
    } catch (error) {
      toast.error("Failed to mark reminder as done");
      mutate(originalData, { revalidate: false });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground">
            Manage your reminders and upcoming tasks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filterStatus}
            onValueChange={(val: any) => setFilterStatus(val)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending (Not Done)</SelectItem>
              <SelectItem value="sent">Completed (Done)</SelectItem>
              <SelectItem value="all">All Status</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>

          {isAdmin && (
            <div className="relative w-[200px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    {selectedUserId
                      ? usersData?.data?.find(
                          (u: any) => u.id === selectedUserId,
                        )?.fullName || "Selected User"
                      : "All Users"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[240px]" align="end">
                  <div className="p-2">
                    <Input
                      placeholder="Search users..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <DropdownMenuItem
                    onClick={() => setSelectedUserId(undefined)}
                  >
                    All Users
                  </DropdownMenuItem>
                  {usersData?.data?.map((u: any) => (
                    <DropdownMenuItem
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(u.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{u.fullName}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Reminders</CardTitle>
          <CardDescription>
            {isAdmin && selectedUserId
              ? "Viewing reminders for selected user"
              : "List of all your upcoming and past reminders"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reminder</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Due Date</TableHead>
                {showOwnerColumn && <TableHead>Owner</TableHead>}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={showOwnerColumn ? 5 : 4}
                    className="text-center py-8"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : reminders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={showOwnerColumn ? 5 : 4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No reminders found
                  </TableCell>
                </TableRow>
              ) : (
                reminders.map((reminder: any) => {
                  const reminderAt = getReminderAt(reminder);
                  const leadId = getReminderLeadId(reminder);
                  const leadName = getReminderLeadName(reminder);
                  const canOpenLead = Boolean(
                    leadId &&
                      leadName &&
                      leadName.toLowerCase() !== "unknown lead",
                  );
                  const isPending = !reminder.isDone;
                  const isOverdue =
                    isPending && new Date(reminderAt) < new Date();
                  return (
                    <TableRow
                      key={reminder.id}
                      className={cn(
                        isOverdue
                          ? "bg-red-50/50 hover:bg-red-100/50"
                          : isPending
                            ? "bg-green-50/50 hover:bg-green-100/50"
                            : "",
                      )}
                    >
                      <TableCell
                        className={cn(
                          isOverdue
                            ? "border-l-2 border-l-red-500"
                            : isPending
                              ? "border-l-2 border-l-green-500"
                              : "",
                        )}
                      >
                        <div
                          className="max-w-[300px] truncate"
                          title={reminder.note}
                        >
                          {reminder.note || "No note"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canOpenLead ? (
                          <Link
                            href={`/${user?.departmentSlug || "sales"}/leads/${leadId}`}
                            className="font-medium hover:underline hover:text-primary transition-colors"
                          >
                            {leadName}
                          </Link>
                        ) : (
                          <span className="font-medium text-muted-foreground">
                            {leadName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span
                            className={
                              new Date(reminderAt) < new Date() &&
                              !reminder.isDone
                                ? "text-red-500 font-bold"
                                : ""
                            }
                          >
                            {format(new Date(reminderAt), "PPP p")}
                          </span>
                          {reminder.isDone && (
                            <Badge
                              variant="secondary"
                              className="w-fit mt-1 text-[10px]"
                            >
                              Done
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {showOwnerColumn && (
                        <TableCell>
                          {reminder.user ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={reminder.user.avatarUrl} />
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(reminder.user.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {reminder.user.fullName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!reminder.isDone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Mark as done"
                              onClick={() => handleMarkDone(reminder.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => leadId && handleDelete(leadId, reminder.id)}
                            disabled={!leadId}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPrevPage}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={!meta.hasNextPage}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
