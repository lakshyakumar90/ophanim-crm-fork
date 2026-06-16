"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { teamsApi, usersApi } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  UserPlus,
  MoreHorizontal,
  Mail,
  Trash,
  ShieldAlert,
  Loader2,
  Save,
  Search,
  User,
  Shield,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { TeamDiscussion } from "@/app/(shared)/components/TeamDiscussion";

type PanelMode = "detail" | "edit" | "add-member";

const editTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  managerId: z.string().optional(),
});

type EditTeamFormData = z.infer<typeof editTeamSchema>;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function TeamEditForm({
  teamId,
  onSaved,
  onCancel,
}: {
  teamId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: teamData } = useSWR(`team-${teamId}`, () => teamsApi.get(teamId));
  const { data: usersData, isLoading: loadingUsers } = useSWR("users-for-manager", () =>
    usersApi.list({ role: "manager", limit: 100 }),
  );
  const team = teamData;
  const managers = usersData?.data || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditTeamFormData>({
    resolver: zodResolver(editTeamSchema),
  });

  useEffect(() => {
    if (team) {
      reset({
        name: team.name || "",
        description: team.description || "",
        managerId: team.managerId || "",
      });
    }
  }, [team, reset]);

  const selectedManagerId = watch("managerId");

  const onSubmit = async (data: EditTeamFormData) => {
    setIsSubmitting(true);
    try {
      await teamsApi.update(teamId, {
        name: data.name,
        description: data.description || null,
        managerId: data.managerId || null,
      });
      toast.success("Team updated successfully");
      mutate(`team-${teamId}`);
      onSaved();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || "Failed to update team");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!team) return <Skeleton className="h-40" />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Team Name *</Label>
        <Input {...register("name")} disabled={isSubmitting} />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea rows={3} {...register("description")} disabled={isSubmitting} />
      </div>
      <div className="space-y-2">
        <Label>Team Manager</Label>
        <Select
          value={selectedManagerId || "none"}
          onValueChange={(value) => setValue("managerId", value === "none" ? "" : value)}
          disabled={isSubmitting || loadingUsers}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No manager</SelectItem>
            {managers.map((manager: { id: string; fullName: string; email?: string }) => (
              <SelectItem key={manager.id} value={manager.id}>
                {manager.fullName} {manager.email ? `(${manager.email})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

function AddMemberForm({
  teamId,
  onAdded,
  onCancel,
}: {
  teamId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: teamMembersData } = useSWR(`team-members-${teamId}`, () =>
    teamsApi.getMembers(teamId),
  );
  const { data: managersData, isLoading: loadingManagers } = useSWR("managers-list", () =>
    usersApi.list({ role: "manager", limit: 100 }),
  );
  const { data: employeesData, isLoading: loadingEmployees } = useSWR("employees-list", () =>
    usersApi.list({ role: "employee", limit: 500 }),
  );

  const teamMemberIds = useMemo(
    () => new Set((teamMembersData || []).map((m: { id: string }) => m.id)),
    [teamMembersData],
  );

  const availableManagers = useMemo(() => {
    const managers = managersData?.data || [];
    return managers.filter((m: { id: string }) => !teamMemberIds.has(m.id));
  }, [managersData, teamMemberIds]);

  const availableEmployees = useMemo(() => {
    const employees = employeesData?.data || [];
    return employees.filter((e: { id: string }) => !teamMemberIds.has(e.id));
  }, [employeesData, teamMemberIds]);

  const filteredEmployees = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    if (!query) return isSearchFocused ? availableEmployees.slice(0, 15) : [];
    return availableEmployees
      .filter(
        (user: { fullName?: string; email?: string }) =>
          user.fullName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query),
      )
      .slice(0, 15);
  }, [availableEmployees, debouncedSearch, isSearchFocused]);

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error("Please select a user to add");
      return;
    }
    setIsSubmitting(true);
    try {
      await teamsApi.addMember(teamId, selectedUser.id);
      toast.success("Member added successfully");
      mutate(`team-members-${teamId}`);
      onAdded();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showResults = isSearchFocused || debouncedSearch;

  return (
    <div className="space-y-4">
      {selectedUser ? (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{selectedUser.fullName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{selectedUser.fullName}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
            </div>
            <Badge variant={selectedUser.role === "manager" ? "default" : "secondary"}>
              {selectedUser.role}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
            <X className="h-4 w-4 mr-1" />
            Change
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-blue-600" />
              Add Manager
            </div>
            <Select
              onValueChange={(v) => {
                const mgr = availableManagers.find((m: { id: string }) => m.id === v);
                if (mgr) setSelectedUser(mgr);
              }}
              disabled={loadingManagers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingManagers ? "Loading..." : "Select a manager"} />
              </SelectTrigger>
              <SelectContent>
                {availableManagers.map((user: { id: string; fullName: string; email?: string }) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-green-600" />
              Add Employee
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="pl-10"
              />
            </div>
            {showResults && filteredEmployees.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {filteredEmployees.map((user: { id: string; fullName: string; email: string }) => (
                  <button
                    key={user.id}
                    type="button"
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted/50 text-left text-sm"
                    onClick={() => setSelectedUser({ ...user, role: "employee" })}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>{user.fullName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{user.fullName}</span>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleAddMember} disabled={isSubmitting || !selectedUser}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Add Member
        </Button>
      </div>
    </div>
  );
}

function TeamDetailBody({
  teamId,
  mode,
  onModeChange,
  onUpdated,
}: {
  teamId: string;
  mode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
  onUpdated?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isTeamMember = user?.teamId === teamId;
  const canViewDetails = isAdmin || isTeamMember;
  const canEdit = isAdmin;
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  const { data: teamData, isLoading: loadingTeam } = useSWR(`team-${teamId}`, () =>
    teamsApi.get(teamId),
  );
  const { data: membersData, isLoading: loadingMembers } = useSWR(`team-members-${teamId}`, () =>
    teamsApi.getMembers(teamId),
  );

  const team = teamData;
  const members = membersData || [];

  const handleRemoveMember = async (userId: string) => {
    setRemoveMemberId(null);
    try {
      await teamsApi.removeMember(teamId, userId);
      toast.success("Member removed successfully");
      mutate(`team-members-${teamId}`);
      onUpdated?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || "Failed to remove member");
    }
  };

  if (loadingTeam) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!team) {
    return <p className="text-center text-muted-foreground py-8">Team not found</p>;
  }

  if (!canViewDetails) {
    return (
      <div className="text-center py-8">
        <ShieldAlert className="h-10 w-10 text-red-600 mx-auto mb-3" />
        <p className="font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-1">
          You are not a member of this team.
        </p>
      </div>
    );
  }

  if (mode === "edit" && canEdit) {
    return (
      <TeamEditForm
        teamId={teamId}
        onSaved={() => {
          onModeChange("detail");
          onUpdated?.();
        }}
        onCancel={() => onModeChange("detail")}
      />
    );
  }

  if (mode === "add-member" && canEdit) {
    return (
      <AddMemberForm
        teamId={teamId}
        onAdded={() => {
          onModeChange("detail");
          onUpdated?.();
        }}
        onCancel={() => onModeChange("detail")}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{team.name}</h2>
            <p className="text-sm text-muted-foreground">{team.description || "No description"}</p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onModeChange("edit")}>
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
              <Button size="sm" onClick={() => onModeChange("add-member")}>
                <UserPlus className="w-4 h-4 mr-1" />
                Add Member
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="mt-4">
            {loadingMembers ? (
              <Skeleton className="h-24" />
            ) : members.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No members</p>
            ) : (
              <div className="divide-y">
                {members.map((member: {
                  id: string;
                  fullName: string;
                  email: string;
                  role: string;
                  avatarUrl?: string;
                }) => (
                  <div key={member.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback>{member.fullName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === "manager" ? "default" : "secondary"}>
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
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="discussion" className="mt-4">
            <TeamDiscussion teamId={teamId} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={!!removeMemberId}
        onOpenChange={(open) => !open && setRemoveMemberId(null)}
        title="Remove Team Member"
        description="Are you sure you want to remove this member from the team?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => removeMemberId && handleRemoveMember(removeMemberId)}
      />
    </>
  );
}

const MODE_TITLES: Record<PanelMode, string> = {
  detail: "Team Details",
  edit: "Edit Team",
  "add-member": "Add Team Member",
};

export function TeamDetailSheet({
  teamId,
  open,
  onOpenChange,
  onUpdated,
}: {
  teamId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const [mode, setMode] = useState<PanelMode>("detail");

  useEffect(() => {
    if (!open) setMode("detail");
  }, [open, teamId]);

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={MODE_TITLES[mode]}
      size="2xl"
    >
      {teamId && open ? (
        <TeamDetailBody
          teamId={teamId}
          mode={mode}
          onModeChange={setMode}
          onUpdated={onUpdated}
        />
      ) : null}
    </FormSideSheet>
  );
}
