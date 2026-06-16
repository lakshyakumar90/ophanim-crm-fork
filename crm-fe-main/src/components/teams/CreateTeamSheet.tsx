"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import useSWR from "swr";
import { teamsApi, departmentsApi, usersApi } from "@/lib/api";
import { useDepartment } from "@/providers/department-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";

const teamSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  managerId: z.string().min(1, "Manager is required"),
  departmentId: z.string().optional(),
});

type TeamFormData = z.infer<typeof teamSchema>;

function CreateTeamFormBody({
  variant,
  onSuccess,
}: {
  variant: "sales" | "global";
  onSuccess?: () => void;
}) {
  const { currentDepartment } = useDepartment();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedDeptId, setResolvedDeptId] = useState<string>("");

  const { data: departmentsData } = useSWR(
    variant === "global" ? "departments" : null,
    () => departmentsApi.list(),
  );

  useEffect(() => {
    if (variant === "sales" && currentDepartment?.id) {
      setResolvedDeptId(currentDepartment.id);
      return;
    }
    if (variant === "sales") {
      departmentsApi.list().then((depts) => {
        const dept = depts.find(
          (d: { slug?: string; name?: string }) =>
            d.slug === "sales" || d.name?.toLowerCase() === "sales",
        );
        if (dept) setResolvedDeptId(dept.id);
      });
    }
  }, [variant, currentDepartment]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: { departmentId: "" },
  });

  const departmentId = variant === "global" ? watch("departmentId") : resolvedDeptId;

  const { data: usersData, isLoading: loadingManagers } = useSWR(
    departmentId ? ["team-managers", departmentId] : null,
    () => usersApi.list({ role: "manager", departmentId, limit: 100 }),
  );

  const managers = usersData?.data || usersData || [];
  const departments = departmentsData || [];

  const onSubmit = async (data: TeamFormData) => {
    const deptId = variant === "global" ? data.departmentId : resolvedDeptId;
    if (!deptId) {
      toast.error("Department not identified");
      return;
    }
    setIsSubmitting(true);
    try {
      await teamsApi.create({
        name: data.name,
        description: data.description,
        managerId: data.managerId,
        departmentId: deptId,
      });
      toast.success("Team created successfully");
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || "Failed to create team");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Team Name</Label>
        <Input id="name" {...register("name")} placeholder="e.g. Alpha Squad" />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      {variant === "global" && (
        <div className="space-y-2">
          <Label>Department</Label>
          <Select onValueChange={(v) => setValue("departmentId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept: { id: string; name: string }) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departmentId && (
            <p className="text-sm text-red-500">{errors.departmentId?.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Manager</Label>
        <Controller
          name="managerId"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value} disabled={loadingManagers || !departmentId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingManagers ? "Loading..." : "Select a manager"} />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager: { id: string; fullName: string }) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.managerId && <p className="text-sm text-red-500">{errors.managerId.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} placeholder="What is this team responsible for?" rows={4} />
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Team"
          )}
        </Button>
      </div>
    </form>
  );
}

export function CreateTeamSheet({
  open,
  onOpenChange,
  onCreated,
  variant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  variant: "sales" | "global";
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Team"
      description={
        variant === "sales"
          ? "Add a new team to your department"
          : "Add a new team to your organization"
      }
      size="lg"
    >
      <CreateTeamFormBody
        variant={variant}
        onSuccess={() => {
          onOpenChange(false);
          onCreated?.();
        }}
      />
    </FormSideSheet>
  );
}
