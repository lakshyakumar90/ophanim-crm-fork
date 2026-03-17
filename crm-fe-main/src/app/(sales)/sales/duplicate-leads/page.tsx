"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import {
  Users,
  AlertTriangle,
  ExternalLink,
  Search,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  Copy,
} from "lucide-react";
import { csvApi, teamsApi, usersApi } from "@/lib/api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSelector } from "@/components/shared/user-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";

interface DuplicateLead {
  id: string;
  leadName: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  assignedTo?: string | null;
}

interface DuplicateGroup {
  email: string | null;
  phone: string | null;
  leads: DuplicateLead[];
}

interface FilterUser {
  id: string;
  fullName?: string;
  full_name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  is_active?: boolean;
}

type SortOption = "latest" | "oldest" | "name";

export default function DuplicateLeadsPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data, isLoading } = useSWR(
    user ? "duplicate-leads" : null,
    async () => {
      const res = await csvApi.getDuplicateLeads();
      return (res.data?.data ?? res.data) as { groups: DuplicateGroup[] };
    },
  );

  const { data: usersData } = useSWR(
    user && (isAdmin || isManager)
      ? [
          "duplicate-leads-users",
          isAdmin ? "admin" : "manager",
          user.teamId ?? "no-team",
        ]
      : null,
    async () => {
      if (isAdmin) {
        const res = await usersApi.list({ limit: 1000 });
        return (res?.data ?? res ?? []) as FilterUser[];
      }

      if (isManager && user?.teamId) {
        const members = await teamsApi.getMembers(user.teamId);
        const merged = [user as FilterUser, ...(Array.isArray(members) ? members : [])];

        return Array.from(
          new Map(merged.map((member) => [member.id, member])).values(),
        ) as FilterUser[];
      }

      return [];
    },
  );

  const rawGroups = data?.groups ?? [];
  const filterUsers = usersData ?? [];
  const userNameMap = useMemo(
    () =>
      Object.fromEntries(
        filterUsers.map((member) => [
          member.id,
          member.fullName || member.full_name || member.email || "Unknown user",
        ]),
      ),
    [filterUsers],
  );
  const selectedUserName =
    selectedUserId && userNameMap[selectedUserId]
      ? userNameMap[selectedUserId]
      : "selected user";

  // Employees see only groups where at least one lead is assigned to them
  const roleFilteredGroups =
    isAdmin || isManager
      ? rawGroups
      : rawGroups
          .map((g) => ({
            ...g,
            leads: g.leads.filter((l) => l.assignedTo === user?.id),
          }))
          .filter((g) => g.leads.length >= 2);

  const userFilteredGroups =
    isAdmin || isManager
      ? selectedUserId
        ? roleFilteredGroups.filter((group) =>
            group.leads.some((lead) => lead.assignedTo === selectedUserId),
          )
        : roleFilteredGroups
      : roleFilteredGroups;

  // Apply search + date filters
  const filteredGroups = userFilteredGroups.filter((group) => {
    if (search) {
      const q = search.toLowerCase();
      const keyMatch =
        (group.email && group.email.toLowerCase().includes(q)) ||
        (group.phone && group.phone.toLowerCase().includes(q)) ||
        group.leads.some((l) => l.leadName.toLowerCase().includes(q));
      if (!keyMatch) return false;
    }

    if (dateFrom || dateTo) {
      const inRange = group.leads.some((l) => {
        const d = new Date(l.createdAt);
        if (dateFrom && isBefore(d, startOfDay(new Date(dateFrom)))) return false;
        if (dateTo && isAfter(d, endOfDay(new Date(dateTo)))) return false;
        return true;
      });
      if (!inRange) return false;
    }

    return true;
  });

  // Sort
  const groups = [...filteredGroups].sort((a, b) => {
    if (sortBy === "name") {
      const aKey = (a.email ?? a.phone ?? "").toLowerCase();
      const bKey = (b.email ?? b.phone ?? "").toLowerCase();
      return aKey.localeCompare(bKey);
    }
    const latestA = Math.max(...a.leads.map((l) => new Date(l.createdAt).getTime()));
    const latestB = Math.max(...b.leads.map((l) => new Date(l.createdAt).getTime()));
    return sortBy === "latest" ? latestB - latestA : latestA - latestB;
  });

  const hasActiveFilters = Boolean(search || dateFrom || dateTo || selectedUserId);
  const getLeadHref = (leadId: string) => `/sales/leads/${leadId}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Copy className="h-5 w-5 text-amber-500" />
            Duplicate Leads
          </h1>
          <p className="text-muted-foreground">
            {isAdmin || isManager
              ? "Leads sharing the same email or phone number"
              : "Your assigned leads that have duplicates"}
          </p>
        </div>
        {!isLoading && (
          <Badge
            variant={groups.length > 0 ? "destructive" : "outline"}
            className="text-sm px-3 py-1"
          >
            {userFilteredGroups.length} group{userFilteredGroups.length !== 1 ? "s" : ""} found
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-card border rounded-xl p-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, phone, name..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 text-xs w-[130px]"
          title="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-8 text-xs w-[130px]"
          title="To date"
        />

        {(isAdmin || isManager) && (
          <div className="w-[220px]">
            <UserSelector
              users={filterUsers}
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              placeholder="All Users"
              className="h-8 text-xs"
            />
          </div>
        )}

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">
              <span className="flex items-center gap-1.5">
                <SortDesc className="h-3.5 w-3.5" /> Latest first
              </span>
            </SelectItem>
            <SelectItem value="oldest">
              <span className="flex items-center gap-1.5">
                <SortAsc className="h-3.5 w-3.5" /> Oldest first
              </span>
            </SelectItem>
            <SelectItem value="name">
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" /> Name A–Z
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              setSearch("");
              setDateFrom("");
              setDateTo("");
              setSelectedUserId("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="font-semibold text-lg">
            {hasActiveFilters
              ? "No groups match your filters"
              : userFilteredGroups.length === 0
                ? "No duplicate leads found"
                : "No groups match your filters"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {hasActiveFilters
              ? selectedUserId && userFilteredGroups.length === 0
                ? `${selectedUserName} has no duplicate lead groups.`
                : "Try adjusting or clearing your filters."
              : isAdmin || isManager
                ? "All leads have unique email addresses and phone numbers."
                : "None of your assigned leads have duplicates."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground px-1">
              Showing {groups.length} of {userFilteredGroups.length} group
              {userFilteredGroups.length !== 1 ? "s" : ""}
            </p>
          )}
          {groups.map((group, gi) => (
            <Card key={gi} className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {group.email ? (
                    <>
                      Duplicate email:{" "}
                      <span className="font-mono text-amber-700 dark:text-amber-400">
                        {group.email}
                      </span>
                    </>
                  ) : (
                    <>
                      Duplicate phone:{" "}
                      <span className="font-mono text-amber-700 dark:text-amber-400">
                        {group.phone}
                      </span>
                    </>
                  )}
                  <Badge variant="secondary" className="ml-auto">
                    {group.leads.length} leads
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.leads
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a.createdAt).getTime() -
                          new Date(b.createdAt).getTime(),
                      )
                      .map((lead, li) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            {lead.leadName}
                            {li === 0 && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[10px]"
                              >
                                Oldest
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {lead.email || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {lead.phone || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {lead.assignedTo
                              ? userNameMap[lead.assignedTo] || "Assigned"
                              : "Unassigned"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="capitalize text-xs"
                            >
                              {lead.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(lead.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => router.push(getLeadHref(lead.id))}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
