"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { teamsApi, usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Search,
  UserPlus,
  Shield,
  User,
  Check,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function AddMemberPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch current team members to exclude them
  const { data: teamMembersData } = useSWR(
    teamId ? `team-members-${teamId}` : null,
    () => teamsApi.getMembers(teamId),
  );

  // Fetch managers separately
  const { data: managersData, isLoading: loadingManagers } = useSWR(
    "managers-list",
    () =>
      usersApi
        .list({ role: "manager", limit: 100 }),
  );

  // Fetch employees separately
  const { data: employeesData, isLoading: loadingEmployees } = useSWR(
    "employees-list",
    () =>
      usersApi
        .list({ role: "employee", limit: 500 }),
  );

  const teamMembers = teamMembersData || [];
  const teamMemberIds = useMemo(
    () => new Set(teamMembers.map((m: any) => m.id)),
    [teamMembers],
  );

  // Filter out already added managers
  const availableManagers = useMemo(() => {
    const managers = managersData?.data || [];
    return managers.filter((m: any) => !teamMemberIds.has(m.id));
  }, [managersData, teamMemberIds]);

  // Filter out already added employees
  const availableEmployees = useMemo(() => {
    const employees = employeesData?.data || [];
    return employees.filter((e: any) => !teamMemberIds.has(e.id));
  }, [employeesData, teamMemberIds]);

  // Filter employees based on debounced search query
  // Show all when focused but no search, otherwise filter
  const filteredEmployees = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();

    if (!query) {
      // Show first 15 when focused without search
      return isSearchFocused ? availableEmployees.slice(0, 15) : [];
    }

    return availableEmployees
      .filter(
        (user: any) =>
          user.fullName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query),
      )
      .slice(0, 15); // Limit to 15 results
  }, [availableEmployees, debouncedSearch, isSearchFocused]);

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error("Please select a user to add");
      return;
    }

    setIsSubmitting(true);
    try {
      await teamsApi.addMember(teamId, selectedUser.id);
      toast.success("Member added successfully");
      router.push(`/sales/teams/${teamId}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to add member",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const showResults = isSearchFocused || debouncedSearch;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/sales/teams/${teamId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Add Team Member
          </h1>
          <p className="text-muted-foreground">
            Select a manager or employee to add to this team
          </p>
        </div>
      </div>

      {/* Selected User Display */}
      {selectedUser && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {selectedUser.fullName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {selectedUser.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
                <Badge
                  variant={
                    selectedUser.role === "manager" ? "default" : "secondary"
                  }
                >
                  {selectedUser.role}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                <X className="h-4 w-4 mr-1" />
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manager Selection */}
      {!selectedUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle>Add Manager</CardTitle>
            </div>
            <CardDescription>
              Select a manager to add to this team ({availableManagers.length}{" "}
              available)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              onValueChange={(v) => {
                const mgr = availableManagers.find((m: any) => m.id === v);
                if (mgr) handleSelectUser(mgr);
              }}
              disabled={loadingManagers}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingManagers ? "Loading managers..." : "Select a manager"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableManagers.length === 0 ? (
                  <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                    No managers available to add
                  </div>
                ) : (
                  availableManagers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.fullName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({user.email})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Employee Search */}
      {!selectedUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              <CardTitle>Add Employee</CardTitle>
            </div>
            <CardDescription>
              Search for an employee by name or email (
              {availableEmployees.length} available)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Click to see all or type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    // Delay to allow click on results
                    setTimeout(() => setIsSearchFocused(false), 200);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {loadingEmployees && showResults && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loadingEmployees &&
                showResults &&
                filteredEmployees.length === 0 && (
                  <div className="py-4 text-center text-muted-foreground text-sm border rounded-md">
                    {debouncedSearch
                      ? `No employees found matching "${debouncedSearch}"`
                      : "No employees available to add"}
                  </div>
                )}

              {showResults && filteredEmployees.length > 0 && (
                <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
                  {filteredEmployees.map((user: any) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => handleSelectUser(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-slate-100 text-slate-700 text-sm">
                          {user.fullName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {user.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                  {availableEmployees.length > 15 && !debouncedSearch && (
                    <div className="px-4 py-2 text-xs text-center text-muted-foreground bg-muted/30">
                      Showing 15 of {availableEmployees.length} — Type to search
                      for more
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/sales/teams/${teamId}`)}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAddMember}
          disabled={isSubmitting || !selectedUser}
          className="bg-primary"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Add Member
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
