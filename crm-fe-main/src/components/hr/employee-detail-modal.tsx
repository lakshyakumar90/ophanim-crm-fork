"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Mail,
  Building,
  Users,
  Briefcase,
  Calendar,
  UserCircle,
  FolderKanban,
  UsersRound,
  Pencil,
  X,
  Loader2,
  Globe,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

interface HREmployee {
  id: string;
  fullName: string;
  email: string;
  role: string;
  departmentName: string | null;
  teamName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  timezone?: string | null;
  country?: string | null;
  address?: string | null;
}

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface ManagedTeam {
  id: string;
  name: string;
  memberCount: number;
}

interface ManagedProject {
  id: string;
  name: string;
  status: string;
  clientName: string | null;
}

interface EmployeeDetailModalProps {
  employee: HREmployee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export function EmployeeDetailModal({
  employee,
  open,
  onOpenChange,
  onUpdated,
}: EmployeeDetailModalProps) {
  const { user } = useAuth();
  const [, setTeamMembers] = useState<TeamMember[]>([]);
  const [managedTeams, setManagedTeams] = useState<ManagedTeam[]>([]);
  const [managedProjects, setManagedProjects] = useState<ManagedProject[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [formFullName, setFormFullName] = useState("");
  const [formJobTitle, setFormJobTitle] = useState("");
  const [formTimezone, setFormTimezone] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isSelf = user?.id === employee?.id;

  // Determine what the current user can edit
  const canEdit =
    isAdmin ||
    (isManager && !isSelf) ||
    (user?.role === "employee" && isSelf);

  const canEditNameTitle = isAdmin || isManager;
  const canEditProfileFields = isAdmin || isSelf; // timezone, country, address

  useEffect(() => {
    if (!employee || !open) return;

    const fetchManagerData = async () => {
      if (employee.role !== "manager" && employee.role !== "admin") return;

      setLoadingExtra(true);
      const token = localStorage.getItem("crm_access_token");

      try {
        const teamsRes = await fetch(`${API_URL}/teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const userTeams = (teamsData.data || []).filter(
            (t: any) => t.managerId === employee.id,
          );
          setManagedTeams(
            userTeams.map((t: any) => ({
              id: t.id,
              name: t.name,
              memberCount: t.memberCount || 0,
            })),
          );
        }

        const projectsRes = await fetch(
          `${API_URL}/projects/by-manager/${employee.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setManagedProjects(
            (projectsData.data || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              status: p.status,
              clientName: p.clientName,
            })),
          );
        }

        if (managedTeams.length > 0) {
          const membersRes = await fetch(
            `${API_URL}/teams/${managedTeams[0].id}/members`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (membersRes.ok) {
            const membersData = await membersRes.json();
            setTeamMembers(
              (membersData.data || [])
                .filter((m: any) => m.id !== employee.id)
                .slice(0, 5),
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch manager data:", error);
      } finally {
        setLoadingExtra(false);
      }
    };

    fetchManagerData();
  }, [employee, open]);

  useEffect(() => {
    if (!open) {
      setTeamMembers([]);
      setManagedTeams([]);
      setManagedProjects([]);
      setIsEditing(false);
    }
  }, [open]);

  const openEdit = () => {
    if (!employee) return;
    setFormFullName(employee.fullName);
    setFormJobTitle(employee.jobTitle || "");
    setFormTimezone(employee.timezone || "");
    setFormCountry(employee.country || "");
    setFormAddress(employee.address || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!employee) return;
    setIsSaving(true);
    const token = localStorage.getItem("crm_access_token");

    const body: Record<string, any> = {};
    if (canEditNameTitle) {
      if (formFullName.trim() && formFullName !== employee.fullName)
        body.fullName = formFullName.trim();
      if (formJobTitle !== (employee.jobTitle || ""))
        body.jobTitle = formJobTitle || null;
    }
    if (canEditProfileFields) {
      if (formTimezone !== (employee.timezone || ""))
        body.timezone = formTimezone || null;
      if (formCountry !== (employee.country || ""))
        body.country = formCountry || null;
      if (formAddress !== (employee.address || ""))
        body.address = formAddress || null;
    }

    if (Object.keys(body).length === 0) {
      setIsEditing(false);
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/hr/employees/${employee.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Failed to update profile");
      }

      toast.success("Profile updated successfully");
      setIsEditing(false);
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!employee) return null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatJobTitle = (title: string | null) => {
    if (!title) return "Not Specified";
    return title
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const isManagerOrAdmin =
    employee.role === "manager" || employee.role === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Employee Details</DialogTitle>
            {canEdit && !isEditing && (
              <Button variant="ghost" size="sm" onClick={openEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatarUrl || undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(employee.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{employee.fullName}</h3>
              <p className="text-sm text-muted-foreground">
                {formatJobTitle(employee.jobTitle)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={employee.isActive ? "default" : "secondary"}
                  className={
                    employee.isActive
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-400"
                  }
                >
                  {employee.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge
                  variant={
                    employee.role === "admin" ? "destructive" : "default"
                  }
                  className={
                    employee.role === "manager" ? "bg-blue-500" : undefined
                  }
                >
                  {employee.role.charAt(0).toUpperCase() +
                    employee.role.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {isEditing ? (
            /* ---- Edit Form ---- */
            <div className="space-y-4">
              {isSelf && !isAdmin && !isManager && (
                <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
                  You can update your timezone, country, and address.
                </p>
              )}

              {canEditNameTitle && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-name">Full Name</Label>
                    <Input
                      id="emp-name"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-job">Job Title</Label>
                    <Input
                      id="emp-job"
                      value={formJobTitle}
                      onChange={(e) => setFormJobTitle(e.target.value)}
                      placeholder="e.g. Sales Executive"
                    />
                  </div>
                </>
              )}

              {canEditProfileFields && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-tz">Timezone</Label>
                    <Input
                      id="emp-tz"
                      value={formTimezone}
                      onChange={(e) => setFormTimezone(e.target.value)}
                      placeholder="e.g. Asia/Kolkata"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-country">Country</Label>
                    <Input
                      id="emp-country"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      placeholder="e.g. India"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-address">Address</Label>
                    <Textarea
                      id="emp-address"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Street address"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ---- Read-only Details ---- */
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{employee.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Building className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium">
                    {employee.departmentName || "Not Assigned"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Primary Team</p>
                  <p className="text-sm font-medium">
                    {employee.teamName || "Not Assigned"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Job Title</p>
                  <p className="text-sm font-medium">
                    {formatJobTitle(employee.jobTitle)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">System Role</p>
                  <p className="text-sm font-medium capitalize">
                    {employee.role}
                  </p>
                </div>
              </div>

              {(employee.timezone || employee.country || employee.address) && (
                <>
                  {employee.timezone && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Timezone</p>
                        <p className="text-sm font-medium">{employee.timezone}</p>
                      </div>
                    </div>
                  )}
                  {(employee.country || employee.address) && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm font-medium">
                          {[employee.address, employee.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm font-medium">
                    {format(new Date(employee.createdAt), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manager-specific info */}
          {!isEditing && isManagerOrAdmin && (
            <>
              <Separator />

              {loadingExtra ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {managedTeams.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <UsersRound className="h-4 w-4" />
                        <span>Teams Managed ({managedTeams.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {managedTeams.map((team) => (
                          <Badge key={team.id} variant="outline">
                            {team.name}{" "}
                            <span className="ml-1 text-muted-foreground">
                              ({team.memberCount} members)
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {managedProjects.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FolderKanban className="h-4 w-4" />
                        <span>
                          Projects Managed ({managedProjects.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {managedProjects.slice(0, 6).map((project) => (
                          <Badge
                            key={project.id}
                            variant={
                              project.status === "in_progress"
                                ? "default"
                                : project.status === "completed"
                                  ? "secondary"
                                  : "outline"
                            }
                            className={
                              project.status === "in_progress"
                                ? "bg-green-500"
                                : undefined
                            }
                          >
                            {project.name}
                            <span className="ml-1 text-xs opacity-70">
                              ({formatStatus(project.status)})
                            </span>
                          </Badge>
                        ))}
                        {managedProjects.length > 6 && (
                          <Badge variant="secondary">
                            +{managedProjects.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {managedTeams.length === 0 && managedProjects.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No teams or projects currently managed by this user.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {isEditing && (
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
