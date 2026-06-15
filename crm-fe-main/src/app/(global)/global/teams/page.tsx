"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { teamsApi } from "@/lib/api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  UserCircle,
  Building,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Team } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

export default function GlobalTeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const { departments } = useDepartment();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const { data, isLoading, error, mutate } = useSWR("teams", () =>
    teamsApi.list(),
  );

  const refreshTeamsData = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshTeamsData,
  });

  const allTeams = (data || []) as Team[];

  // Filter teams by department if selected
  let teams =
    selectedDepartment === "all"
      ? allTeams
      : allTeams.filter(
          (team: Team) => team.departmentId === selectedDepartment,
        );

  // If standard employee, strictly bind view to their own team.
  if (!isAdmin && !isManager && user?.teamId) {
    teams = teams.filter((team) => team.id === user.teamId);
  }

  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleteTeamId(null);
    try {
      await teamsApi.delete(id);
      toast.success("Team deleted successfully");
      mutate();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to delete team",
      );
    }
  };

  // Get department name for a team
  const getDepartmentName = (departmentId: string | null | undefined) => {
    if (!departmentId) return "No Department";
    const dept = departments.find((d) => d.id === departmentId);
    return dept?.name || "Unknown";
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Teams</h1>
          <p className="text-muted-foreground">
            Manage teams across all departments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedDepartment}
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => router.push("/global/teams/new")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          Failed to load teams
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {selectedDepartment === "all"
            ? "No teams found"
            : "No teams in this department"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team: Team) => (
            <Card
              key={team.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => router.push(`/global/teams/${team.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription>
                      {team.memberCount || 0} members
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="group-hover:opacity-100 opacity-0 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/global/teams/${team.id}/edit`);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTeamId(team.id);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4 h-10">
                  {team.description || "No description provided"}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Building className="w-3 h-3" />
                    {getDepartmentName(team.departmentId)}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTeamId}
        onOpenChange={(open) => !open && setDeleteTeamId(null)}
        title="Delete Team"
        description="Are you sure you want to delete this team? All team members will be unassigned."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTeamId && handleDelete(deleteTeamId)}
      />
    </div>
  );
}
