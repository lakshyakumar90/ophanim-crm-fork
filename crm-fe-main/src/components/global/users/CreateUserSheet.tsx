"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import useSWR from "swr";
import { authApi, rolesApi } from "@/lib/api";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormSideSheet } from "@/components/ui/form-side-sheet";

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
    employee: [{ value: "hr_employee", label: "HR Employee" }],
    manager: [
      { value: "hr_manager", label: "HR Manager" },
      { value: "hr_director", label: "HR Director" },
    ],
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

/**
 * Convert a role slug to a job_title value (dynamic — works for any slug).
 * Convention: "some-role-name" → "some_role_name"
 */
function slugToJobTitle(slug: string): string {
  return slug.replace(/-/g, "_");
}

/**
 * Compute seniority for sorting: lower = more senior.
 * - "admin"               → 0
 * - ends with "-manager"  → 1
 * - anything else         → 2
 */
function slugSeniority(slug: string): number {
  if (slug === "admin") return 0;
  if (slug.endsWith("-manager") || slug === "manager") return 1;
  return 2;
}

/** Human-readable label from a job_title value or role slug. */
function jobTitleLabel(jobTitle: string): string {
  return jobTitle
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// User schema - Admin role NOT allowed
const userSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
  role: z.enum(["manager", "employee"]),
  departmentId: z.string().min(1, "Department is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  shiftType: z.enum(["day_shift", "night_shift"]),
  currentCtc: z.coerce.number().positive("CTC must be positive").nullish(),
  basicPct: z.coerce.number().min(0).max(100).nullish(),
  hraPct: z.coerce.number().min(0).max(100).nullish(),
  allowancePct: z.coerce.number().min(0).max(100).nullish(),
});

type UserFormData = z.infer<typeof userSchema>;

