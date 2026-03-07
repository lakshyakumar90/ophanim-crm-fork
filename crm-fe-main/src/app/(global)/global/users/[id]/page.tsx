"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { usersApi, activitiesApi } from "@/lib/api";
import { useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const userId = params.id as string;

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

  const refreshUserData = useCallback(async () => {
    await Promise.all([
      mutate(["user", userId]),
      mutate(["user-activities", userId]),
    ]);
  }, [userId]);

  useHeaderRefresh({
    onRefresh: refreshUserData,
    enabled: isAdmin,
  });

  if (!isAdmin) {
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
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">
                    {user.createdAt
                      ? format(new Date(user.createdAt), "PPP")
                      : "-"}
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
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Shift</p>
                  <p className="font-medium">
                    {user.shiftType === "day_shift"
                      ? "Day Shift (9 AM - 6 PM)"
                      : user.shiftType === "night_shift"
                        ? "Night Shift (7 PM - 4 AM)"
                        : "Not Set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
