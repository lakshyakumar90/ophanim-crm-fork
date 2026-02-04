"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import { teamsApi } from "@/lib/api";
import { useIsAdmin, useIsManager } from "@/providers/auth-provider";
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
  Users,
  Plus,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  UserCircle,
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

import { useDepartment } from "@/providers/department-context";

export default function TeamsPage() {
  const router = useRouter();
  const { slug } = useParams();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const { currentDepartment, isLoading: isDeptLoading } = useDepartment();

  const {
    data,
    isLoading: isTeamsLoading,
    error,
    mutate,
  } = useSWR("teams", () => teamsApi.list().then((res) => res.data));

  const allTeams: Team[] = data?.data || [];

  // Filter teams by current department
  const teams = currentDepartment
    ? allTeams.filter((team) => team.departmentId === currentDepartment.id)
    : [];

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground">
            Manage teams and their members
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => router.push(`/${slug}/teams/new`)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        )}
      </div>

      {isTeamsLoading || isDeptLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          Failed to load teams
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No teams found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team: Team) => (
            <Card
              key={team.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => router.push(`/${slug}/teams/${team.id}`)}
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
                {isAdmin && (
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
                          router.push(`/${slug}/teams/${team.id}/edit`);
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
                )}
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4 h-10">
                  {team.description || "No description provided"}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCircle className="w-4 h-4" />
                    <span>Manager assigned</span>
                  </div>
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
