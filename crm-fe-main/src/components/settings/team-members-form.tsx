"use client";

import { useState, useEffect } from "react";
import { useAuth, useIsManager } from "@/providers/auth-provider";
import { teamsApi, usersApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Users,
  Mail,
  Phone,
  Building,
  UserPlus,
  RefreshCw,
  Search,
  UserMinus,
} from "lucide-react";

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  avatarUrl?: string | null;
  isActive: boolean;
  jobTitle?: string | null;
}

interface Team {
  id: string;
  name: string;
  description?: string | null;
  departmentId?: string | null;
  members?: TeamMember[];
}

export function TeamMembersForm() {
  const { user } = useAuth();
  const isManager = useIsManager();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const fetchTeams = async () => {
    try {
      const res = await teamsApi.list();
      if (res.data.success) {
        // For managers, filter to only their managed teams
        const allTeams = res.data.data || [];
        if (user?.role === "manager") {
          const managedTeams = allTeams.filter(
            (t: Team) => t.id === user?.teamId,
          );
          setTeams(managedTeams.length > 0 ? managedTeams : allTeams);
        } else {
          setTeams(allTeams);
        }
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const res = await teamsApi.get(teamId);
      if (res.data.success) {
        setSelectedTeam(res.data.data);
        setMembers(res.data.data.members || []);
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await usersApi.list();
      if (res.data.success) {
        const allUsers = res.data.data || [];
        // Filter out users already in the team
        const memberIds = members.map((m) => m.id);
        const available = allUsers.filter(
          (u: TeamMember) => !memberIds.includes(u.id),
        );
        setAvailableUsers(available);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      fetchTeamMembers(teams[0].id);
    }
  }, [teams]);

  useEffect(() => {
    if (showAddMember) {
      fetchAvailableUsers();
    }
  }, [showAddMember, members]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (selectedTeam) {
      await fetchTeamMembers(selectedTeam.id);
    }
    setIsRefreshing(false);
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !selectedTeam) return;

    setIsAdding(true);
    try {
      await teamsApi.addMember(selectedTeam.id, selectedUserId);
      toast.success("Member added successfully");
      await fetchTeamMembers(selectedTeam.id);
      setShowAddMember(false);
      setSelectedUserId("");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to add member",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) return;

    setIsRemoving(memberId);
    try {
      await teamsApi.removeMember(selectedTeam.id, memberId);
      toast.success("Member removed from team");
      await fetchTeamMembers(selectedTeam.id);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to remove member",
      );
    } finally {
      setIsRemoving(null);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isManager && user?.role !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Only managers and admins can manage team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view or manage team members.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              View and manage members in your team
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Select a user to add to {selectedTeam?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            <div className="flex items-center gap-2">
                              <span>{u.fullName}</span>
                              <span className="text-xs text-muted-foreground">
                                ({u.email})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No available users to add
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddMember(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMember}
                    disabled={!selectedUserId || isAdding}
                  >
                    {isAdding ? "Adding..." : "Add Member"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Selector (if multiple teams) */}
        {teams.length > 1 && (
          <div className="space-y-2">
            <Label>Select Team</Label>
            <Select
              value={selectedTeam?.id || ""}
              onValueChange={(id) => fetchTeamMembers(id)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Team Info */}
        {selectedTeam && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <Building className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{selectedTeam.name}</p>
              <p className="text-sm text-muted-foreground">
                {members.length} member(s)
              </p>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm
                ? "No members match your search"
                : "No members in this team"}
            </p>
          ) : (
            filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>
                      {member.fullName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.fullName}</p>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {member.role}
                      </Badge>
                      {!member.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      {member.jobTitle && (
                        <span className="capitalize">
                          {member.jobTitle.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={isRemoving === member.id}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
