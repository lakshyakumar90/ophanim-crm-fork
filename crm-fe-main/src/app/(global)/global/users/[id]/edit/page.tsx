"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { usersApi, teamsApi, emailApi, rolesApi } from "@/lib/api";
import { useIsAdmin } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Mail,
  CheckCircle,
  Send,
  Trash2,
  Shield,
  X,
  Plus,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import React, { useMemo } from "react";

// Job titles categorized by role
// Department-to-job-titles mapping
const DEPARTMENT_JOB_TITLES: Record<
  string,
  {
    employee: { value: string; label: string }[];
    manager: { value: string; label: string }[];
  }
> = {
  sales: {
    employee: [{ value: "sales_employee", label: "Sales Employee" }],
    manager: [{ value: "sales_manager", label: "Sales Manager" }],
  },
  hr: {
    employee: [],
    manager: [{ value: "hr_manager", label: "HR Manager" }],
  },
  finance: {
    employee: [{ value: "finance_employee", label: "Finance Employee" }],
    manager: [{ value: "finance_manager", label: "Finance Manager" }],
  },
  "project-management": {
    employee: [
      { value: "developer", label: "Developer" },
      { value: "designer", label: "Designer" },
      { value: "content_writer", label: "Content Writer" },
      { value: "seo_specialist", label: "SEO Specialist" },
    ],
    manager: [{ value: "project_manager", label: "Project Manager" }],
  },
};

const editUserSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  role: z.enum(["admin", "manager", "employee"]),
  departmentId: z.string().optional(),
  isActive: z.boolean(),
  jobTitle: z.string().optional(),
  shiftType: z.enum(["day_shift", "night_shift"]).optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { departments } = useDepartment();
  const userId = params?.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Roles management state
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null);

  // Email settings state
  const [emailType, setEmailType] = useState<"smtp" | "gmail">("gmail");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);
  const [showDeleteEmailConfirm, setShowDeleteEmailConfirm] = useState(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Fetch user data
  const {
    data: userData,
    isLoading: isLoadingUser,
    mutate,
  } = useSWR(userId ? ["user", userId] : null, () =>
    usersApi.get(userId),
  );

  // Fetch teams for dropdown
  const { data: teamsData } = useSWR("teams", () => teamsApi.list());

  // Fetch user email settings
  const { data: emailSettingsData, mutate: mutateEmailSettings } = useSWR(
    userId ? ["user-email-settings", userId] : null,
    () => emailApi.getUserSettings(userId),
  );

  // Fetch user's current role assignments
  const { data: userRoles = [], mutate: mutateUserRoles } = useSWR(
    userId ? ["user-roles", userId] : null,
    () => rolesApi.getUserRoles(userId),
  );

  // Fetch all available roles for the dropdown
  const { data: allRoles = [] } = useSWR("all-roles", () => rolesApi.list());

  const teams = Array.isArray(teamsData) ? teamsData : [];
  const emailSettings = emailSettingsData;

  // Update email form when settings load
  useEffect(() => {
    if (emailSettings?.isConfigured) {
      setEmailType(emailSettings.emailType || "gmail");
      setSmtpHost(emailSettings.smtpHost || "smtp.gmail.com");
      setSmtpPort(emailSettings.smtpPort || 587);
      setSmtpUser(emailSettings.smtpUser || "");
      setSmtpSecure(emailSettings.smtpSecure || false);
    }
  }, [emailSettings]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    values: userData
      ? {
          fullName: userData.fullName || "",
          email: userData.email || "",
          phone: userData.phone || "",
          role: userData.role as "admin" | "manager" | "employee",
          departmentId: userData.departmentId || "",
          isActive: userData.isActive ?? true,
          jobTitle: userData.jobTitle || "",
          shiftType: (userData.shiftType as "day_shift" | "night_shift") || "day_shift",
        }
      : undefined,
  });

  const isActive = watch("isActive");
  const currentRole = watch("role");
  const currentDepartmentId = watch("departmentId");
  const currentJobTitle = watch("jobTitle");
  const currentShiftType = watch("shiftType");

  // Get department slug from ID
  const currentDepartmentSlug = useMemo(() => {
    if (!currentDepartmentId || currentDepartmentId === "none") return null;
    const dept = departments.find((d) => d.id === currentDepartmentId);
    return dept?.slug || null;
  }, [currentDepartmentId, departments]);

  // Get job titles based on selected department and role
  const availableJobTitles = useMemo(() => {
    if (!currentDepartmentSlug) return [];
    const deptConfig = DEPARTMENT_JOB_TITLES[currentDepartmentSlug];
    if (!deptConfig) return [];

    // Explicitly cast currentRole to ensure type safety, though zod schema enforces it
    const role = currentRole as "manager" | "employee";
    return role === "manager" ? deptConfig.manager : deptConfig.employee;
  }, [currentDepartmentSlug, currentRole]);

  // Reset job title if it doesn't match available options
  useEffect(() => {
    if (currentJobTitle && currentJobTitle !== "none") {
      // If we have a title but no lists available, or title not in list
      if (availableJobTitles.length > 0) {
        const isValid = availableJobTitles.some(
          (t) => t.value === currentJobTitle,
        );
        if (!isValid) {
          // Optional: Clear or warn. Clearing might be annoying if departments haven't loaded yet.
          // But since departments load via context (which might be loading), we should be careful.
          // However, availableJobTitles depends on departments.
          // We'll skip auto-clearing for now to avoid wiping data on initial load race conditions,
          // but the dropdown will show empty or selected value will look invalid.
          // Better to rely on user changing it.
        }
      }
    }
  }, [availableJobTitles, currentJobTitle]);

  if (!isAdmin) {
    router.push("/");
    return null;
  }

  if (isLoadingUser) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">User not found</p>
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

  const onSubmit = async (data: EditUserFormData) => {
    setIsSubmitting(true);
    try {
      await usersApi.update(userId, {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        departmentId:
          data.departmentId && data.departmentId !== "none"
            ? data.departmentId
            : null,
        isActive: data.isActive,
        jobTitle:
          data.jobTitle && data.jobTitle !== "none" ? data.jobTitle : null,
        shiftType: data.shiftType || "day_shift",
      });
      toast.success("User updated successfully");
      mutate();
      router.push(`/global/users/${userId}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to update user",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailTypeChange = (type: "smtp" | "gmail") => {
    setEmailType(type);
    if (type === "gmail") {
      setSmtpHost("smtp.gmail.com");
      setSmtpPort(587);
      setSmtpSecure(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!smtpUser || !smtpPassword) {
      toast.error("Please fill in email and password");
      return;
    }
    setIsSavingEmail(true);
    try {
      await emailApi.saveUserSettings(userId, {
        emailType,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        smtpSecure,
      });
      toast.success("Email settings saved");
      mutateEmailSettings();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to save email settings",
      );
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTestEmailSettings = async () => {
    setIsTestingEmail(true);
    try {
      const response = await emailApi.testUserSettings(userId);
      const result = response.data.data;
      if (result.success) {
        toast.success("Email connection test successful!");
      } else {
        toast.error(`Test failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Connection test failed",
      );
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleDeleteEmailSettings = async () => {
    setShowDeleteEmailConfirm(false);
    setIsDeletingEmail(true);
    try {
      await emailApi.deleteUserSettings(userId);
      toast.success("Email settings removed");
      mutateEmailSettings();
      setSmtpPassword("");
    } catch (error: any) {
      toast.error("Failed to remove email settings");
    } finally {
      setIsDeletingEmail(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedRoleId) return;
    setIsAssigningRole(true);
    try {
      await rolesApi.assignRole(userId, selectedRoleId);
      toast.success("Role assigned");
      setSelectedRoleId("");
      mutateUserRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to assign role");
    } finally {
      setIsAssigningRole(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    setRemovingRoleId(roleId);
    try {
      await rolesApi.removeRole(userId, roleId);
      toast.success("Role removed");
      mutateUserRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to remove role");
    } finally {
      setRemovingRoleId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsResettingPassword(true);
    try {
      await usersApi.resetPassword(userId, newPassword);
      toast.success("Password reset successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to reset password",
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/global/users/${userId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit User</h1>
          <p className="text-slate-600">Update user information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                {...register("fullName")}
                placeholder="John Doe"
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={currentRole}
                onValueChange={(v) => {
                  setValue("role", v as "admin" | "manager" | "employee");
                  setValue("jobTitle", ""); // Reset job title when role changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            {/* Department - only for non-admin */}
            {currentRole !== "admin" && (
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department</Label>
                <Select
                  value={currentDepartmentId || "none"}
                  onValueChange={(v) => setValue("departmentId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Job Title - only show for non-admin roles */}
            {currentRole !== "admin" && (
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Select
                  value={currentJobTitle || "none"}
                  onValueChange={(v) => setValue("jobTitle", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job title..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableJobTitles.map((jt) => (
                      <SelectItem key={jt.value} value={jt.value}>
                        {jt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {!currentDepartmentSlug
                    ? "Please select a department to see available job titles"
                    : currentRole === "employee"
                      ? "Select a specialization for this employee"
                      : "Select a management role"}
                </p>
              </div>
            )}

            {/* Shift Type */}
            <div className="space-y-2">
              <Label htmlFor="shiftType">Shift</Label>
              <Select
                value={currentShiftType || "day_shift"}
                onValueChange={(v) =>
                  setValue("shiftType", v as "day_shift" | "night_shift")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day_shift">Day Shift (9 AM - 6 PM)</SelectItem>
                  <SelectItem value="night_shift">Night Shift (7 PM - 4 AM)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the work shift for this user
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Account Active</Label>
                <p className="text-sm text-slate-500">
                  Inactive users cannot login
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(v) => setValue("isActive", v)}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/global/users/${userId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Reset Section */}
      <Card>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Set a new password for this user. They will need to use this
            password to log in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Password must be at least 8 characters with uppercase, lowercase,
            number, and special character.
          </p>
          <Button
            onClick={handleResetPassword}
            disabled={isResettingPassword || !newPassword || !confirmPassword}
            variant="destructive"
          >
            {isResettingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Roles Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Role Assignments</CardTitle>
          </div>
          <CardDescription>
            Dynamic roles determine what this user can see and do. Permissions
            are the union of all assigned roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Current roles — chips */}
          <div>
            <p className="text-sm font-medium mb-2">Current Roles</p>
            {userRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No roles assigned yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userRoles.map((ur) => (
                  <span
                    key={ur.id}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-sm"
                  >
                    <span>{ur.roleName}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      ({ur.roleScope})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(ur.roleId)}
                      disabled={removingRoleId === ur.roleId}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {removingRoleId === ur.roleId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Assign role */}
          <div>
            <p className="text-sm font-medium mb-2">Add Role</p>
            <div className="flex gap-2">
              <Select
                value={selectedRoleId}
                onValueChange={setSelectedRoleId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Search and select a role..." />
                </SelectTrigger>
                <SelectContent>
                  {allRoles
                    .filter(
                      (r) => !userRoles.some((ur) => ur.roleId === r.id),
                    )
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                        {r.departmentName && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({r.departmentName})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleAssignRole}
                disabled={!selectedRoleId || isAssigningRole}
              >
                {isAssigningRole ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="ml-1">Assign</span>
              </Button>
            </div>
          </div>

          {/* Permission summary */}
          {userRoles.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Effective Permissions</p>
              <p className="text-xs text-muted-foreground mb-2">
                Union of all assigned roles — {" "}
                {Array.from(
                  new Set(
                    allRoles
                      .filter((r) => userRoles.some((ur) => ur.roleId === r.id))
                      .flatMap((r) => r.permissions),
                  ),
                ).length}{" "}
                total permissions granted.
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.from(
                  new Set(
                    allRoles
                      .filter((r) => userRoles.some((ur) => ur.roleId === r.id))
                      .flatMap((r) => r.permissions),
                  ),
                )
                  .sort()
                  .map((perm) => (
                    <span
                      key={perm}
                      className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                    >
                      {perm}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Settings Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <CardTitle>Email Configuration</CardTitle>
            </div>
            {emailSettings?.isConfigured && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            )}
          </div>
          <CardDescription>
            Configure SMTP settings for this user to send emails from their own
            account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Email Provider</Label>
            <Select
              value={emailType}
              onValueChange={(v) => handleEmailTypeChange(v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gmail">Gmail (with App Password)</SelectItem>
                <SelectItem value="smtp">Custom SMTP Server</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {emailType === "smtp" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="user@gmail.com"
            />
          </div>

          <div className="space-y-2">
            <Label>{emailType === "gmail" ? "App Password" : "Password"}</Label>
            <PasswordInput
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder={
                emailType === "gmail" ? "16-character app password" : "Password"
              }
            />
            {emailType === "gmail" && (
              <p className="text-xs text-muted-foreground">
                Generate at{" "}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Account Settings
                </a>
              </p>
            )}
          </div>

          {emailType === "smtp" && (
            <div className="flex items-center gap-2">
              <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} />
              <Label>Use SSL/TLS (port 465)</Label>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSaveEmailSettings} disabled={isSavingEmail}>
              {isSavingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Email Settings"
              )}
            </Button>

            {emailSettings?.isConfigured && (
              <>
                <Button
                  variant="outline"
                  onClick={handleTestEmailSettings}
                  disabled={isTestingEmail}
                >
                  {isTestingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Test
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteEmailConfirm(true)}
                  disabled={isDeletingEmail}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteEmailConfirm}
        onOpenChange={setShowDeleteEmailConfirm}
        title="Remove Email Configuration"
        description="Are you sure you want to remove this user's email configuration? They will no longer be able to send emails."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDeleteEmailSettings}
      />
    </div>
  );
}
