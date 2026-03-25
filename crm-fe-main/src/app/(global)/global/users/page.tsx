"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { usersApi, teamsApi } from "@/lib/api";
import { useIsAdmin } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { BulkEditTable, type EmployeeBulkUpdate } from "@/components/hr/employees/BulkEditTable";
import { toast } from "sonner";

// Job title options for filter - all job titles combined
const JOB_TITLES = [
  // Employee job titles
  { value: "developer", label: "Developer" },
  { value: "designer", label: "Designer" },
  { value: "seo_specialist", label: "SEO Specialist" },
  { value: "content_writer", label: "Content Writer" },
  { value: "sales_employee", label: "Sales Employee" },
  { value: "finance_employee", label: "Finance Employee" },
  { value: "hr_employee", label: "HR Employee" },
  // Manager job titles
  { value: "sales_manager", label: "Sales Manager" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "project_manager", label: "Project Manager" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "hr_director", label: "HR Director" },
];

// Helper to format job title for display
const formatJobTitle = (jobTitle: string | null | undefined): string => {
  if (!jobTitle) return "-";
  return jobTitle.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function UsersPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { currentDepartment } = useDepartment();
  const [search, setSearch] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const bulkEditRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, mutate } = useSWR(
    isAdmin
      ? ["users", search, currentDepartment?.id, jobTitleFilter]
      : null,
    () =>
      usersApi
        .list({
          page: 1,
          limit: 5000,
          search: search || undefined,
          departmentId: currentDepartment?.id,
          jobTitle:
            jobTitleFilter && jobTitleFilter !== "all"
              ? jobTitleFilter
              : undefined,
        })
  );

  const { data: teamsData } = useSWR("users-page-teams", () => teamsApi.list());

  const refreshUsersData = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshUsersData,
    enabled: isAdmin,
  });

  const users = data?.data || [];
  const teams = Array.isArray(teamsData) ? teamsData : [];
  const selectedUsers = useMemo(
    () => users.filter((u: any) => selectedIds.includes(u.id)),
    [users, selectedIds],
  );

  const managerOptions = useMemo(
    () =>
      users.filter(
        (u: any) => u.role === "manager" || u.role === "admin",
      ),
    [users],
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Map(
          users
            .filter((u: any) => u.departmentId && u.departmentName)
            .map((u: any) => [u.departmentId, u.departmentName]),
        ).entries(),
      ),
    [users],
  );

  useEffect(() => {
    if (bulkEditMode && bulkEditRef.current) {
      bulkEditRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [bulkEditMode]);

  const allChecked = users.length > 0 && users.every((u: any) => selectedIds.includes(u.id));

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds((prev) => prev.filter((id) => !users.some((u: any) => u.id === id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...users.map((u: any) => u.id)])));
  };

  const saveBulkUsers = async (updates: EmployeeBulkUpdate[]) => {
    if (updates.length === 0) return;

    setBulkSaving(true);
    try {
      const response = await usersApi.bulkUpdate(updates as Array<{ id: string; data: Record<string, unknown> }>);
      const result = response?.data?.data;
      const failed = Array.isArray(result?.failed) ? result.failed.length : 0;
      const succeeded = Array.isArray(result?.succeeded)
        ? result.succeeded.length
        : updates.length - failed;

      if (succeeded > 0) toast.success(`${succeeded} users updated`);
      if (failed > 0) toast.error(`${failed} users failed to update`);

      if (failed === 0) {
        setBulkEditMode(false);
        setSelectedIds([]);
      }

      await mutate();
    } catch {
      toast.error("Bulk update failed");
    } finally {
      setBulkSaving(false);
    }
  };

  const scrollToBulkTable = () => {
    if (!bulkEditRef.current) return;
    bulkEditRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const getRoleBadge = (user: any) => {
    const role = user.role;
    const deptName = user.departmentName;

    if (role === "admin") {
      return <Badge variant="destructive">Admin</Badge>;
    }

    const roleLabel = role === "manager" ? "Manager" : "Employee";
    const displayLabel = deptName ? `${deptName} ${roleLabel}` : roleLabel;

    if (role === "manager") {
      return (
        <Badge variant="default" className="bg-blue-500">
          {displayLabel}
        </Badge>
      );
    }

    return <Badge variant="secondary">{displayLabel}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage users and their roles</p>
        </div>
        <Button
          onClick={() => router.push("/global/new")}
          size="lg"
          className="h-11 rounded-xl px-5 shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={jobTitleFilter}
          onValueChange={(v) => {
            setJobTitleFilter(v);
          }}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Filter by job title" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Job Titles</SelectItem>
            {JOB_TITLES.map((jt) => (
              <SelectItem key={jt.value} value={jt.value}>
                {jt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex items-center justify-between rounded-md border bg-muted/20 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {bulkEditMode
              ? `${selectedIds.length} selected. Bulk edit table is open below.`
              : `${selectedIds.length} selected. Open bulk edit table to edit all selected users together.`}
          </p>
          <div className="flex items-center gap-3">
            {bulkEditMode ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-lg px-4"
                  onClick={scrollToBulkTable}
                >
                  Go to bulk table
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-lg px-4"
                  onClick={() => setBulkEditMode(false)}
                >
                  Exit bulk edit
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="rounded-lg px-4"
                onClick={() => {
                  setBulkEditMode(true);
                  setTimeout(scrollToBulkTable, 80);
                }}
              >
                Bulk Edit Table
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => setSelectedIds([])}
            >
              Clear selection
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Select all users on page"
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12.5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(user.id)
                            ? prev.filter((id) => id !== user.id)
                            : [...prev, user.id],
                        )
                      }
                      aria-label={`Select ${user.fullName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>
                          {user.fullName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {user.departmentName || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatJobTitle(user.jobTitle)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "outline" : "destructive"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/global/users/${user.id}`)
                          }
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/global/users/${user.id}/edit`)
                          }
                        >
                          Edit User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {bulkEditMode && selectedUsers.length > 0 ? (
        <div ref={bulkEditRef}>
          <BulkEditTable
            title="Bulk Edit Users"
            description="Google Sheets-style tabular editing for selected users. Drag the fill handle to copy values downward."
            employees={selectedUsers}
            departmentOptions={departmentOptions.map(([id, name]) => ({ id: String(id), name: String(name) }))}
            teamOptions={(Array.isArray(teams) ? teams : []).map((team: any) => ({
              id: team.id,
              name: team.name,
              departmentId: team.departmentId || null,
            }))}
            managerOptions={managerOptions.map((manager: any) => ({
              id: manager.id,
              fullName: manager.fullName,
            }))}
            roleOptions={[
              { value: "admin", label: "Admin" },
              { value: "manager", label: "Manager" },
              { value: "employee", label: "Employee" },
            ]}
            shiftOptions={[
              { value: "day_shift", label: "Day Shift" },
              { value: "night_shift", label: "Night Shift" },
            ]}
            jobTitleOptions={JOB_TITLES}
            saving={bulkSaving}
            onSave={saveBulkUsers}
            onExit={() => setBulkEditMode(false)}
            onClearSelection={() => setSelectedIds([])}
          />
        </div>
      ) : null}

      {users.length > 0 ? (
        <div className="flex items-center justify-end">
          <p className="text-sm text-muted-foreground">
            Showing all {users.length} users
          </p>
        </div>
      ) : null}
    </div>
  );
}
