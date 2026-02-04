"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { teamsApi, usersApi } from "@/lib/api";
import { useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AddMemberPage() {
  const { id } = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Fetch team data
  const { data: teamData, isLoading: loadingTeam } = useSWR(
    id ? `team-${id}` : null,
    () => teamsApi.get(id as string).then((res) => res.data.data),
  );

  // Fetch users (employees) - filtered by team's department
  // Only fetch when team data (and departmentId) is available
  const { data: usersData } = useSWR(
    teamData?.departmentId ? ["users-available", teamData.departmentId] : null,
    () =>
      usersApi
        .list({
          role: "employee", // Only employees? Or managers too? Usually adds employees.
          departmentId: teamData.departmentId,
          isActive: true,
          // teamId: "null" // We might want to filter users NOT in a team? Or users in ANY team?
          // If we want users who can join this team, they should ideally not be in another team if 1-1 mapping.
          // But our system allows moving users.
        })
        .then((res) => res.data.data),
  );

  const availableUsers = usersData || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setIsSubmitting(true);
    try {
      await teamsApi.addMember(id as string, selectedUserId);
      toast.success("Member added successfully");
      router.push(`/global/teams/${id}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to add member",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  if (loadingTeam) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Team not found</p>
        <Link href="/global/teams">
          <Button variant="outline" className="mt-4">
            Back to Teams
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/global/teams/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Add Team Member
          </h1>
          <p className="text-muted-foreground">
            Add a new member to <strong>{teamData.name}</strong>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Member
          </CardTitle>
          <CardDescription>
            Select a user from the{" "}
            <strong>
              {teamData.departmentId ? "same department" : "organization"}
            </strong>{" "}
            to add to this team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="userId">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No available users found in this department
                    </div>
                  ) : (
                    availableUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName} ({user.role})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !selectedUserId}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Member
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
