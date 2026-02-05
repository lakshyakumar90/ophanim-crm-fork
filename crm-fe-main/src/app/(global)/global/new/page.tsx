"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { authApi, usersApi } from "@/lib/api";
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
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
});

type UserFormData = z.infer<typeof userSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const { departments } = useDepartment();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "employee",
      departmentId: "",
      jobTitle: "",
    },
  });

  const currentRole = watch("role");
  const currentDepartmentId = watch("departmentId");
  const currentJobTitle = watch("jobTitle");

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

  // Reset job title when department or role changes
  useEffect(() => {
    if (currentJobTitle) {
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
    setValue,
  ]);

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
      });

      toast.success("User created successfully");
      router.push("/global/users");
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/global/users")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New User</h1>
          <p className="text-muted-foreground">
            Create a new account for your organization
          </p>
        </div>
      </div>

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

            {/* Job Title - Required, filtered by department */}
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Select
                value={currentJobTitle}
                onValueChange={(v) => setValue("jobTitle", v)}
                disabled={!currentDepartmentSlug}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      currentDepartmentSlug
                        ? "Select job title..."
                        : "Select department first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableJobTitles.map((jt) => (
                    <SelectItem key={jt.value} value={jt.value}>
                      {jt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.jobTitle && (
                <p className="text-sm text-red-500">
                  {errors.jobTitle.message}
                </p>
              )}
              {!currentDepartmentSlug && (
                <p className="text-xs text-muted-foreground">
                  Please select a department to see available job titles
                </p>
              )}
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Job titles are filtered based on the selected department and
                role. Managers get management titles, employees get specialized
                titles.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/global/users")}
              >
                Cancel
              </Button>
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
    </div>
  );
}
