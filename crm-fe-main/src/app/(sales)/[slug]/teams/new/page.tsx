"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { teamsApi, departmentsApi, usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

const teamSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  managerId: z.string().min(1, "Manager is required"),
});

type TeamFormData = z.infer<typeof teamSchema>;

export default function NewTeamPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [department, setDepartment] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
  });

  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        // 1. Fetch departments to find the ID from the slug
        const departments = await departmentsApi.list();
        // Try to match slug to department name or a slug field if it exists
        // Converting slug to title case for better matching (e.g. "sales" -> "Sales")
        const dept = departments.find(
          (d: any) =>
            d.slug === slug || d.name.toLowerCase() === slug.toLowerCase(),
        );

        if (dept) {
          setDepartment(dept);
          // 2. Fetch managers for this department
          const usersResult = await usersApi.list({
            role: "manager",
            departmentId: dept.id,
          });
          setManagers(usersResult?.data || usersResult || []);
        } else {
          toast.error("Department not found");
        }
      } catch (error) {
        console.error("Failed to load data", error);
        toast.error("Failed to load department details");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  const onSubmit = async (data: TeamFormData) => {
    if (!department) {
      toast.error("Cannot create team: Department not identified");
      return;
    }

    setIsSubmitting(true);
    try {
      await teamsApi.create({
        ...data,
        departmentId: department.id,
      });
      toast.success("Team created successfully");
      router.push(`/${slug}/teams`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to create team",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Department not found</p>
        <Button onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${slug}/teams`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Create New Team
          </h1>
          <p className="text-muted-foreground">
            Add a new team to {department.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. Alpha Squad"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerId">Manager</Label>
              <Controller
                name="managerId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.managerId && (
                <p className="text-sm text-red-500">
                  {errors.managerId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="What is this team responsible for?"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${slug}/teams`)}
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
                  "Create Team"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
