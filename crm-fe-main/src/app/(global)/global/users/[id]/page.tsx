"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { usersApi, activitiesApi, projectsApi, rolesApi } from "@/lib/api";
import { useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  User,
  Calendar,
  Clock,
  Edit,
  Activity,
  FolderKanban,
  Briefcase,
  Users,
  Tag,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { useAuth } from "@/providers/auth-provider";
import { canSeeFullCTC, formatCTC } from "@/lib/employeeHelpers";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isCurrentUserManager = useIsManager();
  const { user: currentUser } = useAuth();
  const userId = params.id as string;
  const permissions = currentUser?.permissions ?? [];
  const canSeeCompensation = canSeeFullCTC(permissions);

  const { data, isLoading, error } = useSWR(
    userId ? ["user", userId] : null,
    () => usersApi.get(userId),
  );

  // Fetch user activities
  const { data: activitiesData, isLoading: activitiesLoading } = useSWR(
    userId && isAdmin ? ["user-activities", userId] : null,
    () =>
      activitiesApi.list({ userId, limit: 50 }).then((res) => res?.data || []),
  );

  // Fetch projects managed by this user — available to admins and managers
  const { data: managedProjectsData, isLoading: projectsLoading } = useSWR(
    userId && (isAdmin || isCurrentUserManager) ? ["user-managed-projects", userId] : null,
    () => projectsApi.getByManager(userId),
  );

  // Fetch RBAC roles for this user
  const { data: userRolesData, isLoading: rolesLoading } = useSWR(
    userId && isAdmin ? ["user-rbac-roles", userId] : null,
    () => rolesApi.getUserRoles(userId),
  );

  const refreshUserData = useCallback(async () => {
    await Promise.all([
      mutate(["user", userId]),
      mutate(["user-activities", userId]),
      mutate(["user-managed-projects", userId]),
      mutate(["user-rbac-roles", userId]),
    ]);
  }, [userId]);

  useHeaderRefresh({
    onRefresh: refreshUserData,
    enabled: isAdmin,
  });

  // Non-admins who aren't managers have no business on a user detail page
  if (!isAdmin && !isCurrentUserManager) {
    router.push("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load user details</p>
        <Button
          variant="outline"
          onClick={() => router.push("/global/users")}
          className="mt-4"
        >
          Back to Users
        </Button>
      </div>
    );
  }

  const user = data;
  const activities = activitiesData || [];
  const managedProjects = Array.isArray(managedProjectsData) ? managedProjectsData : [];
  const userRbacRoles = Array.isArray(userRolesData) ? userRolesData : [];
  const isManager = user?.role === "manager" || user?.role === "admin";

  const formatJobTitle = (jt: string | null | undefined) => {
    if (!jt) return "—";
    return jt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case "manager":
        return <Shield className="w-5 h-5 text-blue-500" />;
      default:
        return <User className="w-5 h-5 text-green-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "clock_in":
      case "clock_out":
        return <Clock className="w-4 h-4 text-green-500" />;
      case "login":
      case "logout":
        return <User className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/global/users")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Details</h1>
            <p className="text-muted-foreground">View user information</p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/global/users/${userId}/edit`)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit User
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="text-2xl">
                {user.fullName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                <Badge variant={user.isActive ? "default" : "destructive"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {getRoleIcon(user.role)}
                <span className="capitalize">
                  {user.role === "admin"
                    ? "Admin"
                    : user.departmentName
                      ? `${user.departmentName} ${user.role}`
                      : user.role}
                </span>
                {user.shiftType && (
                  <Badge variant="outline" className="ml-2">
                    {user.shiftType === "day_shift"
                      ? "Day Shift"
                      : "Night Shift"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          {isManager && (
            <TabsTrigger value="projects">
              <FolderKanban className="h-4 w-4 mr-1" />
              Projects ({managedProjects.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{user.phone || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Job Title</p>
                  <p className="font-medium">{formatJobTitle((user as any).jobTitle)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{(user as any).departmentName || "—"}</p>
                </div>
              </div>
              {(user as any).managerName && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Reporting To</p>
                    <p className="font-medium">{(user as any).managerName}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {user.createdAt
                      ? format(new Date(user.createdAt), "PPP")
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">
                    {user.lastLogin
                      ? format(new Date(user.lastLogin), "PPP 'at' p")
                      : "Never"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Shift</p>
                  <p className="font-medium">
                    {user.shiftType === "day_shift"
                      ? "Day Shift (9 AM – 6 PM)"
                      : user.shiftType === "night_shift"
                        ? "Night Shift (7 PM – 4 AM)"
                        : "Not Set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Annual CTC</p>
                  <p className="font-medium">
                    {formatCTC((user as any).currentCtc, canSeeCompensation)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Package split</p>
                  <p className="font-medium">
                    Basic {(user as any).salaryComponents?.basic_pct ?? 50}% · HRA {(user as any).salaryComponents?.hra_pct ?? 20}% · Allowance {(user as any).salaryComponents?.allowance_pct ?? 30}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RBAC Roles */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Assigned Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rolesLoading ? (
                  <div className="flex gap-2">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-6 w-28 rounded-full" />)}
                  </div>
                ) : userRbacRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No RBAC roles assigned.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userRbacRoles.map((r: any) => (
                      <Badge
                        key={r.id || r.roleId}
                        variant="outline"
                        className={
                          r.scope === "global"
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-blue-300 bg-blue-50 text-blue-700"
                        }
                      >
                        {r.name || r.roleName}
                        {r.departmentName && (
                          <span className="ml-1 opacity-60">· {r.departmentName}</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isManager && (
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  Managed Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-14" />
                    ))}
                  </div>
                ) : managedProjects.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No projects managed by this user.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {managedProjects.map((project: any) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}/overview`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <FolderKanban className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </p>
                            {project.clientName && (
                              <p className="text-xs text-muted-foreground truncate">
                                {project.clientName}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0 ml-2"
                        >
                          {project.status?.replace(/_/g, " ") || "planned"}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No activity found for this user
                </p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 pb-3 border-b last:border-0"
                    >
                      <div className="mt-1">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {activity.title ||
                            activity.activity_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.description || "No description"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
