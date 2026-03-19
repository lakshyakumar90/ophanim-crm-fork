"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { usersApi } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
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
  User,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

// Job title options for filter - all job titles combined
const JOB_TITLES = [
  // Employee job titles
  { value: "developer", label: "Developer" },
  { value: "designer", label: "Designer" },
  { value: "seo_specialist", label: "SEO Specialist" },
  { value: "content_writer", label: "Content Writer" },
  { value: "sales_employee", label: "Sales Employee" },
  { value: "finance_employee", label: "Finance Employee" },
  // Manager job titles
  { value: "sales_manager", label: "Sales Manager" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "project_manager", label: "Project Manager" },
];

// Helper to format job title for display
const formatJobTitle = (jobTitle: string | null | undefined): string => {
  if (!jobTitle) return "-";
  return jobTitle.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isAdmin = useIsAdmin();
  const { currentDepartment } = useDepartment();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [jobTitleFilter, setJobTitleFilter] = useState<string>("all");

  const { data, isLoading, mutate } = useSWR(
    isAdmin
      ? ["users", page, search, currentDepartment?.id, jobTitleFilter]
      : null,
    () =>
      usersApi
        .list({
          page,
          limit: 10,
          search: search || undefined,
          departmentId: currentDepartment?.id,
          jobTitle:
            jobTitleFilter && jobTitleFilter !== "all"
              ? jobTitleFilter
              : undefined,
        })
  );

  const refreshUsersData = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshUsersData,
    enabled: isAdmin,
  });

  const users = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

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
        <Button onClick={() => router.push("/global/new")}>
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
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
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

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
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
                <TableCell colSpan={7} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => (
                <TableRow key={user.id}>
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

      {users.length > 0 && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
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
            disabled={page >= meta.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