export function CreateUserFormBody({ onSuccess }: { onSuccess?: () => void }) {
  const { departments } = useDepartment();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRbacRoleIds, setSelectedRbacRoleIds] = useState<string[]>([]);
  const [jobTitleAutoSuggested, setJobTitleAutoSuggested] = useState(false);

  // Fetch all RBAC roles for selection
  const { data: allRoles = [] } = useSWR("all-roles", () => rolesApi.list());

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema) as any,
    defaultValues: {
      role: "employee",
      departmentId: "",
      jobTitle: "",
      shiftType: "day_shift",
      currentCtc: undefined,
      basicPct: undefined,
      hraPct: undefined,
      allowancePct: undefined,
    },
  });

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
    return currentRole === "manager" ? deptConfig.manager : deptConfig.employee;
  }, [currentDepartmentSlug, currentRole]);

  // Reset job title when department or role changes (only if not auto-suggested from RBAC)
  useEffect(() => {
    if (currentJobTitle && !jobTitleAutoSuggested) {
      const isValidTitle = availableJobTitles.some(
        (jt) => jt.value === currentJobTitle,
      );
      if (!isValidTitle) {
        setValue("jobTitle", "");
      }
    }
  }, [
    currentDepartmentSlug,
    currentRole,
    availableJobTitles,
    currentJobTitle,
    jobTitleAutoSuggested,
    setValue,
  ]);

  // Auto-suggest job title from selected RBAC roles (most senior slug wins)
  const suggestedJobTitle = useMemo(() => {
    if (selectedRbacRoleIds.length === 0) return null;
    const slugs = selectedRbacRoleIds
      .map((rid) => (allRoles as any[]).find((r: any) => r.id === rid)?.slug)
      .filter(Boolean) as string[];
    if (!slugs.length) return null;
    const best = [...slugs].sort((a, b) => {
      const diff = slugSeniority(a) - slugSeniority(b);
      return diff !== 0 ? diff : a.localeCompare(b);
    })[0];
    return slugToJobTitle(best);
  }, [selectedRbacRoleIds, allRoles]);

  // Apply auto-suggestion whenever it changes
  useEffect(() => {
    if (suggestedJobTitle) {
      setValue("jobTitle", suggestedJobTitle);
      setJobTitleAutoSuggested(true);
    } else {
      setJobTitleAutoSuggested(false);
    }
  }, [suggestedJobTitle, setValue]);

  const toggleRbacRole = (roleId: string) => {
    setSelectedRbacRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      await authApi.register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
        departmentId: data.departmentId,
        jobTitle: data.jobTitle,
        shiftType: data.shiftType,
        currentCtc: data.currentCtc,
        salaryComponents:
          data.basicPct !== undefined ||
          data.hraPct !== undefined ||
          data.allowancePct !== undefined
            ? {
                basic_pct: data.basicPct,
                hra_pct: data.hraPct,
                allowance_pct: data.allowancePct,
              }
            : undefined,
        ...(selectedRbacRoleIds.length > 0 ? { rbacRoleIds: selectedRbacRoleIds } : {}),
      } as any);

      toast.success("User created successfully");
      onSuccess?.();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to create user",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle role change - reset job title
  const handleRoleChange = (value: "manager" | "employee") => {
    setValue("role", value);
    setValue("jobTitle", "");
  };

  // Handle department change - reset job title
  const handleDepartmentChange = (value: string) => {
    setValue("departmentId", value);
    setValue("jobTitle", "");

    // If HR department is selected, force role to manager
    const dept = departments.find((d) => d.id === value);
    if (dept?.slug === "hr") {
      setValue("role", "manager");
    }
  };

  return (
    <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Fill in the details to create a new user. Department and job title
            are required.
          </CardDescription>
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
              <Label htmlFor="password">Initial Password</Label>
              <PasswordInput
                id="password"
                {...register("password")}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be 8+ chars with uppercase, lowercase, number, and special
                character
              </p>
            </div>

            {/* Role Selection - Admin NOT available */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={currentRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            {/* Department Selection - Required */}
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department *</Label>
              <Select
                value={currentDepartmentId}
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {[...departments]
                    .sort((a, b) => {
                      const order = [
                        "sales",
                        "finance",
                        "hr",
                        "project-management",
                      ];
                      return (
                        order.indexOf(a.slug) - order.indexOf(b.slug) ||
                        a.name.localeCompare(b.name)
                      );
                    })
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.departmentId && (
                <p className="text-sm text-red-500">
                  {errors.departmentId.message}
                </p>
              )}
            </div>

            {/* RBAC Roles Multi-Select */}
            <div className="space-y-2">
              <Label>
                RBAC Roles
                <span className="ml-1 text-muted-foreground font-normal text-xs">
                  (optional — auto-suggests job title)
                </span>
              </Label>
              <div className="rounded-lg border divide-y max-h-52 overflow-y-auto">
                {(allRoles as any[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-4">Loading roles...</p>
                ) : (
                  (allRoles as any[]).map((r: any) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <Checkbox
                        checked={selectedRbacRoleIds.includes(r.id)}
                        onCheckedChange={() => toggleRbacRole(r.id)}
                      />
                      <span className="text-sm flex-1">{r.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${r.scope === "global" ? "border-red-300 text-red-600" : "border-blue-300 text-blue-600"}`}
                      >
                        {r.scope === "global" ? "Global" : r.departmentName || "Dept"}
                      </Badge>
                    </label>
                  ))
                )}
              </div>
              {selectedRbacRoleIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedRbacRoleIds.length} role{selectedRbacRoleIds.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Job Title - Required, filtered by department */}
            <div className="space-y-2">
              <Label htmlFor="jobTitle">
                Job Title *
                {jobTitleAutoSuggested && suggestedJobTitle && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary font-normal">
                    <Sparkles className="h-3 w-3" />
                    Auto-suggested from roles
                  </span>
                )}
              </Label>
              <Select
                value={currentJobTitle}
                onValueChange={(v) => {
                  setValue("jobTitle", v);
                  setJobTitleAutoSuggested(false);
                }}
                disabled={!currentDepartmentSlug && !jobTitleAutoSuggested}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      currentDepartmentSlug || jobTitleAutoSuggested
                        ? "Select job title..."
                        : "Select department first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {jobTitleAutoSuggested
                    ? /* Show all roles as job title options, derived dynamically from slugs */
                      (allRoles as any[])
                        .sort((a: any, b: any) => {
                          const diff = slugSeniority(a.slug) - slugSeniority(b.slug);
                          return diff !== 0 ? diff : a.name.localeCompare(b.name);
                        })
                        .map((r: any) => {
                          const val = slugToJobTitle(r.slug);
                          return (
                            <SelectItem key={val} value={val}>
                              {jobTitleLabel(val)}
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({r.name})
                              </span>
                            </SelectItem>
                          );
                        })
                    : availableJobTitles.map((jt) => (
                        <SelectItem key={jt.value} value={jt.value}>
                          {jt.label}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
              {errors.jobTitle && (
                <p className="text-sm text-red-500">
                  {errors.jobTitle.message}
                </p>
              )}
              {!currentDepartmentSlug && !jobTitleAutoSuggested && (
                <p className="text-xs text-muted-foreground">
                  Select a department or assign RBAC roles to auto-suggest a job title
                </p>
              )}
            </div>

            {/* Shift Type */}
            <div className="space-y-2">
              <Label htmlFor="shiftType">Shift</Label>
              <Select
                value={currentShiftType}
                onValueChange={(v) =>
                  setValue("shiftType", v as "day_shift" | "night_shift")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day_shift">
                    Day Shift (9 AM - 6 PM)
                  </SelectItem>
                  <SelectItem value="night_shift">
                    Night Shift (7 PM - 4 AM)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the work shift for this user
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentCtc">Annual CTC (INR)</Label>
              <Input
                id="currentCtc"
                type="number"
                min={0}
                step="1000"
                placeholder="e.g. 1200000"
                {...register("currentCtc")}
              />
              {errors.currentCtc && (
                <p className="text-sm text-red-500">{errors.currentCtc.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional: helps payroll generate correct package from day one.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="basicPct">Basic %</Label>
                <Input id="basicPct" type="number" min={0} max={100} {...register("basicPct")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hraPct">HRA %</Label>
                <Input id="hraPct" type="number" min={0} max={100} {...register("hraPct")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowancePct">Allowance %</Label>
                <Input
                  id="allowancePct"
                  type="number"
                  min={0}
                  max={100}
                  {...register("allowancePct")}
                />
              </div>
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Assign RBAC roles to automatically suggest a job title based on the most senior role.
                You can still override the job title manually. RBAC roles control detailed permissions
                across the CRM.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
  );
}

export function CreateUserSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add New User"
      description="Create a new account for your organization"
      size="xl"
    >
      <CreateUserFormBody
        onSuccess={() => {
          onOpenChange(false);
          onCreated?.();
        }}
      />
    </FormSideSheet>
  );
}
