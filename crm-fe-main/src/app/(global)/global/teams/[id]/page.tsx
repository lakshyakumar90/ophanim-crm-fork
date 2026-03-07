"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { teamsApi } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Settings,
  UserPlus,
  MoreHorizontal,
  Mail,
  Shield,
  Trash,
  ShieldAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TeamDiscussion } from "@/app/(shared)/components/TeamDiscussion";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

export default function GlobalTeamDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();

  // Check if user is a member of this team
  const isTeamMember = user?.teamId === id;
  const canViewDetails = isAdmin || isTeamMember;
  const canEdit = isAdmin; // Only admin can edit

  const { data: teamData, isLoading: loadingTeam } = useSWR(
    id ? `team-${id}` : null,
    () => teamsApi.get(id as string),
  );

  const { data: membersData, isLoading: loadingMembers } = useSWR(
    id ? `team-members-${id}` : null,
    () => teamsApi.getMembers(id as string),
  );

  const refreshTeamData = useCallback(async () => {
    await Promise.all([mutate(`team-${id}`), mutate(`team-members-${id}`)]);
  }, [id]);

  useHeaderRefresh({
    onRefresh: refreshTeamData,
    enabled: Boolean(id),
  });

  const team = teamData;
  const members = membersData || [];
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  const handleRemoveMember = async (userId: string) => {
    setRemoveMemberId(null);
    try {
      await teamsApi.removeMember(id as string, userId);
      toast.success("Member removed successfully");
      mutate(`team-members-${id}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to remove member",
      );
    }
  };

  if (loadingTeam) {
    return <TeamDetailSkeleton />;
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Team not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/global/teams`)}
        >
          Back to Teams
        </Button>
      </div>
    );
  }

  // Access denied for non-members
  if (!canViewDetails) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <ShieldAlert className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Access Denied
        </h2>
        <p className="text-muted-foreground mb-4">
          You are not a member of this team and cannot view its details.
        </p>
        <Button variant="outline" onClick={() => router.push(`/global/teams`)}>
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/global/teams`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
            <p className="text-muted-foreground">{team.description}</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/global/teams/${id}/edit`)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => router.push(`/global/teams/${id}/add-member`)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMembers ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : !Array.isArray(members) || members.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No members in this team
                </p>
              ) : (
                <div className="divide-y">
                  {members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-4"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {member.fullName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {member.fullName}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Badge
                          variant={
                            member.role === "manager" ? "default" : "secondary"
                          }
                        >
                          {member.role}
                        </Badge>
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setRemoveMemberId(member.id)}
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Remove from Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussion" className="mt-6">
          <TeamDiscussion teamId={id as string} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!removeMemberId}
        onOpenChange={(open) => !open && setRemoveMemberId(null)}
        title="Remove Team Member"
        description="Are you sure you want to remove this member from the team?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => removeMemberId && handleRemoveMember(removeMemberId)}
      />
    </div>
  );
}

function TeamDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
